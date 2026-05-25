from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    DATABASE_URL: str
    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str
    SECRET_KEY: str
    ALLOWED_ORIGINS:list[str] = ["http://localhost:3000","https://card-game-five-puce.vercel.app"]


settings = Settings()
