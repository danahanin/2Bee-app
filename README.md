# 2Bee - Open Finance Integration

פרויקט לניהול חיבורים ל-Open Finance API עם כל הפונקציות הנדרשות.

## תכונות

### 1. Consent & Authentication
- יצירת Consent (אישור גישה לנתונים)
- Redirect למסך הבנק + חזרה (callback)
- החלפת authorization code ל-access/refresh tokens
- חידוש טוקנים (refresh), ניהול תוקף, revoke

### 2. Accounts (רשימת חשבונות)
- שליפת רשימת חשבונות של המשתמש (עו"ש/כרטיס/חסכונות אם נתמך)
- מזהי חשבון יציבים (mapping פנימי)

### 3. Balances (יתרות)
- שליפת יתרות (available/current)
- תאריך עדכון אחרון

### 4. Transactions (תנועות / היסטוריה)
- שליפת תנועות לפי טווח תאריכים
- Pagination אוטומטי
- שדות: תיאור/בית עסק/מטבע/סכום/תאריך/סטטוס
- דה-דופליקציה (כדי שלא תכפילי תנועות בסנכרון חוזר)

## התקנה

1. התקן את התלויות:
```bash
# ב-macOS/Linux:
pip3 install -r requirements.txt

# או ב-Windows:
pip install -r requirements.txt
```

2. העתק את קובץ ההגדרות:
```bash
cp .env.example .env
```

3. עדכן את קובץ `.env` עם הפרטים שלך:
```env
OPEN_FINANCE_API_BASE_URL=https://api.open-finance.ai
OPEN_FINANCE_CLIENT_ID=your_client_id_here
OPEN_FINANCE_CLIENT_SECRET=your_client_secret_here
OPEN_FINANCE_REDIRECT_URI=http://localhost:8000/callback
```

## שימוש

### שימוש בסיסי (Python)

```python
from database import init_db, get_db
from connection_manager import ConnectionManager

# אתחול מסד הנתונים
init_db()

# יצירת מנהל חיבורים
manager = ConnectionManager()
db = next(get_db())

# יצירת חיבור חדש
connection_data = manager.create_connection(
    db=db,
    user_id="user_123",
    permissions=["accounts", "balances", "transactions"]
)

# קבלת URL להרשאה
authorization_url = connection_data['authorization_url']
# הפנה את המשתמש ל-URL הזה

# לאחר שהמשתמש מאשר, השלם את החיבור
connection = manager.complete_connection(
    db=db,
    consent_id=connection_data['consent_id'],
    authorization_code="code_from_callback"
)

# סנכרון כל הנתונים
sync_stats = manager.sync_all_data(
    db=db,
    connection=connection,
    from_date=datetime.utcnow() - timedelta(days=90),
    to_date=datetime.utcnow()
)
```

### שימוש עם FastAPI

הפעל את השרת:
```bash
uvicorn app:app --reload
```

השרת יפעל על `http://localhost:8000`

תיעוד API זמין ב: `http://localhost:8000/docs`

#### דוגמאות API:

**יצירת חיבור:**
```bash
POST /api/connections
{
  "user_id": "user_123",
  "permissions": ["accounts", "balances", "transactions"]
}
```

**סנכרון נתונים:**
```bash
POST /api/connections/{connection_id}/sync
{
  "from_date": "2024-01-01",
  "to_date": "2024-12-31"
}
```

**קבלת חשבונות:**
```bash
GET /api/connections/{connection_id}/accounts
```

**קבלת תנועות:**
```bash
GET /api/accounts/{account_id}/transactions?from_date=2024-01-01&to_date=2024-12-31
```

## מבנה הפרויקט

```
tobee/
├── config.py                 # ניהול הגדרות
├── models.py                 # מודלים של מסד הנתונים
├── database.py               # אתחול מסד נתונים
├── open_finance_client.py   # לקוח API בסיסי
├── auth.py                   # מודול Consent & Authentication
├── accounts.py               # מודול Accounts
├── balances.py               # מודול Balances
├── transactions.py           # מודול Transactions עם deduplication
├── connection_manager.py     # מנהל חיבורים ברמה גבוהה
├── main.py                   # דוגמאות שימוש
├── app.py                    # FastAPI application
├── requirements.txt          # תלויות Python
└── README.md                 # תיעוד
```

## מסד נתונים

הפרויקט משתמש ב-SQLite כברירת מחדל (ניתן לשנות ל-PostgreSQL/MySQL).

הטבלאות:
- `connections` - מידע על חיבורים וטוקנים
- `accounts` - חשבונות עם mapping פנימי יציב
- `balances` - יתרות חשבונות
- `transactions` - תנועות עם deduplication

## הערות חשובות

1. **טוקנים**: הטוקנים נשמרים במסד הנתונים. הפרויקט מטפל בחידוש טוקנים אוטומטית.

2. **Deduplication**: התנועות נבדקות לפי `external_transaction_id` כדי למנוע כפילויות.

3. **Mapping פנימי**: כל חשבון מקבל `internal_account_id` יציב שמאפשר לך לשמור על מזהים קבועים גם אם המזהים החיצוניים משתנים.

4. **Pagination**: מודול התנועות מטפל ב-pagination אוטומטית ומביא את כל התנועות.

## רישיון

פרויקט זה נוצר עבור 2Bee.
