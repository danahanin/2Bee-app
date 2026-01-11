"""
Connection Manager
High-level interface for managing Open Finance connections
"""
from typing import Optional, Dict
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Connection
from auth import AuthManager
from accounts import AccountsManager
from balances import BalancesManager
from transactions import TransactionsManager
from open_finance_client import OpenFinanceClient


class ConnectionManager:
    """High-level manager for Open Finance connections"""
    
    def __init__(self):
        self.client = OpenFinanceClient()
        self.auth_manager = AuthManager(self.client)
        self.accounts_manager = AccountsManager(self.client)
        self.balances_manager = BalancesManager(self.client)
        self.transactions_manager = TransactionsManager(self.client)
    
    def create_connection(
        self,
        db: Session,
        user_id: str,
        permissions: Optional[list] = None
    ) -> Dict:
        """
        Create a new connection and consent
        
        Args:
            db: Database session
            user_id: Internal user identifier
            permissions: List of requested permissions
            
        Returns:
            Dict with consent_id and authorization_url
        """
        consent = self.auth_manager.create_consent(
            user_id=user_id,
            permissions=permissions
        )
        
        # Store connection in database
        connection = Connection(
            connection_id=consent["consent_id"],
            user_id=user_id,
            status="pending"
        )
        
        db.add(connection)
        db.commit()
        db.refresh(connection)
        
        return {
            "connection_id": connection.id,
            "consent_id": consent["consent_id"],
            "authorization_url": consent["authorization_url"]
        }
    
    def complete_connection(
        self,
        db: Session,
        consent_id: str,
        authorization_code: str
    ) -> Connection:
        """
        Complete connection by exchanging authorization code for tokens
        
        Args:
            db: Database session
            consent_id: Consent ID
            authorization_code: Authorization code from callback
            
        Returns:
            Connection instance
        """
        # Exchange code for tokens
        tokens = self.auth_manager.exchange_code_for_tokens(
            authorization_code=authorization_code,
            consent_id=consent_id
        )
        
        # Update connection
        connection = db.query(Connection).filter(
            Connection.connection_id == consent_id
        ).first()
        
        if not connection:
            raise ValueError(f"Connection not found for consent_id: {consent_id}")
        
        connection.access_token = tokens["access_token"]
        connection.refresh_token = tokens["refresh_token"]
        connection.token_expires_at = self.auth_manager.calculate_expires_at(
            tokens["expires_in"]
        )
        connection.status = "active"
        connection.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(connection)
        
        return connection
    
    def ensure_valid_token(
        self,
        db: Session,
        connection: Connection
    ) -> str:
        """
        Ensure connection has a valid access token, refresh if needed
        
        Args:
            db: Database session
            connection: Connection instance
            
        Returns:
            Valid access token
        """
        if not connection.refresh_token:
            raise ValueError("No refresh token available")
        
        # Check if token needs refresh
        if self.auth_manager.is_token_expired(connection.token_expires_at):
            tokens = self.auth_manager.refresh_access_token(connection.refresh_token)
            
            connection.access_token = tokens["access_token"]
            if tokens.get("refresh_token"):
                connection.refresh_token = tokens["refresh_token"]
            connection.token_expires_at = self.auth_manager.calculate_expires_at(
                tokens["expires_in"]
            )
            connection.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(connection)
        
        return connection.access_token
    
    def sync_all_data(
        self,
        db: Session,
        connection: Connection,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None
    ) -> Dict:
        """
        Sync all data for a connection (accounts, balances, transactions)
        
        Args:
            db: Database session
            connection: Connection instance
            from_date: Start date for transactions
            to_date: End date for transactions
            
        Returns:
            Dict with sync statistics
        """
        # Ensure valid token
        access_token = self.ensure_valid_token(db, connection)
        
        # Sync accounts
        accounts = self.accounts_manager.sync_accounts(
            db=db,
            connection=connection,
            access_token=access_token
        )
        
        # Sync balances
        balances = self.balances_manager.sync_all_balances(
            db=db,
            accounts=accounts,
            access_token=access_token
        )
        
        # Sync transactions
        transaction_stats = {}
        for account in accounts:
            stats = self.transactions_manager.sync_transactions(
                db=db,
                account=account,
                connection=connection,
                access_token=access_token,
                from_date=from_date.date() if from_date else None,
                to_date=to_date.date() if to_date else None
            )
            transaction_stats[account.internal_account_id] = stats
        
        return {
            "accounts_synced": len(accounts),
            "balances_synced": len(balances),
            "transactions": transaction_stats
        }
    
    def revoke_connection(
        self,
        db: Session,
        connection: Connection
    ) -> bool:
        """
        Revoke a connection and its tokens
        
        Args:
            db: Database session
            connection: Connection instance
            
        Returns:
            True if successful
        """
        if connection.access_token:
            try:
                self.auth_manager.revoke_token(connection.access_token, "access_token")
            except:
                pass
        
        if connection.refresh_token:
            try:
                self.auth_manager.revoke_token(connection.refresh_token, "refresh_token")
            except:
                pass
        
        connection.status = "revoked"
        connection.updated_at = datetime.utcnow()
        
        db.commit()
        
        return True
