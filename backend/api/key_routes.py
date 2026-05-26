import secrets
import hashlib
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.database import get_db, SupabaseService
from core.auth import get_current_user, TokenData
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/keys", tags=["API Keys"])

class ApiKeyCreate(BaseModel):
    name: str

class ApiKeyResponse(BaseModel):
    id: int
    name: str
    prefix: str
    created_at: datetime
    last_used: Optional[datetime] = None
    is_active: bool

class ApiKeyReveal(ApiKeyResponse):
    key: str

@router.get("/", response_model=List[ApiKeyResponse])
async def list_keys(
    current_user: TokenData = Depends(get_current_user),
    db: SupabaseService = Depends(get_db)
):
    """List all active API keys for the current user."""
    try:
        return db.list_api_keys(current_user.user_id)
    except Exception as e:
        logger.error(f"Failed to list API keys for user {current_user.user_id}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list API keys: {str(e)}"
        )

@router.post("/", response_model=ApiKeyReveal)
async def create_key(
    request: ApiKeyCreate,
    current_user: TokenData = Depends(get_current_user),
    db: SupabaseService = Depends(get_db)
):
    """Create a new API key."""
    try:
        # Generate a secure key
        raw_key = f"sk-seka-{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        prefix = f"{raw_key[:12]}****"
        
        # db.create_api_key now handles recovery and raises descriptive errors on failure
        stored_key = db.create_api_key(
            user_id=current_user.user_id,
            name=request.name.strip(),
            key_hash=key_hash,
            prefix=prefix
        )
        
        return {
            **stored_key,
            "key": raw_key
        }
    except RuntimeError as re:
        # Pass through descriptive database errors
        logger.error(f"Database error during API key creation: {re}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(re)
        )
    except Exception as e:
        logger.error(f"Unhandled error creating API key for user {current_user.user_id}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create API key: {str(e)}"
        )

@router.delete("/{key_id}")
async def revoke_key(
    key_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: SupabaseService = Depends(get_db)
):
    """Revoke an API key."""
    try:
        success = db.revoke_api_key(current_user.user_id, key_id)
        if not success:
            raise HTTPException(status_code=404, detail="API key not found or already revoked")
        return {"message": "API key revoked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to revoke key {key_id} for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to revoke API key: {str(e)}")
