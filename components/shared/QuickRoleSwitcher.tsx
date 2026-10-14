'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Shield, ChevronDown, UserCheck, KeyRound, Building2, Wallet, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

const ROLES: { role: Role; label: string; desc: string; icon: React.ElementType }[] = [
  { role: 'admin', label: 'Admin (Owner)', desc: 'Full platform access', icon: Shield },
  { role: 'manager', label: 'Property Manager', desc: 'Properties, tenants, operations', icon: Building2 },
  { role: 'accountant', label: 'Accountant', desc: 'Billing, invoices, expenses', icon: Wallet },
  { role: 'warden', label: 'PG Warden', desc: 'Rooms, attendance, visitors', icon: KeyRound },
  { role: 'tenant', label: 'Tenant Resident', desc: 'Tenant Self-Service Portal', icon: UserCircle },
];

export function QuickRoleSwitcher() {
  const { role, loginAsRole, isLoaded } = useAuth();
  const router = useRouter();

  const isDemoAllowed =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true';

  if (!isDemoAllowed) {
    return null;
  }

  const handleSwitch = (newRole: Role) => {
    loginAsRole(newRole);
    toast.success(`Switched role to: ${newRole.toUpperCase()}`);
    if (newRole === 'tenant') {
      router.push('/portal/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  const currentRole = isLoaded ? role : 'admin';
  const currentRoleInfo = ROLES.find((r) => r.role === currentRole) || ROLES[0];
  const CurrentIcon = currentRoleInfo.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 h-8 px-2.5 rounded-xl border border-border bg-card/60 hover:bg-muted font-medium text-xs shadow-none text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer">
        <CurrentIcon className="h-3.5 w-3.5 text-primary" />
        <span className="capitalize">{currentRole}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5">
          Switch Demo Role
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((item) => {
          const ItemIcon = item.icon;
          const isSelected = item.role === currentRole;
          return (
            <DropdownMenuItem
              key={item.role}
              onClick={() => handleSwitch(item.role)}
              className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer"
            >
              <div
                className={`p-1.5 rounded-md ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <ItemIcon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-medium leading-none truncate">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.desc}</p>
              </div>
              {isSelected && <UserCheck className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
