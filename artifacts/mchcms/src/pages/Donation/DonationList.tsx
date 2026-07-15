import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Link } from 'wouter';
import { formatCurrencyBDT, formatDateBD } from '@/lib/export';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Heart, CheckCircle2, Lock, Ban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function DonationList() {
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = useAuth();
  
  const donations = useLiveQuery(() => 
    db.donations
      .filter(d => !d.isDeleted)
      .reverse()
      .sortBy('date')
  );

  const filteredDonations = donations?.filter(d => 
    d.donationCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.phone && d.phone.includes(searchTerm))
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'locked': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200"><Ban className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Donations</h2>
          <p className="text-muted-foreground mt-1">Manage all club donations and gifts.</p>
        </div>
        {hasPermission('donation:create') && (
          <Button asChild className="gap-2 shadow-sm bg-amber-600 hover:bg-amber-700 text-white border-amber-700">
            <Link href="/donations/new">
              <Plus className="size-4" />
              Add Donation
            </Link>
          </Button>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by donor, receipt, code..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 shadow-none h-8 p-0"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Receipt</TableHead>
                <TableHead className="font-semibold">Donor</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold text-right">Amount</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDonations === undefined ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="animate-pulse flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-32 bg-muted rounded"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDonations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Heart className="size-12 opacity-20 mx-auto mb-3" />
                    No donations found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDonations.map((donation) => (
                  <TableRow key={donation.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="font-medium">{formatDateBD(donation.date)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{donation.receiptNumber}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{donation.donationCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{donation.isAnonymous ? 'Anonymous' : donation.donorName}</span>
                      {donation.purpose && <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{donation.purpose}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {donation.phone || '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-600 dark:text-amber-500">
                      {formatCurrencyBDT(donation.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(donation.status)}
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