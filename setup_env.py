"""
Helper script to create .env file from template
"""
import os
import shutil

def setup_env():
    """Create .env file from .env.example if it doesn't exist"""
    env_file = ".env"
    env_example = ".env.example"
    
    if os.path.exists(env_file):
        print(f"{env_file} already exists. Skipping...")
        return
    
    if os.path.exists(env_example):
        shutil.copy(env_example, env_file)
        print(f"Created {env_file} from {env_example}")
        print("Please update the values in .env with your actual credentials")
    else:

        env_content = """# Open Finance API Configuration
OPEN_FINANCE_API_BASE_URL=https://api.open-finance.ai
OPEN_FINANCE_CLIENT_ID=your_client_id_here
OPEN_FINANCE_CLIENT_SECRET=your_client_secret_here
OPEN_FINANCE_REDIRECT_URI=http://localhost:8000/callback

# Database Configuration
DATABASE_URL=sqlite:///./tobee.db

# Application Configuration
APP_SECRET_KEY=your_secret_key_here
APP_HOST=0.0.0.0
APP_PORT=8000
"""
        with open(env_file, "w") as f:
            f.write(env_content)
        print(f"Created {env_file}")
        print("Please update the values in .env with your actual credentials")

if __name__ == "__main__":
    setup_env()
