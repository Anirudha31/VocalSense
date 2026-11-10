from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AuthIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class RegisterIn(AuthIn):
    name: str = Field(
        min_length=2,
        max_length=120,
    )


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
