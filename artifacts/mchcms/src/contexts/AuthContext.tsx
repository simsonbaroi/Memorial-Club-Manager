import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../db';
import type { User, UserRole, Permission } from '../db/schema';
import { ROLE_PERMISSIONS } from '../db/schema';
import { verifyPassword, generateToken } from '../lib/crypto';
import { logAudit } from '../lib/audit';
import { seedIfNeeded, cleanupDemoSeedData } from '../db/seed';

interface AuthUser extends Omit<User, 'passwordHash' | 'salt'> {
  id: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      await seedIfNeeded();
      await cleanupDemoSeedData();
      // Restore session from localStorage
      const token = localStorage.getItem('mchcms_token');
      if (token) {
        const session = await db.sessions.where('token').equals(token).first();
        if (session && session.isActive && new Date(session.expiresAt) > new Date()) {
          const dbUser = await db.users.get(session.userId);
          if (dbUser && dbUser.isActive) {
            const { passwordHash: _ph, salt: _s, ...authUser } = dbUser;
            setUser(authUser as AuthUser);
          } else {
            localStorage.removeItem('mchcms_token');
          }
        } else {
          localStorage.removeItem('mchcms_token');
        }
      }
    } catch (err) {
      console.error('Auth init error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const dbUser = await db.users.where('username').equals(username.trim().toLowerCase()).first()
        || await db.users.where('username').equals(username.trim()).first();

      if (!dbUser || !dbUser.id) {
        await logAudit({ username, action: 'login_failed', module: 'auth', reason: 'User not found' });
        return { success: false, message: 'Invalid username or password' };
      }

      if (!dbUser.isActive) {
        return { success: false, message: 'Your account has been deactivated. Contact administrator.' };
      }

      const valid = await verifyPassword(password, dbUser.passwordHash, dbUser.salt);
      if (!valid) {
        await logAudit({ userId: dbUser.id, username: dbUser.username, action: 'login_failed', module: 'auth', reason: 'Wrong password' });
        return { success: false, message: 'Invalid username or password' };
      }

      // Create session
      const token = generateToken();
      const now = new Date();
      const expires = new Date(now.getTime() + 30 * 60 * 1000); // 30 min
      await db.sessions.add({
        userId: dbUser.id,
        token,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        device: navigator.userAgent.substring(0, 200),
        isActive: true,
      });

      // Update last login
      await db.users.update(dbUser.id, { lastLogin: now.toISOString(), updatedAt: now.toISOString() });

      localStorage.setItem('mchcms_token', token);

      const { passwordHash: _ph, salt: _s, ...authUser } = dbUser;
      setUser(authUser as AuthUser);

      await logAudit({ userId: dbUser.id, username: dbUser.username, action: 'login', module: 'auth' });

      return { success: true, message: 'Login successful' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }

  async function logout() {
    try {
      const token = localStorage.getItem('mchcms_token');
      if (token) {
        await db.sessions.where('token').equals(token).modify({ isActive: false });
        localStorage.removeItem('mchcms_token');
      }
      if (user) {
        await logAudit({ userId: user.id, username: user.username, action: 'logout', module: 'auth' });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  }

  function hasPermission(permission: Permission): boolean {
    if (!user) return false;
    const rolePerms = ROLE_PERMISSIONS[user.role] || [];
    const customPerms = user.customPermissions || [];
    return rolePerms.includes(permission) || customPerms.includes(permission);
  }

  function hasRole(role: UserRole | UserRole[]): boolean {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  }

  async function refreshUser() {
    if (!user) return;
    const dbUser = await db.users.get(user.id);
    if (dbUser) {
      const { passwordHash: _ph, salt: _s, ...authUser } = dbUser;
      setUser(authUser as AuthUser);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, hasPermission, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
