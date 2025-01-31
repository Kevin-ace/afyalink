from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel

class Settings(BaseModel):
    authjwt_secret_key: str = "your-secret-key"  # Replace with a secure secret key

@AuthJWT.load_config
def get_config():
    return Settings()
