import subprocess
import sys
import os

def setup_database():
    try:
        # Change to the backend directory
        os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        # Run alembic upgrade
        result = subprocess.run(['alembic', 'upgrade', 'head'], 
                              capture_output=True, 
                              text=True)
        
        if result.returncode == 0:
            print("Database migration successful!")
        else:
            print("Migration failed:", result.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"Error setting up database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    setup_database() 