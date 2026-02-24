#!/bin/bash


snowfakery arch-auth/tests/db.yaml --dburl sqlite:///arch-auth/tests/users.db
sqlitebrowser arch-auth/tests/users.db