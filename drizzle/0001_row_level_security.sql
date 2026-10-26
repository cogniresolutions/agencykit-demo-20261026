-- Layer 2 of tenant isolation: Postgres row-level security.
--
-- The application connects as the least-privilege role "agencykit_app"
-- (NOSUPERUSER, NOBYPASSRLS, not the table owner). Every request that touches
-- tenant data runs inside a transaction that calls
--   set_config('app.current_sub_account', '<uuid>', true)   -- same as SET LOCAL
-- and, for agency-level screens,
--   set_config('app.current_agency', '<uuid>', true)
-- so even a buggy query without a WHERE clause can only see the active tenant.

CREATE OR REPLACE FUNCTION app_current_sub_account() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.current_sub_account', true), '')::uuid $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_current_agency() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.current_agency', true), '')::uuid $$;
--> statement-breakpoint

-- sub_accounts: visible to the owning agency, or when it is the active tenant.
ALTER TABLE "sub_accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sub_accounts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY sub_accounts_isolation ON "sub_accounts"
  USING (id = app_current_sub_account() OR agency_id = app_current_agency())
  WITH CHECK (agency_id = app_current_agency());
--> statement-breakpoint

-- memberships: active tenant, or any sub-account of the active agency.
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY memberships_isolation ON "memberships"
  USING (
    sub_account_id = app_current_sub_account()
    OR sub_account_id IN (SELECT s.id FROM sub_accounts s WHERE s.agency_id = app_current_agency())
  )
  WITH CHECK (
    sub_account_id = app_current_sub_account()
    OR sub_account_id IN (SELECT s.id FROM sub_accounts s WHERE s.agency_id = app_current_agency())
  );
--> statement-breakpoint

-- Strictly tenant-scoped tables.
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "contacts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY contacts_isolation ON "contacts"
  USING (sub_account_id = app_current_sub_account())
  WITH CHECK (sub_account_id = app_current_sub_account());
--> statement-breakpoint
ALTER TABLE "pipeline_stages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pipeline_stages" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY pipeline_stages_isolation ON "pipeline_stages"
  USING (sub_account_id = app_current_sub_account())
  WITH CHECK (sub_account_id = app_current_sub_account());
--> statement-breakpoint
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "deals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY deals_isolation ON "deals"
  USING (sub_account_id = app_current_sub_account())
  WITH CHECK (sub_account_id = app_current_sub_account());
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "conversations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY conversations_isolation ON "conversations"
  USING (sub_account_id = app_current_sub_account())
  WITH CHECK (sub_account_id = app_current_sub_account());
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "messages" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY messages_isolation ON "messages"
  USING (sub_account_id = app_current_sub_account())
  WITH CHECK (sub_account_id = app_current_sub_account());
--> statement-breakpoint
ALTER TABLE "websites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "websites" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY websites_isolation ON "websites"
  USING (sub_account_id = app_current_sub_account())
  WITH CHECK (sub_account_id = app_current_sub_account());
--> statement-breakpoint

-- audit_log: tenant rows, plus agency-level rows (sub_account_id IS NULL).
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY audit_log_isolation ON "audit_log"
  USING (
    sub_account_id = app_current_sub_account()
    OR (sub_account_id IS NULL AND agency_id = app_current_agency())
  )
  WITH CHECK (
    sub_account_id = app_current_sub_account()
    OR (sub_account_id IS NULL AND agency_id = app_current_agency())
  );
--> statement-breakpoint

-- Narrow, read-only lookups the public website needs before it knows the tenant.
-- SECURITY DEFINER lets them run as the owner, so they return only the ids
-- needed to open a tenant context, and only for published sites / valid keys.
CREATE OR REPLACE FUNCTION app_resolve_site(p_slug text)
  RETURNS TABLE (sub_account_id uuid, website_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT w.sub_account_id, w.id FROM websites w
    WHERE w.slug = p_slug AND w.published = true
    LIMIT 1
  $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_resolve_widget_key(p_hash text)
  RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT s.id FROM sub_accounts s WHERE s.widget_key_hash = p_hash LIMIT 1
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_resolve_site(text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_resolve_widget_key(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_resolve_site(text) TO agencykit_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_resolve_widget_key(text) TO agencykit_app;
--> statement-breakpoint

-- Least-privilege grants for the app role (DML only, no DDL).
GRANT USAGE ON SCHEMA public TO agencykit_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO agencykit_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agencykit_app;
