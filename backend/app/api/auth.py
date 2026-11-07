"""Endpoints para autenticación OAuth 2.0 con TikTok Login Kit y gestión de sesiones."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.database import get_db
from app.models.entities import SessionRecord
from app.services.tiktok_service import tiktok_service
from app.utils.security import generate_pkce_pair, generate_state

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthMeResponse(BaseModel):
    authenticated: bool
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    open_id: Optional[str] = None


@router.get("/tiktok/login")
async def tiktok_login(
    response: Response,
    settings: Settings = Depends(get_settings),
):
    """Inicia el flujo OAuth 2.0 PKCE redirigiendo a TikTok.

    Nunca solicita contraseñas. Genera state y code_challenge/code_verifier.
    """
    if not tiktok_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las credenciales de TikTok no están configuradas en el servidor.",
        )

    state = generate_state()
    verifier, challenge = generate_pkce_pair()
    auth_url = tiktok_service.build_authorization_url(state=state, code_challenge=challenge)

    redirect = RedirectResponse(url=auth_url, status_code=status.HTTP_302_FOUND)
    # Cookies temporales para validar el callback (vida corta: 10 min)
    redirect.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=600,
        path="/api/auth",
    )
    redirect.set_cookie(
        key="oauth_verifier",
        value=verifier,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=600,
        path="/api/auth",
    )
    return redirect


@router.get("/tiktok/callback")
async def tiktok_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    oauth_state: Optional[str] = Cookie(None),
    oauth_verifier: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Recibe la redirección de TikTok tras la autorización del usuario."""
    if error:
        detail = error_description or error
        return RedirectResponse(url=f"/login?error={detail}", status_code=status.HTTP_302_FOUND)

    if not code or not state or not oauth_state or state != oauth_state or not oauth_verifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validación de estado o código OAuth inválida.",
        )

    try:
        token_data = await tiktok_service.exchange_code_for_token(code, oauth_verifier)
    except Exception as e:
        return RedirectResponse(
            url=f"/login?error={str(e)}", status_code=status.HTTP_302_FOUND
        )

    open_id = token_data.get("open_id") or ""
    # Guardar tokens cifrados en la base de datos
    await tiktok_service.store_user_tokens(db, open_id, token_data)

    # Obtener perfil de usuario si está permitido
    user_info = await tiktok_service.get_user_info(token_data["access_token"])
    username = user_info.get("display_name") or user_info.get("username") or f"TikTok User {open_id[:6]}"
    avatar_url = user_info.get("avatar_url")

    # Crear sesión en el backend
    session_id = secrets.token_hex(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.session_ttl_minutes)

    session_row = SessionRecord(
        id=session_id,
        open_id=open_id,
        username=username,
        avatar_url=avatar_url,
        expires_at=expires_at,
    )
    db.add(session_row)
    await db.commit()

    # Redirigir al inicio estableciendo cookies HttpOnly
    redirect = RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
    redirect.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.session_ttl_minutes * 60,
        path="/",
    )
    # Token CSRF en cookie legible para double-submit
    csrf_token = secrets.token_hex(16)
    redirect.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.session_ttl_minutes * 60,
        path="/",
    )
    # Limpiar cookies de pre-autenticación
    redirect.delete_cookie("oauth_state", path="/api/auth")
    redirect.delete_cookie("oauth_verifier", path="/api/auth")

    return redirect


@router.get("/me", response_model=AuthMeResponse)
async def get_current_user(
    session_id: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> AuthMeResponse:
    """Verifica si el usuario tiene una sesión activa."""
    if not session_id:
        return AuthMeResponse(authenticated=False)

    stmt = select(SessionRecord).where(SessionRecord.id == session_id)
    session_row = (await db.execute(stmt)).scalar_one_or_none()

    if not session_row:
        return AuthMeResponse(authenticated=False)

    # Comprobar expiración
    now = datetime.now(timezone.utc)
    # Asegurar que expires_at tenga zona horaria para comparación
    exp = session_row.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if exp < now:
        await db.delete(session_row)
        await db.commit()
        return AuthMeResponse(authenticated=False)

    return AuthMeResponse(
        authenticated=True,
        username=session_row.username,
        avatar_url=session_row.avatar_url,
        open_id=session_row.open_id,
    )


@router.post("/logout")
async def logout(
    response: Response,
    session_id: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """Cierra la sesión del usuario eliminando la cookie y los datos temporales."""
    if session_id:
        stmt = select(SessionRecord).where(SessionRecord.id == session_id)
        session_row = (await db.execute(stmt)).scalar_one_or_none()
        if session_row:
            await db.delete(session_row)
            await db.commit()

    response.delete_cookie("session_id", path="/")
    response.delete_cookie("csrf_token", path="/")
    return {"success": True}

