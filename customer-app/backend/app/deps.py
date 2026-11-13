from fastapi import Depends, Header, HTTPException

from app.services.bank_client import bank


def get_token(authorization: str = Header(default="")) -> str:
    # ASSUMPTION: Bank uses "Authorization: Bearer <token>". Confirm with Bank developer.
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return parts[1].strip()


async def get_current_user(token: str = Depends(get_token)):
    """Returns (token, profile). The profile always comes from the Bank."""
    profile = await bank.get_profile(token)
    return token, profile