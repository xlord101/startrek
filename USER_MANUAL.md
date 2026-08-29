# KD Export — Banana Supply Chain Management System
## Official User & Operations Manual

---

## Table of Contents
1. [Platform Overview & Key Highlights](#1-platform-overview--key-highlights)
2. [User Roles & Testing Login Credentials](#2-user-roles--testing-login-credentials)
3. [End-to-End Operational Workflow (Step-by-Step)](#3-end-to-end-operational-workflow-step-by-step)
   - [Phase 1: Farm Intake & Procurement Inspection (Module 1)](#phase-1-farm-intake--procurement-inspection-module-1)
   - [Phase 2: Harvesting Scheduling & Field Dispatch (Module 2)](#phase-2-harvesting-scheduling--field-dispatch-module-2)
   - [Phase 3: Cold Storage Gate Inward & Room Allocation (Module 3)](#phase-3-cold-storage-gate-inward--room-allocation-module-3)
   - [Phase 4: Consumables & Box Inventory Reconciliation (Module 4)](#phase-4-consumables--box-inventory-reconciliation-module-4)
   - [Phase 5: Staff Management & Audit Logs (Module 5)](#phase-5-staff-management--audit-logs-module-5)
4. [Security, Session Rules & Tips](#4-security-session-rules--tips)

---

## 1. Platform Overview & Key Highlights

KD Export Supply Chain System is an enterprise-grade web application built to digitize and automate the entire banana export process:
- **Zero-Loss Tracking**: From initial farm visit to harvesting, packaging, truck transit, cold storage aging, and leftover box returns.
- **Role-Based Workspaces**: Tailored interfaces for Admins, Procurement Field Officers, Harvesting Supervisors, Inventory Clerks, and Cold Storage Operators.
- **Strict Concurrency Protection**: Live session controls prevent duplicate logins and ensure data integrity across field tablets and office PCs.
- **Cold Storage Multi-Brand Stock Matrix**: Real-time breakdown of stored inventory by Brand (e.g. *KD Premium*, *Green King*, *Desert Gold*) and Hand size (*4H, 5H, 6H, 7H, 8H*).

---

## 2. User Roles & Testing Login Credentials

> [!NOTE]
> All accounts have been seeded with the default password: `password123`

| Role | Name | Email / Login ID | Password | Operational Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Main Admin** | Main Admin | `admin@kdexport.com` | `password123` | Full access to all modules, financial approvals, user management & audit trails |
| **Office Admin** | KD Office | `kdoffice@kdexport.com` | `password123` | Procurement review, rate locks, harvest scheduling & logistics |
| **Office Admin** | Anis Momin | `anis.momin@kdexport.com` | `password123` | Operations coordination & harvest planning |
| **Procurement Supervisor** | Vishal Naykudae | `vishal.naykudae@kdexport.com` | `password123` | Farm visits, fruit quality evaluation & rate recommendation |
| **Procurement Supervisor** | Srirang Engale | `srirang.engale@kdexport.com` | `password123` | Field inspection & procurement intake verification |
| **Harvesting Supervisor** | Ankush Shinde | `ankush.shinde@kdexport.com` | `password123` | On-site farm harvesting, labour crew supervision, box loading & truck dispatch |
| **Harvesting Supervisor** | Dinesh Magar | `dinesh.magar@kdexport.com` | `password123` | Farm harvesting execution & Kiran Doke bill generation |
| **Harvesting Supervisor** | Soyal Mujavar | `soyal.mujavar@kdexport.com` | `password123` | Farm harvesting execution & dispatch |
| **Inventory Admin** | Ajit Landge | `ajit.landge@kdexport.com` | `password123` | Warehouse box stock management, consumable issues & return reconciliation |
| **Cold Storage Admin** | Cold Storage Operator | `coldstorage@kdexport.com` | `password123` | Truck gate entry, KD quality inspection, room temperature & multi-brand room allocation |

---

## 3. End-to-End Operational Workflow (Step-by-Step)

Follow this complete lifecycle to test all platform features from start to finish:

### Phase 1: Farm Intake & Procurement Inspection (Module 1)
1. **Login as Admin** (`admin@kdexport.com` / `password123`).
2. Go to **Procurement** -> Click **+ New Farm Intake**.
3. Fill in:
   - **Farmer Details**: Name, Phone Number, Acreage, Variety (*Grand Naine*), Cutting cycle.
   - **Location**: Enter Lane/Gat No, select District/City (e.g. *Solapur*), and select Town (e.g. *Karmala*). State (*Maharashtra*) is mapped automatically.
   - **Estimated Yield**: e.g., `25` Tons.
4. Click **Create Farm Intake**.
5. In the Procurement table, locate the new intake under **Pending Assignment** and click **Assign Supervisor**.
6. Select **Vishal Naykudae** or **Srirang Engale** and click **Confirm & Assign Task**.
7. **Login as Procurement Supervisor** (`vishal.naykudae@kdexport.com`):
   - You will see the assigned farm in your supervisor queue.
   - Click **Submit Inspection Report**: Enter actual tonnage, quality grade (e.g. *A+ Grade*), finger calibration, ratio %, and recommended rate per kg (e.g. `₹18.50`).
   - Submit the field report.
8. **Switch back to Admin**:
   - The farm moves to **Field Report Submitted**.
   - Click **Review & Lock Rate**: Verify the supervisor's numbers, adjust final rate if necessary, and click **Approve & Lock Procurement**.
   - The intake is now locked and ready for harvesting!

---

### Phase 2: Harvesting Scheduling & Field Dispatch (Module 2)
1. **As Admin**, navigate to **Harvesting Management**.
2. Under **Ready for Harvest**, click **Schedule Harvest** on the approved farm.
3. Fill out the dispatch parameters:
   - **Harvesting Supervisor**: Select **Ankush Shinde** or **Dinesh Magar**.
   - **Packaging Box Types**: Select required box types (e.g. *13.5 Kg Bottom Top*, *7 Kg Plate*) and enter required counts (e.g. `1200` boxes).
   - **Vehicle Supplier**: Select transport supplier (e.g. *Shree Samarth Transport - MH-12-AB-1234*).
   - **Labour Squad**: Select assigned harvesting team (e.g. *Team 1 - Ramesh (12 Members)*).
   - **Target Brand**: Select brand packaging category (e.g. *KD Premium*).
4. Click **Confirm & Dispatch Harvesting Order**.
5. **Login as Harvesting Supervisor** (`ankush.shinde@kdexport.com`):
   - View the active harvest job card under **Active Jobs**.
   - Click **Confirm Inventory Pickup** (acknowledges receipt of packaging boxes & consumables).
   - Click **Start Harvesting**.
   - When loading is finished, click **Dispatch Truck (Kiran Doke Bill)**.
   - Fill in:
     - Total boxes loaded into the truck (e.g. `1150` boxes).
     - Net banana weight (e.g. `15.5` Tons).
     - Leftover boxes to return to warehouse (e.g. `50` boxes).
   - Click **Submit Dispatch & Generate Bill**. The truck is now marked *In Transit to Cold Storage*.

---

### Phase 3: Cold Storage Gate Inward & Room Allocation (Module 3)
1. **Login as Cold Storage Admin** (`coldstorage@kdexport.com` / `password123`).
2. You will see the arriving vehicle under **In Transit / Arriving Trucks**.
3. When the vehicle arrives at the facility gate:
   - Click **Verify Gate Arrival**.
   - Click **Submit KD Quality Report**: Check outer box condition (*GOOD/FAIR/POOR*), calibration, and temperature.
4. Click **Allocate to Cold Rooms**:
   - Assign boxes to specific rooms (e.g., *Room 1 (0-4°C)*: `600` boxes of *KD Premium*; *Room 2*: `550` boxes of *KD Premium*).
   - Click **Save & Complete Inward**.
5. **Check Admin Overview** (`admin@kdexport.com`):
   - Open **Admin Dashboard**.
   - View the **Cold Storage Multi-Brand Stock Breakdown**: see total boxes, metric tonnage, and hand-size matrix (*4H, 5H, 6H, 7H, 8H*).

---

### Phase 4: Consumables & Box Inventory Reconciliation (Module 4)
1. **Login as Inventory Admin** (`ajit.landge@kdexport.com` / `password123`).
2. Go to **Inventory & Consumables**.
3. **Restocking Available Stock**:
   - Click **+ Add Stock Entry** to register new shipments of empty boxes, ethylene pouches, foam pads, or chemical cans.
4. **Processing Field Returns**:
   - Under **Pending Returns**, locate the leftover box return submitted by the harvesting supervisor (e.g. `50` boxes).
   - Click **Verify Return**.
   - Count physical items: enter usable good boxes vs damaged boxes.
   - Approved good boxes immediately credit back into live available stock.

---

### Phase 5: Staff Management & Audit Logs (Module 5)
1. **Login as Main Admin** (`admin@kdexport.com`).
2. Go to **User Management** (`/admin/users`):
   - View all active staff across all operational roles.
   - Click **+ New Staff Account** to register a new supervisor or operator.
   - Edit user profile / role privileges anytime.
   - Click the **Trash** icon to safely delete inactive/test accounts.
3. Go to **System Audit Trail** (`/admin/audit-logs`):
   - View a complete timestamped log of every action: rate approvals, task dispatches, inventory modifications, and user deletions.

---

## 4. Security, Session Rules & Tips

- **Single Device Session**: For enterprise security, logging into an account on a second device will automatically log out the first device.
- **Live Background Refresh**: All dashboards silently refresh active task queues every 5 seconds—no need to manually reload the page.
- **Mobile Responsive**: Supervisors can use smartphones or tablets in the field with full touch support for camera uploads and signature inputs.
- **Fast Role Switching**: You can log out from the top-right user menu to switch between Admin, Supervisor, and Operator profiles during testing.
