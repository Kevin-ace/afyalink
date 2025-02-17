from pydantic import BaseSettings
import os

class Settings(BaseSettings):
    # Google Maps Configuration
    GOOGLE_MAPS_API_KEY: str = os.getenv('GOOGLE_MAPS_API_KEY', '')
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    DEBUG: bool = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Database Configuration
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'postgresql://kevin:admin@localhost/afyalink_db')
    
    # Security Settings
    SECRET_KEY: str = os.getenv('SECRET_KEY', '')
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # External Services
    SENTRY_DSN: str = os.getenv('SENTRY_DSN', '')
    
    class Config:
        # Allow reading from .env file
        env_file = '.env'
        env_file_encoding = 'utf-8'

# Singleton settings instance
settings = Settings()

class Config:
    SQLALCHEMY_DATABASE_URI = settings.DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'aPS3qkhl3zd4Zq2uZB1yH/54iCNs+gYmC4vF8Ul15h8=')
