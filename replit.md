# MCHCMS — Memorial Christian Hospital Club Management System

A complete ERP/PWA for Memorial Christian Hospital Club, Malumghat, Chakaria, Cox's Bazar, Bangladesh. Manages all financial and administrative activities: income, expenses, donations, receipt/voucher books, reports, committee, events, and audit trail.

## Run & Operate

- `pnpm --filter @workspace/mchcms run dev` — run the frontend app (port 20791, preview at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- Default login: **admin / admin123** | Cashier login: **cashier / cashier123**

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + Wouter routing
- Database: Dexie.js (IndexedDB — browser-native, no server required)
- Charts: Recharts
- PDF: jsPDF + jspdf-autotable
- QR Codes: qrcode.react
- Excel/CSV: xlsx (SheetJS)
- Auth: Web Crypto API (PBKDF2) — no external library

## Where things live

- `artifacts/mchcms/src/db/schema.ts` — all TypeScript types/interfaces
- `artifacts/mchcms/src/db/index.ts` — Dexie database class, sequence generators, dashboard stats
- `artifacts/mchcms/src/db/seed.ts` — initial seed data (users, categories, sample transactions)
- `artifacts/mchcms/src/contexts/AuthContext.tsx` — auth state, login/logout, permission checks
- `artifacts/mchcms/src/contexts/ThemeContext.tsx` — dark/light/system theme
- `artifacts/mchcms/src/lib/crypto.ts` — PBKDF2 password hashing (Web Crypto API)
- `artifacts/mchcms/src/lib/audit.ts` — audit log helper
- `artifacts/mchcms/src/lib/export.ts` — Excel/CSV export, currency/date formatters
- `artifacts/mchcms/src/lib/backup.ts` — JSON backup/restore
- `artifacts/mchcms/src/pages/` — all 17 pages

## Architecture decisions

- **100% offline, no backend**: All data lives in browser IndexedDB via Dexie.js. No server, no paid APIs.
- **Soft deletes only**: Financial records are never hard-deleted (`isDeleted: true` flag).
- **Immutable audit log**: Every create/update/delete/approve action is recorded in `auditLogs` table, never deleted.
- **Workflow states**: Records follow Draft → Pending → Approved → Locked → Archived.
- **Backup via JSON file**: Export full DB snapshot as JSON; restore by re-importing.
- **Timezone**: All display uses Asia/Dhaka (UTC+06:00). ISO 8601 stored internally.
- **Currency**: Bangladeshi Taka (৳ BDT). Stored as float, displayed with formatCurrencyBDT().

## Product

- Dashboard with balance summary, income/expense charts (12-month), recent transactions
- Income module: employee contribution, hospital contribution, donations, events, misc
- Expense module: categorized with voucher number validation
- Donation module: donor records, receipt generation
- Receipt & Voucher book management with number tracking and validation
- Reports: filterable by date range, exportable to PDF/Excel/CSV
- Committee management with member records
- Event management with budget tracking
- Full audit trail (immutable)
- User management with 8 roles and per-permission configuration
- Backup/restore system
- Dark/light/system theme toggle

## User preferences

- No paid APIs, no external cloud services — everything runs locally
- No emojis in UI
- Hospital Blue (#1565C0) primary, Gold/Amber (#F9A825) accent
- Date format: "15th July 2026" (British style), timezone Asia/Dhaka
- Currency: ৳ BDT

## Gotchas

- Always use soft deletes: `db.incomes.update(id, { isDeleted: true })` never `db.incomes.delete(id)`
- Receipt/voucher number validation must run against active book ranges
- Seed runs once on first load (checks `settings` table for `seeded` key)
- Password hashing is async (PBKDF2 via Web Crypto) — always await
- `useLiveQuery` returns `undefined` during initial load — always handle loading state
