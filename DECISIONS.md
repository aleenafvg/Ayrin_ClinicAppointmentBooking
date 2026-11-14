# DECISIONS.md

This document explains the main technical and product decisions made while building the Clinic Appointment Booking application, the alternatives considered, and the reasons behind the chosen approaches.

## 1. Database Design and Relational Data

**Decision:** Use PostgreSQL with separate tables for users, doctors, and appointments, connected through foreign keys.

**Alternatives considered:**
- MongoDB with document-based storage.
- PostgreSQL with a single table containing all appointment and user information.

**Why this approach:**
PostgreSQL provides relational integrity through foreign keys and constraints. Separating users, doctors, and appointments avoids unnecessary duplication and makes relationships easier to manage. Indexes were added to support common appointment queries, and pagination uses stable ordering to prevent inconsistent results when appointments share the same start time.

The doctor appointment report uses SQL `LEFT JOIN` and aggregate functions to include doctors even when they have no appointments.

## 2. Authentication and Server-Side Authorization

**Decision:** Use the trusted `X-User-Id` header provided by the assignment to identify the current user, with all authorization checks enforced on the backend.

**Alternatives considered:**
- Implementing a complete login and JWT-based authentication system.
- Relying on frontend role checks to control access.

**Why this approach:**
The assignment does not require registration or login. Using seeded users keeps the implementation focused while still enforcing permissions on the server. Patients can only view and cancel their own appointments, whereas reception staff can manage appointments across patients.

Frontend restrictions are only for user experience; the backend remains responsible for authorization.

## 3. Timezone Handling and Appointment Validation

**Decision:** Store appointment timestamps in UTC and convert them to and from IST (`Asia/Kolkata`) at the application boundary.

**Alternatives considered:**
- Storing timestamps directly in IST.
- Using the browser's local timezone for displaying and entering appointments.

**Why this approach:**
UTC provides consistent timestamp storage, while IST matches the clinic's intended user experience. Patients enter and view appointment times in IST, and the backend handles conversion and validation.

Additional business rules were introduced because the original brief did not specify clinic operating hours:

- The clinic operates between 9 AM and 9 PM IST.
- An appointment must finish by 9 PM. If its end time exceeds closing time, the backend rejects the booking and returns a clear validation error.
- Appointments in the past cannot be booked.
- Past appointments are filtered from the upcoming appointments list rather than being marked as cancelled.
- Cancelled appointments release their time slots for future bookings.

Appointment durations are restricted to 15, 30, 45, or 60 minutes.

## 4. Concurrency, Appointment Overlap, and Doctor Management

**Decision:** Use database transactions and row-level locking to prevent two simultaneous booking requests from successfully reserving the same doctor's overlapping time slot.

**Alternatives considered:**
- Checking for conflicts only in application code without database locking.
- Allowing requests to proceed independently and resolving conflicts afterward.

**Why this approach:**
A simple availability check can fail when two requests arrive at nearly the same time. Locking the relevant doctor row ensures that concurrent booking requests are handled safely.

Appointments use half-open time intervals, so overlapping bookings are rejected while back-to-back appointments are allowed.

Doctor management was also extended beyond the original requirement:

- Reception staff can deactivate doctors who are no longer accepting appointments.
- Reception staff can reactivate doctors when they become available again.
- Inactive doctors cannot receive new bookings, but their historical appointments remain accessible.

## 5. Frontend Experience and Scheduling

**Decision:** Build a responsive interface with separate patient and reception experiences, using reusable React components and clear application states.

**Alternatives considered:**
- A single basic appointment form and list for all users.
- A more complex scheduling interface showing every doctor's appointments together.

**Why this approach:**
Separate patient and reception experiences make the available actions clearer. Patients can discover doctors, book appointments, view their appointments, and cancel their own bookings. Reception staff can manage appointments and doctors.

Additional frontend improvements include:

- Horizontal specialty filter tabs for easier doctor discovery.
- Doctor search to find doctors by name or specialty.
- Doctor profile portraits.
- Demo ratings displayed on doctor profiles, clearly identified as sample data rather than verified patient reviews.
- A weekly calendar showing Monday through Sunday for one selected doctor at a time.
- Appointment details accessible from calendar entries.
- Loading, empty, success, and error states, along with clear booking validation messages.
- Pagination for appointment lists.

The weekly calendar allows reception staff to select a doctor and review that doctor's schedule, including historical appointments for inactive doctors.

---

## Additional Feature: AI Clinic Assistant

**Decision:** Add a separate Gemini-powered FAQ assistant to help patients with basic clinic-related questions.

**Implementation:**
- Uses the Gemini API.
- Answers questions using a controlled clinic FAQ knowledge base.
- Visible only in the patient interface.
- Includes guardrails for medical questions and avoids providing medical diagnoses.
- Does not access patient records or appointment data.
- Uses a request timeout and returns a graceful error when the API key is missing or the service is unavailable.

**Why this approach:**
The assistant adds a small AI-powered feature without making the core appointment-booking workflow dependent on an external AI service. Keeping it separate also ensures that the main application continues to function if the chatbot is unavailable.

