from typing import Any, Dict, Optional
from datetime import datetime
from fastapi import Request
from core.database import get_db

class AuditService:
    @staticmethod
    async def log(
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        user_id: Optional[int] = None,
        details: Dict[str, Any] = {},
        request: Optional[Request] = None
    ):
        """
        Log an action to the audit_logs table.
        """
        db = get_db()
        ip_address = None
        user_agent = None
        
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

        try:
            db.table("audit_logs").insert({
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": details,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            # We don't want audit logging failure to crash the main request
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to write audit log: {str(e)}")

audit_service = AuditService()
