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

  // Seed sample incomes
  const sampleIncomes = [
    { category: 'employee_contribution', amount: 3100, description: 'Employee contribution - June 2026', source: 'Employees', receiptNumber: 'DR-000001', date: '2026-06-01' },
    { category: 'hospital_contribution', amount: 500, description: 'Hospital contribution - June 2026', source: 'MCH Hospital', receiptNumber: 'DR-000002', date: '2026-06-01' },
    { category: 'donation', amount: 5000, description: 'Donation for annual meal', source: 'Dr. John Smith', receiptNumber: 'DR-000003', date: '2026-06-15' },
    { category: 'employee_contribution', amount: 3100, description: 'Employee contribution - July 2026', source: 'Employees', receiptNumber: 'DR-000004', date: '2026-07-01' },
    { category: 'hospital_contribution', amount: 500, description: 'Hospital contribution - July 2026', source: 'MCH Hospital', receiptNumber: 'DR-000005', date: '2026-07-01' },
    { category: 'special_donation', amount: 10000, description: 'Special donation for football tournament', source: 'Anonymous', receiptNumber: 'DR-000006', date: '2026-07-05' },
    { category: 'event_income', amount: 2500, description: 'Football tournament entry fees', source: 'Participants', receiptNumber: 'DR-000007', date: '2026-07-10' },
  ];

  for (let i = 0; i < sampleIncomes.length; i++) {
    const inc = sampleIncomes[i];
    await db.incomes.add({
      incomeCode: `INC-2026-${String(i + 1).padStart(6, '0')}`,
      receiptNumber: inc.receiptNumber,
      date: inc.date,
      entryDate: now,
      amount: inc.amount,
      description: inc.description,
      source: inc.source,
      category: inc.category,
      status: 'approved',
      isDeleted: false,
      version: 1,
      createdBy: 1,
      approvedBy: 1,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Seed sample expenses
  const sampleExpenses = [
    { category: 'office_supplies', amount: 800, description: 'Stationery for office', payee: 'Local Shop', voucherNumber: 'PV-000001', date: '2026-06-05' },
    { category: 'tea', amount: 450, description: 'Tea and refreshments for meetings', payee: 'Canteen', voucherNumber: 'PV-000002', date: '2026-06-10' },
    { category: 'meeting', amount: 1200, description: 'Monthly committee meeting expenses', payee: 'Hotel Dining', voucherNumber: 'PV-000003', date: '2026-06-15' },
    { category: 'printing', amount: 600, description: 'Printing of notice boards', payee: 'Print Shop', voucherNumber: 'PV-000004', date: '2026-07-02' },
    { category: 'football_tournament', amount: 5000, description: 'Football tournament preparations', payee: 'Sports Shop', voucherNumber: 'PV-000005', date: '2026-07-08' },
  ];

  for (let i = 0; i < sampleExpenses.length; i++) {
    const exp = sampleExpenses[i];
    await db.expenses.add({
      expenseCode: `EXP-2026-${String(i + 1).padStart(6, '0')}`,
      voucherNumber: exp.voucherNumber,
      date: exp.date,
      entryDate: now,
      amount: exp.amount,
      payee: exp.payee,
      description: exp.description,
      category: exp.category,
      status: 'approved',
      isDeleted: false,
      version: 1,
      createdBy: 1,
      approvedBy: 1,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Update sequence counters
  await db.settings.put({ key: 'seq_income', value: JSON.stringify(sampleIncomes.length), updatedAt: now });
  await db.settings.put({ key: 'seq_expense', value: JSON.stringify(sampleExpenses.length), updatedAt: now });
  await db.settings.put({ key: 'seq_donation', value: JSON.stringify(0), updatedAt: now });
  await db.settings.put({ key: 'seq_event', value: JSON.stringify(0), updatedAt: now });
}
