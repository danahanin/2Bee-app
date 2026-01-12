"""
Test script to verify Open Finance API connection
"""
import sys
from config import config
from open_finance_client import OpenFinanceClient
from database import init_db

def test_config():
    """Test that configuration is loaded correctly"""
    print("=" * 50)
    print("Testing Configuration...")
    print("=" * 50)
    
    print(f"API Base URL: {config.OPEN_FINANCE_API_BASE_URL}")
    print(f"Client ID: {config.OPEN_FINANCE_CLIENT_ID[:20]}..." if config.OPEN_FINANCE_CLIENT_ID else "Client ID: NOT SET")
    print(f"Client Secret: {'*' * 20}..." if config.OPEN_FINANCE_CLIENT_SECRET else "Client Secret: NOT SET")
    print(f"Redirect URI: {config.OPEN_FINANCE_REDIRECT_URI}")
    
    if not config.validate():
        print("\n❌ ERROR: Missing required configuration!")
        print("Please check your .env file")
        return False
    
    print("\n✅ Configuration loaded successfully!")
    return True

def test_client_initialization():
    """Test that the API client can be initialized"""
    print("\n" + "=" * 50)
    print("Testing API Client Initialization...")
    print("=" * 50)
    
    try:
        client = OpenFinanceClient()
        print(f"✅ Client initialized successfully")
        print(f"   Base URL: {client.base_url}")
        print(f"   Client ID: {client.client_id[:20]}..." if client.client_id else "   Client ID: None")
        print(f"   Client Secret: {'*' * 20}..." if client.client_secret else "   Client Secret: None")
        return True
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize client: {str(e)}")
        return False

def test_database():
    """Test database initialization"""
    print("\n" + "=" * 50)
    print("Testing Database...")
    print("=" * 50)
    
    try:
        init_db()
        print("✅ Database initialized successfully")
        return True
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize database: {str(e)}")
        return False

def test_api_connection():
    """Test basic API connection (without authentication)"""
    print("\n" + "=" * 50)
    print("Testing API Connection...")
    print("=" * 50)
    
    try:
        client = OpenFinanceClient()
        print("⚠️  Note: Most Open Finance endpoints require authentication.")
        print("   This test only verifies the client is configured correctly.")
        print("   To fully test, you'll need to create a consent and authenticate.")
        return True
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("\n" + "=" * 50)
    print("2Bee - Open Finance Connection Test")
    print("=" * 50 + "\n")
    
    results = []
    
    results.append(("Configuration", test_config()))
    

    if results[-1][1]:  # Only if config passed
        results.append(("Client Initialization", test_client_initialization()))
    results.append(("Database", test_database()))
    if results[0][1]:  # Only if config passed
        results.append(("API Connection", test_api_connection()))
    
    print("\n" + "=" * 50)
    print("Test Summary")
    print("=" * 50)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 All tests passed! Your configuration is ready.")
        print("\nNext steps:")
        print("1. Run: python3 main.py (to see example usage)")
        print("2. Or run: python3 -m uvicorn app:app --reload (to start the API server)")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
