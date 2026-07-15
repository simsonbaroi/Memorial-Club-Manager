import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Users, Shield, CheckCircle2, Ban } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { generateSalt, hashPassword } from '@/lib/crypto';
import { useAuth } from '@/contexts/AuthContext';

export function UsersList() {
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', displayName: '', email: '', password: '', role: 'viewer' });
  
  const users = useLiveQuery(() => db.users.toArray());

  const handleAddUser = async () => {
    if (!formData.username || !formData.displayName || !formData.password) {
      toast.error('Required fields missing');
      return;
    }

    const exists = await db.users.where('username').equals(formData.username.toLowerCase()).first();
    if (exists) {
      toast.error('Username already exists');
      return;
    }

    const salt = await generateSalt();
    const passwordHash = await hashPassword(formData.password, salt);

    await db.users.add({
      username: formData.username.toLowerCase(),
      displayName: formData.displayName,
      email: formData.email,
      passwordHash,
      salt,
      role: formData.role as any,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser!.id,
    });

    toast.success('User created successfully');
    setIsOpen(false);
    setFormData({ username: '', displayName: '', email: '', password: '', role: 'viewer' });
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    if (id === currentUser!.id) {
      toast.error('Cannot deactivate your own account');
      return;
    }
    await db.users.update(id, { isActive: !currentStatus, updatedAt: new Date().toISOString() });
    toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">User Management</h3>
          <p className="text-sm text-muted-foreground">Manage access and roles for the club staff.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="size-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Username *</Label>
                <Input className="col-span-3" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="login username" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Full Name *</Label>
                <Input className="col-span-3" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} placeholder="Display name" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Email</Label>
                <Input type="email" className="col-span-3" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email address" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Password *</Label>
                <Input type="password" className="col-span-3" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Secret password" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Role *</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="president">President</SelectItem>
                    <SelectItem value="secretary">Secretary</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="auditor">Auditor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddUser}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users === undefined ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-2">
                          {u.displayName}
                          {u.id === currentUser?.id && <Badge variant="secondary" className="text-[9px] px-1 h-4">YOU</Badge>}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">@{u.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        <Shield className="size-3 mr-1 text-primary" />
                        {u.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-center">
                      {u.isActive ? 
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="size-3 mr-1" /> Active</Badge> : 
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200"><Ban className="size-3 mr-1" /> Inactive</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== currentUser?.id && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleStatus(u.id!, u.isActive)}
                          className={u.isActive ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
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