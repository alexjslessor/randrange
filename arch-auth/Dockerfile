# https://hub.docker.com/_/python/
ARG PY_VERSION=3.12
ARG PY_IMG_VERSION=slim-bullseye
FROM python:${PY_VERSION}-${PY_IMG_VERSION}

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=yes \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    C_FORCE_ROOT=1

WORKDIR /usr/src/app

RUN apt-get update

RUN apt-get install -y \
    build-essential \
    python3-dev \
    python3-pip \
    python3-setuptools \
    python3-wheel \
    python3-cffi \
    shared-mime-info \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY ./pyproject.toml ./pyproject.toml
COPY ./api ./api

RUN /usr/local/bin/python -m pip install --upgrade pip \
    && pip install --no-cache-dir .

ARG PY_VERSION
RUN find /usr/local/lib/python${PY_VERSION} -name '*.c' -delete \
    && find /usr/local/lib/python${PY_VERSION} -name '*.pxd' -delete \
    && find /usr/local/lib/python${PY_VERSION} -name '*.pyd' -delete \
    && find /usr/local/lib/python${PY_VERSION} -name '__pycache__' | xargs rm -r

COPY . .

EXPOSE ${PORT}

CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT} --loop uvloop --lifespan on
