import Dexie, { type Table } from 'dexie';
import type {
  User, Category, Income, Expense, Donation,
  ReceiptBook, ReceiptNumberRecord, VoucherBook, VoucherNumberRecord,
  Attachment, AuditLog, Committee, CommitteeMember, CommitteeHandover,
  ClubEvent, AppNotification, Setting, Session,
  Note, Advance, AdvanceSettlement, Budget, BudgetCategory, BudgetRevision,
  Reminder, Memo, PromiseRecord,
} from './schema';

export class MCHCMSDatabase extends Dexie {
  users!: Table<User, number>;
  categories!: Table<Category, number>;
  incomes!: Table<Income, number>;
  expenses!: Table<Expense, number>;
  donations!: Table<Donation, number>;
  receiptBooks!: Table<ReceiptBook, number>;
  receiptNumbers!: Table<ReceiptNumberRecord, number>;
  voucherBooks!: Table<VoucherBook, number>;
  voucherNumbers!: Table<VoucherNumberRecord, number>;
  attachments!: Table<Attachment, number>;
  auditLogs!: Table<AuditLog, number>;
  committees!: Table<Committee, number>;
  committeeMembers!: Table<CommitteeMember, number>;
  committeeHandovers!: Table<CommitteeHandover, number>;
  events!: Table<ClubEvent, number>;
  notifications!: Table<AppNotification, number>;
  settings!: Table<Setting, string>;
  sessions!: Table<Session, number>;
  // v2
  notes!: Table<Note, number>;
  advances!: Table<Advance, number>;
  advanceSettlements!: Table<AdvanceSettlement, number>;
  budgets!: Table<Budget, number>;
  budgetCategories!: Table<BudgetCategory, number>;
  budgetRevisions!: Table<BudgetRevision, number>;
  reminders!: Table<Reminder, number>;
  memos!: Table<Memo, number>;
  promises!: Table<PromiseRecord, number>;

  constructor() {
    super('mchcms_db');

    this.version(1).stores({
      users:               '++id, username, email, role, isActive',
      categories:          '++id, type, name, isActive',
      incomes:             '++id, incomeCode, receiptNumber, date, category, status, createdBy, approvedBy, isDeleted, eventId, month, year',
      expenses:            '++id, expenseCode, voucherNumber, date, category, status, createdBy, approvedBy, isDeleted, eventId',
      donations:           '++id, donationCode, receiptNumber, date, donorName, status, createdBy, isDeleted',
      receiptBooks:        '++id, bookNumber, prefix, status',
      receiptNumbers:      '++id, bookId, number, numericValue, status, usedForType',
      voucherBooks:        '++id, bookNumber, prefix, type, status',
      voucherNumbers:      '++id, bookId, number, numericValue, status',
      attachments:         '++id, recordType, recordId, uploadedBy',
      auditLogs:           '++id, timestamp, userId, action, module, recordId',
      committees:          '++id, isActive',
      committeeMembers:    '++id, committeeId, userId, isActive',
      committeeHandovers:  '++id, fromCommitteeId, toCommitteeId',
      events:              '++id, eventCode, type, date, status',
      notifications:       '++id, userId, type, isRead, createdAt',
      settings:            'key',
      sessions:            '++id, userId, token, isActive',
    });

    this.version(2).stores({
      notes:              '++id, recordType, recordId, createdBy, createdAt',
      advances:           '++id, advanceCode, date, personName, status, createdBy, approvedBy, isDeleted, eventId',
      advanceSettlements: '++id, advanceId, settlementDate, settledBy',
      budgets:            '++id, budgetCode, eventId, approvalStatus, createdBy',
      budgetCategories:   '++id, budgetId, name',
      budgetRevisions:    '++id, budgetCategoryId, budgetId, revisedAt',
      reminders:          '++id, type, dueDate, status, createdBy',
      memos:              '++id, memoNumber, date, priority, status, createdBy',
      promises:           '++id, promiseCode, promisedBy, status, promiseDate, createdBy',
    });
  }
}

export const db = new MCHCMSDatabase();

// ─── Sequence Counters ────────────────────────────────────────────────────────

