#!/bin/bash

docker compose down keycloak && docker volume rm prefect_keycloak_volume && docker compose up keycloak -d
