# "World Class" Platform Re-Architecture Plan

I acknowledge the previous implementation relied too heavily on UI mocks. This plan focuses on **Data Integrity**, **Real Backend Architecture**, and **Production-Grade Features**.

## 1. Database Infrastructure Overhaul (`src/db/schema.ts`)
**Goal:** Replace all hardcoded/mock data with relational database tables.
- **New Tables:**
    - `analytics_metrics`: Time-series data for Reach, Engagement, and Impressions per platform.
    - `crm_contacts`: Centralized table for leads (Audience) with rich profiles.
    - `crm_interactions`: Log of every chat, email, or call with a contact.
    - `system_health`: Logs for API token status, ping latency, and sync errors.
    - `content_calendar`: Unified table for Scheduler and Drafts with approval states.

## 2. Real Data Seeding Engine (`src/db/seed.ts`)
**Goal:** Populate the database with 12 months of realistic, high-fidelity data to prove the "World Class" capabilities.
- **Scope:**
    - Generate 365 days of growth metrics (showing trends).
    - Create 50+ detailed "VIP" contacts with interaction history.
    - Simulate 100+ scheduled/published posts across 4 platforms.

## 3. "Command Center" Dashboard V2 (`src/app/page.tsx`)
**Goal:** A live, data-driven operational view.
- **Features:**
    - **Live Ticker:** Real-time stream of incoming events (DB-driven).
    - **Health Grid:** Real status of the 4 platform connections (DB-driven).
    - **Revenue/Lead Metrics:** Aggregated from the new CRM tables.

## 4. Feature "Deepening"
- **Analytics**: Connect the UI to the `analytics_metrics` table for real interactive graphing.
- **Inbox**: Connect the sidebar to `crm_contacts` so clicking a user *actually* pulls their DB profile.
- **Scheduler**: Connect the calendar to `content_calendar` to allow persistent drag-and-drop updates.

## Execution Order
1.  **Schema & Seed**: Build the foundation first.
2.  **Dashboard**: Prove the data is live.
3.  **Analytics & CRM**: Wire up the complex views to the new data.
