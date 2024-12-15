import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://kevin:admin@localhost/afyalink_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'Cn32yo7ZJXOP2tBICl60Ve3vCJwW242eR4hT8PpJ1rQ=')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'aPS3qkhl3zd4Zq2uZB1yH/54iCNs+gYmC4vF8Ul15h8=')
