from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.models.models import Setting, User
from backend.schemas.schemas import SettingBase, SettingResponse
from backend.api.deps import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=SettingResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    if not setting:
        setting = Setting(user_id=current_user.id, gemini_model="gemini-2.5-flash")
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

@router.put("", response_model=SettingResponse)
def update_settings(
    setting_in: SettingBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    if not setting:
        setting = Setting(user_id=current_user.id)
        db.add(setting)
    
    setting.gemini_model = setting_in.gemini_model
    setting.github_pat = setting_in.github_pat
    setting.custom_system_prompt = setting_in.custom_system_prompt
    
    db.commit()
    db.refresh(setting)
    return setting
