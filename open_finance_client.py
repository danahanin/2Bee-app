"""
Open Finance API Client
Base client for interacting with Open Finance API
"""
import requests
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from config import config


class OpenFinanceAPIError(Exception):
    """Custom exception for Open Finance API errors"""
    pass


class OpenFinanceClient:
    """Base client for Open Finance API interactions"""
    
    def __init__(
        self,
        base_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None
    ):
        self.base_url = base_url or config.OPEN_FINANCE_API_BASE_URL
        self.client_id = client_id or config.OPEN_FINANCE_CLIENT_ID
        self.client_secret = client_secret or config.OPEN_FINANCE_CLIENT_SECRET
        
    def _get_headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        """Get request headers"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        return headers
    
    def _request(
        self,
        method: str,
        endpoint: str,
        access_token: Optional[str] = None,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make API request"""
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers(access_token)
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP Error: {e.response.status_code}"
            try:
                error_data = e.response.json()
                error_msg += f" - {error_data}"
            except:
                error_msg += f" - {e.response.text}"
            raise OpenFinanceAPIError(error_msg) from e
        except requests.exceptions.RequestException as e:
            raise OpenFinanceAPIError(f"Request failed: {str(e)}") from e
    
    def get(self, endpoint: str, access_token: Optional[str] = None, params: Optional[Dict] = None) -> Dict[str, Any]:
        """GET request"""
        return self._request("GET", endpoint, access_token=access_token, params=params)
    
    def post(self, endpoint: str, data: Dict, access_token: Optional[str] = None) -> Dict[str, Any]:
        """POST request"""
        return self._request("POST", endpoint, access_token=access_token, data=data)
    
    def put(self, endpoint: str, data: Dict, access_token: Optional[str] = None) -> Dict[str, Any]:
        """PUT request"""
        return self._request("PUT", endpoint, access_token=access_token, data=data)
    
    def delete(self, endpoint: str, access_token: Optional[str] = None) -> Dict[str, Any]:
        """DELETE request"""
        return self._request("DELETE", endpoint, access_token=access_token)
