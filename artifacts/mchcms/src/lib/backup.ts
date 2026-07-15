import { db } from '../db';

export async function createBackup(): Promise<string> {
  const [
    users, categories, incomes, expenses, donations,
    receiptBooks, receiptNumbers, voucherBooks, voucherNumbers,
    attachments, auditLogs, committees, committeeMembers, committeeHandovers,
    events, notifications, settings,
  ] = await Promise.all([
    db.users.toArray(),
    db.categories.toArray(),
    db.incomes.toArray(),
    db.expenses.toArray(),
    db.donations.toArray(),
    db.receiptBooks.toArray(),
    db.receiptNumbers.toArray(),
    db.voucherBooks.toArray(),
    db.voucherNumbers.toArray(),
    db.attachments.toArray(),
    db.auditLogs.toArray(),
    db.committees.toArray(),
    db.committeeMembers.toArray(),
    db.committeeHandovers.toArray(),
    db.events.toArray(),
    db.notifications.toArray(),
    db.settings.toArray(),
  ]);

  const backup = {
    version: 1,
    createdAt: new Date().toISOString(),
    organization: 'Memorial Christian Hospital Club',
    data: {
      users, categories, incomes, expenses, donations,
      receiptBooks, receiptNumbers, voucherBooks, voucherNumbers,
      attachments, auditLogs, committees, committeeMembers, committeeHandovers,
      events, notifications, settings,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export function downloadBackup(jsonData: string) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `MCHCMS_Backup_${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function restoreBackup(jsonData: string): Promise<{ success: boolean; message: string }> {
  try {
    const backup = JSON.parse(jsonData);
    if (!backup.version || !backup.data) {
      return { success: false, message: 'Invalid backup file format' };
    }

    const { data } = backup;

    await db.transaction('rw', [
      db.users, db.categories, db.incomes, db.expenses, db.donations,
      db.receiptBooks, db.receiptNumbers, db.voucherBooks, db.voucherNumbers,
      db.attachments, db.committees, db.committeeMembers, db.committeeHandovers,
      db.events, db.notifications, db.settings,
    ], async () => {
      if (data.users?.length) { await db.users.clear(); await db.users.bulkAdd(data.users); }
      if (data.categories?.length) { await db.categories.clear(); await db.categories.bulkAdd(data.categories); }
      if (data.incomes?.length) { await db.incomes.clear(); await db.incomes.bulkAdd(data.incomes); }
      if (data.expenses?.length) { await db.expenses.clear(); await db.expenses.bulkAdd(data.expenses); }
      if (data.donations?.length) { await db.donations.clear(); await db.donations.bulkAdd(data.donations); }
      if (data.receiptBooks?.length) { await db.receiptBooks.clear(); await db.receiptBooks.bulkAdd(data.receiptBooks); }
      if (data.receiptNumbers?.length) { await db.receiptNumbers.clear(); await db.receiptNumbers.bulkAdd(data.receiptNumbers); }
      if (data.voucherBooks?.length) { await db.voucherBooks.clear(); await db.voucherBooks.bulkAdd(data.voucherBooks); }
      if (data.voucherNumbers?.length) { await db.voucherNumbers.clear(); await db.voucherNumbers.bulkAdd(data.voucherNumbers); }
      if (data.attachments?.length) { await db.attachments.clear(); await db.attachments.bulkAdd(data.attachments); }
      if (data.committees?.length) { await db.committees.clear(); await db.committees.bulkAdd(data.committees); }
      if (data.committeeMembers?.length) { await db.committeeMembers.clear(); await db.committeeMembers.bulkAdd(data.committeeMembers); }
      if (data.committeeHandovers?.length) { await db.committeeHandovers.clear(); await db.committeeHandovers.bulkAdd(data.committeeHandovers); }
      if (data.events?.length) { await db.events.clear(); await db.events.bulkAdd(data.events); }
      if (data.notifications?.length) { await db.notifications.clear(); await db.notifications.bulkAdd(data.notifications); }
      if (data.settings?.length) { await db.settings.clear(); await db.settings.bulkAdd(data.settings); }
    });

    return { success: true, message: `Backup restored successfully from ${backup.createdAt}` };
  } catch (err) {
    return { success: false, message: `Restore failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}