async function getNextSequence(prefix: string): Promise<number> {
  const key = `seq_${prefix}`;
  const setting = await db.settings.get(key);
  const current = setting ? parseInt(JSON.parse(setting.value), 10) : 0;
  const next = current + 1;
  await db.settings.put({ key, value: JSON.stringify(next), updatedAt: new Date().toISOString() });
  return next;
}

export async function generateIncomeCode(): Promise<string> {
  const n = await getNextSequence('income');
  return `INC-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
}
export async function generateExpenseCode(): Promise<string> {
  const n = await getNextSequence('expense');
  return `EXP-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
}
export async function generateDonationCode(): Promise<string> {
  const n = await getNextSequence('donation');
  return `DON-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
}
export async function generateEventCode(): Promise<string> {
  const n = await getNextSequence('event');
  return `EVT-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
}
export async function generateAdvanceCode(): Promise<string> {
  const n = await getNextSequence('advance');
  return `ADV-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
}
export async function generateBudgetCode(): Promise<string> {
  const n = await getNextSequence('budget');
  return `BDG-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
}
export async function generateMemoCode(): Promise<string> {
  const n = await getNextSequence('memo');
  return `MEM-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
}
export async function generatePromiseCode(): Promise<string> {
  const n = await getNextSequence('promise');
  return `PRO-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
}

// ─── Receipt / Voucher number validation ─────────────────────────────────────

export interface NumberValidationResult {
  valid: boolean;
  status?: 'ok' | 'already_used' | 'missing' | 'voided' | 'duplicate' | 'out_of_range' | 'unknown';
  message: string;
  suggestion?: string;
}

export async function validateReceiptNumber(number: string): Promise<NumberValidationResult> {
  const existing = await db.receiptNumbers.where('number').equals(number).first();
  if (!existing) {
    const parts = number.match(/^([A-Z]+)-0*(\d+)$/);
    if (!parts) return { valid: false, status: 'out_of_range', message: 'Invalid format' };
    const prefix = parts[1];
    const num = parseInt(parts[2], 10);
    const book = await db.receiptBooks
      .filter(b => b.prefix === prefix && b.startNumber <= num && b.endNumber >= num)
      .first();
    if (!book) return { valid: false, status: 'out_of_range', message: 'Number not in any active receipt book range' };
    return { valid: true, status: 'ok', message: 'Valid receipt number' };
  }
  if (existing.status === 'used') return { valid: false, status: 'already_used', message: `Already used for a ${existing.usedForType}` };
  if (existing.status === 'voided') return { valid: false, status: 'voided', message: 'This receipt number has been voided' };
  if (existing.status === 'missing') return { valid: false, status: 'missing', message: 'This receipt number is marked as missing' };
  return { valid: true, status: 'ok', message: 'Valid receipt number' };
}

export async function getNextReceiptNumberSuggestion(currentNumber: string): Promise<string | null> {
  const parts = currentNumber.match(/^([A-Z]+)-0*(\d+)$/);
  if (!parts) return null;
  const prefix = parts[1];
  const num = parseInt(parts[2], 10);
  const totalDigits = currentNumber.split('-')[1].length;
  return `${prefix}-${String(num + 1).padStart(totalDigits, '0')}`;
}

