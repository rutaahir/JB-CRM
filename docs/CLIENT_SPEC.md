# Jalaram Brokers CRM — Client Requirement Specification

## Business Context
- **Client**: Jalaram Brokers (Commodity Broker in Gujarat for cattle feed / cotton-seed products: Kapas Khol, Makai Khol, Hominy Feed, Pellet, Mix Cattlefeed, Wheat Bran).
- **Scale**: ~10 mills/companies, 7 office PCs, 50-200 active buyers/traders.
- **Legacy System**: Pioneer Systems (Desktop ERP). The client expects the CRM to match their established operational terms, party master conventions, and workflow speed.

---

## Core Rules & Guiding Principles
1. **Source of Truth**: This document is the ONLY source of truth. Build EXACTLY what is listed. Nothing extra, nothing less.
2. **Feature Discipline**: Do NOT add unapproved features, extra pages, unrequested form fields, or generic charts.
3. **Single Entry Principle**: "Enter data ONCE, everything else updates automatically." One Deal Entry must feed Mill Order, Order Register, Pending Order tracking, Party Product Mapping, Target actuals, and Reports.
4. **Unit Integrity**: 
   - Commodities use ₹/BAG or ₹/મણ for rates, and BAG or મણ for quantities.
   - **Never multiply Rate by Quantity silently if units differ** (e.g. ₹/BAG with Quantity in મણ). Show "Mixed units" instead.
   - No automatic unit conversion (e.g. assuming 1 BAG = 2.5 મણ) without explicit written confirmation from the client.
5. **No Auto-Target Rule**: Rule 4: Targets are NOT auto-set when a party buys a new product for the first time. Target settings remain Manual until the user explicitly sets a target.
6. **Data Safety**: Do NOT delete deals, recoveries, contacts, or brokerage history silently. Legacy backups must be preserved.
7. **Pioneer UI Parity**: Contact Master, Deal Entry, and shortcuts must feel familiar and ultra-fast for non-technical office staff using keyboard shortcuts (F2 New, F3 Find, F6 Sauda Entry, F7 Sauda Register, F8 Contact Master, F10 Save).

---

## Complete Module Breakdown (Modules 1 to 11)

### Module 1: Dashboard
- Summary cards: Total Deals, Volume, Brokerage, Pending Orders, Today's Follow-ups.
- Quick navigation to key operations.

### Module 2: Contact Master & Contact View (Party Master)
- **Replaces**: Generic "Buyers" and "Sellers" address books.
- **Fields**: Code (Auto-generated numeric 7001+), Date, Name (*required), Party Type (Buyer / Company-Mill), Contact Person 1 & 2, Mobile 1 (*required) & 2, Phone Office 1 & 2, Address, Area, City, PIN, GST No, PAN No, Aadhar No, Email, Reference By.
- **Shortcuts & Actions**:
  - `F2`: Clear form for new record.
  - `F3`: Open Search / Find Modal.
  - `F8`: Quick jump to Contact Master from anywhere.
  - `F10`: Save contact record.
  - Navigation: First, Previous, Next, Last buttons.
- **Protections**:
  - Duplicate Mobile Check: On blur, checks across all active contacts and warns if mobile is already used by another party.
  - Soft Delete Protection: Contact CANNOT be deleted if active Sauda Deals exist for that party.
  - Placeholder Mobile Protection: Known dummy numbers (e.g. 9898000000, 1414141414, 9999999999, 0000000000, 1212121212, demo prefixes) show "⚠️ Mobile missing" and have WhatsApp disabled to prevent messaging strangers.

### Module 3: Sauda Entry (Deal Entry) + Sauda Register
- **Sauda Entry (`F6` / `/deals?mode=entry`)**:
  - Fields: Deal Number (Auto: `SD-YYYYMMDD-XXXX`), Deal Date, Buyer (Contact, type Buyer), Company/Mill (Contact, type Company-Mill), Product (Active commodities only), Rate + Rate Unit (BAG / મણ), Quantity + Quantity Unit (BAG / મણ), Delivery / Payment Status (Default: `Pending`, Options: `Pending`, `Done`).
  - Searchable dropdowns for Buyer and Mill.
  - Inline "Manage Products" modal for adding/toggling commodity products without a sidebar clutter.
  - **Auto-Actions on Save (`F10`)**:
    1. Create Mill Order (`MO-SD-...`).
    2. Create Pending Order tracking entry.
    3. Add row to Sauda Register.
    4. Run Product Auto-Mapping: if buyer buys product for the 1st time, trigger "New Product Alert" (no auto-target).
    5. Update Target actual for the month.
    6. Generate ready WhatsApp messages for Mill and Buyer with copy/send actions.
    7. Display Success Summary modal.
- **Sauda Register (`F7` / `/deals?mode=register`)**:
  - Filter by Date range, Buyer Party, Company/Mill, Product, Status.
  - Search keyword filtering contacts & deals.
  - Export to Excel (UTF-8 BOM CSV with proper Gujarati text support).
  - Shows "Mixed units" when rate unit != quantity unit.

### Module 4: Pending Order PDF Upload & Register
- Upload daily Pending Order PDF tagged by Date + Company/Mill (~10 companies).
- Extract: Party Name, Product, Order Qty, Pending Qty, Order Date.
- Comparison with previous company PDF:
  - Missing in today's PDF -> Mark "Completed"
  - New order in today's PDF -> Add new entry
  - Existing pending -> Calculate ageing in days
- Preview table with highlight on discrepancies; DB updates ONLY upon user approval.
- Sidebar item: "Pending Orders".

### Module 5: Payment Recovery PDF Upload & Register
- Upload company-wise Payment Recovery PDF.
- Extract billed amount, balance amount, bill date, due days.
- Comparison and approval flow identical to Module 4.
- Party-wise pending recovery tracking and promised payment date.

### Module 6: Party Master, Product List, Target & Purchase History
- 4 Product Auto-Mapping rules:
  1. Auto-add product to Party Product List on purchase.
  2. No duplicate mappings.
  3. New Product Alert on first-time purchase.
  4. Manual Target setting (no auto-target).
- Monthly target comparison: Target, Actual, Remaining, Achievement %.
- Purchase History per party.

### Module 7: Smart Telecalling & Automatic Follow-up Reminders
- Priority list of traders to call based on purchase history and recovery balance.
- Call logging and follow-up date reminder.

### Module 8: Multi-Company Brokerage & Billing
- Calculation of brokerage earned per mill/buyer.

### Module 9: Rate Intelligence & Market Trends
- Daily rates per commodity from different mills.

### Module 10: Commission & Brokerage Reconciliation
- Ledger of brokerage received vs pending.

### Module 11: Multi-User Office & Staff Permissions
- 7 office PCs, Staff 1 to 3 roles, Admin controls.
