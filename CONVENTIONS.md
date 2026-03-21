# 2Bee App Conventions

## Linting

ESLint with recommended rules is configured for both frontend and backend.

```bash
# Run linting
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Formatting

Prettier handles code formatting with shared config in `.prettierrc`.

```bash
# Format all files
npm run format

# Check formatting without writing
npm run format:check
```

## Environment Variables

1. Copy `.env.example` to `.env` in the relevant package directory
2. Fill in your local values
3. Never commit `.env` files - they are gitignored

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userData`, `isLoading` |
| Components | PascalCase | `UserProfile`, `TransactionList` |
| Constants | UPPER_SNAKE_CASE | `API_URL`, `MAX_RETRIES` |
| Files (components) | PascalCase | `UserProfile.jsx` |
| Files (utilities) | camelCase | `formatDate.js` |

## Project Structure

- `frontend/` - React + Vite application
- `backend/` - Express API server
- Root config files (`.prettierrc`, `.prettierignore`) are shared across packages
