'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Shield,
  KeyRound,
  Wallet,
  Building,
  UserCircle,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/auth';
import { toast } from 'sonner';

const demoAccounts: {
  role: Role;
  name: string;
  email: string;
  title: string;
  description: string;
  icon: React.ElementType;
  badgeColor: string;
}[] = [
  {
    role: 'admin',
    name: 'Vikramaditya Roy',
    email: 'admin@pgmanager.com',
    title: 'Admin / Owner',
    description: 'Full administrative access across all properties and finances',
    icon: Shield,
    badgeColor: 'bg-primary/10 text-primary border-primary/20',
  },
  {
    role: 'manager',
    name: 'Rajesh Kumar',
    email: 'manager@pgmanager.com',
    title: 'Property Manager',
    description: 'Manages rooms, beds, tenants, applications, and complaints',
    icon: Building,
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  {
    role: 'accountant',
    name: 'Meenakshi Sundaram',
    email: 'accountant@pgmanager.com',
    title: 'Senior Accountant',
    description: 'Specializes in rent generation, payments, invoices, and expenses',
    icon: Wallet,
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  {
    role: 'warden',
    name: 'Kavitha Murthy',
    email: 'warden@pgmanager.com',
    title: 'Head PG Warden',
    description: 'Oversees resident leaves, visitor logs, rooms, and daily mess',
    icon: KeyRound,
    badgeColor: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  },
  {
    role: 'tenant',
    name: 'Rahul Sharma',
    email: 'tenant@pgmanager.com',
    title: 'Resident Tenant',
    description: 'Resident self-service portal for rent, food, and maintenance',
    icon: UserCircle,
    badgeColor: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginAsRole, loginWithCredentials } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isDemoAllowed = process.env.NODE_ENV !== 'production';

  const handleQuickLogin = async (role: Role) => {
    try {
      setIsLoading(true);
      await loginAsRole(role);
      toast.success(`Signed in as ${role.toUpperCase()}`);
      if (role === 'tenant') {
        router.push('/portal/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    if (!password) {
      toast.error('Please enter a password');
      return;
    }
    try {
      setIsLoading(true);
      const found = demoAccounts.find((a) => a.email.toLowerCase() === email.toLowerCase().trim());
      const role = found?.role || 'admin';
      await loginWithCredentials(email, password, role);
      toast.success(`Signed in as ${role.toUpperCase()}`);
      if (role === 'tenant') {
        router.push('/portal/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-between selection:bg-primary/20">
      {/* Top Bar */}
      <header className="flex h-16 items-center justify-between px-6 sm:px-12 border-b border-border/80 bg-background/80 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight text-foreground text-sm">PG Manager</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-xs">
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className={`w-full ${isDemoAllowed ? 'max-w-4xl' : 'max-w-md'} space-y-8`}>
          <div className="text-center space-y-2">
            {isDemoAllowed ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-card text-[11px] font-medium text-muted-foreground shadow-2xs">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Development & Demo Mode</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-card text-[11px] font-medium text-muted-foreground shadow-2xs">
                <Shield className="h-3 w-3 text-primary" />
                <span>Secure SaaS Authentication</span>
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Sign In to PG Manager
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              {isDemoAllowed
                ? 'Select a role below for instant testing access, or enter your credentials.'
                : 'Enter your organization credentials to securely access your workspace.'}
            </p>
          </div>

          <div className={isDemoAllowed ? "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" : "w-full"}>
            {/* Quick Demo Roles Column */}
            {isDemoAllowed && (
              <div className="lg:col-span-7 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  1-Click Instant Demo Logins
                </p>
                <div className="space-y-2.5">
                  {demoAccounts.map((account) => {
                    const Icon = account.icon;
                    return (
                      <Card
                        key={account.role}
                        onClick={() => handleQuickLogin(account.role)}
                        className="p-3.5 bg-card hover:bg-muted/40 border-border/80 rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-xs group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg border ${account.badgeColor}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {account.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  ({account.email})
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                {account.description}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 group-hover:text-primary shrink-0 ml-2"
                            disabled={isLoading}
                          >
                            <span>Sign In</span>
                            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual Form Column */}
            <div className={isDemoAllowed ? "lg:col-span-5" : "w-full"}>
              <Card className="p-6 bg-card border-border/80 rounded-2xl shadow-sm">
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-foreground">
                      {isDemoAllowed ? 'Manual Credentials' : 'Account Credentials'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {isDemoAllowed ? 'Or type your registered email address' : 'Sign in to access your portal'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="owner@blrstays.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 text-xs h-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 text-xs h-9"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full text-xs h-9 mt-2 font-medium" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Continue to Dashboard'}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border/60 bg-background/50">
        PG Manager SaaS • Secure Multi-Tenant Architecture
      </footer>
    </div>
  );
}
