# 📦 Module 1: Procurement Process

> **Module Status:** 🔴 Not Started
> **Priority:** 🔥 First — Build this before any other module
> **Last Updated:** 2026-07-29
> **Depends on:** Foundation Setup (Next.js, Prisma, NextAuth)

---

## 📌 Module Purpose

The Procurement module is the **entry point of the entire system**. It captures yield information from farmers, assigns a field supervisor to verify the farm, collects actual on-site data, and finally locks the approved procurement record for use in the Harvesting module.

> ⚠️ **Important:** The intake form is NOT a "call log". It is a neutral data entry form. Information may arrive via call, WhatsApp, email, or in-person — the system doesn't care about the medium.

---

## 👤 Actors Involved

| Actor | Role in This Module |
|-------|-------------------|
| Office Admin | Fills intake form, assigns supervisor, does final approval |
| Main Admin | Same authorities as Office Admin + override capability |
| Field Supervisor | Views assigned task, fills field inspection form, submits |

---

## 🗂️ Sub-Steps

### Step 1.1 — Inbound Intake Form
**Actor:** Office Admin / Main Admin
**Interface:** Desktop

**What happens:**
- Admin receives yield information (any medium)
- Opens the intake form and fills farmer details
- Farmer name field is a **searchable dropdown** linked to the `farmers` DB table
  - If farmer already exists → prefill address & mobile, allow edit
  - If farmer is new → create a new `farmers` record on save
- Saves task to DB

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Farmer Name | Searchable Dropdown + New Entry | ✅ | Links to `farmers` table |
| Address | Text | ✅ | Editable even for existing farmer |
| Mobile Number | String | ✅ | Stored on farmer record |
| Approximate Tonnage | Decimal Number | ✅ | Field estimate |

**On Save:**
- Creates new `procurement_tasks` record
- Sets `status = PENDING_ASSIGNMENT`
- Farmer record created/updated in `farmers` table

---

### Step 1.2 — Supervisor Allocation
**Actor:** Office Admin / Main Admin
**Interface:** Desktop

**What happens:**
- Admin views a list/table of all `PENDING_ASSIGNMENT` tasks
- Clicks a task → pulls up the intake data in an editable panel/modal
- Selects a supervisor from a **dropdown of active SUPERVISOR-role users**
- Saves the assignment

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Farmer Name | Text (pre-filled, editable) | ✅ | |
| Address | Text (pre-filled, editable) | ✅ | |
| Mobile Number | String (pre-filled, editable) | ✅ | |
| Approximate Tonnage | Decimal (pre-filled, editable) | ✅ | |
| Assign Supervisor | Dropdown (active supervisors) | ✅ | Pulls from `users` where role=SUPERVISOR and is_active=true |

**On Save:**
- Updates `procurement_tasks` record
- Sets `status = ASSIGNED`
- Sets `supervisor_id` and `assigned_at`
- Task now appears on the selected Supervisor's dashboard

---

### Step 1.3 — Field Inspection & Verification
**Actor:** Field Supervisor
**Interface:** Mobile-Optimized (large inputs, touch-friendly)

**What happens:**
- Supervisor logs in, sees ONLY tasks assigned to them (`supervisor_id == current_user.id`)
- Opens task card → sees intake details
- Travels to site, fills out the field form
- Form submit is **disabled** until all required fields are complete
- On successful submit → **WhatsApp share popup** triggers

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text (pre-filled) | ✅ | Can edit on-site |
| Address | Text (pre-filled) | ✅ | Can edit on-site |
| Mobile Number | String (pre-filled) | ✅ | Can edit |
| Alternate Number | String | ❌ | Optional |
| Box Particulars | Dynamic Repeatable Block | ✅ | At least one required |
| → Box Type | Dropdown: 5kg, 7kg, 13kg, 13.5kg, 16kg | ✅ | Per block |
| → "Add Another Particular" | Ghost Button | — | Adds new block |
| Total Actual Tonnage | Decimal | ✅ | On-site measured value |
| Ratio (%) | Decimal | ✅ | |
| Quality | Dropdown: Excellent, Good, Average, Reject | ✅ | |
| → Rejection Reason | Textarea | ✅ if Reject | Only visible when Reject selected |
| Rate (₹) | Decimal | ❌ | Optional — admin can set/override later |

**On Submit:**
1. All data saved to `procurement_tasks` + `task_particulars`
2. Status → `FIELD_SUBMITTED`
3. `supervisor_submitted_at` timestamp set
4. **WhatsApp share modal appears**

**WhatsApp Message Format:**
```
*Startrek - Field Report*
--------------------------
Farmer: [Farmer Name]
Address: [Address]
Mobile: [Number]

*Box Particulars:*
[Box Type 1]
[Box Type 2] (if any)

Actual Tonnage: [X] ton
Ratio: [X]%
Quality: [Excellent/Good/Average/Reject]
[Rejection Reason: ... (if applicable)]
Rate: ₹[X] (if filled)
--------------------------
Submitted by: [Supervisor Name]
```

- Clicking "Share to WhatsApp" opens: `https://wa.me/?text=[encoded_message]`
- This opens WhatsApp on mobile and lets supervisor pick their group

---

