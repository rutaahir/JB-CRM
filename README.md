# Jalaram Brokers – CRM Admin Panel (React + Python Django)

A professional, modern, fully responsive CRM web application built for **Jalaram Brokers** (Ahmedabad, Gujarat), connecting cattle feed & oil cake suppliers (Sellers) with livestock farms & dairies (Buyers).

---

## 📸 System Architecture & Features

### 1. UI & Visual Identity
- **Brand Colors**: Deep Forest Green (`#0B3B24` / `#14532D`), Warm Gold (`#CA8A04`), Slate (`#0F172A`), Background (`#F8FAFC`).
- **Typography**: *Plus Jakarta Sans* (headings), *Inter* (body/UI), *Noto Sans Gujarati* (regional names/terms).
- **Design System**: 12px rounded cards, soft drop shadows, responsive mobile bottom navigation + hamburger drawer.

### 2. Core Modules
- **Login Module**: Split-screen brand hero panel with cattle pasture imagery, key value badges, and authenticated JWT sessions.
- **Admin Dashboard**: 5 KPI stat cards with growth metrics, interactive 6-month growth multi-line chart (Recharts), recent sellers/buyers/products widgets, and top quick-action buttons.
- **Sellers Module**: Supplier directory with search, sorting, pagination, direct clickable WhatsApp link (`wa.me`), phone (`tel:`), email (`mailto:`), and full Add/Edit/View/Delete controls.
- **Buyers Module**: Reusable company architecture shared with Sellers for consistent validation and UI.
- **Products Module**: Dual Grid & Table view toggle, category pill filter tabs, status filters, image upload with dropzone and live preview (max 2MB), price units, packaging, and protein %.
- **Staff Access Control**:
  - Staff table with instant optimistic UI toggle for `is_active`.
  - Hashed credentials with automated strong password generator.
  - **Immediate Forced Logout**: On *every* authenticated request, the database validates `is_active`. If an admin revokes a staff member's access, their next API call returns `403 Forbidden` (`{"code": "account_disabled", "detail": "Your access has been disabled by the administrator. Please contact admin."}`). The Axios interceptor immediately clears the session and redirects to `/login` with the alert toast.
  - Role-based permissions (`IsAdminRole`, `IsAdminOrReadOnlyStaff`): Staff accounts have read-only access to records and cannot manage staff.

---

## 🚀 Quick Setup Instructions

### One-Command Quick Start (Both Backend & Frontend)
From the root directory:
```bash
npm run dev:all
# or: npm run dev
```
This automatically starts both the Django backend (using `backend/venv`) and the Vite React frontend.

---

### Backend Setup (Django + DRF)

```bash
cd backend

# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
# Copy .env.example to .env (already created with default settings)

# 4. Apply migrations and seed data
python manage.py makemigrations accounts sellers buyers products
python manage.py migrate
python manage.py seed_data

# 5. Start development server
python manage.py runserver
```
- API Base URL: `http://127.0.0.1:8000/api/`
- Interactive OpenAPI / Swagger Docs: `http://127.0.0.1:8000/api/docs/`
- Django Admin Portal: `http://127.0.0.1:8000/admin/`

---

### Frontend Setup (React 18 + Vite + TypeScript + Tailwind)

```bash
cd frontend

# 1. Install packages
npm install

# 2. Start Vite dev server with proxy to backend
npm run dev
```
- Frontend Dev URL: `http://localhost:5173/`

---

## 🔑 Default Seed Credentials

| Role | Email | Password | Access Status |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@jalarambroker.com` | `Admin@123` | Full Access |
| **Staff** | `rahul@gmail.com` | `Staff@123` | Active (Read-Only) |
| **Staff** | `priya@gmail.com` | `Staff@123` | Active (Read-Only) |
| **Staff** | `amit@gmail.com` | `Staff@123` | **Disabled** (Access test) |
| **Staff** | `neha@gmail.com` | `Staff@123` | Active (Read-Only) |

