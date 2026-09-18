# 🧪 Browser Test Plan — KD Export (Startrek) — Local Verification

> **Purpose:** End-to-end browser verification of the full app on a local machine before anything is pushed to GitHub / Vercel.
> **Hand-off:** Paste this entire file into your browser-testing agent (e.g. Antigravity) and let it execute top to bottom. It must report back per the template in §10.

---

## 0. Rules for the tester

1. **Do NOT push, commit, deploy, or touch production (Vercel/Supabase cloud).** All testing is local only.
2. **Do NOT seed or reset the shared Supabase database.** If the local `.env` points at the cloud DB, test read-only flows + create records clearly marked `TEST-` and delete them afterwards. Prefer a local/dev database if one is configured (ask the owner first).
3. **Record everything:** for every step, capture — (a) browser console errors/warnings, (b) failed network requests (4xx/5xx), (c) screenshots of anything broken, (d) exact reproduction steps.
4. **Console-error policy:** any red console error or failed API call = a FAIL, even if the UI "looks fine".
5. Test in **Chrome (desktop, 1440px)** primarily; spot-check **mobile viewport (390px)** for supervisor pages (supervisors use phones in the field).
6. If you are blocked (missing password, env, DB access), **stop and report** — do not guess or work around auth.

---

## 1. Local setup

```powershell
cd c:\Dev-Drive\Startrek\startrek-app
npm install
npx prisma generate
npm run dev        # serves on http://localhost:3000
```

- Open DevTools → **Console** tab + **Network** tab (preserve log ON) before doing anything.
- Health check: visit `http://localhost:3000/api/health` → expect HTTP 200 JSON with `"status":"healthy"` and a `userCount` number. If this fails, STOP and report (DB not reachable).

### Test accounts (seeded, password for all = `Startrek@123`)

| Role | Email | Use for |
|---|---|---|
| MAIN_ADMIN | `admin@kdexport.com` | Admin flows (§3–§7, §9) |
| OFFICE_ADMIN | `kdoffice@kdexport.com` | Overview / dispatch approvals (§9) |
| INVENTORY_ADMIN | `ajit.landge@kdexport.com` | Inventory flows (§6) |
| COLD_STORAGE_ADMIN | `coldstorage@kdexport.com` | Cold-storage flows (§7, §9) |
| FIELD_SUPERVISOR | `ankush.shinde@kdexport.com` | Harvest supervisor flow (§5) |
| PROCUREMENT_SUPERVISOR | `vishal.naykudae@kdexport.com` | Procurement supervisor flow (§4) |

⚠️ Single-session enforcement: logging in as a user logs out their other sessions. Prefer creating fresh `TEST-` users via `/admin/users` for destructive tests.

---

## 2. Global checks (EVERY page listed below)

On each page visit, verify and log:
- [ ] No red errors in browser console; no React hydration warnings.
- [ ] No failed requests in Network tab (no 4xx/5xx except deliberately tested negative cases).
- [ ] Page loads in reasonable time locally (< 3s).
- [ ] No layout breakage: no overlapping elements, no text cut off, no horizontal scroll on desktop; on mobile viewport everything reachable.
- [ ] No hardcoded demo/placeholder data visible (e.g. names like "Shanmugam", "Naresh Bhai", "Soyal & Yash", phone "+919412345678", fake totals like 140/210/180/70/50/650 boxes, fake "300" counts).
- [ ] Logout works; protected pages redirect to `/login` when logged out; a logged-out user hitting any `/api/*` gets 401.

### Pages to open (as MAIN_ADMIN)

1. `/login` (logged out) — renders, no console errors.
2. `/admin` — dashboard cards render with real numbers (match them against DB/API responses where possible).
3. `/admin/procurement` — list loads, no empty-state when tasks exist.
4. `/admin/procurement/new` — intake form renders.
5. `/admin/harvesting` — list loads.
6. `/admin/cold-storage` — dashboard renders (stock cards, allocation section, container dispatch panel).
7. `/admin/inventory` — stock levels render.
8. `/admin/supervisors` — all supervisors listed.
9. `/admin/users` — user list renders.
10. `/admin/audit-logs` — log entries render.
11. `/supervisor` (as a supervisor) — **only tasks assigned to that supervisor** are visible (assignment-based visibility, NOT role-based).
12. `/harvesting` (as FIELD_SUPERVISOR) — assigned harvest jobs visible.

---

## 3. Procurement flow (intake → assign → supervisor visit → review)

### 3.1 New intake (`/admin/procurement/new`, as MAIN_ADMIN)
- [ ] Address section asks for **village only** (no district/town fields).
- [ ] Supervisor dropdown shows **ALL supervisors** (both field + procurement), each with a duty/role label.
- [ ] Create a task `TEST-VILLAGE-<date>` assigned to the PROCUREMENT_SUPERVISOR test account. Submit → success, task appears in `/admin/procurement`.
- [ ] Console + Network clean.

