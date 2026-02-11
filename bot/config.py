from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_BOT_USERNAME: str = "predskazu_bot"
    WEBAPP_URL: str = "https://xn--80ahcgkj6ail.xn--p1ai"
    APP_URL: str = "https://xn--80ahcgkj6ail.xn--p1ai"
    REDIS_URL: str = "redis://redis:6379/0"
    APP_DEBUG: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
