-- Runs once on first DB boot (docker-entrypoint-initdb.d).
-- PostGIS ships with the base image; enable it plus pgvector here so the
-- database is ready for geospatial + vector workloads before any migration.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- Sanity: surface versions in the init logs.
DO $$
BEGIN
    RAISE NOTICE 'PostGIS: %', postgis_version();
    RAISE NOTICE 'pgvector: %', (SELECT extversion FROM pg_extension WHERE extname = 'vector');
END $$;
