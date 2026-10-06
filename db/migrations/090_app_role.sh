#!/bin/sh
# The site connects as filmbox_web, never as postgres. It inherits filmbox_app (least privilege, M16.1).
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v pw="$FILMBOX_WEB_PASSWORD" <<'SQL'
CREATE ROLE filmbox_web LOGIN PASSWORD :'pw' IN ROLE filmbox_app;
GRANT USAGE ON SCHEMA public TO filmbox_web;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO filmbox_web;
SQL
