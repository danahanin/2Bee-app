# שינויים שנעשו - התאמה ל-Open Finance API

## מה תוקן:

### 1. Headers - שינוי ל-lowercase
- **לפני**: `"Content-Type"` ו-`"Accept"` (PascalCase)
- **אחרי**: `"accept"` ו-`"content-type"` (lowercase)
- **למה**: זה מה ש-Open Finance מצפים, כפי שמופיע בדוגמה שלהם

### 2. Token Endpoint
- **לפני**: `/api/v1/oauth/token`
- **אחרי**: `/oauth/token`
- **למה**: זה ה-endpoint הנכון לפי הדוגמה שלהם

### 3. Credentials - ב-body במקום Basic Auth
- **לפני**: Basic Authentication ב-header
- **אחרי**: Credentials ב-body של הבקשה
- **פורמט**: 
  ```json
  {
    "clientId": "...",
    "clientSecret": "...",
    "userId": "..."
  }
  ```

### 4. camelCase במקום snake_case
- כל השדות עכשיו ב-camelCase:
  - `clientId` במקום `client_id`
  - `clientSecret` במקום `client_secret`
  - `userId` במקום `user_id`
  - `redirectUri` במקום `redirect_uri`
  - `accessToken` במקום `access_token`
  - `refreshToken` במקום `refresh_token`
  - `expiresIn` במקום `expires_in`
  - `tokenType` במקום `token_type`

### 5. פונקציה חדשה: `get_access_token()`
- מקבלת access token ישירות עם client credentials
- עובדת בהצלחה! 
- משתמשת ב-endpoint `/oauth/token` עם credentials ב-body

##  מה עובד עכשיו:

1. **`get_access_token(user_id)`** - עובד! 
   ```python
   auth = AuthManager()
   token = auth.get_access_token("user_123")
   # מחזיר: access_token, expires_in, token_type
   ```

2. **Headers** - lowercase כפי שצריך 

3. **Token endpoint** - `/oauth/token` עובד 

##  מה עדיין לא עובד:

1. **`create_consent()`** - עדיין מחזיר 403
   - ייתכן שצריך endpoint אחר
   - ייתכן שצריך access token קודם
   - צריך לבדוק את התיעוד של Open Finance

##  דוגמה לשימוש:

```python
from auth import AuthManager

auth = AuthManager()

# קבלת access token (עובד!)
token_data = auth.get_access_token("user_123")
access_token = token_data["access_token"]
print(f"Token expires in: {token_data['expires_in']} seconds")

# עכשיו אפשר להשתמש ב-access_token לבקשות אחרות
```

##  הערות:

- הקוד עכשיו תואם לדוגמה של Open Finance
- ה-token endpoint עובד בהצלחה
- Consent creation עדיין צריך בדיקה - אולי יש endpoint אחר או תהליך אחר
