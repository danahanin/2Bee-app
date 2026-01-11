"""
Transactions Module
Handles fetching transactions with pagination and deduplication
"""
from typing import List, Dict, Optional
from datetime import datetime, date
from dateutil import parser as date_parser
from open_finance_client import OpenFinanceClient, OpenFinanceAPIError
from models import Account, Transaction, Connection
from sqlalchemy.orm import Session
from sqlalchemy import and_


class TransactionsManager:
    """Manages transaction operations with deduplication"""
    
    def __init__(self, client: Optional[OpenFinanceClient] = None):
        self.client = client or OpenFinanceClient()
    
    def fetch_transactions(
        self,
        access_token: str,
        account_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        page: int = 1,
        page_size: int = 100
    ) -> Dict:
        """
        Fetch transactions for an account with pagination
        
        Args:
            access_token: Valid access token
            account_id: External account ID
            from_date: Start date for transaction range
            to_date: End date for transaction range
            page: Page number (1-indexed)
            page_size: Number of transactions per page
            
        Returns:
            Dict containing transactions and pagination info
        """
        params = {
            "page": page,
            "page_size": page_size
        }
        
        if from_date:
            params["from_date"] = from_date.isoformat()
        if to_date:
            params["to_date"] = to_date.isoformat()
        
        try:
            response = self.client.get(
                f"/api/v1/accounts/{account_id}/transactions",
                access_token=access_token,
                params=params
            )
            return response
        except OpenFinanceAPIError as e:
            raise Exception(f"Failed to fetch transactions: {str(e)}") from e
    
    def fetch_all_transactions_paginated(
        self,
        access_token: str,
        account_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        max_pages: Optional[int] = None
    ) -> List[Dict]:
        """
        Fetch all transactions with automatic pagination
        
        Args:
            access_token: Valid access token
            account_id: External account ID
            from_date: Start date for transaction range
            to_date: End date for transaction range
            max_pages: Maximum number of pages to fetch (None for all)
            
        Returns:
            List of all transaction dictionaries
        """
        all_transactions = []
        page = 1
        
        while True:
            if max_pages and page > max_pages:
                break
            
            response = self.fetch_transactions(
                access_token=access_token,
                account_id=account_id,
                from_date=from_date,
                to_date=to_date,
                page=page,
                page_size=100
            )
            
            transactions = response.get("transactions", [])
            if not transactions:
                break
            
            all_transactions.extend(transactions)
            
            # Check if there are more pages
            pagination = response.get("pagination", {})
            total_pages = pagination.get("total_pages", 1)
            if page >= total_pages:
                break
            
            page += 1
        
        return all_transactions
    
    def parse_transaction_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse transaction date string to datetime"""
        if not date_str:
            return None
        
        try:
            return date_parser.parse(date_str)
        except:
            return None
    
    def normalize_transaction_data(self, transaction_data: Dict) -> Dict:
        """
        Normalize transaction data from API to standard format
        
        Args:
            transaction_data: Raw transaction data from API
            
        Returns:
            Normalized transaction data
        """
        # Handle different API response formats
        external_id = (
            transaction_data.get("id") or
            transaction_data.get("transaction_id") or
            transaction_data.get("reference")
        )
        
        amount = transaction_data.get("amount") or transaction_data.get("value")
        if isinstance(amount, str):
            amount = float(amount.replace(",", ""))
        
        description = (
            transaction_data.get("description") or
            transaction_data.get("details") or
            transaction_data.get("memo") or
            ""
        )
        
        merchant_name = (
            transaction_data.get("merchant_name") or
            transaction_data.get("merchant") or
            transaction_data.get("counterparty_name")
        )
        
        transaction_date = self.parse_transaction_date(
            transaction_data.get("transaction_date") or
            transaction_data.get("date") or
            transaction_data.get("booking_date")
        )
        
        value_date = self.parse_transaction_date(
            transaction_data.get("value_date") or
            transaction_data.get("valueDate")
        )
        
        status = (
            transaction_data.get("status") or
            transaction_data.get("transaction_status") or
            "completed"
        )
        
        return {
            "external_transaction_id": external_id,
            "amount": float(amount) if amount is not None else 0.0,
            "currency": transaction_data.get("currency", "ILS"),
            "description": description,
            "merchant_name": merchant_name,
            "transaction_date": transaction_date or datetime.utcnow(),
            "value_date": value_date,
            "status": status.lower(),
            "category": transaction_data.get("category"),
            "reference_number": transaction_data.get("reference_number") or transaction_data.get("reference")
        }
    
    def is_transaction_duplicate(
        self,
        db: Session,
        account_id: int,
        external_transaction_id: str
    ) -> bool:
        """Check if transaction already exists (deduplication)"""
        existing = db.query(Transaction).filter(
            and_(
                Transaction.account_id == account_id,
                Transaction.external_transaction_id == external_transaction_id
            )
        ).first()
        return existing is not None
    
    def save_transaction(
        self,
        db: Session,
        account: Account,
        connection: Connection,
        transaction_data: Dict
    ) -> Optional[Transaction]:
        """
        Save transaction to database (with deduplication)
        
        Args:
            db: Database session
            account: Account model instance
            connection: Connection model instance
            transaction_data: Normalized transaction data
            
        Returns:
            Transaction instance if saved, None if duplicate
        """
        external_id = transaction_data["external_transaction_id"]
        
        # Check for duplicates
        if self.is_transaction_duplicate(db, account.id, external_id):
            return None
        
        transaction = Transaction(
            connection_id=connection.id,
            account_id=account.id,
            external_transaction_id=external_id,
            amount=transaction_data["amount"],
            currency=transaction_data["currency"],
            description=transaction_data["description"],
            merchant_name=transaction_data["merchant_name"],
            transaction_date=transaction_data["transaction_date"],
            value_date=transaction_data["value_date"],
            status=transaction_data["status"],
            category=transaction_data.get("category"),
            reference_number=transaction_data.get("reference_number"),
            synced_at=datetime.utcnow()
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        return transaction
    
    def sync_transactions(
        self,
        db: Session,
        account: Account,
        connection: Connection,
        access_token: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> Dict[str, int]:
        """
        Sync transactions for an account with deduplication
        
        Args:
            db: Database session
            account: Account model instance
            connection: Connection model instance
            access_token: Valid access token
            from_date: Start date for transaction range
            to_date: End date for transaction range
            
        Returns:
            Dict with 'total', 'new', 'duplicates' counts
        """
        # Fetch all transactions
        transactions_data = self.fetch_all_transactions_paginated(
            access_token=access_token,
            account_id=account.external_account_id,
            from_date=from_date,
            to_date=to_date
        )
        
        stats = {
            "total": len(transactions_data),
            "new": 0,
            "duplicates": 0
        }
        
        for transaction_data in transactions_data:
            normalized = self.normalize_transaction_data(transaction_data)
            
            if not normalized["external_transaction_id"]:
                continue
            
            saved = self.save_transaction(db, account, connection, normalized)
            
            if saved:
                stats["new"] += 1
            else:
                stats["duplicates"] += 1
        
        return stats
    
    def get_transactions(
        self,
        db: Session,
        account_id: int,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        limit: Optional[int] = None
    ) -> List[Transaction]:
        """Get transactions from database"""
        query = db.query(Transaction).filter(Transaction.account_id == account_id)
        
        if from_date:
            query = query.filter(Transaction.transaction_date >= from_date)
        if to_date:
            query = query.filter(Transaction.transaction_date <= to_date)
        
        query = query.order_by(Transaction.transaction_date.desc())
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
