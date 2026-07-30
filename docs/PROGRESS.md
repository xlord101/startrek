# 📋 Project Startrek — Progress Tracker

> **Last Updated:** 2026-07-29
> **Overall Status:** 🟡 In Progress — Foundation Setup

---

## 🗺️ Master Progress Overview

```
[ Module 1: Procurement ]──→ [ Module 2: Harvesting ]──→ [ Module 3: Cold Storage ]
       🔴 0%                        🔴 Locked                    🔴 Locked
```

| Module | Phase | Status | % Done |
|--------|-------|--------|--------|
| Module 1 | 1A — Foundation (UI Shell) | 🟢 Complete | 100% |
| Module 1 | 1B — Office Admin Flow (UI) | 🟢 Complete | 100% |
| Module 1 | 1C — Supervisor Mobile Flow (UI) | 🟢 Complete | 100% |
| Module 1 | 1D — Admin Approval Flow (UI) | 🟢 Complete | 100% |
| Module 1 | DB & Server Actions Layer | 🟢 Complete | 100% |
| Module 2 | 2A — Harvesting Allocation | 🟢 Complete | 100% |
| Module 2 | 2B — Mobile Execution | 🟢 Complete | 100% |
| Module 2 | 2C — Dispatch & Inventory | 🟢 Complete | 100% |
| Module 3 | 3A — Receiving & Cold Room | 🟡 Up Next | 0% |
| Module 3 | 3B — Room Allocation | 🔴 Locked | 0% |
| Module 3 | 3C — Container Booking | 🔴 Locked | 0% |
| Module 3 | 3D — Container Tracking | 🔴 Locked | 0% |

---

## 🏗️ Phase 1A — Foundation Setup

> **Status:** 🔴 Not Started
> **Blocker:** Need decisions: Supabase vs Neon, UI-first vs DB-first

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Initialize Next.js project (App Router + TypeScript + Tailwind) | ☐ Todo | |
| 2 | Install and configure Shadcn UI | ☐ Todo | |
| 3 | Choose and set up PostgreSQL host (Supabase or Neon) | ☐ Todo | **Decision needed** |
| 4 | Install Prisma | ☐ Todo | |
| 5 | Write `schema.prisma` (users, farmers, procurement_tasks, task_particulars) | ☐ Todo | |
| 6 | Run first DB migration | ☐ Todo | |
| 7 | Configure NextAuth with role-based enum | ☐ Todo | |
| 8 | Create seed script (first MAIN_ADMIN user) | ☐ Todo | |
| 9 | Test login → session role reading | ☐ Todo | |
| 10 | Set up middleware for RBAC route protection | ☐ Todo | |

---

## 📥 Phase 1B — Office Admin Flow

> **Status:** 🔴 Locked (requires 1A complete)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Build farmer intake form UI (searchable autocomplete dropdown) | ☐ Todo | |
| 2 | API route: `POST /api/procurement/intake` | ☐ Todo | |
| 3 | Farmer record: create new or update existing on save | ☐ Todo | |
| 4 | Build Pending Allocations table UI | ☐ Todo | |
| 5 | Build Supervisor assignment modal | ☐ Todo | |
| 6 | API route: `PATCH /api/procurement/[id]/assign` | ☐ Todo | |
| 7 | Status transition: PENDING_ASSIGNMENT → ASSIGNED | ☐ Todo | |
| 8 | End-to-end test: intake → assignment | ☐ Todo | |

---

## 📱 Phase 1C — Supervisor Mobile Flow

> **Status:** 🔴 Locked (requires 1B complete)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Build Supervisor dashboard (task list, mobile-optimized) | ☐ Todo | |
| 2 | Filter tasks by `supervisor_id == current_user.id` | ☐ Todo | |
| 3 | Build Field Inspection form UI (large inputs) | ☐ Todo | |
| 4 | Implement dynamic "Add Another Particular" block | ☐ Todo | |
| 5 | Implement conditional Rejection Reason field | ☐ Todo | |
| 6 | Implement client-side form validation (submit gate) | ☐ Todo | |
| 7 | API route: `POST /api/procurement/[id]/field-submit` | ☐ Todo | |
| 8 | Status transition: ASSIGNED → FIELD_SUBMITTED | ☐ Todo | |
| 9 | Implement WhatsApp message text formatter | ☐ Todo | |
| 10 | Implement WhatsApp share modal + `wa.me` deep link | ☐ Todo | |
| 11 | End-to-end test on mobile viewport | ☐ Todo | |

