"""
Configuration management for Open Finance integration
"""
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration"""
    
    # Open Finance API
    OPEN_FINANCE_API_BASE_URL: str = os.getenv(
        "OPEN_FINANCE_API_BASE_URL", 
        "https://api.open-finance.ai"
    )
    OPEN_FINANCE_CLIENT_ID: Optional[str] = os.getenv("OPEN_FINANCE_CLIENT_ID")
    OPEN_FINANCE_CLIENT_SECRET: Optional[str] = os.getenv("OPEN_FINANCE_CLIENT_SECRET")
    OPEN_FINANCE_REDIRECT_URI: str = os.getenv(
        "OPEN_FINANCE_REDIRECT_URI",
        "http://localhost:8000/callback"
    )
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./tobee.db")
    
    # Application
    APP_SECRET_KEY: str = os.getenv("APP_SECRET_KEY", "change-me-in-production")
    APP_HOST: str = os.getenv("APP_HOST", "0.0.0.0")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    
    @classmethod
    def validate(cls) -> bool:
        """Validate that required configuration is present"""
        required = [
            cls.OPEN_FINANCE_CLIENT_ID,
            cls.OPEN_FINANCE_CLIENT_SECRET,
        ]
        return all(required)


config = Config()
