-- ResQNet schema for Supabase (Postgres 15)
-- ============================================
-- OPTIONAL: the FastAPI backend runs `Base.metadata.create_all()` on startup and
-- will create these tables automatically on first boot. Use this script only if
-- you want the schema to exist BEFORE the backend starts, or to inspect it.
--
-- How to use:
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Paste this whole file and click Run.
--   3. Tables appear under Database -> Tables in the `public` schema.
--
-- NOTE: RLS (row-level security) is left DISABLED on all tables because the
-- backend connects with the database password directly (bypassing PostgREST),
-- so no policies are needed. Keep this as-is.

BEGIN;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.alert_severity AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);

CREATE TYPE public.assignment_status AS ENUM (
    'OFFERED',
    'ACCEPTED',
    'DECLINED',
    'ON_THE_WAY',
    'ARRIVED',
    'COMPLETED'
);

CREATE TYPE public.shelter_status AS ENUM (
    'OPEN',
    'FULL',
    'CLOSED'
);

CREATE TYPE public.sos_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);

CREATE TYPE public.sos_status AS ENUM (
    'SUBMITTED',
    'VERIFIED',
    'ASSIGNED',
    'RESPONDER_ON_WAY',
    'ASSISTANCE_PROVIDED',
    'RESOLVED',
    'REJECTED'
);

CREATE TYPE public.user_role AS ENUM (
    'REQUESTER',
    'DISASTER_MGMT_TEAM',
    'AUTHORITY'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.alerts (
    alert_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    severity public.alert_severity NOT NULL,
    target_area character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.assignments (
    assignment_id uuid NOT NULL,
    sos_id character varying(50) NOT NULL,
    team_id uuid NOT NULL,
    status public.assignment_status NOT NULL,
    distance_km double precision,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.awareness_content (
    content_id uuid NOT NULL,
    disaster_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    media_url text,
    target_area character varying(255),
    is_program boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.disaster_mgmt_teams (
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    team_name character varying(255) NOT NULL,
    specialization character varying(50)[] NOT NULL,
    experience_level character varying(50) NOT NULL,
    is_available boolean NOT NULL,
    current_lat double precision,
    current_lng double precision,
    badge_number character varying(100) NOT NULL,
    contact_phone character varying(50),
    location_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.relief_shelters (
    shelter_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    address character varying(255) NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    capacity integer NOT NULL,
    occupied integer NOT NULL,
    contact_phone character varying(50) NOT NULL,
    status public.shelter_status NOT NULL,
    supplies character varying(100)[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.sos_requests (
    sos_id character varying(50) NOT NULL,
    requester_user_id uuid,
    guest_name character varying(255),
    guest_phone character varying(50),
    emergency_type character varying(50) NOT NULL,
    description text NOT NULL,
    people_affected integer NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    priority public.sos_priority NOT NULL,
    status public.sos_status NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.users (
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(50) NOT NULL,
    email character varying(255),
    password_hash character varying(255) NOT NULL,
    role public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ---------------------------------------------------------------------------
-- Primary keys
-- ---------------------------------------------------------------------------

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (alert_id);

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (assignment_id);

ALTER TABLE ONLY public.awareness_content
    ADD CONSTRAINT awareness_content_pkey PRIMARY KEY (content_id);

ALTER TABLE ONLY public.disaster_mgmt_teams
    ADD CONSTRAINT disaster_mgmt_teams_badge_number_key UNIQUE (badge_number);

ALTER TABLE ONLY public.disaster_mgmt_teams
    ADD CONSTRAINT disaster_mgmt_teams_pkey PRIMARY KEY (team_id);

ALTER TABLE ONLY public.relief_shelters
    ADD CONSTRAINT relief_shelters_pkey PRIMARY KEY (shelter_id);

ALTER TABLE ONLY public.sos_requests
    ADD CONSTRAINT sos_requests_pkey PRIMARY KEY (sos_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX ix_assignments_sos_id ON public.assignments USING btree (sos_id);
CREATE INDEX ix_assignments_status ON public.assignments USING btree (status);
CREATE INDEX ix_assignments_team_id ON public.assignments USING btree (team_id);
CREATE UNIQUE INDEX ix_disaster_mgmt_teams_user_id ON public.disaster_mgmt_teams USING btree (user_id);
CREATE INDEX ix_sos_requests_requester_user_id ON public.sos_requests USING btree (requester_user_id);
CREATE INDEX ix_sos_requests_status ON public.sos_requests USING btree (status);
CREATE UNIQUE INDEX ix_users_phone ON public.users USING btree (phone);
CREATE INDEX ix_users_role ON public.users USING btree (role);

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_sos_id_fkey FOREIGN KEY (sos_id) REFERENCES public.sos_requests(sos_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.disaster_mgmt_teams(team_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.disaster_mgmt_teams
    ADD CONSTRAINT disaster_mgmt_teams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sos_requests
    ADD CONSTRAINT sos_requests_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;

COMMIT;

-- ---------------------------------------------------------------------------
-- If you already ran the previous version of this schema (no location column):
-- ---------------------------------------------------------------------------
-- ALTER TABLE public.disaster_mgmt_teams ADD COLUMN IF NOT EXISTS location_updated_at timestamp with time zone;
