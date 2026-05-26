from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, ExpiredSignatureError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator
import logging
import os

logger = logging.getLogger(__name__)

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
    if _IS_PRODUCTION:
        raise RuntimeError(
            f"JWT_SECRET_KEY is too short ({len(_raw_secret)} chars). "
            "Set a strong random secret of at least 32 characters in your "
            "Railway environment variables before deploying."
        )
    # Non-production: warn loudly but allow startup so local dev and
    # transitional deployments are not hard-blocked while the env var is
    # being updated to a proper value.
    logger.warning(
        "JWT_SECRET_KEY is too short (%d chars) — minimum 32 required. "
        "Tokens signed with this key are insecure. "
        "Update JWT_SECRET_KEY to a 32+ character secret immediately.",
        len(_raw_secret),
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

import hashlib
from fastapi.security import APIKeyHeader
from core.database import get_db, SupabaseService

# API Key configuration
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(
    api_key: Optional[str] = Depends(api_key_header),
    db: SupabaseService = Depends(get_db)
) -> Optional[TokenData]:
    """
    Validate an API key from the X-API-Key header.
    If valid, returns TokenData for the owner of the key.
    """
    if not api_key:
        return None
        
    try:
        # Hash the provided key to match stored hash
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Verify in database
        key_record = db.verify_api_key(key_hash)
        
        if not key_record:
            return None
            
        # Update last_used in background
        db.update_key_last_used(key_record["id"])
        
        # User details are nested because of users!inner(*)
        user = key_record.get("users")
        if not user:
            return None
            
        return TokenData(
            email=user["email"],
            user_id=user["id"],
            role=user.get("role", "analyst")
        )
    except Exception as e:
        logger.error(f"API key validation error: {e}")
        return None

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    api_key_data: Optional[TokenData] = Depends(get_api_key)
) -> TokenData:
    """
    Unified authentication dependency.
    Supports both JWT (Bearer) and API Key (X-API-Key header).
    """
    # 1. Try API Key first (higher priority for programmatic access)
    if api_key_data:
        return api_key_data
        
    # 2. Fallback to JWT
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required (Bearer token or X-API-Key)",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
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
