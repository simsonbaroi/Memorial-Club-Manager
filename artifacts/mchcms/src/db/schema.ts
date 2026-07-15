// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole =
  | 'administrator'
  | 'president'
  | 'vice_president'
  | 'secretary'
  | 'cashier'
  | 'committee_member'
  | 'auditor'
  | 'viewer';

export type Permission =
  | 'income:create' | 'income:read' | 'income:update' | 'income:delete' | 'income:approve'
  | 'expense:create' | 'expense:read' | 'expense:update' | 'expense:delete' | 'expense:approve'
  | 'donation:create' | 'donation:read' | 'donation:update' | 'donation:delete'
  | 'receipt_book:create' | 'receipt_book:read' | 'receipt_book:update'
  | 'voucher_book:create' | 'voucher_book:read' | 'voucher_book:update'
  | 'report:read' | 'report:export'
  | 'committee:create' | 'committee:read' | 'committee:update'
  | 'event:create' | 'event:read' | 'event:update' | 'event:delete'
  | 'advance:create' | 'advance:read' | 'advance:update' | 'advance:approve' | 'advance:settle'
  | 'budget:create' | 'budget:read' | 'budget:update' | 'budget:approve'
  | 'memo:create' | 'memo:read' | 'memo:update'
  | 'promise:create' | 'promise:read' | 'promise:update'
  | 'user:create' | 'user:read' | 'user:update' | 'user:delete'
  | 'settings:read' | 'settings:update'
  | 'audit:read'
  | 'backup:create' | 'backup:restore';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  administrator: [
    'income:create','income:read','income:update','income:delete','income:approve',
    'expense:create','expense:read','expense:update','expense:delete','expense:approve',
    'donation:create','donation:read','donation:update','donation:delete',
    'receipt_book:create','receipt_book:read','receipt_book:update',
    'voucher_book:create','voucher_book:read','voucher_book:update',
    'report:read','report:export',
    'committee:create','committee:read','committee:update',
    'event:create','event:read','event:update','event:delete',
    'advance:create','advance:read','advance:update','advance:approve','advance:settle',
    'budget:create','budget:read','budget:update','budget:approve',
    'memo:create','memo:read','memo:update',
    'promise:create','promise:read','promise:update',
    'user:create','user:read','user:update','user:delete',
    'settings:read','settings:update',
    'audit:read',
    'backup:create','backup:restore',
  ],
  president: [
    'income:read','income:approve',
    'expense:read','expense:approve',
    'donation:read',
    'receipt_book:read','voucher_book:read',
    'report:read','report:export',
    'committee:read','committee:update',
    'event:read','event:update',
    'advance:read','advance:approve',
    'budget:read','budget:approve',
    'memo:read','promise:read',
    'user:read','settings:read','audit:read',
  ],
  vice_president: [
    'income:read','income:approve',
    'expense:read','expense:approve',
    'donation:read',
    'receipt_book:read','voucher_book:read',
    'report:read','report:export',
    'committee:read',
    'event:read','event:update',
    'advance:read','advance:approve',
    'budget:read',
    'memo:read','promise:read',
    'user:read','audit:read',
  ],
  secretary: [
    'income:create','income:read','income:update',
    'expense:create','expense:read','expense:update',
    'donation:create','donation:read','donation:update',
    'receipt_book:create','receipt_book:read','receipt_book:update',
    'voucher_book:create','voucher_book:read','voucher_book:update',
    'report:read','report:export',
    'committee:read','committee:update',
    'event:create','event:read','event:update',
    'advance:create','advance:read','advance:update','advance:settle',
    'budget:create','budget:read','budget:update',
    'memo:create','memo:read','memo:update',
    'promise:create','promise:read','promise:update',
    'user:read','audit:read',
  ],
  cashier: [
    'income:create','income:read','income:update',
    'expense:create','expense:read','expense:update',
    'donation:create','donation:read',
    'receipt_book:read','voucher_book:read',
    'report:read','report:export',
    'event:read',
    'advance:create','advance:read','advance:update','advance:settle',
    'budget:read',
    'memo:create','memo:read',
    'promise:read',
  ],
  committee_member: [
    'income:read','expense:read','donation:read','report:read',
    'event:read','committee:read',
    'advance:read','budget:read','memo:read','promise:read',
  ],
  auditor: [
    'income:read','expense:read','donation:read',
    'receipt_book:read','voucher_book:read',
    'report:read','report:export',
    'committee:read','event:read',
    'advance:read','budget:read','memo:read','promise:read',
    'user:read','audit:read',
  ],
  viewer: [
    'income:read','expense:read','donation:read','report:read',
    'event:read','committee:read',
    'advance:read','budget:read','memo:read','promise:read',
  ],
};

