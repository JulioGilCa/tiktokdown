"""Servicio para la integración con TikTok Login Kit (OAuth 2.0 con PKCE)
y TikTok Data Portability API.

Sigue las especificaciones oficiales de TikTok for Developers:
https://developers.tiktok.com/doc/login-kit-web
https://developers.tiktok.com/doc/data-portability-api-get-started
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.entities import OAuthToken, SessionRecord
from app.utils.security import decrypt_token, encrypt_token


TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/"
TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/"
TIKTOK_PORTABILITY_CREATE_URL = "https://open.tiktokapis.com/v2/portability/create/"
TIKTOK_PORTABILITY_STATUS_URL = "https://open.tiktokapis.com/v2/portability/status/"


class TikTokService:
    def __init__(self):
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return self.settings.tiktok_configured

    def build_authorization_url(self, state: str, code_challenge: str) -> str:
        """Genera la URL oficial de TikTok Login Kit con PKCE (S256)."""
        if not self.is_configured():
            raise ValueError(
                "Credenciales de TikTok no configuradas. "
                "Define TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET y TIKTOK_REDIRECT_URI en el backend."
            )

        params = {
            "client_key": self.settings.tiktok_client_key,
            "response_type": "code",
            "scope": self.settings.tiktok_scopes or "user.info.basic",
            "redirect_uri": self.settings.tiktok_redirect_uri,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        return f"{TIKTOK_AUTHORIZE_URL}?{urlencode(params)}"

    async def exchange_code_for_token(self, code: str, code_verifier: str) -> Dict[str, Any]:
        """Intercambia el authorization code y code_verifier por access_token y refresh_token."""
        if not self.is_configured():
            raise ValueError("TikTok no está configurado.")

        secret = self.settings.tiktok_client_secret.get_secret_value() if self.settings.tiktok_client_secret else ""
        data = {
            "client_key": self.settings.tiktok_client_key,
            "client_secret": secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.settings.tiktok_redirect_uri,
            "code_verifier": code_verifier,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(TIKTOK_TOKEN_URL, data=data, headers=headers)
            body = resp.json()

        if resp.status_code != 200 or "data" not in body or "access_token" not in body["data"]:
            err_msg = body.get("error_description") or body.get("message") or f"Error HTTP {resp.status_code}"
            raise RuntimeError(f"Fallo al intercambiar código con TikTok: {err_msg}")

        return body["data"]

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Obtiene el perfil básico autorizado del usuario desde TikTok."""
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {"fields": "open_id,union_id,avatar_url,display_name,username"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(TIKTOK_USER_INFO_URL, headers=headers, params=params)
            body = resp.json()

        if resp.status_code == 200 and "data" in body and "user" in body["data"]:
            return body["data"]["user"]

        return {}

    async def store_user_tokens(
        self,
        db: AsyncSession,
        open_id: str,
        token_data: Dict[str, Any],
    ) -> OAuthToken:
        """Almacena o actualiza los tokens de TikTok cifrados con Fernet."""
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token", "")
        expires_in = token_data.get("expires_in", 86400)
        refresh_expires_in = token_data.get("refresh_expires_in", 86400 * 365)
        scope = token_data.get("scope")

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=expires_in)
        refresh_expires_at = now + timedelta(seconds=refresh_expires_in)

        stmt = select(OAuthToken).where(OAuthToken.open_id == open_id, OAuthToken.provider == "tiktok")
        token_row = (await db.execute(stmt)).scalar_one_or_none()

        enc_access = encrypt_token(access_token)
        enc_refresh = encrypt_token(refresh_token)

        if token_row:
            token_row.access_token_encrypted = enc_access
            token_row.refresh_token_encrypted = enc_refresh
            token_row.scope = scope
            token_row.expires_at = expires_at
            token_row.refresh_expires_at = refresh_expires_at
        else:
            token_row = OAuthToken(
                provider="tiktok",
                open_id=open_id,
                access_token_encrypted=enc_access,
                refresh_token_encrypted=enc_refresh,
                scope=scope,
                expires_at=expires_at,
                refresh_expires_at=refresh_expires_at,
            )
            db.add(token_row)

        await db.commit()
        await db.refresh(token_row)
        return token_row

    async def get_valid_access_token(self, db: AsyncSession, open_id: str) -> Optional[str]:
        """Recupera y descifra el access_token del usuario."""
        stmt = select(OAuthToken).where(OAuthToken.open_id == open_id, OAuthToken.provider == "tiktok")
        token_row = (await db.execute(stmt)).scalar_one_or_none()
        if not token_row:
            return None
        return decrypt_token(token_row.access_token_encrypted)

    async def request_data_portability(
        self, db: AsyncSession, open_id: str
    ) -> Dict[str, Any]:
        """Solicita la exportación oficial a través de TikTok Data Portability API.

        Requiere que la aplicación de TikTok tenga los scopes `portability.activity.single`
        o `portability.all.single` formalmente aprobados por TikTok.
        """
        token = await self.get_valid_access_token(db, open_id)
        if not token:
            return {
                "success": False,
                "error": "No se encontró sesión activa con token de TikTok.",
                "requires_approval": False,
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        body = {
            "scope": ["portability.activity.single"],
            "format": "JSON",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(TIKTOK_PORTABILITY_CREATE_URL, headers=headers, json=body)
                data = resp.json()
        except Exception as e:
            return {"success": False, "error": f"Error de conexión con TikTok API: {str(e)}"}

        if resp.status_code == 200 and "data" in data and "request_id" in data["data"]:
            return {
                "success": True,
                "request_id": data["data"]["request_id"],
                "status": data["data"].get("status", "processing"),
            }

        # Manejo honesto de error de permisos
        err_code = data.get("error", {}).get("code", "")
        err_msg = data.get("error", {}).get("message", resp.text)
        return {
            "success": False,
            "error": f"TikTok rechazó la solicitud de portabilidad: {err_msg}",
            "requires_approval": "scope" in err_msg.lower() or "permission" in err_msg.lower() or resp.status_code == 403,
            "raw_response": data,
        }


tiktok_service = TikTokService()

