# 📦 Inventory Management System (IMS)

A modern inventory management system that replaces Excel sheets and manual tracking with a real-time, centralized solution. Built for inventory managers and warehouse staff.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Convex](https://img.shields.io/badge/Convex-FF71B1)
![BetterAuth](https://img.shields.io/badge/BetterAuth-6366F1)
![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000)
![Tailwind](https://img.shields.io/badge/Tailwind-38B2AC)

---

## 🚀 Overview

**Problem**: Businesses struggle with scattered Excel sheets, manual registers, and delayed stock updates.

**Solution**: A centralized, real-time inventory system that tracks all stock movements automatically.

---

## ✨ Features

### Dashboard
- Real-time KPIs: Total products, low stock alerts, pending orders
- Dynamic filters by document type, status, warehouse, category
- Visual stock movement charts

### Core Modules
| Module | What it does |
|--------|-------------|
| **Products** | Create/edit products with SKU, category, unit of measure |
| **Receipts** | Incoming stock from vendors (auto-increases stock) |
| **Deliveries** | Outgoing stock for customers (auto-deducts stock) |
| **Transfers** | Move stock between warehouses/locations |
| **Adjustments** | Fix physical count mismatches |
| **Ledger** | Complete history of all movements |

### Smart Features
- Low stock alerts via email/notification
- Multi-warehouse support
- Instant SKU search
- Mobile responsive
- CSV import/export

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router) |
| **UI Library** | shadcn/ui |
| **Styling** | Tailwind CSS |
| **Backend** | Convex (real-time, built-in DB) |
| **Auth** | BetterAuth (OTP, email, social) |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **Deployment** | Vercel + Convex |


---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone repo
git clone https://github.com/yourusername/ims.git
cd ims

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start Convex backend
npx convex dev

# Start Next.js (new terminal)
npm run dev
```

Visit `http://localhost:3000`


---

## 📊 How It Works

### Example Flow: Receiving Stock
1. Create new receipt
2. Add supplier "ABC Corp"
3. Add product "Steel Rods" quantity 50
4. Click Validate → Stock automatically +50

### Example Flow: Shipping Order
1. Create delivery order
2. Pick products
3. Validate → Stock automatically -10

### Example Flow: Transfer
1. Select source: Warehouse A
2. Select destination: Warehouse B
3. Move 20 units → Both locations updated

### Example Flow: Adjustment
1. Physical count shows 47, system says 50
2. Enter counted quantity: 47
3. System auto-calculates -3 and logs reason

---

## 🔑 Environment Variables

```env
# Required
BETTER_AUTH_SECRET=your_secret
BETTER_AUTH_URL=http://localhost:3000

```

---

## 📱 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, settings, user management |
| **Manager** | Create/edit all, view reports |
| **Staff** | Create receipts/deliveries, view products |

---

## 📈 Future Scope

- Purchase order generation
- Supplier/workers portal
- Analytics and predictions


## 📄 License

MIT © IMS Team

---

<div align="center">
  <p>Built for odoo  hackathon 2026</p>
</div>

---