### 3.2 Procurement supervisor visit (`/supervisor/task/[id]`, as PROCUREMENT_SUPERVISOR)
- [ ] The assigned TEST task is visible and opens.
- [ ] **Rate field is OPTIONAL** — submitting the report with rate blank succeeds.
- [ ] Quality blocks present: Chilling (Yes/No), Pulp %, Red Rust %, Skin cosmetics grade (Good/Excellent/Average) + %, Finger length (inch), Caliber (number).
- [ ] Submit → report saves; a **share sheet / copy-to-clipboard** appears for the bill message (NOT an auto-opened WhatsApp link — user must be able to choose the destination group manually).

### 3.3 Admin review (`/admin/procurement`, as MAIN_ADMIN)
- [ ] Open the review modal for the TEST task.
- [ ] **"Est. Total Produce Value" box is GONE.**
- [ ] Approve/assign actions work; audit log (`/admin/audit-logs`) gains an entry for the action.
- [ ] Clean up: delete/reject the TEST task afterwards.

---

## 4. Harvesting admin flow (`/admin/harvesting`, as MAIN_ADMIN)

### 4.1 Assign form
- [ ] Supervisor dropdown shows **ALL supervisors** (both kinds).
- [ ] **Brand field starts EMPTY** — no brand name pre-filled before selection.
- [ ] **Multi-brand supported:** add 2 brands (e.g. Star + other), enter per-brand box counts (e.g. 100 + 100). Total = 200 (per-brand sums, not a glitched number).
  - 5/7/13/13.5KG boxes: 25 tops per top-bundle, 20 bottoms per bottom-bundle → e.g. 100 boxes = 4 top bundles + 5 bottom bundles.
  - 16KG boxes: complete-box bundles of 10 → 10 boxes = 1 bundle.
- [ ] Chemicals offered: **C chemical 50gm, Turti 2kg, Tilt 200ml, Bavistin 1kg** — each editable, no old chemicals present.
- [ ] **Ethylene pouches are AUTO-calculated** (ceil(total boxes/100)), user is NOT asked.
- [ ] **Faviloc: fixed 5 packets/vehicle. Rubber: fixed 1 packet/vehicle** — both shown, non-editable.
- [ ] Submit assign → inventory (`/admin/inventory`) decreases by the **actual bundles** (tops and bottoms deducted separately, not finished-box count).

### 4.2 The "300" glitch hunt
- [ ] Assign exactly 13KG boxes (e.g. 100) for one brand. Check the total shown in: (a) assign modal, (b) supervisor's generated bill, (c) inventory deduction. **All three must show 100 (or correct bundle math), never 300 or any inflated number.** Log where any mismatch occurs.

---

## 5. Harvest supervisor flow (`/harvesting/job/[id]`, as FIELD_SUPERVISOR)

Use the harvest job created in §4.1 (assigned to the FIELD_SUPERVISOR test account).

### Step 1 — Pickup
- [ ] Page shows the **admin-generated bill only** (quantities, bundles, chemicals, Faviloc, rubber). Supervisor does NOT type quantities — only **confirms** pickup.
- [ ] Confirm → persists (reload page → pickup stays confirmed).

### Step 2 — Quality
- [ ] Select **Good** → proceeds to next step + work-started message uses **copy/share sheet** (no forced WhatsApp redirect).
- [ ] Reset/back, select **Average** or **Reject** → **cannot proceed without typing a description** of why. Submitting with empty description is blocked; with description it saves.

### Step 3 — Filling progress
- [ ] **Field-damaged-boxes input sits OUTSIDE the filling card, ABOVE the leftover/empty summary** (position check).
- [ ] Progress ping saves; reload page → saved filled/damaged values restore.
- [ ] Finish → bill form opens with **all known fields pre-filled** (vehicle, farmer, contact, line, vendor, supervisor, deal person, rate, destination); unknown fields blank.
- [ ] **Deal person = the name of the supervisor who did the procurement of that farm** (cross-check against the procurement task).
- [ ] **No destination-cold-storage field** in the bill.
- [ ] Dispatch with 0 boxes is **blocked** with an error message.

### Dispatch verification
- [ ] After dispatch: cold storage shows the **real dispatched count** (not 0).
- [ ] Inventory return-due = **picked-up − loaded-in-bill − damaged** (e.g. 100 picked, 90 loaded, 10 damaged → 0 due, NOT 100).
- [ ] Reload at each step → no data loss, correct step restored.

---

## 6. Inventory (`/admin/inventory`, as INVENTORY_ADMIN)
- [ ] Bundle math from §4.1 reflected: top bundles and bottom bundles tracked separately; 16KG as complete bundles.
- [ ] Consumables deducted: chemicals (edited values), ethylene pouches (auto), Faviloc 5, rubber 1.
- [ ] Return-request math is damaged-aware (§5 check above).
- [ ] No inflated numbers anywhere (the "300" hunt — check stock numbers after the §4.1 assignment).

---

## 7. Cold storage (`/admin/cold-storage`, as MAIN_ADMIN + COLD_STORAGE_ADMIN)

