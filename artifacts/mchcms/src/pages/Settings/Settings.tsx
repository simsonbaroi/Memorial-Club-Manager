import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UsersList } from './UsersList';
import { Settings as SettingsIcon, Shield, Database, Download, Upload } from 'lucide-react';
import { createBackup, downloadBackup } from '@/lib/backup';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function Settings() {
  const handleBackup = async () => {
    try {
      const data = await createBackup();
      downloadBackup(data);
      toast.success('Backup downloaded successfully');
    } catch (e) {
      toast.error('Failed to create backup');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground mt-1">Manage users, roles, and system configuration.</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="users" className="gap-2">
            <Shield className="size-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="size-4" /> General
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="size-4" /> Backup
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="users">
            <UsersList />
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>Basic information used in reports and receipts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Configuration UI will be implemented here. Values are currently read from the database settings table.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>Database Backup</CardTitle>
                <CardDescription>Export your complete offline database for safekeeping or import to another device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 border rounded-xl p-6 bg-muted/10">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                      <Download className="size-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold">Export Database</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Download a full JSON backup of all records, users, and settings. Store this securely.
                      </p>
                      <Button onClick={handleBackup} className="gap-2">
                        Download Backup
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 border border-rose-200 rounded-xl p-6 bg-rose-50/30">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                      <Upload className="size-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-rose-900">Restore Database</h4>
                      <p className="text-sm text-rose-700/80 mb-4">
                        Warning: Restoring a backup will overwrite all current data on this device.
                      </p>
                      <Button variant="destructive" className="gap-2" onClick={() => toast.info('Restore functionality requires file upload UI')}>
                        Restore from File
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}