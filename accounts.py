"""
Accounts Module
Handles fetching and managing user accounts with stable ID mapping
"""
from typing import List, Dict, Optional
from datetime import datetime
import uuid
from open_finance_client import OpenFinanceClient, OpenFinanceAPIError
from models import Account, Connection
from sqlalchemy.orm import Session


class AccountsManager:
    """Manages account operations with stable internal mapping"""
    
    def __init__(self, client: Optional[OpenFinanceClient] = None):
        self.client = client or OpenFinanceClient()
    
    def fetch_accounts(self, access_token: str) -> List[Dict]:
        """
        Fetch list of accounts from Open Finance API
        
        Args:
            access_token: Valid access token
            
        Returns:
            List of account dictionaries
        """
        try:
            response = self.client.get("/api/v1/accounts", access_token=access_token)
            return response.get("accounts", [])
        except OpenFinanceAPIError as e:
            raise Exception(f"Failed to fetch accounts: {str(e)}") from e
    
    def get_or_create_account_mapping(
        self,
        db: Session,
        connection_id: int,
        external_account_id: str,
        account_data: Dict
    ) -> Account:
        """
        Get existing account or create new one with stable internal mapping
        
        Args:
            db: Database session
            connection_id: Connection ID
            external_account_id: External account ID from Open Finance
            account_data: Account data from API
            
        Returns:
            Account model instance
        """
        # Try to find existing account by connection and external ID
        account = db.query(Account).filter(
            Account.connection_id == connection_id,
            Account.external_account_id == external_account_id
        ).first()
        
        if account:
            # Update account details
            account.account_type = account_data.get("type", account.account_type)
            account.account_name = account_data.get("name", account.account_name)
            account.account_number = account_data.get("account_number", account.account_number)
            account.currency = account_data.get("currency", "ILS")
            account.is_active = account_data.get("status", "active") == "active"
            account.updated_at = datetime.utcnow()
            return account
        
        # Create new account with stable internal ID
        internal_account_id = f"acc_{uuid.uuid4().hex[:16]}"
        
        account = Account(
            connection_id=connection_id,
            external_account_id=external_account_id,
            internal_account_id=internal_account_id,
            account_type=account_data.get("type", "checking"),
            account_name=account_data.get("name"),
            account_number=account_data.get("account_number"),
            currency=account_data.get("currency", "ILS"),
            is_active=account_data.get("status", "active") == "active"
        )
        
        db.add(account)
        db.commit()
        db.refresh(account)
        
        return account
    
    def sync_accounts(
        self,
        db: Session,
        connection: Connection,
        access_token: str
    ) -> List[Account]:
        """
        Sync accounts from API and create/update local mappings
        
        Args:
            db: Database session
            connection: Connection model instance
            access_token: Valid access token
            
        Returns:
            List of synced Account instances
        """
        # Fetch accounts from API
        accounts_data = self.fetch_accounts(access_token)
        
        synced_accounts = []
        for account_data in accounts_data:
            external_account_id = account_data.get("id") or account_data.get("account_id")
            if not external_account_id:
                continue
            
            account = self.get_or_create_account_mapping(
                db=db,
                connection_id=connection.id,
                external_account_id=external_account_id,
                account_data=account_data
            )
            synced_accounts.append(account)
        
        return synced_accounts
    
    def get_account_by_internal_id(self, db: Session, internal_account_id: str) -> Optional[Account]:
        """Get account by stable internal ID"""
        return db.query(Account).filter(
            Account.internal_account_id == internal_account_id
        ).first()
    
    def get_connection_accounts(self, db: Session, connection_id: int) -> List[Account]:
        """Get all accounts for a connection"""
        return db.query(Account).filter(
            Account.connection_id == connection_id,
            Account.is_active == True
        ).all()
