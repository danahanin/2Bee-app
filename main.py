"""
Main application entry point
Example usage of Open Finance integration
"""
from datetime import datetime, timedelta
from database import init_db, get_db
from connection_manager import ConnectionManager
from models import Connection, Account, Transaction, Balance


def example_usage():
    """Example of how to use the Open Finance integration"""
    
    # Initialize database
    init_db()
    
    # Initialize connection manager
    manager = ConnectionManager()
    
    # Get database session
    db = next(get_db())
    
    try:
        # Step 1: Create connection and get authorization URL
        print("Step 1: Creating connection...")
        connection_data = manager.create_connection(
            db=db,
            user_id="user_123",
            permissions=["accounts", "balances", "transactions"]
        )
        
        print(f"Connection created: {connection_data['connection_id']}")
        print(f"Authorization URL: {connection_data['authorization_url']}")
        print("\nPlease redirect user to the authorization URL above")
        print("After user authorizes, you'll receive an authorization_code")
        
        # Step 2: Complete connection (after user authorizes)
        # authorization_code = "code_from_callback"
        # connection = manager.complete_connection(
        #     db=db,
        #     consent_id=connection_data['consent_id'],
        #     authorization_code=authorization_code
        # )
        # print(f"Connection completed: {connection.id}")
        
        # Step 3: Sync all data
        # from_date = datetime.utcnow() - timedelta(days=90)
        # to_date = datetime.utcnow()
        # 
        # sync_stats = manager.sync_all_data(
        #     db=db,
        #     connection=connection,
        #     from_date=from_date,
        #     to_date=to_date
        # )
        # print(f"Sync completed: {sync_stats}")
        
        # Step 4: Query accounts
        # connection = db.query(Connection).filter(
        #     Connection.user_id == "user_123"
        # ).first()
        # 
        # accounts = manager.accounts_manager.get_connection_accounts(
        #     db=db,
        #     connection_id=connection.id
        # )
        # print(f"Found {len(accounts)} accounts")
        
        # Step 5: Query transactions
        # for account in accounts:
        #     transactions = manager.transactions_manager.get_transactions(
        #         db=db,
        #         account_id=account.id,
        #         from_date=from_date,
        #         to_date=to_date,
        #         limit=10
        #     )
        #     print(f"Account {account.internal_account_id}: {len(transactions)} transactions")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    example_usage()
