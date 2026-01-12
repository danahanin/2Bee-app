"""
Consent & Authentication Module
Handles OAuth2 flow, token management, and consent creation
"""
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from open_finance_client import OpenFinanceClient, OpenFinanceAPIError
from config import config


class AuthManager:
    """Manages authentication and consent flow"""
    
    def __init__(self, client: Optional[OpenFinanceClient] = None):
        self.client = client or OpenFinanceClient()
    
    def create_consent(
        self,
        user_id: str,
        permissions: Optional[list] = None,
        redirect_uri: Optional[str] = None
    ) -> Dict:
        """
        Create a new consent for accessing user's financial data
        
        Args:
            user_id: Internal user identifier
            permissions: List of requested permissions (e.g., ['accounts', 'transactions', 'balances'])
            redirect_uri: Callback URI after bank authentication
            
        Returns:
            Dict containing consent_id and authorization_url
        """
        if permissions is None:
            permissions = ["accounts", "balances", "transactions"]
        
        redirect_uri = redirect_uri or config.OPEN_FINANCE_REDIRECT_URI
        
        data = {
            "user_id": user_id,
            "permissions": permissions,
            "redirectUri": redirect_uri,
            "clientId": self.client.client_id,
            "clientSecret": self.client.client_secret
        }
        
        try:
            response = self.client.post("/api/v1/consents", data=data)
            return {
                "consent_id": response.get("consentId") or response.get("consent_id"),
                "authorization_url": response.get("authorizationUrl") or response.get("authorization_url"),
                "expires_in": response.get("expiresIn") or response.get("expires_in", 3600)
            }
        except OpenFinanceAPIError as e:
            raise Exception(f"Failed to create consent: {str(e)}") from e
    
    def get_access_token(self, user_id: str) -> Dict:
        """
        Get an access token using client credentials (as per Open Finance example)
        
        Args:
            user_id: User identifier
            
        Returns:
            Dict containing access_token, expires_in, etc.
        """
        data = {
            "clientId": self.client.client_id,
            "clientSecret": self.client.client_secret,
            "userId": user_id
        }
        
        try:
            response = self.client.post("/oauth/token", data=data)
            return {
                "access_token": response.get("accessToken") or response.get("access_token"),
                "expires_in": response.get("expiresIn") or response.get("expires_in", 86400),
                "token_type": response.get("tokenType") or response.get("token_type", "Bearer"),
                "scope": response.get("scope")
            }
        except OpenFinanceAPIError as e:
            raise Exception(f"Failed to get access token: {str(e)}") from e
    
    def get_authorization_url(self, consent_id: str) -> str:
        """
        Get authorization URL for redirecting user to bank
        
        Args:
            consent_id: The consent ID from create_consent
            
        Returns:
            Authorization URL
        """
        try:
            data = {
                "clientId": self.client.client_id,
                "clientSecret": self.client.client_secret
            }
            response = self.client.post(f"/api/v1/consents/{consent_id}/authorize", data=data)
            return response.get("authorizationUrl") or response.get("authorization_url")
        except OpenFinanceAPIError as e:
            raise Exception(f"Failed to get authorization URL: {str(e)}") from e
    
    def exchange_code_for_tokens(
        self,
        authorization_code: str,
        consent_id: Optional[str] = None
    ) -> Dict:
        """
        Exchange authorization code for access and refresh tokens
        
        Args:
            authorization_code: Code received from callback
            consent_id: Optional consent ID
            
        Returns:
            Dict containing access_token, refresh_token, expires_in, etc.
        """
        data = {
            "grant_type": "authorization_code",
            "code": authorization_code,
            "redirect_uri": config.OPEN_FINANCE_REDIRECT_URI,
            "client_id": self.client.client_id,
            "client_secret": self.client.client_secret
        }
        
        if consent_id:
            data["consent_id"] = consent_id
        
        try:
            token_data = {
                "grant_type": "authorization_code",
                "code": authorization_code,
                "redirectUri": config.OPEN_FINANCE_REDIRECT_URI,
                "clientId": self.client.client_id,
                "clientSecret": self.client.client_secret
            }
            if consent_id:
                token_data["consentId"] = consent_id  
            response = self.client.post("/oauth/token", data=token_data)

            return {
                "access_token": response.get("accessToken") or response.get("access_token"),
                "refresh_token": response.get("refreshToken") or response.get("refresh_token"),
                "expires_in": response.get("expiresIn") or response.get("expires_in", 3600),
                "token_type": response.get("tokenType") or response.get("token_type", "Bearer"),
                "scope": response.get("scope")
            }
        except OpenFinanceAPIError as e:
            raise Exception(f"Failed to exchange code for tokens: {str(e)}") from e
    
    def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: The refresh token
            
        Returns:
            Dict containing new access_token, refresh_token, expires_in
        """
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.client.client_id,
            "client_secret": self.client.client_secret
        }
        
        try:
            token_data = {
                "grant_type": "refresh_token",
                "refreshToken": refresh_token,
                "clientId": self.client.client_id,
                "clientSecret": self.client.client_secret
            }
            response = self.client.post("/oauth/token", data=token_data)
            return {
                "access_token": response.get("accessToken") or response.get("access_token"),
                "refresh_token": response.get("refreshToken") or refresh_token, 
                "expires_in": response.get("expiresIn") or response.get("expires_in", 3600),
                "token_type": response.get("tokenType") or response.get("token_type", "Bearer")
            }
        except OpenFinanceAPIError as e:
            raise Exception(f"Failed to refresh token: {str(e)}") from e
    
    def revoke_token(self, token: str, token_type: str = "access_token") -> bool:
        """
        Revoke an access or refresh token
        
        Args:
            token: The token to revoke
            token_type: 'access_token' or 'refresh_token'
            
        Returns:
            True if successful
        """
        data = {
            "token": token,
            "token_type_hint": token_type,
            "client_id": self.client.client_id,
            "client_secret": self.client.client_secret
        }
        
        try:
            revoke_data = {
                "token": token,
                "tokenTypeHint": token_type,
                "clientId": self.client.client_id,
                "clientSecret": self.client.client_secret
            }
            self.client.post("/api/v1/oauth/revoke", data=revoke_data)
            return True
        except OpenFinanceAPIError as e:
            raise Exception(f"Failed to revoke token: {str(e)}") from e
    
    def is_token_expired(self, expires_at: Optional[datetime]) -> bool:
        """Check if token is expired or will expire soon (within 5 minutes)"""
        if expires_at is None:
            return True
        return datetime.utcnow() >= (expires_at - timedelta(minutes=5))
    
    def calculate_expires_at(self, expires_in: int) -> datetime:
        """Calculate expiration datetime from expires_in seconds"""
        return datetime.utcnow() + timedelta(seconds=expires_in)
