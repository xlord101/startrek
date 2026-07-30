# 🤖 Startrek — Agent Context File (Feed This First!)

> Drop this file at the start of every new Antigravity session.
> Last Updated: 2026-07-29

---

## What is Startrek?

A responsive web application for **agricultural supply chain management** (banana produce business).
Covers: Farmer Intake → Field Inspection → Harvesting → Cold Storage → Container Dispatch.

**Project Language:** TypeScript
**Framework:** Next.js (App Router)
**Styling:** Tailwind CSS + Shadcn UI
**DB:** PostgreSQL via Prisma ORM
**Auth:** NextAuth with RBAC
**Hosting:** Vercel (app) + Supabase or Neon (DB)

---

## 5 User Roles (Strict Downward Data Flow)

1. **MAIN_ADMIN** — Full access, override anything
2. **OFFICE_ADMIN** — Intake, allocation, approval
3. **SUPERVISOR** — Only their own assigned tasks (mobile)
4. **INVENTORY_ADMIN** — Box tracking + return verification
5. **COLD_STORAGE_ADMIN** — Room allocation + dispatch

---

## Current Focus

**Module 1 — Procurement** (4 steps):
1. **Intake** → Admin fills farmer info → task `PENDING_ASSIGNMENT`
2. **Allocation** → Admin assigns supervisor → task `ASSIGNED`
3. **Field Inspection** → Supervisor fills on-site form → task `FIELD_SUBMITTED` + WhatsApp share
4. **Approval** → Admin reviews + sets rate → task `APPROVED_PROCUREMENT` (locked, feeds Module 2)

---

## Critical Rules for Agent

- ❌ Never allow upward/lateral data access
- ❌ Never hardcode user IDs or names
- ❌ Never let intake form imply "call" as the only medium — it's neutral intake
- ❌ Never allow records to be edited post-`APPROVED_PROCUREMENT`
- ❌ Never start Module 2 work before Module 1 is fully done
- ✅ Always protect API routes server-side with role checks
- ✅ Always use Prisma migrations — never raw SQL schema changes
- ✅ Supervisor UI must be mobile-first (large inputs, touch-friendly)
- ✅ Admin UI must be desktop-optimized (data-dense tables)
- ✅ WhatsApp share MUST trigger on supervisor form submit
- ✅ Form submit MUST be blocked (disabled) until all required fields are filled

---

## Key Files to Reference

| File | Purpose |
|------|---------|
| [STARTREK_MASTER.md](./STARTREK_MASTER.md) | Full roles, DB schema, rules, module index |
| [MODULE_1_PROCUREMENT.md](./MODULE_1_PROCUREMENT.md) | Current module — all steps, fields, API routes |
| [MODULE_2_HARVESTING.md](./MODULE_2_HARVESTING.md) | Next module — review only, do not build yet |
| [MODULE_3_COLD_STORAGE.md](./MODULE_3_COLD_STORAGE.md) | Future module — review only |
| [PROGRESS.md](./PROGRESS.md) | Task checklist — update after every completed task |

---

## Before Starting Any Session — Checklist

- [ ] Read PROGRESS.md — know what's done and what's next
- [ ] Read the relevant module doc before writing any code
- [ ] Confirm current phase with user before proceeding
- [ ] Update PROGRESS.md task status as you complete items
- [ ] Log any new decisions in PROGRESS.md > Decisions Log
- [ ] Log any new issues/blockers in PROGRESS.md > Issues Log

---

## Pending Decisions (Get from User Before Starting)

1. **DB Host** — Supabase or Neon?
2. **Build approach** — UI-first (design then wire-up) or DB-first (schema + API then UI)?
3. **WhatsApp group** — user to provide the group invite link
