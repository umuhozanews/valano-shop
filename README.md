# VALANO SHOP — Business Management System

A full-stack business management system for a clothing import/wholesale business in Kigali, Rwanda.

---

## Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** v14 or higher
- **npm** v9 or higher

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd valano-shop

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env and fill in your values
```

### 3. Database setup

```bash
# Create the database
createdb valano

# Run schema (creates all tables)
psql valano -f ../schema.sql

# Seed with initial data
psql valano -f ../seed.sql
```

### 4. Start backend

```bash
cd backend
npm run dev
# → Running on http://localhost:5000
# → Health check: GET http://localhost:5000/api/health
```

### 5. Start frontend

```bash
cd frontend
npm run dev
# → Running on http://localhost:3000
```

---

## Default Login Credentials

| Role       | Email                            | Password      |
|------------|----------------------------------|---------------|
| Admin      | rukundojosephtuyishime@gmail.com | rukundo2007   |
| Manager    | manager@valano.rw                | valano123     |
| Accountant | accounts@valano.rw               | valano123     |
| Worker     | worker1@valano.rw                | valano123     |


---

## Project Structure

```
valano-shop/
  /backend          Express + PostgreSQL API
  /frontend         React + Tailwind UI
  schema.sql        Full database schema
  seed.sql          Initial seed data
  README.md         This file
```

---

## Build Series

| Series | Status     | Description                                      |
|--------|------------|--------------------------------------------------|
| 1      | ✅ Done    | Scaffold, design system, layout shell, schema    |
| 2      | Pending    | Auth — login, JWT, role-guard, session           |
| 3      | Pending    | Dashboard — KPI cards, charts, live summary      |
| 4      | Pending    | Stock management — CRUD, barcode, transfers      |
| 5      | Pending    | Sales POS — cart, receipt, payment methods       |
| 6      | Pending    | Procurement — China orders, FX conversion        |
| 7      | Pending    | Workers — profiles, attendance, commissions      |
| 8      | Pending    | Customers & Suppliers management                 |
| 9      | Pending    | Invoices & Expenses                              |
| 10     | Pending    | Profit & Loss reporting                          |
| 11     | Pending    | Reports — PDF/Excel export                       |
| 12     | Pending    | Notifications & Audit log                        |
| 13     | Pending    | Settings, multi-branch, final polish             |
```