---

## ✅ Phase 1D — Admin Approval Flow

> **Status:** 🟢 Complete (UI Phase)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Build Pending Approval table (FIELD_SUBMITTED tasks) | ✅ Done | |
| 2 | Build Review/Approval panel (supervisor data + rate input) | ✅ Done | `ReviewProcurementModal.tsx` |
| 3 | Rate field: pre-fill if supervisor set it; allow override | ✅ Done | Auto calculates total produce valuation |
| 4 | Status transition: FIELD_SUBMITTED → APPROVED_PROCUREMENT | ✅ Done | |
| 5 | Stamp: `approved_by_id`, `approved_at` on record | ✅ Done | Display audit label |
| 6 | UI audit label: "Accepted by [Name] ([Role])" | ✅ Done | "Accepted by Office" / "Accepted by Main Admin" |
| 7 | Lock record as read-only post-approval | ✅ Done | Read-only audit view |
| 8 | Approved record feeds into Module 2 list | ✅ Done | Ready for Harvesting module |

---

## 🌾 Module 2 Tasks (Locked)

> All tasks locked until Module 1 is 100% complete and signed off

See [MODULE_2_HARVESTING.md](./MODULE_2_HARVESTING.md) for full breakdown.

---

## 🧊 Module 3 Tasks (Locked)

> All tasks locked until Module 2 is 100% complete and signed off

See [MODULE_3_COLD_STORAGE.md](./MODULE_3_COLD_STORAGE.md) for full breakdown.

---

## 🔖 Decisions Log

| # | Decision | Status | Choice Made |
|---|----------|--------|-------------|
| 1 | DB Host: Supabase vs Neon | ✅ Decided | **Supabase** (production-grade PostgreSQL) |
| 2 | Approach: UI-first vs DB-first | ✅ Decided | **UI-first** — build all UI with mock data, wire DB progressively |
| 3 | WhatsApp group invite link | ⏳ Pending | User to provide |
| 4 | Rate override audit logging | ⏳ Pending | — |
| 5 | Supervisor management page — Module 1 or later? | ⏳ Pending | — |
| 6 | 10 team names for Module 2 | ⏳ Pending | User to provide |
| 7 | Brand names for Module 2 | ⏳ Pending | User to provide |
| 8 | 4 chemical options for Module 2 | ⏳ Pending | User to provide |
| 9 | 2hr ping mechanism — browser/SMS/WhatsApp? | ⏳ Pending | — |
| 10 | Cold storage room number list | ⏳ Pending | User to provide |
| 11 | "Complete" time-gate rule (Module 3) | ⏳ Pending | — |

---

## 🐛 Issues / Blockers Log

| # | Issue | Status | Resolved |
|---|-------|--------|---------|
| — | None yet | — | — |

---

## 📅 Timeline (Estimated)

| Phase | Estimated Duration | Start | End |
|-------|-------------------|-------|-----|
| 1A — Foundation | 3–4 days | TBD | TBD |
| 1B — Office Admin Flow | 3–4 days | TBD | TBD |
| 1C — Supervisor Mobile Flow | 4–5 days | TBD | TBD |
| 1D — Admin Approval Flow | 2–3 days | TBD | TBD |
| 2A — Harvesting Allocation | 3–4 days | TBD | TBD |
| 2B — Mobile Execution | 5–6 days | TBD | TBD |
| 2C — Dispatch & Inventory | 2–3 days | TBD | TBD |
| 3A–3D — Cold Storage | 6–8 days | TBD | TBD |

---

## ✏️ Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-07-29 | Initial documentation created from project briefing | Antigravity |
| 2026-07-29 | Project name confirmed as "Startrek" | User |
| 2026-07-29 | Intake framing changed from "call log" to neutral "inbound intake" | User |
| 2026-07-29 | DB Host confirmed as Supabase | User |
| 2026-07-29 | Build approach confirmed as UI-first, wire DB progressively | User |