### Step 1.4 — Final Approval & Rate Lock
**Actor:** Office Admin / Main Admin
**Interface:** Desktop

**What happens:**
- Admin sees all `FIELD_SUBMITTED` tasks in a "Pending Approval" section
- Opens task → views all data submitted by supervisor
- If rate was not filled by supervisor → Admin fills it here
- If rate was filled → Admin can view and **override** it
- Admin confirms → record is locked

**Form Fields (Review Panel):**
| Field | Type | Notes |
|-------|------|-------|
| All supervisor-submitted fields | Read-only display | |
| Final Rate (₹) | Decimal | Required before confirm. Pre-filled if supervisor entered it |
| Confirm & Lock button | Action | Triggers approval |

**On Approval:**
- `status = APPROVED_PROCUREMENT`
- `final_rate` set
- `approved_by_id` set to current admin's user ID
- `approved_at` timestamp set
- Record becomes **read-only** for this module
- Record appears in Module 2 (Harvesting) approved list

**Audit Display:**
- All admin + office admin users can see: "Accepted by [Name] ([Role]) on [Date]"
- If approved by Office Admin → clearly labeled as "Accepted by Office"

---

## 🧩 UI Pages Required (Module 1)

| Page | Route (Planned) | Role | Device |
|------|----------------|------|--------|
| Intake Form | `/admin/procurement/new` | Admin, Office Admin | Desktop |
| Pending Allocations Table | `/admin/procurement/pending` | Admin, Office Admin | Desktop |
| Supervisor Assignment Modal | (within pending table) | Admin, Office Admin | Desktop |
| Supervisor Dashboard | `/supervisor/dashboard` | Supervisor | Mobile |
| Field Inspection Form | `/supervisor/task/[id]` | Supervisor | Mobile |
| Pending Approval Table | `/admin/procurement/review` | Admin, Office Admin | Desktop |
| Final Approval Panel | (within review table) | Admin, Office Admin | Desktop |

---

## 🗄️ Database Tables Used (Module 1)

- `users` — for supervisor dropdown and approval tracking
- `farmers` — farmer master list + autocomplete source
- `procurement_tasks` — core task record
- `task_particulars` — one-to-many box types per task

---

## 🔄 Status Flow

```
PENDING_ASSIGNMENT
      ↓  (Admin assigns supervisor)
   ASSIGNED
      ↓  (Supervisor submits field form)
FIELD_SUBMITTED
      ↓  (Admin confirms + sets rate)
APPROVED_PROCUREMENT  ──→  feeds Module 2
```

---

## ✅ Task Checklist (Module 1)

### Phase 1A — Foundation (Pre-requisite)
- [ ] Initialize Next.js project (App Router, TypeScript, Tailwind CSS)
- [ ] Install and configure Shadcn UI
- [ ] Set up PostgreSQL (Supabase or Neon — decide first)
- [ ] Install Prisma, write `schema.prisma` with all 4 tables
- [ ] Run first database migration
- [ ] Set up NextAuth with role enum
- [ ] Create seed script: add first `MAIN_ADMIN` user
- [ ] Test login flow and session role reading

### Phase 1B — Office Admin Flow
- [ ] Build Farmer intake form UI (with autocomplete dropdown)
- [ ] Build API route: `POST /api/procurement/intake`
- [ ] Build Pending Allocations table UI
- [ ] Build Supervisor assignment modal UI
- [ ] Build API route: `PATCH /api/procurement/[id]/assign`
- [ ] Test full intake → assignment flow

### Phase 1C — Supervisor Mobile Flow
- [ ] Build Supervisor dashboard (task list, mobile-optimized)
- [ ] Build Field Inspection form UI (large inputs, dynamic particulars)
- [ ] Implement conditional Rejection Reason field
- [ ] Implement "Add Another Particular" dynamic block
- [ ] Implement form validation (submit disabled until complete)
- [ ] Build API route: `POST /api/procurement/[id]/field-submit`
- [ ] Implement WhatsApp message formatter
- [ ] Implement WhatsApp share modal + deep link
- [ ] Test full supervisor submission flow on mobile viewport

### Phase 1D — Admin Approval Flow
- [ ] Build Pending Approval table UI (for FIELD_SUBMITTED tasks)
- [ ] Build Review/Approval panel UI (shows supervisor data + rate input)
- [ ] Build API route: `PATCH /api/procurement/[id]/approve`
- [ ] Implement audit stamp ("Accepted by [Name] ([Role])")
- [ ] Implement read-only lock post-approval
- [ ] Test full approval flow

---

## 🚫 Out of Scope for Module 1
- Harvesting assignment or execution
- Inventory tracking
- Cold storage
- Container booking
- Other vendor section (covered in Module 2)
- Field photo uploads (future enhancement)

---

## 📝 Open Questions / Decisions Needed

- [ ] **Supabase vs Neon** — which DB hosting to use?
- [ ] **WhatsApp group link** — user to provide the specific group's invite link for deep-linking
- [ ] **UI-first or DB-first?** — does user want to finalize UI screens before wiring up backend?
- [ ] **Rate field behavior** — if supervisor sets rate and admin overrides, should change history be logged?
- [ ] **Number of supervisors** — will there be a supervisor management page in Module 1 or later?
