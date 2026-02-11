from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_env_file = Path(__file__).resolve().parent.parent.parent.parent / ".env"


class Settings(BaseSettings):
    # App
    APP_ENV: str = "production"
    APP_DEBUG: bool = False
    APP_URL: str = "https://predict.ru"
    WEBAPP_URL: str = "https://app.predict.ru"

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_BOT_USERNAME: str = "predictru_bot"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://predictru:changeme@postgres:5432/predictru"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "change-me-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days

    # Admin
    ADMIN_TELEGRAM_IDS: str = ""

    # Sentry
    SENTRY_DSN: str = ""

    # Trading
    TRADE_FEE_PERCENT: float = 2.0  # 2% commission on trades
    MIN_BET_DEFAULT: float = 1.0
    MAX_BET_DEFAULT: float = 10000.0
    SIGNUP_BONUS: float = 1000.0

    # B2B
    B2B_API_KEY: str = ""

    @property
    def admin_ids(self) -> set[int]:
        if not self.ADMIN_TELEGRAM_IDS:
            return set()
        return {int(x.strip()) for x in self.ADMIN_TELEGRAM_IDS.split(",") if x.strip()}

    model_config = SettingsConfigDict(
        env_file=str(_env_file),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
