# 🌾 Module 2: Harvesting

> **Module Status:** 🔴 Not Started
> **Priority:** 🟡 Second — Only begin after Module 1 is fully complete and approved
> **Last Updated:** 2026-07-29
> **Depends on:** Module 1 complete — `APPROVED_PROCUREMENT` tasks available

---

## 📌 Module Purpose

The Harvesting module takes over once a farm has been verified and approved through procurement. It manages the logistics of the actual harvest: assigning the right team and vehicle, tracking real-time progress, recording box counts, performing quality checks, generating a procurement bill, and dispatching produce to the cold storage / warehouse.

---

## 👤 Actors Involved

| Actor | Role in This Module |
|-------|-------------------|
| Main Admin / Office Admin | Allocate supervisor, vehicle, brand, team; approve dispatch |
| Field Supervisor | Accept task, log work start, update progress, submit completion |
| Inventory Admin | Verify box return count from the vehicle |

---

## 🗂️ Sub-Steps

### Step 2.1 — Harvesting Allocation
**Actor:** Office Admin / Main Admin
**Interface:** Desktop

**Data Source:** Pulls from `APPROVED_PROCUREMENT` list (read from Module 1)

**What happens:**
- Admin views all approved procurement records
- Selects a record and fills the harvesting allocation form

**Allocation Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Assign Supervisor | Dropdown (active supervisors) | ✅ | |
| Box Type | Multi-select: 5kg, 7kg, 13kg, 13.5kg, 16kg | ✅ | May be multiple |
| Add Box Type | "Add" button | — | Dynamic add type + brand |
| Brand | Dropdown + "Add New": Star Lemon, Orchid, ... | ✅ | Per box type |
| Vehicle Selection | Dropdown (name/number) / "New" option | ✅ | |
| Vehicle Contact Detail | String | ✅ | Driver/contact number |
| Labor Contact | String | ❌ | Optional |
| Team | Dropdown (10 teams) | ✅ | Pre-configured list |
| Priority | Dropdown: High (only shown if set) | ❌ | "High" — only displayed if explicitly set |
| Chemical (options + quantity) | Multi-line optional | ❌ | 4 chemical options |

**On Save:**
- Harvesting task created, linked to `procurement_task`
- Task pushed to assigned Supervisor's mobile dashboard
- Status → `HARVEST_ASSIGNED`

---

### Step 2.2 — Other Vendors Section
**Actor:** Office Admin / Main Admin
**Interface:** Desktop

> ⚠️ In addition to approved procurement records, there is a separate section for **external/other vendors** who are not part of the procurement pipeline.

**Sub-fields for Other Vendor entry:**
| Field | Type | Notes |
|-------|------|-------|
| Other Farmer Name | Text | (Admin must pre-add vendor/farmer names) |
| Other Vendor | Text | |
| Other Team | Text | |

- Admin should have the ability to **pre-add vendor name and details** (managed in settings/admin panel)

---

### Step 2.3 — Harvest Execution (Mobile)
**Actor:** Field Supervisor
**Interface:** Mobile-Optimized

**What happens:**
- Supervisor opens assigned harvesting task
- Sees full allocation details (box types, brand, vehicle, team)
- Begins work — logs work start timestamp (visible on admin side + WhatsApp update)
- Every **2 hours**, an automated ping/reminder asks: *"How many boxes done so far?"*
  - Supervisor inputs current quantity
  - This auto-updates on admin dashboard + sends update to WhatsApp group
- Performs on-site **quality checks**
- Logs **empty quantity of boxes loaded** (this number is subtracted from available inventory)

**Mobile Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Work Start | Timestamp (auto + manual confirm) | ✅ | Logged and shared to WhatsApp |
| Boxes Loaded (Empty) | Integer | ✅ | Deducted from inventory |
| Quality Check | Dropdown / Notes | ✅ | |
| Every 2hr Update | Integer (quantity done so far) | ✅ | Pinged automatically |

**Completion:**
- Supervisor clicks **"Complete"** button (only visible after duration has passed / conditions met)
- Fills total quantity of boxes (if not fulfilled → shows the gap)
- Generates **Procurement Bill**:
  - Fetches all existing data (farmer, tonnage, box particulars, rate, brand)
  - Calculates: used boxes = loaded − remaining − wastage
  - Bill formatted for sharing

