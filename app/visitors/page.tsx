'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCheck2, Plus, Search, Clock, LogOut, ShieldCheck, User, CheckCircle2 } from 'lucide-react';
import { operationsService } from '@/services/operationsService';
import { tenantService } from '@/services/tenantService';
import { propertyService } from '@/services/propertyService';
import { Visitor } from '@/types/operations';
import { useStorageState } from '@/hooks/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage';
import { initialVisitors } from '@/data/operations';
import { toast } from 'sonner';

export default function VisitorsPage() {
  const [visitors, setVisitors] = useStorageState<Visitor[]>(
    STORAGE_KEYS.VISITORS,
    initialVisitors
  );

  const tenants = tenantService.getTenants();
  const properties = propertyService.getProperties();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  // Form states
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [tenantId, setTenantId] = useState(tenants[0]?.id || '');
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [purpose, setPurpose] = useState('Friend / Family Visit');
  const [idVerificationType, setIdVerificationType] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');

  const insideCount = visitors.filter((v) => v.status === 'inside').length;
  const checkedOutCount = visitors.filter((v) => v.status === 'checked_out').length;

  const filtered = visitors.filter((v) => {
    const tenant = tenants.find((t) => t.id === v.tenantId);
    const matchesSearch =
      v.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone.includes(searchTerm) ||
      (tenant && tenant.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !phone || !tenantId) {
      toast.error('Please enter visitor name, phone, and host resident.');
      return;
    }

    const tenant = tenants.find((t) => t.id === tenantId);

    const newVisitor = await operationsService.checkInVisitor({
      visitorName,
      phone,
      tenantId,
      propertyId: tenant?.propertyId || propertyId,
      purpose,
      idVerificationType,
      idNumber,
    });

    setIsCheckInOpen(false);
    toast.success(`Visitor ${newVisitor.visitorName} checked in successfully!`);
    setVisitorName('');
    setIdNumber('');
  };

  const handleCheckOut = (id: string) => {
    operationsService.checkOutVisitor(id);
    toast.success('Visitor departure logged (Checked Out).');
  };

  return (
    <AppShell>
      <PageHeader
        title="Visitor & Gate Management"
        description="Gate log of external guests, delivery agents, parent visits, and entry/exit timestamps."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Visitors' }]}
        actions={
          <Button onClick={() => setIsCheckInOpen(true)} className="h-9 gap-1.5 text-xs rounded-xl shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Visitor Check-In</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Visitors" value={visitors.length} subtitle="Cumulative guest logs" icon={UserCheck2} />
        <StatCard
          title="Currently Inside"
          value={insideCount}
          subtitle="Guests on premises"
          icon={Clock}
          iconColor="text-emerald-600 bg-emerald-500/10"
        />
        <StatCard
          title="Checked Out"
          value={checkedOutCount}
          subtitle="Departures logged"
          icon={CheckCircle2}
          iconColor="text-sky-600 bg-sky-500/10"
        />
        <StatCard title="Security Level" value="Level 1" subtitle="Biometric & ID verified" icon={ShieldCheck} />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search visitor or resident..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-xs w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="inside">Currently Inside</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No visitors found"
          description="Adjust your search criteria or register a new visitor check-in."
          actionLabel="Check-In Visitor"
          onAction={() => setIsCheckInOpen(true)}
        />
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card overflow-x-auto shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                <th className="p-3.5 font-semibold">Visitor Name</th>
                <th className="p-3.5 font-semibold">Phone Number</th>
                <th className="p-3.5 font-semibold">Host Resident</th>
                <th className="p-3.5 font-semibold">Purpose</th>
                <th className="p-3.5 font-semibold">ID Proof</th>
                <th className="p-3.5 font-semibold">Entry Time</th>
                <th className="p-3.5 font-semibold">Exit Time</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((v) => {
                const tenant = tenants.find((t) => t.id === v.tenantId);

                return (
                  <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 font-bold text-foreground">{v.visitorName}</td>
                    <td className="p-3.5 text-muted-foreground">{v.phone}</td>
                    <td className="p-3.5 font-semibold text-foreground">
                      {tenant ? tenant.name : 'Resident'}
                    </td>
                    <td className="p-3.5 text-muted-foreground">{v.purpose}</td>
                    <td className="p-3.5 text-muted-foreground">
                      <span className="font-medium text-foreground">{v.idVerificationType || 'Govt ID'}</span>
                      {v.idNumber && <span className="block text-[10px] text-muted-foreground font-mono">{v.idNumber}</span>}
                    </td>
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">{v.entryTime}</td>
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">{v.exitTime || '—'}</td>
                    <td className="p-3.5">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      {v.status === 'inside' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckOut(v.id)}
                          className="h-7 text-xs gap-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <LogOut className="h-3 w-3" />
                          <span>Check Out</span>
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Visitor Check-In Dialog */}
      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Visitor Check-In Registration</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Register an incoming guest or delivery personnel.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCheckIn} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Visitor Name *</Label>
              <Input
                required
                placeholder="e.g. Nitin Agrawal"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Phone Number *</Label>
                <Input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Host Resident *</Label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} (Bed: {t.bedId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Purpose of Visit</Label>
                <Input
                  placeholder="e.g. Parent Visit / Discussion / Delivery"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">ID Verification Type</Label>
                <Select value={idVerificationType} onValueChange={setIdVerificationType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aadhaar Card">Aadhaar Card</SelectItem>
                    <SelectItem value="Driving License">Driving License</SelectItem>
                    <SelectItem value="PAN Card">PAN Card</SelectItem>
                    <SelectItem value="Voter ID">Voter ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">ID Number (Optional)</Label>
                <Input
                  placeholder="e.g. KA-01-2021-9988"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCheckInOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Check In Visitor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
