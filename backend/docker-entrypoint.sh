#!/bin/sh
set -e

for var in DATABASE_URL DIRECT_URL SUPABASE_DB_URL JWT_SECRET; do
  current=$(eval echo \"\$$var\")
  stripped=$(echo "$current" | sed "s/^[[:space:]]*//; s/[[:space:]]*$//; s/^\"//; s/\"$//; s/^'//; s/'$//")
  if [ "$current" != "$stripped" ]; then
    export "$var=$stripped"
  fi
done

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  npx prisma migrate deploy
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  npm run seed
fi

if [ "$#" -eq 0 ]; then
  set -- npm run start
fi

exec "$@"
