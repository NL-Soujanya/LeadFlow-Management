/*
# Lead Management Platform — Core Schema

## Purpose
A lead management application for a small sales team. Supports a public lead-capture
form, an authenticated admin/member app, lead lifecycle (status pipeline, assignment,
notes, activity trail), and a JSON API.

## New Tables
1. `profiles` — one row per auth user; holds role (admin/member).
2. `leads` — the lead records with status pipeline, assignment, source.
3. `lead_notes` — timestamped notes attached to a lead.
4. `lead_activities` — append-only activity trail per lead.

## Security (RLS)
- profiles: authenticated read all (team directory); update own.
- leads: authenticated read/update/delete (shared pipeline); anon+authenticated insert (public form).
- lead_notes: authenticated read; insert/update own.
- lead_activities: authenticated read; anon+authenticated insert.

## Notes
1. Trigger auto-creates a profile row on signup (default role 'member').
2. Trigger maintains leads.updated_at.
3. The edge function performs real admin/member permission checks server-side; RLS is a defense-in-depth gate.
*/

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- leads
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  message text,
  source text NOT NULL DEFAULT 'website',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal','won','lost')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select_authenticated" ON leads;
CREATE POLICY "leads_select_authenticated"
  ON leads FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "leads_insert_anon_authenticated" ON leads;
CREATE POLICY "leads_insert_anon_authenticated"
  ON leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "leads_update_authenticated" ON leads;
CREATE POLICY "leads_update_authenticated"
  ON leads FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "leads_delete_authenticated" ON leads;
CREATE POLICY "leads_delete_authenticated"
  ON leads FOR DELETE TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ============================================================
-- lead_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_authenticated" ON lead_notes;
CREATE POLICY "notes_select_authenticated"
  ON lead_notes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "notes_insert_authenticated" ON lead_notes;
CREATE POLICY "notes_insert_authenticated"
  ON lead_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_update_own" ON lead_notes;
CREATE POLICY "notes_update_own"
  ON lead_notes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- lead_activities
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_select_authenticated" ON lead_activities;
CREATE POLICY "activities_select_authenticated"
  ON lead_activities FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "activities_insert_anon_authenticated" ON lead_activities;
CREATE POLICY "activities_insert_anon_authenticated"
  ON lead_activities FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(type);

-- ============================================================
-- updated_at trigger for leads
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), 'member')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
