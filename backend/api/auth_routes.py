import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from core.database import get_supabase_client
from core.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_admin, revoke_token, get_raw_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    UserCreate, UserLogin, Token, UserResponse, TokenData
)

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger(__name__)

class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    organization: str = Field(min_length=1, max_length=200)

class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=72)

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    supabase = get_supabase_client()
    
    try:
        existing = supabase.table("users").select("id").eq("email", user.email).execute()
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Password validation happens in UserCreate model, but defensive check here
        try:
            hashed_password = get_password_hash(user.password)
        except (ValueError, RuntimeError) as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Password processing failed"
            )
        
        new_user = {
            "email": user.email,
            "password_hash": hashed_password,
            "full_name": user.full_name,
            "organization": user.organization,
            "role": user.role,
            "created_at": datetime.now(timezone.utc).isoformat(),
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("users").select("*").eq("email", user.email).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        db_user = result.data[0]
        
        try:
            if not verify_password(user.password, db_user["password_hash"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
        except HTTPException:
            raise
        except ValueError:
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
            "last_login": datetime.now(timezone.utc).isoformat()
        }).eq("id", db_user["id"]).execute()
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds, per OAuth2 spec
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token login, retrieving an access token."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table("users").select("*").eq("email", form_data.username).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        db_user = result.data[0]
        
        try:
            if not verify_password(form_data.password, db_user["password_hash"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except HTTPException:
            raise
        except ValueError:
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
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds, per OAuth2 spec
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token generation failed"
        )

@router.post("/logout")
async def logout(
    current_user: TokenData = Depends(get_current_user),
    raw_token: str | None = Depends(get_raw_token),
):
    """Invalidate the current JWT for this process instance."""
    if raw_token:
        revoke_token(raw_token)
    return JSONResponse(content={"message": "Successfully logged out"})

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    supabase = get_supabase_client()
    
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user info"
        )

@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    profile: ProfileUpdate,
    current_user: TokenData = Depends(get_current_user),
    raw_token: str | None = Depends(get_raw_token),
):
    if not raw_token:
        raise HTTPException(status_code=401, detail="A user session is required to update a profile")
    supabase = get_supabase_client()
    full_name = profile.full_name.strip()
    organization = profile.organization.strip()
    if not full_name or not organization:
        raise HTTPException(status_code=400, detail="Name and organization are required")
    try:
        result = supabase.table("users").update({
            "full_name": full_name,
            "organization": organization,
        }).eq("id", current_user.user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        user_data = result.data[0]
        return UserResponse(
            id=user_data["id"], email=user_data["email"],
            full_name=user_data["full_name"], organization=user_data["organization"],
            role=user_data["role"], created_at=datetime.fromisoformat(user_data["created_at"]),
            last_login=datetime.fromisoformat(user_data["last_login"]) if user_data.get("last_login") else None,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to update profile")

@router.post("/change-password")
async def change_current_password(
    request: PasswordChange,
    current_user: TokenData = Depends(get_current_user),
    raw_token: str | None = Depends(get_raw_token),
):
    if not raw_token:
        raise HTTPException(status_code=401, detail="A user session is required to change a password")
    supabase = get_supabase_client()
    try:
        result = supabase.table("users").select("password_hash").eq("id", current_user.user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        if not verify_password(request.current_password, result.data[0]["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if len(request.new_password.encode("utf-8")) > 72:
            raise HTTPException(status_code=400, detail="New password must be 72 bytes or fewer")
        supabase.table("users").update({
            "password_hash": get_password_hash(request.new_password),
        }).eq("id", current_user.user_id).execute()
        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to change password")


# ============================================================
# PASSWORD RESET & EMAIL VERIFICATION FLOWS
# ============================================================

class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str = Field(min_length=32, max_length=128)
    new_password: str = Field(min_length=8, max_length=72)

class EmailVerificationRequest(BaseModel):
    """Email verification request"""
    token: str = Field(min_length=32, max_length=128)

class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str

def _send_email_async(background_tasks: BackgroundTasks, to_email: str, subject: str, body: str):
    """Send email asynchronously using SMTP."""
    import os
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    email_from = os.getenv("EMAIL_FROM", "noreply@seka-kama.io")
    
    if not all([smtp_host, smtp_user, smtp_password]):
        logger.warning("SMTP not configured, skipping email send")
        return False
    
    def _send():
        try:
            msg = MIMEMultipart()
            msg['From'] = email_from
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    background_tasks.add_task(_send)
    return True

def _generate_secure_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)

@router.post("/forgot-password")
async def forgot_password(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks
):
    """
    Request a password reset email.
    Always returns success to prevent email enumeration.
    """
    supabase = get_supabase_client()
    
    try:
        # Check if user exists
        result = supabase.table("users").select("id, email, full_name").eq("email", request.email).execute()
        
        if result.data:
            user = result.data[0]
            # Generate reset token
            reset_token = _generate_secure_token()
            reset_expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
            
            # Store token in database (create password_reset_tokens table if needed)
            try:
                supabase.table("password_reset_tokens").insert({
                    "user_id": user["id"],
                    "token": reset_token,
                    "expires_at": reset_expires,
                    "used": False
                }).execute()
            except Exception as e:
                logger.error(f"Failed to store reset token: {e}")
                # Try update if insert fails
                supabase.table("password_reset_tokens").update({
                    "token": reset_token,
                    "expires_at": reset_expires,
                    "used": False
                }).eq("user_id", user["id"]).execute()
            
            # Send reset email
            reset_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={reset_token}"
            email_body = f"""Hello {user['full_name']},

You have requested to reset your password for your Seka Kama account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you did not request this reset, please ignore this email.

Best regards,
Seka Kama Team
"""
            _send_email_async(background_tasks, user["email"], "Password Reset Request", email_body)
        
        # Always return success to prevent email enumeration
        return {"message": "If the email exists, a password reset link has been sent"}
    
    except Exception as e:
        logger.error(f"Password reset request failed: {e}")
        # Still return success to prevent enumeration
        return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm):
    """Reset password using token from email."""
    supabase = get_supabase_client()
    
    try:
        # Find valid token
        result = supabase.table("password_reset_tokens").select("*, users(*)").eq("token", request.token).eq("used", False).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        token_record = result.data[0]
        
        # Check expiration
        expires_at = datetime.fromisoformat(token_record["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired"
            )
        
        # Update password
        hashed_password = get_password_hash(request.new_password)
        supabase.table("users").update({
            "password_hash": hashed_password
        }).eq("id", token_record["user_id"]).execute()
        
        # Mark token as used
        supabase.table("password_reset_tokens").update({
            "used": True
        }).eq("id", token_record["id"]).execute()
        
        return {"message": "Password has been reset successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.post("/verify-email")
async def verify_email(request: EmailVerificationRequest):
    """Verify email address using token."""
    supabase = get_supabase_client()
    
    try:
        # Find verification token
        result = supabase.table("email_verification_tokens").select("*, users(*)").eq("token", request.token).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
        
        token_record = result.data[0]
        
        # Check expiration
        expires_at = datetime.fromisoformat(token_record["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired"
            )
        
        # Mark email as verified
        supabase.table("users").update({
            "email_verified": True,
            "email_verified_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", token_record["user_id"]).execute()
        
        # Delete used token
        supabase.table("email_verification_tokens").delete().eq("id", token_record["id"]).execute()
        
        return {"message": "Email verified successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify email"
        )

@router.post("/resend-verification")
async def resend_verification(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks
):
    """Resend email verification."""
    supabase = get_supabase_client()
    
    try:
        # Check if user exists and not already verified
        result = supabase.table("users").select("id, email, full_name, email_verified").eq("email", request.email).execute()
        
        if result.data and not result.data[0].get("email_verified"):
            user = result.data[0]
            
            # Generate verification token
            verify_token = _generate_secure_token()
            verify_expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
            
            # Store token
            try:
                supabase.table("email_verification_tokens").insert({
                    "user_id": user["id"],
                    "token": verify_token,
                    "expires_at": verify_expires
                }).execute()
            except Exception:
                # Update if exists
                supabase.table("email_verification_tokens").update({
                    "token": verify_token,
                    "expires_at": verify_expires
                }).eq("user_id", user["id"]).execute()
            
            # Send verification email
            verify_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token={verify_token}"
            email_body = f"""Hello {user['full_name']},

Please verify your email address for Seka Kama by clicking the link below:

{verify_url}

This link will expire in 24 hours.

Best regards,
Seka Kama Team
"""
            _send_email_async(background_tasks, user["email"], "Verify Your Email", email_body)
        
        return {"message": "If the email exists and is not verified, a verification link has been sent"}
    
    except Exception as e:
        logger.error(f"Resend verification failed: {e}")
        return {"message": "If the email exists and is not verified, a verification link has been sent"}

@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token."""
    supabase = get_supabase_client()
    
    try:
        # Verify refresh token
        result = supabase.table("refresh_tokens").select("*, users(*)").eq("token", request.refresh_token).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        token_record = result.data[0]
        
        # Check expiration
        expires_at = datetime.fromisoformat(token_record["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired"
            )
        
        user = token_record["users"]
        
        # Generate new access token
        access_token = create_access_token(
            data={"sub": user["email"], "user_id": user["id"], "role": user["role"]}
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )

