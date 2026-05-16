import secrets
import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.database import get_db, SupabaseService
from core.auth import get_current_user, TokenData
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/keys", tags=["API Keys"])

class ApiKeyCreate(BaseModel):
    name: str

class ApiKeyResponse(BaseModel):
    id: int
    name: str
    prefix: str
    created_at: datetime
    last_used: Optional[datetime]
    is_active: bool

class ApiKeyReveal(ApiKeyResponse):
    key: str

@router.get("/", response_model=List[ApiKeyResponse])
async def list_keys(
    current_user: TokenData = Depends(get_current_user),
    db: SupabaseService = Depends(get_db)
):
    """List all active API keys for the current user."""
    return db.list_api_keys(current_user.user_id)

@router.post("/", response_model=ApiKeyReveal)
async def create_key(
    request: ApiKeyCreate,
    current_user: TokenData = Depends(get_current_user),
    db: SupabaseService = Depends(get_db)
):
    """Create a new API key."""
    # Generate a secure key
    raw_key = f"sk-seka-{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = f"{raw_key[:12]}****"
    
    stored_key = db.create_api_key(
        user_id=current_user.user_id,
        name=request.name.strip(),
        key_hash=key_hash,
        prefix=prefix
    )
    
    if not stored_key:
        raise HTTPException(status_code=500, detail="Failed to create API key")
    
    return {
        **stored_key,
        "key": raw_key
    }

@router.delete("/{key_id}")
async def revoke_key(
    key_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: SupabaseService = Depends(get_db)
):
    """Revoke an API key."""
    success = db.revoke_api_key(current_user.user_id, key_id)
    if not success:
        raise HTTPException(status_code=404, detail="API key not found or already revoked")
    return {"message": "API key revoked successfully"}
