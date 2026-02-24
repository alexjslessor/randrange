
from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict

# - flipping env_settings and init_settings, environment variables now have precedence over __init__ kwargs.
# - you can ignore sources completely by removing them from the return tuple
#   - ignore arguments from init_settings return env_settings, file_secret_settings

# Default: https://docs.pydantic.dev/latest/api/pydantic_settings/#pydantic_settings.BaseSettings
# @classmethod
# def settings_customise_sources(
#     cls,
#     settings_cls: type[BaseSettings],
#     init_settings: PydanticBaseSettingsSource,
#     env_settings: PydanticBaseSettingsSource,
#     dotenv_settings: PydanticBaseSettingsSource,
#     file_secret_settings: PydanticBaseSettingsSource,
# ) -> tuple[PydanticBaseSettingsSource, ...]:
#     """
#     Define the sources and their order for loading the settings values.

#     Args:
#         settings_cls: The Settings class.
#         init_settings: The `InitSettingsSource` instance.
#         env_settings: The `EnvSettingsSource` instance.
#         dotenv_settings: The `DotEnvSettingsSource` instance.
#         file_secret_settings: The `SecretsSettingsSource` instance.

#     Returns:
#         A tuple containing the sources and their order for loading the settings values.
#     """
#     return init_settings, env_settings, dotenv_settings, file_secret_settings


class Settings(BaseSettings):
    '''
    - settings_customise_sources takes 4 callables as arguments 
        - and returns any number of callables as a tuple.
    - https://docs.pydantic.dev/latest/concepts/pydantic_settings/#customise-settings-sources
    '''
    database_dsn: PostgresDsn


class SettingsV1(Settings):

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        """fliped env_settings and init_settings, 
        environment variables now have precedence over __init__ kwargs.

        Args:
            settings_cls (type[BaseSettings]): The default field values for the Settings model.
            init_settings (PydanticBaseSettingsSource): Arguments passed to the Settings class initialiser.
            env_settings (PydanticBaseSettingsSource): Environment variables,
            dotenv_settings (PydanticBaseSettingsSource): Variables loaded from a dotenv (.env) file.
            file_secret_settings (PydanticBaseSettingsSource): Variables loaded from the secrets directory.

        Returns:
            tuple[PydanticBaseSettingsSource, ...]: _description_
        """
        return env_settings, init_settings, file_secret_settings

# print(SettingsV1(database_dsn='postgres://postgres@localhost:5432/kwargs_db'))
#> database_dsn=PostgresDsn('postgres://postgres@localhost:5432/kwargs_db')

class Settings(BaseSettings):
    database_dsn: PostgresDsn = 'database_dsn=postgres://postgres@localhost:5432/class_default_db'

class SettingsV2(Settings):
    model_config = SettingsConfigDict(
        env_file=".env.prod",
        env_file_encoding="utf-8",
        extra='ignore'
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        dotenv_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        init_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            dotenv_settings,
            env_settings, 
        )

# settings = SettingsV2(_env_file='.env.dev')
# print(settings)
#> database_dsn=PostgresDsn('postgres://postgres@localhost:5432/kwargs_db')