export interface User {
  id?: number;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  customPermissions?: Permission[];
  isActive: boolean;
  photo?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
}

// ─── Record Status ────────────────────────────────────────────────────────────

export type RecordStatus = 'draft' | 'pending' | 'approved' | 'locked' | 'archived' | 'rejected';

// ─── Categories ───────────────────────────────────────────────────────────────

export type CategoryType = 'income' | 'expense';

export interface Category {
  id?: number;
  type: CategoryType;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

// ─── Income ───────────────────────────────────────────────────────────────────

export type IncomeCategory =
  | 'employee_contribution' | 'hospital_contribution' | 'donation'
  | 'special_donation' | 'event_income' | 'interest' | 'miscellaneous' | 'custom';

export interface Income {
  id?: number;
  incomeCode: string;
  receiptNumber: string;
  date: string;
  entryDate: string;
  amount: number;
  description: string;
  source: string;
  category: IncomeCategory | string;
  remarks?: string;
  status: RecordStatus;
  employeeCount?: number;
  contributionPerEmployee?: number;
  month?: number;
  year?: number;
  contributionMonth?: number;
  contributionYear?: number;
  eventId?: number;
  createdBy: number;
  approvedBy?: number;
  approvedAt?: string;
  lockedAt?: string;
  archivedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'office_supplies' | 'refreshments' | 'tea' | 'meeting'
  | 'football_tournament' | 'annual_meal' | 'transportation' | 'printing'
  | 'stationery' | 'decoration' | 'prize' | 'medical_help' | 'miscellaneous' | 'custom';

export interface Expense {
  id?: number;
  expenseCode: string;
  voucherNumber: string;
  date: string;
  entryDate: string;
  amount: number;
  payee: string;
  description: string;
  category: ExpenseCategory | string;
  remarks?: string;
  status: RecordStatus;
  eventId?: number;
  createdBy: number;
  approvedBy?: number;
  approvedAt?: string;
  lockedAt?: string;
  archivedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Donation ─────────────────────────────────────────────────────────────────

export interface Donation {
  id?: number;
  donationCode: string;
  donorName: string;
  phone?: string;
  address?: string;
  purpose?: string;
  amount: number;
  receiptNumber: string;
  notes?: string;
  status: RecordStatus;
  isAnonymous: boolean;
  createdBy: number;
  approvedBy?: number;
  approvedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  version: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Receipt Books ────────────────────────────────────────────────────────────

export type BookStatus = 'unused' | 'active' | 'used' | 'voided' | 'missing' | 'damaged' | 'recovered' | 'cancelled' | 'archived';

export interface ReceiptBook {
  id?: number;
  bookNumber: string;
  prefix: string;
  startNumber: number;
  endNumber: number;
  issueDate: string;
  issuedTo: string;
  currentNumber: number;
  remainingCount: number;
  status: BookStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

export type ReceiptNumberStatus = 'unused' | 'used' | 'voided' | 'missing' | 'damaged' | 'recovered' | 'cancelled';

export interface ReceiptNumberRecord {
  id?: number;
  bookId: number;
  number: string;
  numericValue: number;
  status: ReceiptNumberStatus;
  usedAt?: string;
  usedBy?: number;
  usedForId?: number;
  usedForType?: 'income' | 'donation';
  notes?: string;
}

// ─── Voucher Books ────────────────────────────────────────────────────────────

export type VoucherType = 'cash_payment' | 'journal' | 'approval' | 'custom';

export interface VoucherBook {
  id?: number;
  bookNumber: string;
  type: VoucherType;
  prefix: string;
  startNumber: number;
  endNumber: number;
  issueDate: string;
  issuedTo: string;
  currentNumber: number;
  remainingCount: number;
  status: BookStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

export interface VoucherNumberRecord {
  id?: number;
  bookId: number;
  number: string;
  numericValue: number;
  status: ReceiptNumberStatus;
  usedAt?: string;
  usedBy?: number;
  usedForId?: number;
  notes?: string;
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export type AttachmentType = 'image' | 'pdf' | 'document';
export type RecordType =
  | 'income' | 'expense' | 'donation' | 'event' | 'committee_member'
  | 'report' | 'advance' | 'budget' | 'memo' | 'promise';

export interface Attachment {
  id?: number;
  recordType: RecordType;
  recordId: number;
  fileName: string;
  fileType: AttachmentType;
  mimeType: string;
  fileData: string; // base64
  fileSize: number;
  uploadedAt: string;
  uploadedBy: number;
  description?: string;
}

// ─── Notes / Timeline ─────────────────────────────────────────────────────────

export interface Note {
  id?: number;
  recordType: RecordType;
  recordId: number;
  comment: string;
  attachmentId?: number;
  createdBy: number;
  createdByName: string;
  createdAt: string; // ISO — immutable
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'restore'
  | 'approve' | 'reject' | 'lock' | 'unlock'
  | 'print' | 'export' | 'backup' | 'restore_backup'
  | 'login' | 'logout' | 'login_failed'
  | 'settle' | 'release_cash';

export type AuditModule =
  | 'income' | 'expense' | 'donation'
  | 'receipt_book' | 'voucher_book'
  | 'report' | 'committee' | 'event'
  | 'advance' | 'budget' | 'memo' | 'promise'
  | 'user' | 'settings' | 'backup' | 'auth';

export interface AuditLog {
  id?: number;
  timestamp: string;
  userId?: number;
  username: string;
  action: AuditAction;
  module: AuditModule;
  recordId?: number;
  recordCode?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  device?: string;
  ipAddress?: string;
  sessionId?: string;
}

// ─── Committee ────────────────────────────────────────────────────────────────

export interface Committee {
  id?: number;
  name: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  createdBy: number;
}

export interface CommitteeMember {
  id?: number;
  committeeId: number;
  userId?: number;
  name: string;
  designation: string;
  joiningDate: string;
  leavingDate?: string;
  contact?: string;
  photo?: string;
  responsibilities?: string;
  isActive: boolean;
}

export interface CommitteeHandover {
  id?: number;
  fromCommitteeId: number;
  toCommitteeId: number;
  handoverDate: string;
  balance: number;
  notes?: string;
  handedOverBy: number;
  receivedBy: number;
  createdAt: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type EventType = 'football_tournament' | 'annual_meal' | 'meeting' | 'picnic' | 'seminar' | 'custom';
export type EventStatus = 'planning' | 'approved' | 'active' | 'completed' | 'archived' | 'cancelled';

export interface ClubEvent {
  id?: number;
  eventCode: string;
  name: string;
  type: EventType;
  category?: string;
  date: string;
  endDate?: string;
  venue?: string;
  organizer?: string;
  committeeId?: number;
  budget: number;
  description?: string;
  status: EventStatus;
  sponsors?: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  createdAt: string;
  createdBy: number;
  updatedAt: string;
}

// ─── Event Budget ─────────────────────────────────────────────────────────────

export type BudgetStatus = 'draft' | 'pending' | 'approved' | 'locked';

export interface Budget {
  id?: number;
  budgetCode: string;
  name: string;
  eventId: number;
  approvalStatus: BudgetStatus;
  createdBy: number;
  createdByName: string;
  lastModifiedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id?: number;
  budgetId: number;
  name: string;
  estimatedAmount: number;
  actualAmount: number;
  notes?: string;
  sortOrder: number;
  createdAt: string;
}

export interface BudgetRevision {
  id?: number;
  budgetCategoryId: number;
  budgetId: number;
  field: 'estimatedAmount' | 'actualAmount' | 'name' | 'notes';
  previousValue: string;
  newValue: string;
  reason?: string;
  revisedBy: number;
  revisedByName: string;
  revisedAt: string;
}

// ─── Advances ─────────────────────────────────────────────────────────────────

export type AdvanceStatus =
  | 'draft' | 'pending' | 'approved' | 'cash_released'
  | 'partially_settled' | 'fully_settled' | 'cancelled';

export interface Advance {
  id?: number;
  advanceCode: string;
  voucherNumber?: string;
  date: string;
  personName: string;
  designation?: string;
  eventId?: number;
  purpose: string;
  amountGiven: number;
  paymentMethod: 'cash' | 'bank' | 'mobile_banking';
  status: AdvanceStatus;
  amountSpent: number;
  amountReturned: number;
  outstandingAmount: number;
  notes?: string;
  createdBy: number;
  approvedBy?: number;
  approvedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdvanceSettlement {
  id?: number;
  advanceId: number;
  settlementDate: string;
  billsSubmitted: number;
  cashReturned: number;
  notes?: string;
  attachments?: string; // JSON array of base64
  settledBy: number;
  settledByName: string;
  createdAt: string;
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export type ReminderType =
  | 'advance_settlement' | 'donation_followup' | 'pending_bills'
  | 'missing_voucher' | 'meeting' | 'budget_review' | 'event_deadline' | 'custom';

export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom_date';
export type ReminderStatus = 'pending' | 'done' | 'dismissed';

export interface Reminder {
  id?: number;
  type: ReminderType;
  title: string;
  description?: string;
  dueDate: string;
  frequency: ReminderFrequency;
  status: ReminderStatus;
  recordType?: RecordType;
  recordId?: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Financial Memo ───────────────────────────────────────────────────────────

export type MemoPriority = 'low' | 'normal' | 'high' | 'urgent';
export type MemoStatus = 'open' | 'resolved' | 'archived';

export interface Memo {
  id?: number;
  memoNumber: string;
  date: string;
  subject: string;
  description: string;
  priority: MemoPriority;
  status: MemoStatus;
  relatedEventId?: number;
  relatedRecordType?: RecordType;
  relatedRecordId?: number;
  reminderDate?: string;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Promise Register ─────────────────────────────────────────────────────────

export type PromiseStatus = 'promised' | 'confirmed' | 'received' | 'cancelled';

export interface PromiseRecord {
  id?: number;
  promiseCode: string;
  promisedBy: string;         // person or org name
  phone?: string;
  amount: number;
  description: string;        // what was promised
  promiseDate: string;
  expectedDate?: string;
  status: PromiseStatus;
  receivedAmount?: number;
  receivedDate?: string;
  notes?: string;
  reminderDate?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'contribution_reminder' | 'hospital_contribution_reminder'
  | 'pending_approval' | 'low_voucher_count' | 'backup_reminder'
  | 'event_reminder' | 'advance_overdue' | 'promise_due' | 'general';

export interface AppNotification {
  id?: number;
  userId?: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
  expiresAt?: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
  updatedBy?: number;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface Session {
  id?: number;
  userId: number;
  token: string;
  createdAt: string;
  expiresAt: string;
  device?: string;
  isActive: boolean;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  currentBalance: number;
  todayIncome: number;
  todayExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
  yearlyIncome: number;
  yearlyExpense: number;
  totalDonations: number;
  employeeContributionThisMonth: number;
  hospitalContributionThisMonth: number;
  pendingApprovals: number;
  receiptBooksRemaining: number;
  voucherBooksRemaining: number;
  pendingAdvances: number;
  outstandingAdvanceAmount: number;
  recentTransactions: RecentTransaction[];
  upcomingEvents: ClubEvent[];
  monthlyChart: MonthlyChartData[];
}

export interface RecentTransaction {
  id: number;
  type: 'income' | 'expense' | 'donation' | 'advance';
  code: string;
  description: string;
  amount: number;
  date: string;
  status: RecordStatus | AdvanceStatus;
  category: string;
}

export interface MonthlyChartData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}
