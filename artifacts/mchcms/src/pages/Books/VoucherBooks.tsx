import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function VoucherBooks() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'cash_payment', prefix: 'PV', startNumber: '', endNumber: '', issuedTo: '' });
  
  const books = useLiveQuery(() => db.voucherBooks.reverse().toArray());

  const handleAdd = async () => {
    const start = parseInt(formData.startNumber, 10);
    const end = parseInt(formData.endNumber, 10);
    
    if (!start || !end || start >= end || !formData.issuedTo || !formData.prefix) {
      toast.error('Invalid form data. Ensure start < end.');
      return;
    }

    const count = await db.voucherBooks.count();
    const bookNumber = `VB-${String(count + 1).padStart(3, '0')}`;
    
    await db.voucherBooks.add({
      bookNumber,
      type: formData.type as any,
      prefix: formData.prefix,
      startNumber: start,
      endNumber: end,
      issueDate: new Date().toISOString().slice(0, 10),
      issuedTo: formData.issuedTo,
      currentNumber: start,
      remainingCount: (end - start) + 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user!.id,
    });
    
    toast.success('Voucher book added');
    setIsOpen(false);
    setFormData({ type: 'cash_payment', prefix: 'PV', startNumber: '', endNumber: '', issuedTo: '' });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>;
      case 'used': return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Used Up</Badge>;
      case 'archived': return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Archived</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Voucher Books</h2>
          <p className="text-muted-foreground mt-1">Manage books used for expenses and payments.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm bg-rose-600 hover:bg-rose-700 text-white border-rose-700">
              <Plus className="size-4" />
              Issue New Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New Voucher Book</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_payment">Cash Payment</SelectItem>
                    <SelectItem value="journal">Journal</SelectItem>
                    <SelectItem value="approval">Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Prefix</Label>
                <Input className="col-span-3" value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} placeholder="e.g. PV" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Start No.</Label>
                <Input type="number" className="col-span-3" value={formData.startNumber} onChange={e => setFormData({...formData, startNumber: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">End No.</Label>
                <Input type="number" className="col-span-3" value={formData.endNumber} onChange={e => setFormData({...formData, endNumber: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Issued To</Label>
                <Input className="col-span-3" value={formData.issuedTo} onChange={e => setFormData({...formData, issuedTo: e.target.value})} placeholder="Name or designation" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd}>Save Book</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Book No.</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Prefix & Range</TableHead>
                <TableHead className="font-semibold">Issued To</TableHead>
                <TableHead className="font-semibold">Issue Date</TableHead>
                <TableHead className="font-semibold text-center">Remaining</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books === undefined ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="animate-pulse flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-32 bg-muted rounded"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : books.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <BookOpen className="size-12 opacity-20 mx-auto mb-3" />
                    No voucher books found.
                  </TableCell>
                </TableRow>
              ) : (
                books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.bookNumber}</TableCell>
                    <TableCell className="capitalize text-sm">{book.type.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{book.prefix}</span>
                        <span className="text-xs text-muted-foreground font-mono">{book.startNumber} - {book.endNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>{book.issuedTo}</TableCell>
                    <TableCell>{book.issueDate}</TableCell>
                    <TableCell className="text-center font-bold">
                      <span className={book.remainingCount < 50 ? "text-rose-500" : ""}>{book.remainingCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(book.status)}
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