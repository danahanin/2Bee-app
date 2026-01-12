# מדריך שימוש Bee Open Finance Integration


#### שלב 1: אתחול מסד הנתונים
```python
from database import init_db
init_db()  
```

#### שלב 2: יצירת חיבור חדש
```python
from connection_manager import ConnectionManager
from database import get_db

manager = ConnectionManager()
db = next(get_db())

# יצירת חיבור חדש
connection_data = manager.create_connection(
    db=db,
    user_id="user_123",  # מזהה המשתמש שלך
    permissions=["accounts", "balances", "transactions"]
)

print(f"Authorization URL: {connection_data['authorization_url']}")
# הפנה את המשתמש ל-כתובת הזאת כדי לאשר את הגישה
```

#### שלב 3: השלמת החיבור (אחרי שהמשתמש מאשר)
```python
# לאחר שהמשתמש מאשר, תקבל authorization_code מה-callback
connection = manager.complete_connection(
    db=db,
    consent_id=connection_data['consent_id'],
    authorization_code="code_from_callback"
)
```

#### שלב 4: סנכרון נתונים
```python
from datetime import datetime, timedelta

# סנכרון כל הנתונים 
from_date = datetime.utcnow() - timedelta(days=90) 
to_date = datetime.utcnow()

sync_stats = manager.sync_all_data(
    db=db,
    connection=connection,
    from_date=from_date,
    to_date=to_date
)

print(f"Accounts synced: {sync_stats['accounts_synced']}")
print(f"Balances synced: {sync_stats['balances_synced']}")
print(f"Transactions: {sync_stats['transactions']}")
```

#### שלב 5: שליפת נתונים
```python
accounts = manager.accounts_manager.get_connection_accounts(
    db=db,
    connection_id=connection.id
)

for account in accounts:
    print(f"Account: {account.internal_account_id} - {account.account_name}")
    
    balance = manager.balances_manager.get_latest_balance(db, account.id)
    if balance:
        print(f"  Balance: {balance.current_balance} {balance.currency}")
    
    transactions = manager.transactions_manager.get_transactions(
        db=db,
        account_id=account.id,
        from_date=from_date,
        to_date=to_date,
        limit=10
    )
    print(f"  Transactions: {len(transactions)}")
```

### אפשרות 2: שימוש עם FastAPI (REST API)

#### הפעלת השרת:
```bash
cd /Users/user/tobee/2Bee-app
python3 -m uvicorn app:app --reload
```

השרת יפעל על: `http://localhost:8000`

#### תיעוד API:
פתח בדפדפן: `http://localhost:8000/docs`

#### דוגמאות API Calls:

**1. יצירת חיבור חדש:**
```bash
curl -X POST "http://localhost:8000/api/connections" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "permissions": ["accounts", "balances", "transactions"]
  }'
```

**2. סנכרון נתונים:**
```bash
curl -X POST "http://localhost:8000/api/connections/1/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "from_date": "2024-01-01",
    "to_date": "2024-12-31"
  }'
```

**3. קבלת חשבונות:**
```bash
curl "http://localhost:8000/api/connections/1/accounts"
```

**4. קבלת תנועות:**
```bash
curl "http://localhost:8000/api/accounts/1/transactions?from_date=2024-01-01&to_date=2024-12-31&limit=50"
```

##  תהליך העבודה המלא

### 1. יצירת Consent והרשאה
- המערכת יוצרת Consent עם Open Finance
- מקבלים `authorization_url`
- מפנים את המשתמש ל-URL הזה
- המשתמש מאשר בבנק שלו
- המשתמש מופנה חזרה ל-`callback` עם `authorization_code`

### 2. השלמת החיבור
- מחליפים את ה-`authorization_code` ב-access token ו-refresh token
- הטוקנים נשמרים במסד הנתונים
- החיבור מוכן לשימוש

### 3. סנכרון נתונים
- **חשבונות**: נשלפים ונשמרים עם `internal_account_id` יציב
- **יתרות**: נשלפות ונשמרות עם תאריך עדכון
- **תנועות**: נשלפות עם pagination אוטומטי, נבדקות ל-deduplication

### 4. ניהול טוקנים
- המערכת בודקת אוטומטית אם הטוקן פג תוקף
- אם כן, משתמשת ב-refresh token לחידוש אוטומטי
- אין צורך לטפל בזה ידנית

## 🔍 בדיקת תקינות

הרץ את סקריפט הבדיקה:
```bash
python3 test_connection.py
```

זה יבדוק:
-  שהטוקנים נטענו נכון
-  שהלקוח API מוכן
-  שמסד הנתונים עובד
-  שההגדרות תקינות

## פתרון בעיות

### בעיה: "Missing required configuration"
**פתרון**: ודא שקובץ `.env` קיים בתיקיית הפרויקט וכל הערכים מוגדרים

### בעיה: "Failed to create consent"
**פתרון**: 
- ודא שהטוקנים נכונים ב-`.env`
- בדוק שה-API endpoint נכון
- ודא שה-`redirect_uri` תואם למה שהוגדר ב-Open Finance

### בעיה: "Token expired"
**פתרון**: המערכת אמורה לחדש אוטומטית. אם לא, נסה ליצור חיבור חדש


