#!/bin/bash

# VARIABLES: https://docs.prefect.io/v3/concepts/variables#through-the-cli

# creates or updates a variable.
# prefect variable set

# retrieves a variable’s value.
prefect variable get url

# deletes a variable.
# prefect variable unset

# lists all variables.
prefect variable ls

# shows a variable’s details.
prefect variable inspect url