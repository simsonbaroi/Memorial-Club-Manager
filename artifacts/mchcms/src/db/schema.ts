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
    'user:read',
    'settings:read',
    'audit:read',
  ],
  vice_president: [
    'income:read','income:approve',
    'expense:read','expense:approve',
    'donation:read',
    'receipt_book:read','voucher_book:read',
    'report:read','report:export',
    'committee:read',
    'event:read','event:update',
    'user:read',
    'audit:read',
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
    'user:read',
    'audit:read',
  ],
  cashier: [
    'income:create','income:read','income:update',
    'expense:create','expense:read','expense:update',
    'donation:create','donation:read',
    'receipt_book:read','voucher_book:read',
    'report:read','report:export',
    'event:read',
  ],
  committee_member: [
    'income:read',
    'expense:read',
    'donation:read',
    'report:read',
    'event:read',
    'committee:read',
  ],
  auditor: [
    'income:read',
    'expense:read',
    'donation:read',
    'receipt_book:read','voucher_book:read',
    'report:read','report:export',
    'committee:read',
    'event:read',
    'user:read',
    'audit:read',
  ],
  viewer: [
    'income:read',
    'expense:read',
    'donation:read',
    'report:read',
    'event:read',
    'committee:read',
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
  photo?: string; // base64
  lastLogin?: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
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
  | 'employee_contribution'
  | 'hospital_contribution'
  | 'donation'
  | 'special_donation'
  | 'event_income'
  | 'interest'
  | 'miscellaneous'
  | 'custom';

export interface Income {
  id?: number;
  incomeCode: string; // e.g. INC-2024-000001
  receiptNumber: string; // e.g. DR-000245
  date: string; // ISO date
  entryDate: string; // ISO datetime
  amount: number;
  description: string;
  source: string;
  category: IncomeCategory | string;
  remarks?: string;
  status: RecordStatus;
  // Employee contribution specifics
  employeeCount?: number;
  contributionPerEmployee?: number;
  month?: number;
  year?: number;
  // Hospital contribution specifics
  contributionMonth?: number;
  contributionYear?: number;
  // Links
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
  | 'office_supplies'
  | 'refreshments'
  | 'tea'
  | 'meeting'
  | 'football_tournament'
  | 'annual_meal'
  | 'transportation'
  | 'printing'
  | 'stationery'
  | 'decoration'
  | 'prize'
  | 'medical_help'
  | 'miscellaneous'
  | 'custom';

export interface Expense {
  id?: number;
  expenseCode: string;
  voucherNumber: string; // e.g. PV-000580
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
  prefix: string; // e.g. DR
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
  number: string; // full formatted e.g. DR-000245
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
  prefix: string; // e.g. PV
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
  number: string; // full formatted e.g. PV-000580
  numericValue: number;
  status: ReceiptNumberStatus;
  usedAt?: string;
  usedBy?: number;
  usedForId?: number;
  notes?: string;
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export type AttachmentType = 'image' | 'pdf' | 'document';
export type RecordType = 'income' | 'expense' | 'donation' | 'event' | 'committee_member' | 'report';

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

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'create' | 'update' | 'delete' | 'restore'
  | 'approve' | 'reject' | 'lock' | 'unlock'
  | 'print' | 'export' | 'backup' | 'restore_backup'
  | 'login' | 'logout' | 'login_failed';

export type AuditModule =
  | 'income' | 'expense' | 'donation'
  | 'receipt_book' | 'voucher_book'
  | 'report' | 'committee' | 'event'
  | 'user' | 'settings' | 'backup' | 'auth';

export interface AuditLog {
  id?: number;
  timestamp: string; // ISO
  userId?: number;
  username: string;
  action: AuditAction;
  module: AuditModule;
  recordId?: number;
  recordCode?: string;
  oldValue?: string; // JSON
  newValue?: string; // JSON
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
  photo?: string; // base64
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
export type EventStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';

export interface ClubEvent {
  id?: number;
  eventCode: string;
  name: string;
  type: EventType;
  date: string;
  endDate?: string;
  venue?: string;
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

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'contribution_reminder'
  | 'hospital_contribution_reminder'
  | 'pending_approval'
  | 'low_voucher_count'
  | 'backup_reminder'
  | 'event_reminder'
  | 'general';

export interface AppNotification {
  id?: number;
  userId?: number; // null = all users
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
  value: string; // JSON-encoded
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
  recentTransactions: RecentTransaction[];
  upcomingEvents: ClubEvent[];
  monthlyChart: MonthlyChartData[];
}

export interface RecentTransaction {
  id: number;
  type: 'income' | 'expense' | 'donation';
  code: string;
  description: string;
  amount: number;
  date: string;
  status: RecordStatus;
  category: string;
}

export interface MonthlyChartData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}
