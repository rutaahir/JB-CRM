# Jalaram Brokers CRM (JB-CRM) — Complete User Manual & Flow Guide
> **સરળ અને સંપૂર્ણ માર્ગદર્શિકા (Simple & Understandable Documentation)**  
> This document explains every single page in the CRM, what each button and feature does, what happens when you perform an action ("If we do this, then that happens"), and step-by-step operational workflows.

---

## 📌 Table of Contents
1. [Project Overview & Core Business Rules](#1-project-overview--core-business-rules)
2. [Global Keyboard Shortcuts (Pioneer ERP Speed)](#2-global-keyboard-shortcuts)
3. [Page-by-Page Detailed Breakdown](#3-page-by-page-detailed-breakdown)
   - [Page 1: Login & Staff Approval Screen (`/login`)](#page-1-login--staff-approval-screen)
   - [Page 2: Dashboard (`/dashboard`)](#page-2-dashboard)
   - [Page 3: Contact Master (`/contacts/master` - Shortcut F8)](#page-3-contact-master-party-master)
   - [Page 4: Contact View (`/contacts/view`)](#page-4-contact-view-party-directory)
   - [Page 5: Sauda Entry (`/deals?mode=entry` - Shortcut F6)](#page-5-sauda-entry-deal-entry)
   - [Page 6: Sauda Register (`/deals?mode=register` - Shortcut F7)](#page-6-sauda-register-order-book)
   - [Page 7: Party Targets & Achievement (`/deals?mode=targets`)](#page-7-party-targets--achievement)
   - [Page 8: Leads & Smart Follow-Up (`/leads`)](#page-8-leads--smart-follow-up)
   - [Page 9: Pending Orders & Daily PDF Extractor (`/pending-orders`)](#page-9-pending-orders--daily-pdf-extractor)
   - [Page 10: Staff Management & Login Approvals (`/staff` - Admin Only)](#page-10-staff-management--login-approvals)
4. [Step-by-Step Flow Guides ("How Do I Do X?")](#4-step-by-step-flow-guides)
   - [Flow 1: Creating a New Party (Buyer or Mill)](#flow-1-creating-a-new-party-buyer-or-mill)
   - [Flow 2: Booking a New Deal (Sauda) & Sending WhatsApp Messages](#flow-2-booking-a-new-deal-sauda--sending-whatsapp)
   - [Flow 3: Daily Mill Pending Orders via PDF Upload](#flow-3-daily-mill-pending-orders-via-pdf-upload)
   - [Flow 4: Staff Member Logging In (Admin Approval Workflow)](#flow-4-staff-member-logging-in)
   - [Flow 5: Lead Follow-up & Converting to Customer](#flow-5-lead-follow-up--converting-to-customer)
   - [Flow 6: Setting and Monitoring Monthly Targets](#flow-6-setting-and-monitoring-monthly-targets)
   - [Flow 7: Exporting Data to Excel with Gujarati Support](#flow-7-exporting-data-to-excel-with-gujarati-support)
5. [Important Safety Rules & "Why did this happen?"](#5-important-safety-rules--troubleshooting)

---

## 1. Project Overview & Core Business Rules

**Jalaram Brokers CRM** is a dedicated commodity brokerage software designed for trading cattle feed / cotton seed commodities in Gujarat:
- **Core Commodities**: Kapas Khol (કપાસ ખોળ), Makai Khol (મકાઈ ખોળ), Hominy Feed (હોમિની ફીડ), Pellet (પેલેટ), Mix Cattlefeed, Wheat Bran.
- **Scale**: ~10 Cotton/Feed Mills (Companies), 50–200 active Buyers/Traders, 7 Office PCs.
- **Legacy Match**: Built to match the keyboard speed, naming conventions, and layout of Pioneer Systems ERP.

### 4 Golden Rules of the CRM:
1. **Single Entry Principle**: You enter a deal **once** in Sauda Entry (`F6`). The system automatically creates the Mill Order, records Pending Order tracking, adds it to the Sauda Register, updates monthly party targets, and generates ready WhatsApp messages.
2. **Unit Integrity**: Rates are in `₹/BAG` or `₹/મણ`, and quantities are in `BAG` or `મણ`. If Rate is in `₹/BAG` but Quantity is in `મણ`, the system **never** silently multiplies them. It clearly shows **"Mixed units"** to prevent financial mistakes.
3. **No Auto-Target Rule (Rule 4)**: When a buyer purchases a new commodity for the first time, the CRM alerts the team, but **does NOT automatically set a sales target**. Target setting is always manually controlled by the manager.
4. **Data Safety**: Active contacts with deal history can **never** be deleted accidentally (Soft Delete Protection). Dummy/placeholder phone numbers (like `9898000000`) have WhatsApp messaging disabled to prevent messaging strangers.

---

## 2. Global Keyboard Shortcuts

Work rapidly without needing the mouse — just like in Pioneer Systems:

| Key | What it does | Where it works |
| :--- | :--- | :--- |
| **`F2`** | **New Record / Clear Form** | Contact Master, Deal Entry |
| **`F3`** | **Find / Quick Search Dialog** | Contact Master |
| **`F6`** | **Quick Jump to Sauda Entry** | Anywhere in the application |
| **`F7`** | **Quick Jump to Sauda Register** | Anywhere in the application |
| **`F8`** | **Quick Jump to Contact Master** | Anywhere in the application |
| **`F10`** | **Save Record** | Contact Master, Deal Entry |
| **`Esc`** | **Close Modals / Popup Windows** | Anywhere |

---

## 3. Page-by-Page Detailed Breakdown

---

### Page 1: Login & Staff Approval Screen
- **URL**: `/login`
- **Component**: [LoginPage.tsx](file:///c:/Users/Harshil%20Shah/Desktop/TA-Project/JB-CRM/frontend/src/pages/LoginPage.tsx)

#### What is on this page?
- Secure username/email and password fields.
- Brand logo and official company credentials.
- Automatic device and session tracking.

#### How does it work?
- **Case A: Admin Login (`admin@jalarambroker.com`)**:
  - Enter credentials and click **Sign In**.
  - 👉 **Result**: Logged in immediately and redirected to the **Dashboard**.
- **Case B: Staff Member Login (`staff1@jalarambroker.com`, etc.)**:
  - Enter credentials and click **Sign In**.
  - 👉 **Result**: The screen transforms into a **"Waiting for Admin Approval"** status screen with a live polling clock (checks every 2 seconds).
  - A notification appears on the Admin's Staff Page.
  - As soon as Admin clicks **Approve**, the staff screen automatically opens the Dashboard.
  - If Admin clicks **Reject**, the staff screen shows "Login Request Rejected".

---

### Page 2: Dashboard
- **URL**: `/dashboard`
- **Component**: [DashboardPage.tsx](file:///c:/Users/Harshil%20Shah/Desktop/TA-Project/JB-CRM/frontend/src/pages/DashboardPage.tsx)

#### What is on this page?
- **Top KPI Cards**: Total Active Mills, Total Buyers, Today's Deals Count, Total Volume (Bags), Total Brokerage (₹), Pending Orders, and Monthly Target Achievement %.
- **Quick Action Buttons**:
  - `+ New Sauda (F6)` -> Takes you directly to Deal Entry.
  - `Search Contact (F8)` -> Opens Contact Master.
  - `Pending Orders (PDF)` -> Takes you to PDF Extractor.
  - `Telecalling Queue` -> Takes you to Leads Follow-up.
- **Recent Deals Widget**: Shows the latest 5 booked deals with live statuses.
- **Pending Deliveries Alert Box**: Highlights orders waiting for dispatch from mills.
- **Today's Due Telecalls**: Direct list of buyers who need a call today.

---

### Page 3: Contact Master (Party Master)
- **URL**: `/contacts/master` (Shortcut: **`F8`**)
- **Component**: [ContactMasterPage.tsx](file:///c:/Users/Harshil%20Shah/Desktop/TA-Project/JB-CRM/frontend/src/pages/ContactMasterPage.tsx)

#### What is on this page?
A 1-to-1 recreation of the Pioneer Systems ERP desktop layout:
- **Header**: Auto-generated Numeric Code (`7001`, `7002`, etc.), Creation Date, Party Name.
- **Party Type**: Dropdown selecting **`Buyer`** (વેપારી) or **`Company-Mill`** (મીલ/કંપની).
- **Contact Numbers**: Contact Person 1 & 2, Mobile 1 (Required), Mobile 2, Phone Office 1 & 2.
- **Address & Tax Details**: Address, Area, City/Station, PIN Code, GST Number, PAN Number, Aadhar Number.
- **Bank & Pioneer Layout**: Bank Name, Account No, IFSC, Branch, Cheque Layout.
- **Navigation Controls**: `First (|<)`, `Previous (<)`, `Next (>)`, `Last (>|)` buttons to browse records one by one.

#### What happens when you do this?
- **If you press `F2`**: The form clears instantly and fetches the next available party code (e.g. `7085`).
- **If you type a Mobile Number already used by another party**: On clicking outside or pressing Tab, a bright amber warning appears: *"⚠️ Warning: Mobile number is already used by [Party Name]!"*
- **If you enter a dummy phone (e.g. `9898000000`, `9999999999`, `1212121212`)**: The badge marks *"⚠️ Dummy/Placeholder Mobile"*. The WhatsApp button is disabled to protect you from messaging wrong people.
- **If you press `F10` or click "Save"**:
  - If Name or Mobile 1 is missing, it stops and highlights the field.
  - If valid, the contact is saved in the database, navigation buttons refresh, and a green success notification confirms save.
- **If you click "Delete" on a party that has past deals**: The system blocks deletion and displays: *"Cannot delete party: Active Sauda Deals exist for this contact."*

---

### Page 4: Contact View (Party Directory)
- **URL**: `/contacts/view`
- **Component**: [ContactViewPage.tsx](file:///c:/Users/Harshil%20Shah/Desktop/TA-Project/JB-CRM/frontend/src/pages/ContactViewPage.tsx)

#### What is on this page?
- Search bar: Type party name, code, phone, or city to filter instantly.
- Filter tabs: `All`, `Buyers Only`, `Mills / Companies Only`.
- Table listing: Code, Name, City, Primary Mobile, Secondary Mobile, GST No.

#### Actions on this page:
- **Click "WhatsApp" icon**: Opens WhatsApp Web / WhatsApp Desktop with a personalized Gujarati greeting to that party.
- **Click "Edit / View"**: Jumps directly to that party in the Contact Master (`F8`).
- **Click "Export to Excel"**: Downloads an Excel/CSV file encoded with UTF-8 BOM, ensuring all Gujarati names display perfectly in Microsoft Excel without question marks.

---

### Page 5: Sauda Entry (Deal Entry)
- **URL**: `/deals?mode=entry` (Shortcut: **`F6`**)
- **Component**: [DealsPage.tsx](file:///c:/Users/Harshil%20Shah/Desktop/TA-Project/JB-CRM/frontend/src/pages/DealsPage.tsx)

#### What is on this page?
- **Deal Number**: Automatically generated (`SD-20261114-0001`).
- **Deal Date**: Defaults to today's date.
- **Buyer Selection**: Searchable dropdown. Type code (`7001`), name (`Jay Ambe Trader`), or city (`Rajkot`).
- **Company / Mill Selection**: Searchable dropdown for Mills (`Kakan Cotton`, `Shree Ram Agro`, etc.).
- **Product Selection**: Commodity dropdown (`Kapas Khol`, `Makai Khol`, `Hominy Feed`, `Pellet`, `Wheat Bran`).
- **Rate & Rate Unit**: Amount in ₹, unit selectable as `BAG` or `મણ`.
- **Quantity & Quantity Unit**: Total number, unit selectable as `BAG` or `મણ`.
- **Gross Amount Display**:
  - If both units match (`BAG` & `BAG`), it auto-calculates `Rate × Quantity`.
  - If units differ (e.g. ₹/BAG with Quantity in મણ), it shows `Mixed units` to prevent inaccurate calculations.
- **Delivery / Payment Status**: Default `Pending`, option `Done`.

#### What happens when you press `F10` (Save Deal)?
Saving a deal triggers **7 automatic operations behind the scenes**:
1. Creates the deal record in the database.
2. Creates an official **Mill Order** (`MO-SD-...`) linked to this deal.
3. Creates a **Pending Order** record for delivery tracking.
4. Updates the **Sauda Register**.
5. Checks Buyer Product History: If the buyer bought this item for the first time, it logs a **"New Product Alert"** (without auto-setting targets, complying with Rule 4).
6. Adds the quantity to the buyer's monthly **Target Actuals**.
7. **Pops up the Deal Summary Modal** containing two ready WhatsApp messages:
   - **For the Mill**: Order confirmation details, buyer station, quantity, rate.
   - **For the Buyer**: Confirmation receipt with broker remarks.
   - Click the green **Send via WhatsApp** button to launch the message directly!

---

### Page 6: Sauda Register (Order Book)
- **URL**: `/deals?mode=register` (Shortcut: **`F7`**)
- **Component**: [DealsPage.tsx](file:///c:/Users/Harshil%20Shah/Desktop/TA-Project/JB-CRM/frontend/src/pages/DealsPage.tsx)

#### What is on this page?
A comprehensive ledger of all transactions ever booked in the CRM.
- **Filter Bar**:
  - Filter by Date Range (From Date -> To Date).
  - Filter by Buyer Party.
  - Filter by Company / Mill.
  - Filter by Product.
  - Filter by Delivery / Payment Status (`Pending` vs `Done`).
- **Table Columns**: Sauda No, Date, Mill Name, Buyer Name, Buyer Station/City, Product, Quantity + Unit, Rate + Unit, Gross Amount (₹), Status, Actions.
- **Excel Export**: Click **Export to Excel** to get a clean spreadsheet for accounting reconciliation.

---

### Page 7: Party Targets & Achievement
- **URL**: `/deals?mode=targets`
- **Component**: [DealsPage.tsx](file:///c:/Users/Harshil%20Shah/Desktop/TA-Project/JB-CRM/frontend/src/pages/DealsPage.tsx)

#### What is on this page?
Monitors monthly commodity targets per buyer (Rule 4 Target Tracking):
- **Month Picker**: Select Month & Year (e.g. `2026-11`).
- **Summary Cards**:
  - Total Target Goal (Total Bags targeted across all parties).
  - Total Actual Sold (Bags already booked this month).
  - Overall Achievement Rate (% completed).
- **Target Comparison Table**:
  - Buyer Name & Station.
  - Product.
  - Target Quantity (Bags).
  - Actual Quantity (Bags booked).
  - Remaining Balance to achieve.
  - Visual Progress Bar (Color coded: Red < 50%, Amber 50-80%, Green > 80%).
- **Manual Target Setup Form**:
  - Select Buyer + Product + Target Quantity in Bags -> Save.

---

### Page 8: Leads & Smart Follow-Up
- **URL**: `/leads`
- **Component**: [LeadsPage.tsx](file:///c:/Users/Harshil%20Shah/Desktop/TA-Project/JB-CRM/frontend/src/pages/LeadsPage.tsx)

#### What is on this page?
A telecalling and prospect management system for office staff:
- **Pipeline Tabs**:
  - `All Leads`: Complete list.
  - `Today's Calls`: Leads whose follow-up date is today.
  - `Overdue Calls`: Follow-ups that were missed.
  - `Hot Leads`: High-intent buyers ready to book.
  - `Converted`: Leads turned into buying customers.
- **Actions per Lead**:
  - **Log Call (📞)**: Opens a modal to write notes: Call Result (`Interested`, `Ringing`, `Not Interested`), Discussed Rate, and Next Follow-up Date.
  - **Call History (🕒)**: View past telecall remarks chronologically.
  - **Convert to Customer (⭐)**: When a lead agrees to buy, click Convert. The system creates a full Contact Master record and lets you book a deal immediately!

---

### Page 9: Pending Orders & Daily PDF Extractor
- **URL**: `/pending-orders`
- **Component**: [PendingOrdersPage.tsx](file:///c:/Users/Harshil%20Shah/Desktop/TA-Project/JB-CRM/frontend/src/pages/PendingOrdersPage.tsx)

#### What is on this page?
Handles daily pending order reports sent by the ~10 Mills:
- **Tab 1: PDF Extractor & Daily Diff**:
  1. Select the Mill/Company from the dropdown.
  2. Select the Report Date.
  3. Upload the Mill's daily PDF report (or paste OCR text).
  4. Click **Extract & Analyze**.
  5. The system reads the table (Party Name, Product, Order Qty, Pending Qty, Order Date).
  6. **Automated Comparison with Yesterday's PDF**:
     - 🟢 **New Order**: Order appeared today that wasn't there yesterday.
     - 🔵 **Completed**: Order was on yesterday's PDF but gone today -> Mark as Dispatched/Completed.
     - 🟠 **Ageing Calculation**: Shows exactly how many days the order has been pending at the mill.
  7. **Approval Protection**: Nothing changes in the live database until the operator reviews the preview and clicks **Approve & Commit to Database**.
- **Tab 2: Live Pending Orders Register**:
  - Searchable list of all currently pending dispatches across all mills.
- **Tab 3: Upload History**:
  - Archive of past uploaded PDFs with rollback capabilities.

---

### Page 10: Staff Management & Login Approvals
- **URL**: `/staff` (Restricted to **Admin** only)
- **Component**: [StaffPage.tsx](file:///c:/Users/Harshil%20Shah/Desktop/TA-Project/JB-CRM/frontend/src/pages/StaffPage.tsx)

#### What is on this page?
- **Tab 1: Staff Directory**:
  - Lists the 7 office users (`Staff 1`, `Staff 2`, `Staff 3`, etc.).
  - Add new staff member with email, phone, and role.
  - One-click Toggle to enable or disable any staff member's access.
- **Tab 2: Live Login Requests (Approval Queue)**:
  - When staff attempts to log in from their PC, a live request card pops up showing:
    - Staff Name & Email.
    - IP address / Device information.
    - Timestamp.
  - Two buttons:
    - **`Approve`** (Green): Unlocks the staff member's screen instantly.
    - **`Reject`** (Red): Denies access and disconnects the session.

---

## 4. Step-by-Step Flow Guides

### Flow 1: Creating a New Party (Buyer or Mill)
```text
Step 1: Press 'F8' anywhere -> Opens Contact Master.
Step 2: Press 'F2' -> Clears form and assigns the next Code (e.g. 7085).
Step 3: Select Party Type:
        - Choose "Buyer" for customers who purchase cattle feed.
        - Choose "Company-Mill" for ginning/crushing mills selling goods.
Step 4: Type Name (e.g. "Radhe Krishna Traders").
Step 5: Type Primary Mobile Number (10 digits).
        * If warning shows "Already used", check if party already exists!
Step 6: Enter City / Station (e.g. "Kadi" or "Gondal").
Step 7: (Optional) Fill in GST, PAN, Address, Bank details.
Step 8: Press 'F10' or click "Save".
        * Green notification appears: "Contact Saved Successfully!"
```

---

### Flow 2: Booking a New Deal (Sauda) & Sending WhatsApp
```text
Step 1: Press 'F6' anywhere -> Opens Sauda Entry.
Step 2: Select "Buyer":
        - Click Buyer field, type 2-3 letters of name or city, click to select.
Step 3: Select "Company / Mill":
        - Click Mill field, select the supplying mill.
Step 4: Select "Product" (e.g. Kapas Khol 50kg).
Step 5: Enter "Rate" (e.g. 1850) and select Unit (e.g. BAG).
Step 6: Enter "Quantity" (e.g. 300) and select Unit (e.g. BAG).
        * Notice Gross Amount displays: ₹5,55,000.00.
Step 7: Press 'F10' or click "Book Sauda".
Step 8: Pop-up Modal opens with Summary & Ready WhatsApp Text:
        - Click "WhatsApp Mill" to send confirmation to the mill manager.
        - Click "WhatsApp Buyer" to send confirmation to the buyer.
Step 9: Click "Close" or press 'Esc'. Form resets ready for the next deal!
```

---

### Flow 3: Daily Mill Pending Orders via PDF Upload
```text
Step 1: Click "Pending Orders" in the left sidebar.
Step 2: Under "Upload Daily PDF":
        - Select the Mill (e.g. "Kakan Cotton").
        - Select Report Date (Today).
Step 3: Click "Choose PDF File" and select the PDF received on WhatsApp/Email.
Step 4: Click "Extract & Process".
Step 5: Review the Preview Table:
        - Look at "New Orders" highlighted in Green.
        - Look at "Dispatched/Completed" highlighted in Blue.
        - If an unknown party name appears, click "Quick Add Contact".
Step 6: Click "Approve & Update Database".
        * The Live Pending Register is now officially updated!
```

---

### Flow 4: Staff Member Logging In
```text
On the Staff's PC:
1. Open browser -> Go to CRM URL.
2. Enter Staff Email & Password -> Click "Sign In".
3. The screen will say: "Waiting for Admin Approval...".

On the Admin's PC:
1. Go to "Staff & Approvals" in the left sidebar.
2. Open the "Login Requests" tab.
3. Click green "Approve" button next to the staff member's request.

👉 Result: The staff's screen automatically logs in and opens the Dashboard.
```

---

### Flow 5: Lead Follow-up & Converting to Customer
```text
Step 1: Click "Leads & Follow-up" in the left sidebar.
Step 2: Click the "Today's Calls" tab to see buyers due for a call today.
Step 3: Call the trader.
Step 4: Click the "📞 Log Call" button on that row:
        - Enter discussed rate (e.g. ₹1840).
        - Select call result (e.g. "Interested").
        - Pick next follow-up date (e.g. tomorrow).
        - Click "Save Call Log".
Step 5: If the trader agrees to make a deal right away:
        - Click "⭐ Convert to Customer".
        - The CRM automatically promotes them to Contact Master.
        - Press 'F6' to book their deal!
```

---

### Flow 6: Setting and Monitoring Monthly Targets
```text
Step 1: In the left sidebar, click "Party Targets" (or go to /deals?mode=targets).
Step 2: Select the Current Month (e.g. 2026-11).
Step 3: To set a target for a party:
        - Select Buyer Name.
        - Select Product (e.g. Makai Khol).
        - Enter Target Quantity (e.g. 1000 Bags).
        - Click "Save Target".
Step 4: As Sauda Deals are booked throughout the month, the "Actual Bags" and
        "Achievement %" update automatically without any manual calculations!
```

---

### Flow 7: Exporting Data to Excel with Gujarati Support
```text
To export Contacts:
1. Go to "Contact View" (/contacts/view).
2. Click the green "Export to Excel" button at top-right.

To export Deals:
1. Go to "Sauda Register" (F7).
2. Apply any desired filters (e.g. specific Mill or Date Range).
3. Click "Export to Excel".

👉 Result: A .csv file is downloaded with UTF-8 BOM encoding.
When opened in Microsoft Excel on any Windows PC, all Gujarati text
(names, notes, stations) will display cleanly without distortion or '???'.
```

---

## 5. Important Safety Rules & Troubleshooting

| Question / Symptom | Reason | What to do |
| :--- | :--- | :--- |
| **Why is the WhatsApp button grey/disabled on a contact?** | The contact has a placeholder or dummy phone number (e.g. `9898000000`). | Edit the contact in Contact Master (`F8`), enter their real 10-digit mobile number, and save (`F10`). |
| **Why does Gross Amount show "Mixed units" instead of an amount?** | Rate Unit is different from Quantity Unit (e.g. Rate in `₹/BAG`, but Quantity in `મણ`). | Rule 2 prohibits multiplying across different units. Ensure both Rate Unit and Quantity Unit match (both `BAG` or both `મણ`). |
| **Why can't I delete a party from Contact Master?** | The party has existing Sauda deals or orders in the system. | To maintain audit integrity, contacts with deal history cannot be deleted. If you don't trade with them anymore, simply leave them inactive. |
| **Why didn't a monthly target auto-generate when a party bought a new product?** | **Rule 4 of the CRM**: New product purchases never automatically set sales targets. | Go to `Party Targets` (`/deals?mode=targets`) and manually enter the target if desired. |
| **Why can't a staff member log in from their PC?** | Staff logins require one-time approval by Admin for security. | The Admin must navigate to `/staff` -> `Login Requests` tab and click **Approve**. |

---

*Document prepared for Jalaram Brokers Management & Office Staff.*
