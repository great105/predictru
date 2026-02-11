import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs

from jose import JWTError, jwt

from app.core.config import settings


def validate_telegram_init_data(init_data: str) -> dict | None:
    """Validate Telegram WebApp initData using HMAC-SHA256.

    Returns parsed user data dict or None if validation fails.
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    parsed = parse_qs(init_data)
    if "hash" not in parsed:
        return None

    received_hash = parsed.pop("hash")[0]

    # Build data-check-string: sorted key=value pairs joined by \n
    data_check_parts = []
    for key in sorted(parsed.keys()):
        data_check_parts.append(f"{key}={parsed[key][0]}")
    data_check_string = "\n".join(data_check_parts)

    # HMAC-SHA256: secret_key = HMAC_SHA256("WebAppData", bot_token)
    secret_key = hmac.new(
        b"WebAppData",
        settings.TELEGRAM_BOT_TOKEN.encode(),
        hashlib.sha256,
    ).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        return None

    # Check auth_date freshness (allow up to 24 hours)
    auth_date_str = parsed.get("auth_date", [None])[0]
    if auth_date_str:
        auth_date = int(auth_date_str)
        if time.time() - auth_date > 86400:
            return None

    # Parse user JSON
    user_str = parsed.get("user", [None])[0]
    if not user_str:
        return None

    return json.loads(user_str)


def validate_telegram_login_widget(data: dict) -> dict | None:
    """Validate Telegram Login Widget data using HMAC-SHA256.

    The widget sends: id, first_name, last_name, username, photo_url, auth_date, hash.
    Secret = SHA256(bot_token), then HMAC-SHA256(secret, data_check_string).
    https://core.telegram.org/widgets/login#checking-authorization
    """
    received_hash = data.get("hash")
    if not received_hash:
        return None

    # Build data-check-string: sorted key=value pairs (excluding hash)
    check_parts = []
    for key in sorted(data.keys()):
        if key == "hash":
            continue
        check_parts.append(f"{key}={data[key]}")
    data_check_string = "\n".join(check_parts)

    # Secret key = SHA256(bot_token)  (different from initData which uses HMAC!)
    secret_key = hashlib.sha256(settings.TELEGRAM_BOT_TOKEN.encode()).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        return None

    # Check auth_date freshness (allow up to 24 hours)
    auth_date_str = data.get("auth_date")
    if auth_date_str:
        auth_date = int(auth_date_str)
        if time.time() - auth_date > 86400:
            return None

    return data


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None
