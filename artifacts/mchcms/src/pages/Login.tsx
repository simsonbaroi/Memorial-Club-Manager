import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Building2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }
    
    setIsSubmitting(true);
    const { success, message } = await login(username, password);
    setIsSubmitting(false);
    
    if (success) {
      toast.success(message);
      setLocation('/');
    } else {
      toast.error(message);
    }
  };

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="size-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-black/5">
            <Building2 className="size-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">MCHCMS</h1>
            <p className="text-muted-foreground font-medium text-sm">Memorial Christian Hospital Club</p>
          </div>
        </div>
        
        <Card className="border-border shadow-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="admin" 
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  autoComplete="current-password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-5 pt-2">
              <Button type="submit" className="w-full h-11 text-base font-medium shadow-md shadow-primary/20" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="text-sm text-center text-muted-foreground bg-muted/50 p-4 rounded-lg border w-full flex flex-col gap-2">
                <div className="font-semibold text-foreground flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider mb-1">
                  <KeyRound className="size-3.5 text-accent" />
                  Default Credentials
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col items-center gap-1">
                    <span className="opacity-70">Username</span>
                    <code className="bg-background px-2 py-1 rounded font-mono border shadow-sm">admin</code>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="opacity-70">Password</span>
                    <code className="bg-background px-2 py-1 rounded font-mono border shadow-sm">admin123</code>
                  </div>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}