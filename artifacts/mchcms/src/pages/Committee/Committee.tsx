import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function Committee() {
  const { hasPermission } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', designation: '', contact: '', joiningDate: new Date().toISOString().slice(0, 10) });

  const activeCommittee = useLiveQuery(() => db.committees.filter(c => c.isActive).first());
  const members = useLiveQuery(() => activeCommittee ? db.committeeMembers.filter(m => m.committeeId === activeCommittee.id && m.isActive).toArray() : [], [activeCommittee]);

  const handleAddMember = async () => {
    if (!activeCommittee) return;
    if (!formData.name || !formData.designation) {
      toast.error('Name and designation are required');
      return;
    }
    
    await db.committeeMembers.add({
      committeeId: activeCommittee.id!,
      name: formData.name,
      designation: formData.designation,
      joiningDate: formData.joiningDate,
      contact: formData.contact,
      isActive: true,
    });
    
    toast.success('Member added to committee');
    setIsOpen(false);
    setFormData({ name: '', designation: '', contact: '', joiningDate: new Date().toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Committee</h2>
          <p className="text-muted-foreground mt-1">Manage executive committee members.</p>
        </div>
        {hasPermission('committee:update') && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="size-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Committee Member</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Name</Label>
                  <Input className="col-span-3" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full name" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Designation</Label>
                  <Input className="col-span-3" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} placeholder="e.g. President, Secretary" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Contact</Label>
                  <Input className="col-span-3" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="Phone number" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Joined Date</Label>
                  <Input type="date" className="col-span-3" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddMember}>Add Member</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-primary/20 shadow-sm overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Star className="size-5 text-primary fill-primary/20" />
                {activeCommittee?.name || 'Active Committee'}
              </CardTitle>
              <CardDescription className="mt-1.5 text-sm">{activeCommittee?.description || 'Current active members of the organization'}</CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {members === undefined ? (
              <div className="col-span-full py-8 text-center text-muted-foreground animate-pulse">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Users className="size-8 opacity-20" />
                No members found in active committee.
              </div>
            ) : (
              members.map(member => (
                <div key={member.id} className="bg-card border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <Avatar className="size-12 border-2 border-muted shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate" title={member.name}>{member.name}</h4>
                    <p className="text-xs text-muted-foreground font-medium text-primary mt-0.5">{member.designation}</p>
                    {member.contact && <p className="text-[11px] text-muted-foreground mt-1 truncate">{member.contact}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}