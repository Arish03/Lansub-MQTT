from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models.user import User
from app.models.dashboard import Dashboard
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut
from app.services.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegister, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email_clean))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    user = User(
        email=email_clean,
        password_hash=hash_password(req.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Initialize default dashboard for the new user
    default_dashboard = Dashboard(
        user_id=user.id,
        name="Main Dashboard",
        layout={"cols": 3}
    )
    db.add(default_dashboard)
    await db.commit()

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
