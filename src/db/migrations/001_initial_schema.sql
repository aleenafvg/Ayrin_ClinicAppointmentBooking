-- Migration: 001_initial_schema
-- Description: Create users, doctors, and appointments tables with constraints and indexes.

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    role            VARCHAR(20)     NOT NULL CHECK (role IN ('PATIENT', 'RECEPTION')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. DOCTORS TABLE
-- ============================================================================
CREATE TABLE doctors (
    id              SERIAL          PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    specialization  VARCHAR(255),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. APPOINTMENTS TABLE
-- ============================================================================
CREATE TABLE appointments (
    id                  SERIAL          PRIMARY KEY,
    doctor_id           INTEGER         NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    patient_id          INTEGER         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    start_time          TIMESTAMPTZ     NOT NULL,
    duration_minutes    INTEGER         NOT NULL CHECK (duration_minutes IN (15, 30, 45, 60)),
    status              VARCHAR(20)     NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'CANCELLED')),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

-- idx_appointments_doctor_status_start
-- Supports doctor schedule lookups: "Show all BOOKED appointments for
-- doctor X starting within or after a given time window."
-- Reception staff frequently view a doctor's upcoming schedule or daily
-- appointments. This composite index satisfies equality filters on
-- (doctor_id, status) via index seek, followed by range filtering/ordering
-- on start_time.
-- Note: A complete temporal overlap check between [new_start, new_end) and
-- an existing appointment requires evaluating both start_time and duration:
--   existing.start_time < new_end AND
--   (existing.start_time + existing.duration_minutes * interval '1 minute') > new_start
-- While a range check on start_time alone is not a complete overlap check,
-- this index significantly optimizes candidate appointment retrieval for a
-- doctor before evaluating full interval overlap logic.
CREATE INDEX idx_appointments_doctor_status_start
    ON appointments (doctor_id, status, start_time);

-- idx_appointments_patient_start
-- Supports the patient's appointment list query: "Show me all appointments
-- for patient X, most recent first." When a patient views their appointment
-- history or upcoming visits, the query filters by patient_id and orders
-- by start_time DESC. This index covers both the filter and the sort,
-- avoiding a sequential scan + sort on large tables.
CREATE INDEX idx_appointments_patient_start
    ON appointments (patient_id, start_time DESC, id DESC);

