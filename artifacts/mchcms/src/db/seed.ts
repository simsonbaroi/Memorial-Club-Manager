import { db } from './index';
import { generateSalt, hashPassword } from '../lib/crypto';

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Employee Contribution', isDefault: true, sortOrder: 1 },
  { name: 'Hospital Contribution', isDefault: true, sortOrder: 2 },
  { name: 'Donation', isDefault: true, sortOrder: 3 },
  { name: 'Special Donation', isDefault: true, sortOrder: 4 },
  { name: 'Event Income', isDefault: true, sortOrder: 5 },
  { name: 'Interest', isDefault: true, sortOrder: 6 },
  { name: 'Miscellaneous', isDefault: true, sortOrder: 7 },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Office Supplies', isDefault: true, sortOrder: 1 },
  { name: 'Refreshments', isDefault: true, sortOrder: 2 },
  { name: 'Tea', isDefault: true, sortOrder: 3 },
  { name: 'Meeting', isDefault: true, sortOrder: 4 },
  { name: 'Football Tournament', isDefault: true, sortOrder: 5 },
  { name: 'Annual Meal', isDefault: true, sortOrder: 6 },
  { name: 'Transportation', isDefault: true, sortOrder: 7 },
  { name: 'Printing', isDefault: true, sortOrder: 8 },
  { name: 'Stationery', isDefault: true, sortOrder: 9 },
  { name: 'Decoration', isDefault: true, sortOrder: 10 },
  { name: 'Prize', isDefault: true, sortOrder: 11 },
  { name: 'Medical Help', isDefault: true, sortOrder: 12 },
  { name: 'Miscellaneous', isDefault: true, sortOrder: 13 },
];

const DEFAULT_SETTINGS: Array<{ key: string; value: unknown }> = [
  { key: 'org_name', value: 'Memorial Christian Hospital Club' },
  { key: 'org_location', value: 'Malumghat, Chakaria, Cox\'s Bazar, Bangladesh' },
  { key: 'org_timezone', value: 'Asia/Dhaka' },
  { key: 'date_format', value: 'DD MMMM YYYY' },
  { key: 'currency', value: 'BDT' },
  { key: 'currency_symbol', value: '৳' },
  { key: 'default_employee_count', value: 310 },
  { key: 'default_contribution_per_employee', value: 10 },
  { key: 'default_hospital_contribution', value: 500 },
  { key: 'receipt_prefix', value: 'DR' },
  { key: 'voucher_prefix', value: 'PV' },
  { key: 'backup_reminder_days', value: 7 },
  { key: 'auto_logout_minutes', value: 30 },
  { key: 'low_voucher_threshold', value: 50 },
  { key: 'seeded', value: true },
];

export async function seedIfNeeded() {
  const seeded = await db.settings.get('seeded');
  if (seeded) return;

  const now = new Date().toISOString();

  // Default admin user
  const salt = await generateSalt();
  const passwordHash = await hashPassword('admin123', salt);
  await db.users.add({
    username: 'admin',
    displayName: 'Administrator',
    email: 'admin@mchclub.org',
    passwordHash,
    salt,
    role: 'administrator',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // Default cashier user
  const salt2 = await generateSalt();
  const hash2 = await hashPassword('cashier123', salt2);
  await db.users.add({
    username: 'cashier',
    displayName: 'Cashier',
    email: 'cashier@mchclub.org',
    passwordHash: hash2,
    salt: salt2,
    role: 'cashier',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // Income categories
  for (const cat of DEFAULT_INCOME_CATEGORIES) {
    await db.categories.add({ type: 'income', ...cat, isActive: true, createdAt: now });
  }

  // Expense categories
  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    await db.categories.add({ type: 'expense', ...cat, isActive: true, createdAt: now });
  }

  // Default receipt book
  await db.receiptBooks.add({
    bookNumber: 'RB-001',
    prefix: 'DR',
    startNumber: 1,
    endNumber: 500,
    issueDate: now.slice(0, 10),
    issuedTo: 'Cashier',
    currentNumber: 1,
    remainingCount: 500,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 1,
  });

  // Default voucher book
  await db.voucherBooks.add({
    bookNumber: 'VB-001',
    type: 'cash_payment',
    prefix: 'PV',
    startNumber: 1,
    endNumber: 1000,
    issueDate: now.slice(0, 10),
    issuedTo: 'Cashier',
    currentNumber: 1,
    remainingCount: 1000,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 1,
  });

  // Default committee
  await db.committees.add({
    name: 'Executive Committee 2024-2025',
    startDate: '2024-01-01',
    isActive: true,
    description: 'Current active committee',
    createdAt: now,
    createdBy: 1,
  });

  // Settings
  for (const s of DEFAULT_SETTINGS) {
    await db.settings.put({ key: s.key, value: JSON.stringify(s.value), updatedAt: now });
  }

  // No sample/demo transactions are seeded — the ledger starts empty so every
  // number in the app reflects real club data from day one.
  await db.settings.put({ key: 'seq_income', value: JSON.stringify(0), updatedAt: now });
  await db.settings.put({ key: 'seq_expense', value: JSON.stringify(0), updatedAt: now });
  await db.settings.put({ key: 'seq_donation', value: JSON.stringify(0), updatedAt: now });
  await db.settings.put({ key: 'seq_event', value: JSON.stringify(0), updatedAt: now });
}

// ─── One-time cleanup for installs seeded before demo data was removed ───────
// Earlier versions of seedIfNeeded() inserted 7 sample incomes and 5 sample
// expenses (codes INC-2026-000001..007 / EXP-2026-000001..005) so the
// dashboard had something to show. This removes them from any database that
// already has them, then resets the affected sequence counters so newly
// created records start from 1 again.
const DEMO_INCOME_CODES = Array.from({ length: 7 }, (_, i) => `INC-2026-${String(i + 1).padStart(6, '0')}`);
const DEMO_EXPENSE_CODES = Array.from({ length: 5 }, (_, i) => `EXP-2026-${String(i + 1).padStart(6, '0')}`);

export async function cleanupDemoSeedData() {
  const flag = await db.settings.get('demo_data_cleaned');
  if (flag) return;

  const removedIncomes = await db.incomes.where('incomeCode').anyOf(DEMO_INCOME_CODES).toArray();
  const removedExpenses = await db.expenses.where('expenseCode').anyOf(DEMO_EXPENSE_CODES).toArray();

  if (removedIncomes.length) {
    await db.incomes.bulkDelete(removedIncomes.map(r => r.id!));
  }
  if (removedExpenses.length) {
    await db.expenses.bulkDelete(removedExpenses.map(r => r.id!));
  }

  const now = new Date().toISOString();

  // Only reset sequence counters if nothing else has been recorded since —
  // otherwise we'd renumber real transactions the user already created.
  if (removedIncomes.length) {
    const remainingIncomes = await db.incomes.count();
    if (remainingIncomes === 0) {
      await db.settings.put({ key: 'seq_income', value: JSON.stringify(0), updatedAt: now });
    }
  }
  if (removedExpenses.length) {
    const remainingExpenses = await db.expenses.count();
    if (remainingExpenses === 0) {
      await db.settings.put({ key: 'seq_expense', value: JSON.stringify(0), updatedAt: now });
    }
  }

  await db.settings.put({ key: 'demo_data_cleaned', value: JSON.stringify(true), updatedAt: now });
}
