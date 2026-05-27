import secrets
import hashlib
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.database import get_db, SupabaseService
from core.auth import get_current_user, TokenData
from pydantic import BaseModel, field_validator
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/keys", tags=["API Keys"])


class ApiKeyCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Key name cannot be empty")
        if len(v) > 100:
            raise ValueError("Key name must be 100 characters or fewer")
        return v


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    prefix: str
    created_at: datetime
    last_used: Optional[datetime] = None
    is_active: bool


class ApiKeyReveal(ApiKeyResponse):
    """Returned only at creation time — includes the plaintext key."""
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


@router.post("/", response_model=ApiKeyReveal, status_code=status.HTTP_201_CREATED)
async def create_key(
    request: ApiKeyCreate,
    current_user: TokenData = Depends(get_current_user),
    db: SupabaseService = Depends(get_db)
):
    """
    Create a new API key.
    The plaintext key is returned **only once** — store it securely.
    """
    try:
        raw_key = f"sk-seka-{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        prefix = f"{raw_key[:12]}****"

        stored_key = db.create_api_key(
            user_id=current_user.user_id,
            name=request.name,
            key_hash=key_hash,
            prefix=prefix
        )

        return {**stored_key, "key": raw_key}

    except RuntimeError as re:
        logger.error(
            f"Database error during API key creation for user {current_user.user_id}: {re}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database configuration issue: {str(re)}"
        )
    except Exception as e:
        logger.error(
            f"Unhandled error creating API key for user {current_user.user_id}: {e}\n"
            + traceback.format_exc()
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server error during key generation. Please check backend logs."
        )


@router.delete("/{key_id}", status_code=status.HTTP_200_OK)
async def revoke_key(
    key_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: SupabaseService = Depends(get_db)
):
    """Revoke (deactivate) an API key owned by the current user."""
    try:
        success = db.revoke_api_key(current_user.user_id, key_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found or already revoked"
            )
        return {"message": "API key revoked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to revoke key {key_id} for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke API key: {str(e)}"
        )
