# 👆 Manual Test Guide — KD Export (Startrek), Click by Click

> Companion to `BROWSER_TEST_PLAN.md` (the what). This file is the **how, in order**.
> Do the phases in sequence — later phases use data created in earlier ones.
> Password for every test account: **`Startrek@123`**
> Mark every record you create with **`TEST-`** and delete it in Phase 8.

**Keep open the whole time:** browser DevTools → Console tab + Network tab (preserve log ON).
Any red console error or failed request (4xx/5xx you didn't intend) = note it down immediately with page + action.

---

## PHASE 0 — Start the app (5 min)

1. Open PowerShell, run:
   ```powershell
   cd c:\Dev-Drive\Startrek\startrek-app
   npm install
   npx prisma generate
   npm run dev
   ```
2. Open Chrome → `http://localhost:3000/api/health`
   ✅ Expect: HTTP 200, JSON with `"status":"healthy"` and a `userCount` number.
   🛑 If this fails → STOP. DB is unreachable; fix `.env` / network first.
3. Go to `http://localhost:3000/login`. Page renders, no console errors.

---

## PHASE 1 — Admin sanity tour (login as `admin@kdexport.com`, 15 min)

1. Log in as **admin@kdexport.com**. You land on `/admin`.
   ✅ Dashboard cards show real numbers. Leave it open 2+ minutes, then check the Network tab — requests should be occasional (every ~30s), NOT a flood every 2 seconds.
2. Click through each sidebar page, waiting for each to load:
   - `/admin/procurement` → list loads.
   - `/admin/procurement/new` → intake form renders. **Confirm: address asks village ONLY (no district/town).**
   - `/admin/harvesting` → list loads.
   - `/admin/cold-storage` → dashboard + stock cards + allocation section + Container Dispatch panel render.
   - `/admin/inventory` → stock levels render.
   - `/admin/supervisors` → supervisors listed.
   - `/admin/users` → user list renders.
   - `/admin/audit-logs` → entries render.
   ✅ Each: no console errors, no failed requests, no overlapping/cut-off layout.

---

## PHASE 2 — Procurement intake (still `admin@kdexport.com`, 10 min)

1. Go to `/admin/procurement/new`.

---

## PHASE 3 — Procurement supervisor visit (log out, login as `vishal.naykudae@kdexport.com`, 15 min)

1. Log out (sidebar → logout). Confirm you land on `/login`.
2. Log in as **vishal.naykudae@kdexport.com**. You land on `/supervisor`.
   ✅ You see ONLY tasks assigned to Vishal — including `TEST-Farmer-Intake1`. You do NOT see other supervisors' tasks.
3. Open the `TEST-Farmer-Intake1` task.
4. Fill the farm-visit report:
   - **Leave RATE blank** → ✅ submitting must still succeed (rate is optional now).
   - Chilling: select **Yes**.
   - Pulp: type a number (e.g. 12) → %.
   - Red Rust: type a number (e.g. 3) → %.
   - Skin cosmetics: pick **Good**, type its % (e.g. 80).
   - Finger length: type inches (e.g. 8).
   - Caliber: type a number (e.g. 46).
5. Submit the report.
   ✅ Saves successfully. A **share/copy sheet appears for the bill message** — you can copy it and choose where to send it. 🛑 FAIL if it force-opens a WhatsApp link with a fixed number.
6. Reload the page → ✅ report data persists (nothing lost).

---

## PHASE 4 — Admin review (log out, login as `admin@kdexport.com`, 10 min)

1. Log back in as **admin@kdexport.com** → `/admin/procurement`.
2. Open the review modal for `TEST-Farmer-Intake1`.
   ✅ **"Est. Total Produce Value" box is GONE.**
3. Approve the task (and assign/forward as your flow requires).
4. Go to `/admin/audit-logs` → ✅ a new entry records your approval action.
5. Keep this task (you need its farm + supervisor for the harvest bill's deal-person check in Phase 6). You will delete it in Phase 8.

---

## PHASE 5 — Harvest assign with bundle math (still `admin@kdexport.com`, 20 min)

1. Go to `/admin/harvesting`. Open the assign/create-harvest form for a farm (use the TEST farm if the UI allows, else any farm — note which).
2. Supervisor dropdown → ✅ lists ALL supervisors (field + procurement).
3. Brand field → ✅ **starts EMPTY** (no pre-filled brand name).
4. Add **TWO brands**: Brand A = 100 boxes of 13KG, Brand B = 100 boxes of 13KG.
   ✅ Total shows **200** (100+100). 🛑 FAIL if it shows 300 or any other number — note exactly which field/screen.
5. Check the **bundle plan** shown:
   ✅ 13KG is a 2-part box: 25 tops/bundle, 20 bottoms/bundle → 200 boxes = **8 top bundles + 10 bottom bundles**.
6. Chemicals section → ✅ exactly these four, each editable: **C chemical 50gm, Turti 2kg, Tilt 200ml, Bavistin 1kg**. No old chemicals.
7. ✅ **Germination paper auto-calculated in KG** — 5/7KG boxes: boxes ÷ 45 ÷ 2; 13/13.5/16KG: boxes ÷ 45 (e.g. 100 × 13KG → 2.2 kg). No rounding — decimals like 1.1 are fine.
8. ✅ **Faviloc fixed 5 packets/vehicle. Rubber fixed 1 packet/vehicle.** Non-editable.
9. Assign the job to **`ankush.shinde@kdexport.com`**. Submit.
10. Go to `/admin/inventory` → ✅ stock dropped by the **actual bundles** (tops and bottoms separately), plus chemicals, germination paper (KG), 5 Faviloc, 1 rubber. Note the before/after numbers.
11. **Brand-stock live check:** each brand+size input in the assign form shows **live `(stock N)`** beside it. Type MORE than stock for one brand+size → ✅ that field turns red with a shortage line, and **Schedule is blocked** (button disabled; even if forced, the server answers **409** and deducts nothing). Reduce it or move the remainder to another brand → ✅ block clears.
12. **"300" glitch triple-check** for the 13KG line: assign-modal total vs supervisor bill (Phase 6) vs inventory deduction (step 10) — all must agree on 100-per-brand. Log any mismatch with the exact screen + number.

2. Fill the form with:
   - Farmer name: **`TEST-Farmer-Intake1`**

---

## PHASE 6 — Harvest supervisor job (log out, login as `ankush.shinde@kdexport.com`, 30 min)

1. Log in as **ankush.shinde@kdexport.com** → `/harvesting` → open the job assigned in Phase 5.

### Step 1 — Pickup (confirm only)
2. ✅ The page shows the **admin-generated bill** (per-brand boxes, bundles, chemicals, Faviloc, rubber). There are NO quantity textboxes to fill — only a **Confirm pickup** action.
3. Click Confirm pickup → ✅ success. **Reload the page** → ✅ pickup stays confirmed.

### Step 2 — Quality gate (test BOTH paths)
4. Select **Good** → ✅ proceeds to next step; work-started message offers a **copy/share sheet** (no forced WhatsApp redirect).
5. Go back / reset quality, select **Average**, leave the description EMPTY, try to submit → ✅ **BLOCKED** with an error.
6. Type a reason (e.g. `TEST dull skin patches`) → ✅ submits and saves.
7. **Reload** → ✅ quality grade + description persist.

### Step 3 — Filling + bill
8. Enter some filled boxes + a few damaged boxes, save progress. **Reload** → ✅ values restore.
9. ✅ **Position check:** the field-damaged-boxes input is OUTSIDE the filling card, ABOVE the leftover/empty summary.
10. Finish filling → bill form opens:
    - ✅ All known fields **pre-filled** (vehicle, farmer, contact, line, vendor, supervisor, rate, destination); unknown ones blank.
    - ✅ **Deal person = the procurement supervisor of this farm** (compare with the Phase 2–4 task — expect Vishal's name).
    - ✅ **No destination-cold-storage field.**
11. Try dispatch with total = 0 → ✅ **blocked** with an error.
12. Fill real numbers (e.g. loaded 90, damaged 10 of 100 picked) and dispatch → ✅ success, modal closes.

### Dispatch verification (still as Ankush, then admin)
13. As admin (`admin@kdexport.com`) open `/admin/cold-storage` → ✅ the dispatch shows the **real count (not 0)**.
14. Open `/admin/inventory` → ✅ return-due = **picked − loaded − damaged** (100 − 90 − 10 = **0**, NOT 100).

---

## PHASE 7 — Cold storage + container dispatch (45–60 min)

### 7A — Quality voucher (as `admin@kdexport.com`)
1. Open the quality voucher/report for the Phase 6 dispatch.
   ✅ Prefills match the bill — brand, quantities. **No fake numbers** (140/210/180/70/50/650).
2. ✅ **Red rust is a typed % input.** Particulars are **editable** and include **3H** alongside 4H–8H.
3. Save the voucher → ✅ no console errors.

### 7B — Room allocation (as `admin@kdexport.com`)
4. Open the allocation form for the dispatch → ✅ **brand + quantity pre-sync** from the dispatch.
5. Split it: put **50 in Room A + 50 in Room B** using "add room" rows (try auto-distribute too).
6. Try to allocate MORE than a room's remaining space → ✅ **blocked**, with a "use next room" suggestion. (Fixed capacity = **27,000 boxes/room**.)
7. Save → ✅ cold-storage dashboard shows **brand-wise AND room-wise** cards with correct numbers; `/admin` overview totals match.

### 7C — Container: create (as `admin@kdexport.com`)
8. Open the **Container Dispatch panel** on `/admin/cold-storage`. Create a container:
   - Container No: **`TESTU-001`**, Seal: **`TEST-SEAL-1`**, Vehicle No: **`TEST-VEH-1`**, Mobile: **`9999999999`**
   - Load lines: **two lines** — e.g. 13KG × Brand A × 20 boxes AND 13KG × Brand B × 20 boxes.
9. Submit → ✅ container appears as **pending-load** on the cold-storage dashboard.

### 7D — Container: load (log out, login as `coldstorage@kdexport.com`)
10. As **coldstorage@kdexport.com**, open the pending-load card for `TESTU-001` → ✅ it shows exactly what to load.
11. Mark **Loading Complete** → ✅ success.
12. Log back in as **admin@kdexport.com** (or `kdoffice@kdexport.com`) → ✅ the loading-complete notification is visible on `/admin` / overview.

### 7E — Decision: plug-in path with hard block (as `admin@kdexport.com`)
13. For `TESTU-001`, choose **Plug-in (cooling)** → enter **1 hour** (use a short time so you can verify expiry; note the exact time entered).
14. Now (as `coldstorage@kdexport.com`) try to **Dispatch immediately** → ✅ **BLOCKED with an error** (cooling not finished). 🛑 FAIL if dispatch goes through.
15. Wait for the hour to pass (or the deadline you set), then dispatch as `coldstorage@kdexport.com` → ✅ succeeds.

### 7F — Container: direct-dispatch path (second container)
16. As `admin@kdexport.com`, create **`TESTU-002`** (Seal `TEST-SEAL-2`, vehicle `TEST-VEH-2`, mobile `9999999999`) with one load line, mark loading complete (as cold storage), then choose **Direct dispatch** as admin.
17. Dispatch as `coldstorage@kdexport.com` → ✅ succeeds with "dispatch sealed with paper" instruction.

### 7G — Negative + concurrency tests
18. As **`coldstorage@kdexport.com`**, try to **approve a dispatch / start cooling** yourself → ✅ **403/blocked**. (Only admin/office may.)
19. Try to **dispatch `TESTU-001` a second time** → ✅ **blocked** (no double deduction). Verify stock numbers didn't move.
20. **Two-tab race:** create `TESTU-003` with a load line, approve it, then open it in **TWO browser tabs side by side** and hit Dispatch in both as fast as possible → ✅ stock deducts **exactly once**. Report precisely what happened.
21. Try dispatching a container with quantity **larger than available stock** → ✅ **rejected, stock unchanged** (no partial deduction).

   - Village: any village from the list (confirm there is NO district/town field)
   - Any other required fields with `TEST-` values
3. Find the **supervisor dropdown** → ✅ it lists BOTH field supervisors (Ankush, Dinesh, Soyal) AND procurement supervisors (Vishal, Srirang), each with a duty/role label.
4. Select **`vishal.naykudae@kdexport.com`** (procurement supervisor). Submit.
   ✅ Success message; task appears in `/admin/procurement`. Note its ID/farmer name — you need it in Phase 3.

---

## PHASE 8 — Regression, mobile, cleanup, report (20 min)

1. **Empty-state check:** log in as a supervisor with no assignments (create `TEST-Nobody` via `/admin/users` if needed) → ✅ clean empty state, no other users' tasks, no error.
2. **Cross-role check:** assign a HARVEST task to procurement supervisor Vishal (or vice versa) → ✅ they can open and complete it.
3. **Mobile check:** shrink Chrome to **390px wide** (or open on your phone on the same Wi-Fi via your machine's LAN IP) → log in as Ankush → ✅ the supervisor task page and harvest job page are fully usable.
4. **Refresh torture:** on every wizard step in Phases 3 and 6, hit **reload mid-entry** → ✅ correct step + saved data restored, no mock data reappearing.
5. **Polling check:** leave `/admin` open 3 minutes, watch Network tab → ✅ occasional requests (~30s apart), no 2-second storm.
6. **Cleanup (as `admin@kdexport.com`):** delete `TEST-Farmer-Intake1`, the TEST harvest job, containers `TESTU-001/002/003`, and any `TEST-` users. Verify inventory/cold-storage numbers return to sane values.
7. **Write your report** (copy this, fill it, send it):

```markdown
# Manual Test Report — <date> — by <name>
Commit tested: <git rev-parse --short HEAD>
## Result: X passed / Y failed / Z blocked
## FAILURES
| # | Phase.Step | Did | Expected | Got | Console error? | Failed request? |
## Console errors seen (page + action for each)
## Wrong numbers / wrong data (screen + values)
## Layout problems (screen + viewport width)
## Verdict: READY TO PUSH / NOT READY — because …
```

