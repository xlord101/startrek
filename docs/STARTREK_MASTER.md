# 🚀 Project Startrek — Master Reference Document

> **Last Updated:** 2026-07-29
> **Status:** 🟡 Planning & Foundation Phase

---

## 📖 Project Overview

**Startrek** is a responsive web application for agricultural supply chain management, specifically designed for a **banana produce business**. It tracks the full lifecycle of produce from:

```
Farmer Intake (Procurement)
    → Field Inspection
        → Harvest Execution
            → Cold Storage
                → Container Dispatch
```

The system operates across **5 distinct user roles** with a strict **downward-only data flow** — lower roles cannot access data from higher levels. Only the Main Admin has full visibility.

---

## 👥 User Roles & Access Levels

| # | Role | Access Scope | Device |
|---|------|-------------|--------|
| 1 | **Main Admin** | Full system — all modules, all data, override anything, manage users | Desktop |
| 2 | **Office Admin** | Intake, allocation, approval, rate finalization | Desktop |
| 3 | **Field Supervisor** | Only their own assigned tasks | Mobile (Primary) |
| 4 | **Inventory Admin** | Warehouse intake, box tracking, return verification | Desktop/Mobile |
| 5 | **Cold Storage Admin** | Storage room allocation, dispatch verification | Desktop |

### RBAC Rules (Non-Negotiable)
- ❌ No upward data access — a Supervisor cannot see admin data
- ❌ No lateral access — Supervisor A cannot see Supervisor B's tasks
- ✅ Main Admin sees everything at all times
- ✅ Office Admin + Main Admin share allocation and approval authority
- ✅ Multiple supervisors share the same UI but have isolated data views
- ✅ Main Admin and Office Admin can add/remove supervisors

---

## 🛠️ Tech Stack (Decided)

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Framework** | Next.js (App Router) | SSR for admin dashboards, CSR for mobile supervisor views, PWA-ready |
| **Database** | PostgreSQL | Relational data with strict integrity (tonnage, rates, audit trails) |
| **ORM** | Prisma | Type-safe migrations and relations |
| **Auth** | NextAuth (Auth.js) | RBAC out of the box, session management |
| **Styling** | Tailwind CSS + Shadcn UI | Responsive, desktop-dense & mobile-friendly |
| **DB Hosting** | Supabase or Neon | Managed serverless PostgreSQL, generous free tier |
| **App Hosting** | Vercel | Optimized for Next.js, global edge delivery |
| **File Storage** | Supabase Storage / AWS S3 | For future field evidence photos |

---

## 📦 Module Index

| Module | Name | Status |
|--------|------|--------|
| [Module 1](./MODULE_1_PROCUREMENT.md) | Procurement Process | 🔴 Not Started |
| [Module 2](./MODULE_2_HARVESTING.md) | Harvesting | 🔴 Not Started |
| [Module 3](./MODULE_3_COLD_STORAGE.md) | Cold Storage & Fulfillment | 🔴 Not Started |

---

## 🗄️ Database Schema Overview

### Table: `users`
```
id              UUID (PK)
name            String
email           String (Unique)
password_hash   String
role            Enum: MAIN_ADMIN | OFFICE_ADMIN | SUPERVISOR | INVENTORY_ADMIN | COLD_STORAGE_ADMIN
is_active       Boolean
created_at      Timestamp
```

### Table: `farmers`
```
id              UUID (PK)
name            String
mobile_number   String (Unique)
address         Text
created_at      Timestamp
```

### Table: `procurement_tasks`
```
id                      UUID (PK)
farmer_id               FK → farmers
approx_tonnage          Decimal
status                  Enum: PENDING_ASSIGNMENT | ASSIGNED | FIELD_SUBMITTED | APPROVED_PROCUREMENT
supervisor_id           FK → users (Nullable)
assigned_at             Timestamp (Nullable)

-- Field Inspection Data (filled by supervisor)
actual_tonnage          Decimal (Nullable)
ratio_percentage        Decimal (Nullable)
quality                 Enum: EXCELLENT | GOOD | AVERAGE | REJECT (Nullable)
rejection_reason        Text (Nullable)
alt_mobile_number       String (Nullable)
rate                    Decimal (Nullable)
supervisor_submitted_at Timestamp (Nullable)

-- Final Approval Data
final_rate              Decimal (Nullable)
approved_by_id          FK → users (Nullable)
approved_at             Timestamp (Nullable)
```

### Table: `task_particulars`
```
id          UUID (PK)
task_id     FK → procurement_tasks
box_type    Enum: 5KG | 7KG | 13KG | 13_5KG | 16KG
```

---

## 🤖 Agent Context & Working Rules

> These rules govern how Antigravity (the coding agent) should behave throughout development.

### ✅ DO
- Work **strictly module by module** — do not bleed logic from one module into another prematurely
- Always **check this master doc and the relevant module doc** before starting any work
- Keep the **PROGRESS tracker** updated after completing any task
- Use **Prisma migrations** — never manually alter the database schema
- Maintain **role-based guards** on every API route and page using NextAuth middleware
- Build **mobile-first** for all Supervisor interfaces
- Build **desktop-optimized** (data-dense) for Admin/Office interfaces
- Use **Shadcn UI components** for all form elements, dropdowns, modals, tables
- Format **WhatsApp share text** exactly as described in Module 1.3
- Mark task status transitions **atomically** — update status + timestamp together

### ❌ DO NOT
- Do not build modules out of order without explicit user approval
- Do not allow data access that violates RBAC (always verify role server-side)
- Do not use hardcoded user IDs or names anywhere — always pull from session/DB
- Do not make the "call intake" the primary framing — it's just one medium; the form is neutral
- Do not expose approved procurement records to modification after `APPROVED_PROCUREMENT` status
- Do not skip the WhatsApp integration on supervisor form submission
- Do not allow form submission unless all required fields are filled (enforce both client + server side)
- Do not mix inventory or cold storage logic into Module 1

### 🔄 Status Transition Rules (Module 1)
```
[Form Filled by Admin] → PENDING_ASSIGNMENT
         ↓ [Supervisor Assigned]
      ASSIGNED
         ↓ [Supervisor Submits Field Form]
   FIELD_SUBMITTED
         ↓ [Admin Reviews + Rate + Confirm]
  APPROVED_PROCUREMENT  ←→  (Read-only, feeds Module 2)
```

---

## 📋 Overall Progress Tracker

See [PROGRESS.md](./PROGRESS.md) for the full granular task checklist.

---

## 🔖 Key Design Decisions (Logged)

| Decision | Choice | Reason |
|----------|--------|--------|
| UI-first or DB-first? | TBD by user | Waiting for user direction |
| Supabase vs Neon? | TBD by user | Both work, user to decide |
| Native app (Capacitor)? | Later phase | Not priority for Module 1 |
| WhatsApp Business API vs wa.me link? | `wa.me` deep link | No API cost, works natively on mobile |
| Dedicated group link for WhatsApp? | TBD | User to provide group invite link |

---

## 📁 File & Folder Conventions

```
/startrek
  /docs
    STARTREK_MASTER.md       ← You are here
    MODULE_1_PROCUREMENT.md
    MODULE_2_HARVESTING.md
    MODULE_3_COLD_STORAGE.md
    PROGRESS.md
  /src
    /app                     ← Next.js App Router pages
    /components              ← Shared UI components
    /lib                     ← Prisma client, auth helpers, utils
    /prisma
      schema.prisma
```
