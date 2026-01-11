"""
FastAPI application for Open Finance integration
Provides REST API endpoints for managing connections and data
"""
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel

from database import init_db, get_db
from connection_manager import ConnectionManager
from models import Connection, Account, Transaction, Balance

app = FastAPI(title="2Bee Open Finance Integration", version="1.0.0")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

manager = ConnectionManager()


# Pydantic models for request/response
class CreateConnectionRequest(BaseModel):
    user_id: str
    permissions: Optional[list] = None


class CompleteConnectionRequest(BaseModel):
    consent_id: str
    authorization_code: str


class SyncRequest(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None


# API Endpoints

@app.post("/api/connections")
async def create_connection(
    request: CreateConnectionRequest,
    db: Session = Depends(get_db)
):
    """Create a new connection and get authorization URL"""
    try:
        result = manager.create_connection(
            db=db,
            user_id=request.user_id,
            permissions=request.permissions
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/callback")
async def oauth_callback(
    code: str = Query(..., description="Authorization code"),
    consent_id: Optional[str] = Query(None, description="Consent ID"),
    db: Session = Depends(get_db)
):
    """OAuth callback endpoint"""
    if not consent_id:
        raise HTTPException(status_code=400, detail="consent_id is required")
    
    try:
        connection = manager.complete_connection(
            db=db,
            consent_id=consent_id,
            authorization_code=code
        )
        return {
            "status": "success",
            "connection_id": connection.id,
            "message": "Connection completed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/connections/{connection_id}/sync")
async def sync_connection_data(
    connection_id: int,
    request: SyncRequest,
    db: Session = Depends(get_db)
):
    """Sync all data for a connection"""
    connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    try:
        from_date = datetime.combine(request.from_date, datetime.min.time()) if request.from_date else None
        to_date = datetime.combine(request.to_date, datetime.max.time()) if request.to_date else None
        
        stats = manager.sync_all_data(
            db=db,
            connection=connection,
            from_date=from_date,
            to_date=to_date
        )
        return stats
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/connections/{connection_id}/accounts")
async def get_connection_accounts(
    connection_id: int,
    db: Session = Depends(get_db)
):
    """Get all accounts for a connection"""
    connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    accounts = manager.accounts_manager.get_connection_accounts(db, connection_id)
    return {
        "accounts": [
            {
                "id": acc.id,
                "internal_account_id": acc.internal_account_id,
                "external_account_id": acc.external_account_id,
                "type": acc.account_type,
                "name": acc.account_name,
                "currency": acc.currency
            }
            for acc in accounts
        ]
    }


@app.get("/api/accounts/{account_id}/balances")
async def get_account_balances(
    account_id: int,
    db: Session = Depends(get_db)
):
    """Get latest balance for an account"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    balance = manager.balances_manager.get_latest_balance(db, account_id)
    if not balance:
        raise HTTPException(status_code=404, detail="No balance found")
    
    return {
        "account_id": account.internal_account_id,
        "available_balance": balance.available_balance,
        "current_balance": balance.current_balance,
        "currency": balance.currency,
        "last_updated": balance.last_updated.isoformat()
    }


@app.get("/api/accounts/{account_id}/transactions")
async def get_account_transactions(
    account_id: int,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    limit: Optional[int] = Query(100),
    db: Session = Depends(get_db)
):
    """Get transactions for an account"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    from_dt = datetime.combine(from_date, datetime.min.time()) if from_date else None
    to_dt = datetime.combine(to_date, datetime.max.time()) if to_date else None
    
    transactions = manager.transactions_manager.get_transactions(
        db=db,
        account_id=account_id,
        from_date=from_dt,
        to_date=to_dt,
        limit=limit
    )
    
    return {
        "account_id": account.internal_account_id,
        "transactions": [
            {
                "id": txn.id,
                "amount": txn.amount,
                "currency": txn.currency,
                "description": txn.description,
                "merchant_name": txn.merchant_name,
                "transaction_date": txn.transaction_date.isoformat(),
                "status": txn.status,
                "category": txn.category
            }
            for txn in transactions
        ]
    }


@app.delete("/api/connections/{connection_id}")
async def revoke_connection(
    connection_id: int,
    db: Session = Depends(get_db)
):
    """Revoke a connection"""
    connection = db.query(Connection).filter(Connection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    try:
        manager.revoke_connection(db=db, connection=connection)
        return {"status": "success", "message": "Connection revoked"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "2Bee Open Finance Integration API",
        "version": "1.0.0",
        "docs": "/docs"
    }
