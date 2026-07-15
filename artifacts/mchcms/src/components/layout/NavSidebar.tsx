import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Building2, LayoutDashboard, Wallet, Receipt, Heart, BookOpen, FileText, Users, Calendar, ShieldAlert, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function NavSidebar() {
  const { user, logout, hasPermission } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [location] = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = location === href || (href !== '/' && location.startsWith(href));
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
          <Link href={href}>
            <Icon className="size-4" />
            <span>{label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b px-4 py-3 flex-row items-center gap-2">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Building2 className="size-5" />
        </div>
        <div className="flex flex-col gap-0.5 leading-none">
          <span className="font-semibold text-sm tracking-tight">MCHCMS</span>
          <span className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-wider">MCH Club</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem href="/" icon={LayoutDashboard} label="Dashboard" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem href="/income" icon={Wallet} label="Income" />
              <NavItem href="/expense" icon={Receipt} label="Expenses" />
              <NavItem href="/donations" icon={Heart} label="Donations" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Books</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem href="/receipt-books" icon={BookOpen} label="Receipt Books" />
              <NavItem href="/voucher-books" icon={BookOpen} label="Voucher Books" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem href="/reports" icon={FileText} label="Reports" />
              <NavItem href="/committee" icon={Users} label="Committee" />
              <NavItem href="/events" icon={Calendar} label="Events" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(hasPermission('audit:read') || hasPermission('settings:read')) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hasPermission('audit:read') && <NavItem href="/audit" icon={ShieldAlert} label="Audit Log" />}
                {hasPermission('settings:read') && <NavItem href="/settings" icon={Settings} label="Settings" />}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 border shadow-sm">
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              {user?.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate leading-tight">{user?.displayName}</span>
            <span className="text-[11px] text-muted-foreground capitalize truncate leading-tight mt-0.5">{user?.role.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Button variant="outline" size="icon" className="flex-1 h-9 shadow-sm" onClick={toggleTheme} title="Toggle Theme">
            {resolvedTheme === 'dark' ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4 text-blue-500" />}
          </Button>
          <Button variant="outline" size="sm" className="flex-[3] h-9 gap-2 shadow-sm text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 hover:border-destructive/30" onClick={handleLogout}>
            <LogOut className="size-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}