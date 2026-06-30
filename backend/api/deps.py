from fastapi import Depends
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.models.models import User, Setting
from backend.core.security import get_password_hash

def get_current_user(
    db: Session = Depends(get_db)
) -> User:
    # Bypassed authentication: Always returns default developer user without checking token/credentials.
    # This simplifies local development and avoids requiring a login session.
    user = db.query(User).filter(User.email == "developer@example.com").first()
    if not user:
        user = User(
            email="developer@example.com",
            hashed_password=get_password_hash("defaultpassword123")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create settings record
        setting = db.query(Setting).filter(Setting.user_id == user.id).first()
        if not setting:
            setting = Setting(user_id=user.id, gemini_model="gemini-2.5-flash")
            db.add(setting)
            db.commit()
            
    return user
