from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_BOT_USERNAME: str = "predictru_bot"
    WEBAPP_URL: str = "https://app.predict.ru"
    APP_URL: str = "https://predict.ru"
    REDIS_URL: str = "redis://redis:6379/0"
    APP_DEBUG: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
