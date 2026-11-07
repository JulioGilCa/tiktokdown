"""Pruebas de seguridad, PKCE, cifrado y autenticación."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.db_init import init_db
from app.main import app
from app.utils.security import (
    decrypt_token,
    encrypt_token,
    generate_pkce_pair,
    generate_state,
)


def test_pkce_and_security_utils():
    state = generate_state()
    assert len(state) >= 32

    verifier, challenge = generate_pkce_pair()
    assert len(verifier) >= 43
    assert len(challenge) >= 43
    assert verifier != challenge

    # Cifrado y descifrado de tokens
    plain = "act.tiktok_access_token_super_secret_12345"
    encrypted = encrypt_token(plain)
    assert encrypted != plain
    decrypted = decrypt_token(encrypted)
    assert decrypted == plain


@pytest.mark.asyncio
async def test_auth_me_unauthenticated():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        res = await ac.get("/api/auth/me")
        assert res.status_code == 200
        data = res.json()
        assert data["authenticated"] is False


@pytest.mark.asyncio
async def test_tiktok_login_endpoint_configured():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        res = await ac.get("/api/auth/tiktok/login", follow_redirects=False)
        # Con credenciales configuradas en .env, redirige a TikTok OAuth
        assert res.status_code == 302
        assert "tiktok.com" in res.headers.get("location", "")


@pytest.mark.asyncio
async def test_logout_endpoint():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        res = await ac.post("/api/auth/logout")
        assert res.status_code == 200
        assert res.json() == {"success": True}
