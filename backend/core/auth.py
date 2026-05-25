from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, ExpiredSignatureError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator
import os

# Password hashing with explicit bcrypt configuration
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

# JWT configuration
# JWT_SECRET_KEY is required in production. We validate it eagerly at import
# time so a misconfigured deployment fails loudly on startup rather than
# silently issuing tokens that can never be verified after a redeploy.
_raw_secret = os.getenv("JWT_SECRET_KEY", "")
_ENV = os.getenv("ENVIRONMENT", os.getenv("RAILWAY_ENVIRONMENT", "development")).lower()
_IS_PRODUCTION = _ENV in ("production", "prod")

if not _raw_secret:
    if _IS_PRODUCTION:
        raise RuntimeError(
            "JWT_SECRET_KEY environment variable is not set. "
            "Set a strong random secret (≥32 characters) before deploying."
        )
    # Development fallback — intentionally obvious so it is never used in prod
    _raw_secret = "dev-only-secret-do-not-use-in-production-replace-me"

if len(_raw_secret) < 32:
    raise RuntimeError(
        f"JWT_SECRET_KEY is too short ({len(_raw_secret)} chars). "
        "Use a secret of at least 32 characters to ensure token security."
    )

SECRET_KEY: str = _raw_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer()

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class TokenData(BaseModel):
    email: str
    user_id: int
    role: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    organization: str
    role: str = "analyst"
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Validate email format"""
        if not v or '@' not in v:
            raise ValueError('Invalid email format')
        return v.lower().strip()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password: min 8 chars, max 72 bytes (bcrypt limit)"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password too long (max 72 bytes)')
        return v
    
    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Full name cannot be empty')
        return v.strip()
    
    @field_validator('organization')
    @classmethod
    def validate_organization(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Organization cannot be empty')
        return v.strip()

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    organization: str
    role: str
    created_at: datetime
    last_login: Optional[datetime]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password with error handling"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (ValueError, TypeError) as e:
        raise ValueError(f"Password verification failed: {str(e)}")

def get_password_hash(password: str) -> str:
    """Hash password with validation and error handling"""
    # Double-check password length (should be caught by validator, but defensive)
    if len(password.encode('utf-8')) > 72:
        raise ValueError("Password cannot be longer than 72 bytes")
    
    try:
        return pwd_context.hash(password)
    except (ValueError, TypeError, RuntimeError) as e:
        raise RuntimeError(f"Password hashing failed: {str(e)}")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    Decode and validate the Bearer JWT.

    Raises:
      401 with detail "Token has expired"  — when the token's exp claim is in the past.
      401 with detail "Could not validate credentials" — for any other JWT error
          (bad signature, malformed token, missing required claims, etc.).
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email: str = payload.get("sub")
    user_id: int = payload.get("user_id")
    role: str = payload.get("role", "analyst")

    if not email or user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenData(email=email, user_id=user_id, role=role)


async def require_admin(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """
    Dependency that enforces admin-only access.
    Raises 403 if the authenticated user does not hold the 'admin' role.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
