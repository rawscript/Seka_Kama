from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime
from core.database import get_supabase_client
from core.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_admin,
    UserCreate, UserLogin, Token, UserResponse, TokenData
)

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    supabase = get_supabase_client()
    
    existing = supabase.table("users").select("id").eq("email", user.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user.password)
    
    new_user = {
        "email": user.email,
        "password_hash": hashed_password,
        "full_name": user.full_name,
        "organization": user.organization,
        "role": user.role,
        "created_at": datetime.utcnow().isoformat(),
        "is_active": True
    }
    
    result = supabase.table("users").insert(new_user).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Registration failed")
    
    user_data = result.data[0]
    return UserResponse(
        id=user_data["id"],
        email=user_data["email"],
        full_name=user_data["full_name"],
        organization=user_data["organization"],
        role=user_data["role"],
        created_at=datetime.fromisoformat(user_data["created_at"]),
        last_login=None
    )

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    supabase = get_supabase_client()
    
    result = supabase.table("users").select("*").eq("email", user.email).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    db_user = result.data[0]
    
    if not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not db_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled"
        )
    
    access_token = create_access_token(
        data={"sub": db_user["email"], "user_id": db_user["id"], "role": db_user["role"]}
    )
    
    supabase.table("users").update({
        "last_login": datetime.utcnow().isoformat()
    }).eq("id", db_user["id"]).execute()
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=60 * 24
    )

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token login, retrieving an access token."""
    supabase = get_supabase_client()
    
    result = supabase.table("users").select("*").eq("email", form_data.username).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    db_user = result.data[0]
    
    if not verify_password(form_data.password, db_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(
        data={"sub": db_user["email"], "user_id": db_user["id"], "role": db_user["role"]}
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=60 * 24
    )

@router.post("/logout")
async def logout(current_user: TokenData = Depends(get_current_user)):
    return JSONResponse(content={"message": "Successfully logged out"})

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    result = supabase.table("users").select("*").eq("id", current_user.user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = result.data[0]
    return UserResponse(
        id=user_data["id"],
        email=user_data["email"],
        full_name=user_data["full_name"],
        organization=user_data["organization"],
        role=user_data["role"],
        created_at=datetime.fromisoformat(user_data["created_at"]),
        last_login=datetime.fromisoformat(user_data["last_login"]) if user_data.get("last_login") else None
    )