"""
Balances Module
Handles fetching account balances
"""
from typing import List, Dict, Optional
from datetime import datetime
from open_finance_client import OpenFinanceClient, OpenFinanceAPIError
from models import Account, Balance
from sqlalchemy.orm import Session


class BalancesManager:
    """Manages balance operations"""
    
    def __init__(self, client: Optional[OpenFinanceClient] = None):
        self.client = client or OpenFinanceClient()
    
    def fetch_account_balance(
        self,
        access_token: str,
        account_id: str
    ) -> Dict:
        """
        Fetch balance for a specific account
        
        Args:
            access_token: Valid access token
            account_id: External account ID
            
        Returns:
            Balance data dictionary
        """
        try:
            response = self.client.get(
                f"/api/v1/accounts/{account_id}/balances",
                access_token=access_token
            )
            return response
        except OpenFinanceAPIError as e:
            raise Exception(f"Failed to fetch balance: {str(e)}") from e
    
    def fetch_all_balances(self, access_token: str) -> List[Dict]:
        """
        Fetch balances for all accounts
        
        Args:
            access_token: Valid access token
            
        Returns:
            List of balance dictionaries
        """
        try:
            response = self.client.get("/api/v1/balances", access_token=access_token)
            return response.get("balances", [])
        except OpenFinanceAPIError as e:
            raise Exception(f"Failed to fetch balances: {str(e)}") from e
    
    def save_balance(
        self,
        db: Session,
        account: Account,
        balance_data: Dict
    ) -> Balance:
        """
        Save balance data to database
        
        Args:
            db: Database session
            account: Account model instance
            balance_data: Balance data from API
            
        Returns:
            Balance model instance
        """
        # Get balance values (handle different API response formats)
        available_balance = balance_data.get("available_balance") or balance_data.get("available")
        current_balance = balance_data.get("current_balance") or balance_data.get("current") or balance_data.get("balance")
        
        # Get last updated timestamp
        last_updated_str = balance_data.get("last_updated") or balance_data.get("updated_at")
        if isinstance(last_updated_str, str):
            try:
                last_updated = datetime.fromisoformat(last_updated_str.replace('Z', '+00:00'))
            except:
                last_updated = datetime.utcnow()
        else:
            last_updated = datetime.utcnow()
        
        balance = Balance(
            account_id=account.id,
            available_balance=float(available_balance) if available_balance is not None else None,
            current_balance=float(current_balance) if current_balance is not None else None,
            currency=balance_data.get("currency", account.currency),
            last_updated=last_updated
        )
        
        db.add(balance)
        db.commit()
        db.refresh(balance)
        
        return balance
    
    def sync_balances(
        self,
        db: Session,
        account: Account,
        access_token: str
    ) -> Balance:
        """
        Sync balance for an account
        
        Args:
            db: Database session
            account: Account model instance
            access_token: Valid access token
            
        Returns:
            Latest Balance instance
        """
        balance_data = self.fetch_account_balance(access_token, account.external_account_id)
        return self.save_balance(db, account, balance_data)
    
    def sync_all_balances(
        self,
        db: Session,
        accounts: List[Account],
        access_token: str
    ) -> List[Balance]:
        """
        Sync balances for multiple accounts
        
        Args:
            db: Database session
            accounts: List of Account instances
            access_token: Valid access token
            
        Returns:
            List of Balance instances
        """
        balances = []
        for account in accounts:
            try:
                balance = self.sync_balances(db, account, access_token)
                balances.append(balance)
            except Exception as e:
                print(f"Failed to sync balance for account {account.internal_account_id}: {str(e)}")
                continue
        
        return balances
    
    def get_latest_balance(self, db: Session, account_id: int) -> Optional[Balance]:
        """Get the most recent balance for an account"""
        return db.query(Balance).filter(
            Balance.account_id == account_id
        ).order_by(Balance.last_updated.desc()).first()
