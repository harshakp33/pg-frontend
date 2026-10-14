'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  FileCheck,
  CreditCard,
  Building2,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';
import { tenantService } from '@/services/tenantService';
import { propertyService } from '@/services/propertyService';
import { Tenant, Gender, TenantStatus } from '@/types/tenant';
import { useStorageState } from '@/hooks/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage';
import { initialTenants } from '@/data/tenants';
import { formatINR, formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useStorageState<Tenant[]>(
    STORAGE_KEYS.TENANTS,
    initialTenants
  );

  const properties = propertyService.getProperties();
  const availableBeds = propertyService.getBeds().filter((b) => b.status === 'available');

  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [occupation, setOccupation] = useState('');
  const [companyOrCollege, setCompanyOrCollege] = useState('');
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [bedId, setBedId] = useState(availableBeds[0]?.id || '');
  const [monthlyRent, setMonthlyRent] = useState(12000);
  const [securityDeposit, setSecurityDeposit] = useState(24000);
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().split('T')[0]);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('+91 ');
  const [emergencyRelation, setEmergencyRelation] = useState('Parent');

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      t.tenantCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProp = propertyFilter === 'all' || t.propertyId === propertyFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || t.paymentStatus === paymentFilter;
    return matchesSearch && matchesProp && matchesStatus && matchesPayment;
  });

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email || !propertyId) {
      toast.error('Please enter name, phone, email, and choose property');
      return;
    }

    const selectedBedObj = availableBeds.find((b) => b.id === bedId);

    const newTenant = await tenantService.createTenant({
      name,
      phone,
      email,
      gender,
      occupation: occupation || 'Working Professional',
      companyOrCollege: companyOrCollege || 'Bangalore Tech Park',
      propertyId,
      buildingId: selectedBedObj?.buildingId || 'bld-1',
      floorId: selectedBedObj?.floorId || 'flr-1',
      roomId: selectedBedObj?.roomId || 'room-101',
      bedId: bedId || 'bed-101-A',
      moveInDate,
      noticePeriodDays: 30,
      monthlyRent,
      securityDeposit,
      depositPaid: securityDeposit,
      paymentStatus: 'paid',
      status: 'active',
      emergencyContact: {
        name: emergencyName || 'Emergency Contact',
        phone: emergencyPhone,
        relation: emergencyRelation,
      },
      kyc: {
        status: 'pending',
        aadhaarStatus: 'pending',
        panStatus: 'pending',
        policeVerificationStatus: 'pending',
      },
    });

    setIsAddOpen(false);
    toast.success(`Tenant ${newTenant.name} registered (${newTenant.tenantCode})!`);
  };

  const handleDeleteTenant = () => {
    if (deleteTargetId) {
      tenantService.deleteTenant(deleteTargetId);
      toast.success('Tenant record archived and bed released.');
      setDeleteTargetId(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Tenants Directory"
        description="Manage resident profiles, bed assignments, monthly rent tracking, and digital KYC verification."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Tenants' }]}
        actions={
          <Button onClick={() => setIsAddOpen(true)} className="h-9 gap-1.5 text-xs rounded-xl shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Add Resident Tenant</span>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone or TNT code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="h-9 text-xs w-44">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="notice_period">Notice Period</SelectItem>
              <SelectItem value="vacated">Vacated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="Rent Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rent Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tenants Table */}
      {filteredTenants.length === 0 ? (
        <EmptyState
          title="No tenants found"
          description="Try broadening your filters or add a new tenant resident."
          actionLabel="Add Tenant"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card overflow-x-auto shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                <th className="p-3.5 font-semibold">Tenant ID</th>
                <th className="p-3.5 font-semibold">Resident Name</th>
                <th className="p-3.5 font-semibold">Contact</th>
                <th className="p-3.5 font-semibold">Bed / Room</th>
                <th className="p-3.5 font-semibold">Property</th>
                <th className="p-3.5 font-semibold">Move In</th>
                <th className="p-3.5 font-semibold">Rent</th>
                <th className="p-3.5 font-semibold">Rent Status</th>
                <th className="p-3.5 font-semibold">KYC</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTenants.map((tenant) => {
                const prop = properties.find((p) => p.id === tenant.propertyId);

                return (
                  <tr key={tenant.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] font-bold text-foreground">
                      {tenant.tenantCode}
                    </td>
                    <td className="p-3.5">
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="font-bold text-foreground hover:underline text-primary"
                      >
                        {tenant.name}
                      </Link>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {tenant.occupation} • {tenant.gender}
                      </p>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      <p className="font-medium text-foreground">{tenant.phone}</p>
                      <p className="text-[10px] truncate max-w-[140px]">{tenant.email}</p>
                    </td>
                    <td className="p-3.5 font-semibold text-foreground">
                      {tenant.bedId ? `Bed ${tenant.bedId.split('-').slice(1).join('-')}` : 'Unassigned'}
                    </td>
                    <td className="p-3.5 text-muted-foreground truncate max-w-[120px]">
                      {prop?.name || 'PG'}
                    </td>
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                      {formatDate(tenant.moveInDate)}
                    </td>
                    <td className="p-3.5 font-bold text-foreground">
                      {formatINR(tenant.monthlyRent)}
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={tenant.paymentStatus} />
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={tenant.kyc.status} dot={false} />
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      <Link href={`/tenants/${tenant.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTargetId(tenant.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Resident Tenant Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Resident Tenant</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter tenant personal details, assign a bed, and establish rental agreement terms.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddTenant} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Full Name *</Label>
                <Input
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Phone Number *</Label>
                <Input
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Email Address *</Label>
                <Input
                  required
                  type="email"
                  placeholder="rahul.sharma@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Gender</Label>
                <Select value={gender} onValueChange={(val: Gender) => setGender(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Occupation / Job Title</Label>
                <Input
                  placeholder="e.g. Senior Software Engineer"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Company or College</Label>
                <Input
                  placeholder="e.g. Swiggy HQ / RV College"
                  value={companyOrCollege}
                  onChange={(e) => setCompanyOrCollege(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Property Location *</Label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Bed Assignment *</Label>
                <Select value={bedId} onValueChange={setBedId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose vacant bed" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBeds.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        Bed {b.bedNumber} (₹{b.monthlyRent}/mo)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Monthly Rent (₹)</Label>
                <Input
                  type="number"
                  step={500}
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Security Deposit (₹)</Label>
                <Input
                  type="number"
                  step={1000}
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Move-in Date</Label>
                <Input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Emergency Contact Name</Label>
                <Input
                  placeholder="e.g. Ramesh Sharma (Father)"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Emergency Contact Phone</Label>
                <Input
                  placeholder="+91 98220 11223"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Register & Allocate Bed
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Archive Tenant?"
        description="Are you sure you want to remove this tenant? Their occupied bed will be released back into available inventory."
        confirmLabel="Archive & Vacate"
        variant="destructive"
        onConfirm={handleDeleteTenant}
      />
    </AppShell>
  );
}
