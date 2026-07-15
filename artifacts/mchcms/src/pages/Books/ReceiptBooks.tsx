import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function ReceiptBooks() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ prefix: 'DR', startNumber: '', endNumber: '', issuedTo: '' });
  
  const books = useLiveQuery(() => db.receiptBooks.reverse().toArray());

  const handleAdd = async () => {
    const start = parseInt(formData.startNumber, 10);
    const end = parseInt(formData.endNumber, 10);
    
    if (!start || !end || start >= end || !formData.issuedTo || !formData.prefix) {
      toast.error('Invalid form data. Ensure start < end.');
      return;
    }

    const count = await db.receiptBooks.count();
    const bookNumber = `RB-${String(count + 1).padStart(3, '0')}`;
    
    await db.receiptBooks.add({
      bookNumber,
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
    
    toast.success('Receipt book added');
    setIsOpen(false);
    setFormData({ prefix: 'DR', startNumber: '', endNumber: '', issuedTo: '' });
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
          <h2 className="text-2xl font-bold tracking-tight">Receipt Books</h2>
          <p className="text-muted-foreground mt-1">Manage books used for income and donations.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Plus className="size-4" />
              Issue New Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New Receipt Book</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Prefix</Label>
                <Input className="col-span-3" value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} placeholder="e.g. DR" />
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
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="animate-pulse flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-32 bg-muted rounded"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : books.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <BookOpen className="size-12 opacity-20 mx-auto mb-3" />
                    No receipt books found.
                  </TableCell>
                </TableRow>
              ) : (
                books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.bookNumber}</TableCell>
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