### 7.1 Quality voucher
- [ ] Prefills match the dispatched bill (brand, quantities). **No fake numbers** (140/210/180/70/50/650 etc.).
- [ ] **Red rust is a typed % input.** Particulars/hand-boxes are **editable** and include **3H** alongside 4H–8H.

### 7.2 Room allocation
- [ ] Allocation form **syncs brand name + box quantity from the dispatch**.
- [ ] Can **split one dispatch across multiple rooms** (e.g. 100 boxes → 50 room A + 50 room B) via "add room" rows, with auto-distribute option.
- [ ] **Room capacity = 27,000 boxes (fixed).** Allocation exceeding remaining capacity is **blocked** with a "use next room" suggestion.
- [ ] Dashboard shows **brand-wise AND room-wise** stock cards with correct numbers; admin overview (`/admin`) reflects the same totals.

---

## 8. Container dispatch — full lifecycle (NEW module, highest risk)

### 8.1 Create (as MAIN_ADMIN, cold-storage page → Container Dispatch panel)
- [ ] Create container with: **Container No, Seal, Vehicle No, Mobile (MOB)**.
- [ ] Add **multiple** load lines: box size (5/7/13/13.5/16KG) × brand × quantity.
- [ ] Submit → container appears as **pending-load** on the cold-storage dashboard.

### 8.2 Load (as COLD_STORAGE_ADMIN)
- [ ] Pending-load card shows exactly what to load. Mark **Loading Complete** → notification reaches admin/office overview (`/admin` and Office Admin view).

### 8.3 Decision (as MAIN_ADMIN or OFFICE_ADMIN)
- [ ] **Option A — Direct dispatch:** message instructs cold storage to "dispatch sealed with paper".
- [ ] **Option B — Plug-in (cooling):** enter hours (e.g. 2). **Dispatch button is HARD-BLOCKED until the timer completes** (attempting dispatch early must fail with an error — test this explicitly). After expiry, "ready to dispatch" message appears and dispatch unlocks.

### 8.4 Dispatch (as COLD_STORAGE_ADMIN, after approval/timer)
- [ ] Dispatch succeeds; **cold-storage stock deducts by brand AND box size** for the loaded lines.
- [ ] Dispatching more than available stock is **rejected with no partial deduction**.
- [ ] Repeat/second dispatch of the same container is **blocked** (no double-deduction).
- [ ] **Concurrency:** open the pending container in TWO tabs/logins, dispatch in both nearly simultaneously → stock must deduct exactly once (report the outcome precisely: pass = single deduction, fail = double deduction or crash).

### 8.5 Authorization matrix (expect failures where marked ⛔)
| Actor | Action | Expected |
|---|---|---|
| COLD_STORAGE_ADMIN | approve dispatch / start cooling | ⛔ 403/blocked |
| OFFICE_ADMIN | approve direct dispatch | ✅ allowed |
| Anyone | dispatch before approval or before cooling timer ends | ⛔ blocked with error |
| Anyone | dispatch same container twice | ⛔ blocked |

---

## 9. Regression & cross-cutting
- [ ] Supervisor with NO assignments sees an empty state (not other people's tasks, not an error).
- [ ] Procurement supervisor assigned a HARVEST task (and vice versa) can open and complete it (cross-role assignment now allowed).
- [ ] Notifications bell updates; audit logs record all §3–§8 actions.
- [ ] Mobile viewport (390px): supervisor task page and harvest job page fully usable.
- [ ] Hard refresh mid-flow on every wizard step → correct state restored, no mock data reappearing.

---

## 10. Report format (tester must return this)

```markdown
# Test Report — <date>
Environment: <node version, browser version, DB used (local/cloud), commit tested>
## Summary: X passed / Y failed / Z blocked
## Failures (one row each)
| # | Section | What I did | Expected | Actual | Console error | Network failure | Screenshot |
## Console-error inventory (every red error seen, with page + action)
## Logical/data errors (wrong numbers, wrong persistence, wrong visibility)
## Display/layout errors (with viewport size)
## Leftover TEST- records created (list for cleanup)
## Verdict: READY TO PUSH / NOT READY (with reasons)
```

**Definition of READY:** zero console errors, zero failed API calls outside negative tests, all expected/actual match, concurrency dedupes correctly, no leftover TEST- records, mobile supervisor flow usable.

---

## Appendix — known risk areas (pay extra attention)

1. `src/app/(dashboard)/harvesting/job/[id]/page.tsx` — largest page; refresh-restore logic (`progressTouched` flag), bill auto-fill, async save handlers.
2. `src/app/api/container-dispatch/route.ts` — approval/cooling gates, brand+size deduction, idempotency.
3. `src/app/api/cold-storage/route.ts` — allocation validation, 27k capacity, reallocation-after-shipment block.
4. `src/hooks/useLiveData.ts` — polling hook; verify no 2s request storms in Network tab on any dashboard page left open 2+ minutes.
5. `src/app/api/harvest/route.ts` — leftover/return math, bounded GET (`take: 200`).
