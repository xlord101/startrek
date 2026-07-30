# 🧊 Module 3: Cold Storage & Container Fulfillment

> **Module Status:** 🔴 Not Started
> **Priority:** 🟢 Third — Only begin after Module 2 is fully complete
> **Last Updated:** 2026-07-29
> **Depends on:** Module 2 complete — `DISPATCHED` harvest tasks available

---

## 📌 Module Purpose

The Cold Storage module manages everything after the harvested produce is dispatched from the field. It covers:
1. Receiving the produce at the warehouse/cold storage
2. Allocating the produce into specific rooms by brand
3. Booking containers for export/dispatch
4. Tracking the container lifecycle through to completion

---

## 👤 Actors Involved

| Actor | Role in This Module |
|-------|-------------------|
| Cold Storage Admin | Receives produce, allocates rooms, verifies delivery |
| Main Admin / Office Admin | Books containers, logs orders, sends packing instructions |
| Inventory Admin | Cross-verified box count during receiving |

---

## 🗂️ Sub-Steps

### Step 3.1 — Receiving at Cold Storage
**Actor:** Cold Storage Admin
**Interface:** Desktop

**What happens:**
- Cold Storage Admin gets a **dispatch notification** when a harvesting task is marked `DISPATCHED`
- Also receives the **Procurement Bill** (formatted text from Module 2)
- Admin cross-verifies the total boxes received against the bill
- Confirms receipt

**Fields / Actions:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Dispatched Task Reference | Auto-linked | ✅ | Pulled from Module 2 record |
| Procurement Bill (view) | Read-only | ✅ | Displayed for reference |
| Total Boxes Received | Integer | ✅ | Admin inputs actual count received |
| Verified / Discrepancy Note | Text | ❌ | Optional mismatch note |
| Confirm Receipt | Button | ✅ | Marks as received |

**On Confirm:**
- Status → `RECEIVED`
- Dispatch notification cleared
- Record ready for room allocation

---

### Step 3.2 — Storage Room Allocation
**Actor:** Cold Storage Admin
**Interface:** Desktop

**What happens:**
- Admin assigns received produce to specific **room numbers** in cold storage
- Can assign **multiple brands** to the **same room** or different rooms
- Can also assign the **same brand** to **multiple rooms** at the same time

**Allocation Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Brand | Dropdown (from allocated brands in Module 2) | ✅ | |
| Room Number | Dropdown (pre-configured room list) | ✅ | |
| Box Count per Room | Integer | ✅ | |
| "Add Another Room/Brand" | Button | — | Dynamic repeatable |

**Business Rules:**
- Multiple brands can be in one room ✅
- One brand can span multiple rooms ✅
- Room occupancy should be tracked (future: capacity monitoring)

**On Save:**
- Storage allocation record created
- Linked back to harvest + procurement record
- Status → `STORED`

---

### Step 3.3 — Container Booking
**Actor:** Main Admin / Office Admin
**Interface:** Desktop

**What happens:**
- Admin logs a container order/booking
- Links it to stored produce
- Sends **packing instructions** to both Inventory and Cold Storage teams

**Container Booking Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Order / Invoice Number | String | ✅ | Unique reference |
| Container Details | Text / Structured | ✅ | Container number, size, type |
| Linked Storage Records | Multi-select | ✅ | Which rooms/brands to pack |
| Packing Instructions | Textarea | ❌ | Sent to Inventory + Cold Storage |
| Send Instructions | Button | ✅ | Notifies Inventory + Cold Storage admins |

**On Save:**
- Container booking record created
- Packing instruction notification pushed to Inventory Admin and Cold Storage Admin dashboards
- Container status → `BOOKING_CONFIRMED`

---

### Step 3.4 — Container Lifecycle Tracking
**Actor:** Cold Storage Admin / Main Admin
**Interface:** Desktop

**Status Progression:**
```
BOOKING_CONFIRMED
      ↓
LOADING_STARTED
      ↓
SEALED
      ↓
DISPATCHED
      ↓
COMPLETED
```

> ⚠️ **"Complete" option is only visible after the required duration/conditions are met** (as noted in handwritten notes — a time-gate applies)

**At Each Stage:**
- Admin manually advances the status
- Timestamp recorded at each transition
- Admin can view: duration between each stage

---

## 🗄️ Database Tables Required (Module 3 — Design Phase)

> Finalize after Module 2 is complete

```
cold_storage_receipts
  id
  harvest_task_id       FK → harvest_tasks
  boxes_received        Integer
  discrepancy_note      Text (Nullable)
  received_by_id        FK → users
  received_at           Timestamp

storage_room_allocations
  id
  receipt_id            FK → cold_storage_receipts
  room_number           String
  brand                 String
  box_count             Integer
  stored_at             Timestamp

container_bookings
  id
  order_invoice_number  String (Unique)
  container_details     Text
  packing_instructions  Text (Nullable)
  status                Enum: BOOKING_CONFIRMED | LOADING_STARTED | SEALED | DISPATCHED | COMPLETED
  booked_by_id          FK → users
  booked_at             Timestamp
  loading_started_at    Timestamp (Nullable)
  sealed_at             Timestamp (Nullable)
  dispatched_at         Timestamp (Nullable)
  completed_at          Timestamp (Nullable)

container_storage_links
  id
  container_id          FK → container_bookings
  allocation_id         FK → storage_room_allocations
```

---

## 🔄 Status Flow

```
DISPATCHED (from Module 2)
      ↓  (Cold Storage Admin confirms receipt)
   RECEIVED
      ↓  (Room allocation done)
    STORED
      ↓  (Container booking confirmed)
BOOKING_CONFIRMED
      ↓  (Loading begins)
LOADING_STARTED
      ↓  (Container sealed)
    SEALED
      ↓  (Container leaves)
  DISPATCHED (container)
      ↓  (Delivery confirmed)
  COMPLETED
```

---

## ✅ Task Checklist (Module 3)

> ⚠️ Do not start these until all Module 2 tasks are ✅ complete

### Phase 3A — Receiving
- [ ] Build Cold Storage Admin dashboard
- [ ] Build dispatch notification system (triggered from Module 2)
- [ ] Build receipt confirmation form
- [ ] Build API route: `POST /api/cold-storage/receive`

### Phase 3B — Room Allocation
- [ ] Build room allocation form UI (dynamic brand + room blocks)
- [ ] Build room number management (admin-configured list)
- [ ] Build API route: `POST /api/cold-storage/allocate`
- [ ] Build storage overview/map view (optional — nice to have)

### Phase 3C — Container Booking
- [ ] Build container booking form
- [ ] Build packing instructions send system
- [ ] Build API route: `POST /api/containers/book`
- [ ] Implement notification push to Inventory + Cold Storage dashboards

### Phase 3D — Container Tracking
- [ ] Build container status pipeline view (kanban or timeline)
- [ ] Implement manual status advancement
- [ ] Implement duration tracking between stages
- [ ] Implement "Complete" visibility gate (time-based or condition-based)

---

## 🚫 Out of Scope for Module 3
- Financial billing / invoice generation system (future)
- Physical temperature monitoring of cold storage
- External shipping carrier integration

---

## 📝 Open Questions / Decisions Needed

- [ ] What are the **pre-configured room numbers** in cold storage?
- [ ] What is the **time-gate rule** for the "Complete" button? (After how many hours/days?)
- [ ] Should the packing instruction **notification** be an in-app alert, email, or WhatsApp?
- [ ] How many **containers** can be active at one time — is there a limit?
- [ ] Should box **capacity per room** be tracked and displayed?
