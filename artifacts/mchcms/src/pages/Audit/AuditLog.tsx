import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTimeBD } from '@/lib/export';

export function AuditLog() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const logs = useLiveQuery(() => db.auditLogs.reverse().limit(500).toArray());

  const filteredLogs = logs?.filter(log => 
    log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.recordCode && log.recordCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      update: 'bg-blue-50 text-blue-700 border-blue-200',
      delete: 'bg-rose-50 text-rose-700 border-rose-200',
      approve: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      reject: 'bg-rose-50 text-rose-700 border-rose-200',
      login: 'bg-slate-100 text-slate-700 border-slate-300',
      logout: 'bg-slate-100 text-slate-700 border-slate-300',
      login_failed: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    };
    
    return <Badge variant="outline" className={`${colors[action] || ''} uppercase tracking-wider text-[10px]`}>{action.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col justify-between items-start gap-2">
        <h2 className="text-2xl font-bold tracking-tight">System Audit Log</h2>
        <p className="text-muted-foreground mt-1">Read-only record of all actions performed in the system.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="size-4 text-muted-foreground" />
            <Input 
              placeholder="Search user, action, module, or code..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 shadow-none h-8 p-0"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold w-[200px]">Timestamp</TableHead>
                <TableHead className="font-semibold">User</TableHead>
                <TableHead className="font-semibold">Action</TableHead>
                <TableHead className="font-semibold">Module</TableHead>
                <TableHead className="font-semibold">Record Code</TableHead>
                <TableHead className="font-semibold text-right">IP/Device Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs === undefined ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="animate-pulse flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-32 bg-muted rounded"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <ShieldAlert className="size-12 opacity-20 mx-auto mb-3" />
                    No audit records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="text-sm">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTimeBD(log.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium">{log.username}</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{log.module}</TableCell>
                    <TableCell className="font-mono text-xs">{log.recordCode || '-'}</TableCell>
                    <TableCell className="text-right text-[10px] text-muted-foreground max-w-[200px] truncate" title={log.device}>
                      {log.device ? log.device.split(' ')[0] : 'Unknown'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}