export async function validateVoucherNumber(number: string): Promise<NumberValidationResult> {
  const existing = await db.voucherNumbers.where('number').equals(number).first();
  if (!existing) {
    const parts = number.match(/^([A-Z]+)-0*(\d+)$/);
    if (!parts) return { valid: false, status: 'out_of_range', message: 'Invalid format' };
    const prefix = parts[1];
    const num = parseInt(parts[2], 10);
    const book = await db.voucherBooks
      .filter(b => b.prefix === prefix && b.startNumber <= num && b.endNumber >= num)
      .first();
    if (!book) return { valid: false, status: 'out_of_range', message: 'Number not in any active voucher book range' };
    return { valid: true, status: 'ok', message: 'Valid voucher number' };
  }
  if (existing.status === 'used') return { valid: false, status: 'already_used', message: 'Already used' };
  if (existing.status === 'voided') return { valid: false, status: 'voided', message: 'Voided' };
  return { valid: true, status: 'ok', message: 'Valid voucher number' };
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);
  const yearStr = now.getFullYear().toString();

  const [allIncomes, allExpenses, allDonations, pendingIncomes, pendingExpenses, events, receiptBooks, voucherBooks, allAdvances] = await Promise.all([
    db.incomes.filter(i => !i.isDeleted && i.status !== 'rejected').toArray(),
    db.expenses.filter(e => !e.isDeleted && e.status !== 'rejected').toArray(),
    db.donations.filter(d => !d.isDeleted && d.status !== 'rejected').toArray(),
    db.incomes.filter(i => !i.isDeleted && i.status === 'pending').count(),
    db.expenses.filter(e => !e.isDeleted && e.status === 'pending').count(),
    db.events.filter(e => e.status !== 'cancelled').toArray(),
    db.receiptBooks.filter(b => b.status === 'active').toArray(),
    db.voucherBooks.filter(b => b.status === 'active').toArray(),
    db.advances.filter(a => !a.isDeleted).toArray(),
  ]);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const totalIncome = sum(allIncomes.map(i => i.amount));
  const totalExpense = sum(allExpenses.map(e => e.amount));
  const currentBalance = totalIncome - totalExpense;

  const todayIncome = sum(allIncomes.filter(i => i.date.startsWith(todayStr)).map(i => i.amount));
  const todayExpense = sum(allExpenses.filter(e => e.date.startsWith(todayStr)).map(e => e.amount));
  const monthlyIncome = sum(allIncomes.filter(i => i.date.startsWith(monthStr)).map(i => i.amount));
  const monthlyExpense = sum(allExpenses.filter(e => e.date.startsWith(monthStr)).map(e => e.amount));
  const yearlyIncome = sum(allIncomes.filter(i => i.date.startsWith(yearStr)).map(i => i.amount));
  const yearlyExpense = sum(allExpenses.filter(e => e.date.startsWith(yearStr)).map(e => e.amount));
  const totalDonations = sum(allDonations.map(d => d.amount));

  const empContrib = sum(allIncomes.filter(i => i.category === 'employee_contribution' && i.date.startsWith(monthStr)).map(i => i.amount));
  const hospContrib = sum(allIncomes.filter(i => i.category === 'hospital_contribution' && i.date.startsWith(monthStr)).map(i => i.amount));

  const receiptBooksRemaining = sum(receiptBooks.map(b => b.remainingCount));
  const voucherBooksRemaining = sum(voucherBooks.map(b => b.remainingCount));

  const activeAdvances = allAdvances.filter(a => !['fully_settled', 'cancelled'].includes(a.status));
  const pendingAdvances = activeAdvances.filter(a => ['pending', 'approved', 'cash_released', 'partially_settled'].includes(a.status)).length;
  const outstandingAdvanceAmount = sum(activeAdvances.map(a => a.outstandingAmount));

  const recentIncomes = allIncomes.slice(-5).reverse().map(i => ({
    id: i.id!, type: 'income' as const, code: i.incomeCode,
    description: i.description, amount: i.amount, date: i.date,
    status: i.status, category: i.category,
  }));
  const recentExpenses = allExpenses.slice(-5).reverse().map(e => ({
    id: e.id!, type: 'expense' as const, code: e.expenseCode,
    description: e.description, amount: e.amount, date: e.date,
    status: e.status, category: e.category,
  }));
  const recentTransactions = [...recentIncomes, ...recentExpenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const monthlyChart = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ms = d.toISOString().slice(0, 7);
    const inc = sum(allIncomes.filter(x => x.date.startsWith(ms)).map(x => x.amount));
    const exp = sum(allExpenses.filter(x => x.date.startsWith(ms)).map(x => x.amount));
    monthlyChart.push({ month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), income: inc, expense: exp, balance: inc - exp });
  }

  const upcomingEvents = events.filter(e => e.date >= todayStr && (e.status === 'planning' || e.status === 'approved')).slice(0, 5);

  return {
    currentBalance, todayIncome, todayExpense,
    monthlyIncome, monthlyExpense, yearlyIncome, yearlyExpense,
    totalDonations, employeeContributionThisMonth: empContrib,
    hospitalContributionThisMonth: hospContrib,
    pendingApprovals: pendingIncomes + pendingExpenses,
    receiptBooksRemaining, voucherBooksRemaining,
    pendingAdvances, outstandingAdvanceAmount,
    recentTransactions, upcomingEvents, monthlyChart,
  };
}

export * from './schema';
