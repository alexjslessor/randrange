
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(levelname)s - %(name)s - %(funcName)s - %(message)s",
            # "datefmt": "%H:%M",
        },
        "access": {
            "format": '%(asctime)s - %(levelname)s - %(message)s',
            # "datefmt": "%H:%M",
        }

    },
    "handlers": {
        "default": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "default",
        },
        "access": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "access",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "formatter": "default",
            "filename": "logs.log",
            "maxBytes": 100000000,
            "backupCount": 3
        }
    },
    "root": {
        "handlers": [
            "default", 
            'file',
        ],
        "level": "INFO",
    },
    "loggers": {
        "uvicorn": {
            "handlers": ["default", 'file'],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn.error": {
            "handlers": ["default", 'file'],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn.access": {
            "handlers": ["access", 'file'],
            "level": "INFO",
            "propagate": False,
        },
    },
}