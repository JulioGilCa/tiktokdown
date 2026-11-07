"""Utilidades de seguridad, criptografía y PKCE para OAuth 2.0."""

import base64
import hashlib
import os
import secrets
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


def generate_state(length: int = 32) -> str:
    """Genera un state aleatorio seguro para evitar CSRF en el flujo OAuth."""
    return secrets.token_urlsafe(length)


def generate_pkce_pair() -> tuple[str, str]:
    """Genera (code_verifier, code_challenge) para OAuth 2.0 PKCE según RFC 7636.

    code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
    """
    code_verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return code_verifier, code_challenge


def get_fernet_cipher() -> Optional[Fernet]:
    """Obtiene el cifrador Fernet si la clave TOKEN_ENCRYPTION_KEY está configurada."""
    settings = get_settings()
    if not settings.token_encryption_key:
        return None
    key_str = settings.token_encryption_key.get_secret_value()
    try:
        return Fernet(key_str.encode("utf-8"))
    except Exception:
        return None


def encrypt_token(plain_token: str) -> str:
    """Cifra un token sensible en reposo con Fernet (AES-128-CBC + HMAC)."""
    cipher = get_fernet_cipher()
    if not cipher:
        # Si no hay clave de cifrado definida, se codifica en base64 indicando no-cifrado
        return f"plain:{base64.b64encode(plain_token.encode('utf-8')).decode('ascii')}"
    encrypted_bytes = cipher.encrypt(plain_token.encode("utf-8"))
    return f"enc:{encrypted_bytes.decode('ascii')}"


def decrypt_token(stored_token: str) -> Optional[str]:
    """Descifra un token sensible en reposo."""
    if not stored_token:
        return None
    if stored_token.startswith("plain:"):
        return base64.b64decode(stored_token[6:].encode("ascii")).decode("utf-8")
    if stored_token.startswith("enc:"):
        cipher = get_fernet_cipher()
        if not cipher:
            return None
        try:
            return cipher.decrypt(stored_token[4:].encode("ascii")).decode("utf-8")
        except InvalidToken:
            return None
    return None

