"""
Database models for storing Open Finance data
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, 
    Text, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Connection(Base):
    """Stores connection/consent information"""
    __tablename__ = "connections"
    
    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    
    # Token information
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    
    # Connection metadata
    bank_name = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending, active, revoked
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    accounts = relationship("Account", back_populates="connection", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="connection", cascade="all, delete-orphan")


class Account(Base):
    """Stores account information with stable internal mapping"""
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("connections.id"), nullable=False)
    
    # Open Finance account ID (external)
    external_account_id = Column(String, nullable=False)
    
    # Internal stable mapping
    internal_account_id = Column(String, unique=True, nullable=False, index=True)
    
    # Account details
    account_type = Column(String, nullable=False)  # checking, savings, credit_card
    account_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    currency = Column(String, default="ILS")
    
    # Status
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    connection = relationship("Connection", back_populates="accounts")
    balances = relationship("Balance", back_populates="account", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('connection_id', 'external_account_id', name='uq_connection_external_account'),
    )


class Balance(Base):
    """Stores account balances"""
    __tablename__ = "balances"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    
    # Balance values
    available_balance = Column(Float, nullable=True)
    current_balance = Column(Float, nullable=True)
    currency = Column(String, default="ILS")
    
    # Metadata
    last_updated = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    account = relationship("Account", back_populates="balances")
    
    __table_args__ = (
        Index('idx_account_last_updated', 'account_id', 'last_updated'),
    )


class Transaction(Base):
    """Stores transaction data with deduplication support"""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("connections.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    
    # External transaction ID for deduplication
    external_transaction_id = Column(String, nullable=False, index=True)
    
    # Transaction details
    amount = Column(Float, nullable=False)
    currency = Column(String, default="ILS")
    description = Column(Text, nullable=True)
    merchant_name = Column(String, nullable=True)
    transaction_date = Column(DateTime, nullable=False, index=True)
    value_date = Column(DateTime, nullable=True)
    
    # Status
    status = Column(String, nullable=False)  # pending, completed, cancelled, etc.
    
    # Additional metadata
    category = Column(String, nullable=True)
    reference_number = Column(String, nullable=True)
    
    # Sync metadata
    synced_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    connection = relationship("Connection", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    
    __table_args__ = (
        UniqueConstraint('account_id', 'external_transaction_id', name='uq_account_transaction'),
        Index('idx_transaction_date', 'account_id', 'transaction_date'),
        Index('idx_synced_at', 'account_id', 'synced_at'),
    )
