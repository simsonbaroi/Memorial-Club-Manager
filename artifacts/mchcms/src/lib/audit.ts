import { db } from '../db';
import type { AuditAction, AuditModule } from '../db/schema';

export async function logAudit(params: {
  userId?: number;
  username: string;
  action: AuditAction;
  module: AuditModule;
  recordId?: number;
  recordCode?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}) {
  await db.auditLogs.add({
    timestamp: new Date().toISOString(),
    userId: params.userId,
    username: params.username,
    action: params.action,
    module: params.module,
    recordId: params.recordId,
    recordCode: params.recordCode,
    oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : undefined,
    newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : undefined,
    reason: params.reason,
    device: navigator.userAgent.substring(0, 200),
  });
}
