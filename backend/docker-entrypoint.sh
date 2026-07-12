#!/bin/sh
set -e

for var in DATABASE_URL DIRECT_URL SUPABASE_DB_URL JWT_SECRET; do
  current=$(eval echo \"\$$var\")
  stripped=$(echo "$current" | sed "s/^[[:space:]]*//; s/[[:space:]]*$//; s/^\"//; s/\"$//; s/^'//; s/'$//")
  if [ "$current" != "$stripped" ]; then
    export "$var=$stripped"
  fi
done

exec npm run start