**On Completion:**
1. Procurement bill generated and formatted as text
2. WhatsApp share triggered (bill sent to group)
3. Vehicle dispatched to Cold Storage / Warehouse

---

### Step 2.4 — Dispatch & Inventory Return
**Actor:** Supervisor + Inventory Admin
**Interface:** Mobile (Supervisor), Desktop (Inventory Admin)

**What happens:**
- Supervisor logs **remaining/unused boxes** before dispatch
- Inventory Admin receives the vehicle return
- Verifies the box count: `Used Boxes = Loaded Boxes − Remaining Boxes − Wastage`
- Once verified → marked as Done, deducted from available inventory

**Inventory Logic Formula:**
```
Used Boxes = Loaded Boxes − Remaining Boxes − Wastage Boxes
```

---

## 🗄️ Database Tables Required (Module 2 — Design Phase)

> Finalize after Module 1 is complete

```
harvest_tasks
  id
  procurement_task_id   FK → procurement_tasks
  supervisor_id         FK → users
  vehicle_id            FK → vehicles (or inline text)
  team_id               FK → teams
  brand                 String / FK → brands
  priority              Enum: NORMAL | HIGH
  status                Enum: HARVEST_ASSIGNED | IN_PROGRESS | COMPLETED | DISPATCHED
  work_start_at         Timestamp
  completed_at          Timestamp

harvest_box_types
  id
  harvest_task_id       FK → harvest_tasks
  box_type              Enum: 5KG | 7KG | 13KG | 13_5KG | 16KG
  brand                 String
  quantity_loaded       Integer
  quantity_remaining    Integer
  wastage               Integer

harvest_progress_updates
  id
  harvest_task_id       FK → harvest_tasks
  quantity_done         Integer
  updated_at            Timestamp
  sent_to_whatsapp      Boolean
```

---

## 🔄 Status Flow

```
APPROVED_PROCUREMENT (from Module 1)
      ↓  (Admin creates harvesting allocation)
 HARVEST_ASSIGNED
      ↓  (Supervisor starts work)
  IN_PROGRESS
      ↓  (Supervisor submits completion)
  COMPLETED
      ↓  (Vehicle dispatched, inventory verified)
  DISPATCHED  ──→  feeds Module 3
```

---

## ✅ Task Checklist (Module 2)

> ⚠️ Do not start these until all Module 1 tasks are ✅ complete

### Phase 2A — Allocation
- [ ] Build Approved Procurement list view (desktop)
- [ ] Build Harvesting Allocation form UI
- [ ] Build Vendor master management page (add/edit other vendors)
- [ ] Build API route: `POST /api/harvest/allocate`
- [ ] Implement vehicle, team, brand dropdown management

### Phase 2B — Mobile Execution
- [ ] Build Supervisor harvesting task view (mobile)
- [ ] Implement work-start timestamp logging
- [ ] Build 2-hour ping/reminder system (background job or push notification)
- [ ] Build progress update input (per ping)
- [ ] Build quality check form
- [ ] Implement box-loaded tracking (deduct from inventory)
- [ ] Build "Complete" button logic (time-gated + quantity gate)
- [ ] Build Procurement Bill generator (text formatter)
- [ ] Implement WhatsApp share for bill

### Phase 2C — Dispatch & Inventory
- [ ] Build remaining box return form (supervisor side)
- [ ] Build Inventory Admin verification view
- [ ] Implement inventory deduction formula
- [ ] Build API route: `PATCH /api/harvest/[id]/dispatch`
- [ ] Mark record as Dispatched → feed to Module 3

---

## 🚫 Out of Scope for Module 2
- Cold Storage allocation (Module 3)
- Container booking (Module 3)
- Financial reporting / billing system (future)

---

## 📝 Open Questions / Decisions Needed

- [ ] What are the **10 team names** in the team dropdown?
- [ ] What are the available **brand names** (Star Lemon, Orchid, + others)?
- [ ] What **chemical options** (4 options) are available in the chemical field?
- [ ] How does the **2-hour ping** work — browser notification, SMS, or WhatsApp message?
- [ ] Is the "Complete" button purely time-gated or quantity-gated or both?
- [ ] How should the **procurement bill** be formatted (exact template needed)?
- [ ] Does the **vehicle** have a pre-configured list or is it manually typed each time?
