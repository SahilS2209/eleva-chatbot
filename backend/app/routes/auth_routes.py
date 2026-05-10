from datetime import datetime

from app.auth import hash_password, verify_password, create_access_token, \
    get_current_user
from app.database import users_collection
from app.models.user import UserCreate, UserLogin, UserResponse, Token, UserRole
from fastapi import APIRouter, HTTPException, status, Depends

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user_doc = {
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role.value,
        "hashed_password": hash_password(user_data.password),
        "created_at": datetime.utcnow(),
        "is_active": True,
    }

    result = await users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Generate token
    access_token = create_access_token(data={"sub": user_data.email, "role": user_data.role.value})

    return Token(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role=user_data.role,
            created_at=user_doc["created_at"],
            is_active=True,
        )
    )


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await users_collection.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]}
    )

    return Token(
        access_token=access_token,
        user=UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            role=UserRole(user["role"]),
            created_at=user["created_at"],
            is_active=user.get("is_active", True),
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=UserRole(current_user["role"]),
        created_at=current_user["created_at"],
        is_active=current_user.get("is_active", True),
    )
