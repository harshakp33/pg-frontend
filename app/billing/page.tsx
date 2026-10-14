'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Send,
  Zap,
} from 'lucide-react';
import { financeService } from '@/services/financeService';
import { tenantService } from '@/services/tenantService';
import { propertyService } from '@/services/propertyService';
import { Invoice, InvoiceStatus } from '@/types/finance';
import { useStorageState } from '@/hooks/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage';
import { initialInvoices } from '@/data/finance';
import { formatINR, formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function BillingPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useStorageState<Invoice[]>(
    STORAGE_KEYS.INVOICES,
    initialInvoices
  );

  const tenants = tenantService.getTenants();
  const properties = propertyService.getProperties();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  // Custom Invoice Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [tenantId, setTenantId] = useState(tenants[0]?.id || '');
  const [month, setMonth] = useState('November 2024');
  const [dueDate, setDueDate] = useState('2024-11-05');
  const [rentAmount, setRentAmount] = useState(12000);
  const [electricityAmount, setElectricityAmount] = useState(500);
  const [foodAmount, setFoodAmount] = useState(0);
  const [lateFee, setLateFee] = useState(0);

  // Computations
  const totalBilled = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const pendingDues = invoices.reduce((acc, i) => acc + i.balanceAmount, 0);
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  const filtered = invoices.filter((inv) => {
    const tenant = tenants.find((t) => t.id === inv.tenantId);
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant && tenant.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesMonth = monthFilter === 'all' || inv.month === monthFilter;
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const handleRunMonthlyBilling = () => {
    const count = financeService.generateMonthlyRentInvoices('November 2024', '2024-11-05');
    toast.success(`Generated ${count} monthly invoices for November billing run!`);
  };

  const handleCreateCustomInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    const subtotal = rentAmount + electricityAmount + foodAmount;
    const total = subtotal + lateFee;

    const newInv = await financeService.createInvoice({
      tenantId,
      propertyId: tenant.propertyId,
      month,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate,
      items: [
        { id: `it-${Date.now()}-1`, description: `Monthly Room Rent (${month})`, amount: rentAmount, category: 'rent' },
        { id: `it-${Date.now()}-2`, description: 'Electricity Submeter Usage', amount: electricityAmount, category: 'electricity' },
        ...(foodAmount > 0 ? [{ id: `it-${Date.now()}-3`, description: 'Extra Mess / Food Charges', amount: foodAmount, category: 'food' as const }] : []),
      ],
      subtotal,
      discount: 0,
      lateFee,
      previousBalance: 0,
      totalAmount: total,
      paidAmount: 0,
      balanceAmount: total,
      status: 'sent',
    });

    setIsAddOpen(false);
    toast.success(`Invoice ${newInv.invoiceNumber} created for ${tenant.name}!`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Billing & Invoices"
        description="Automate monthly rent runs, electricity submeter charges, late fees, and track payment receipts."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Billing' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunMonthlyBilling}
              className="h-9 gap-1.5 text-xs rounded-xl"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Run Auto Billing Run</span>
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="h-9 gap-1.5 text-xs rounded-xl shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Billed" value={formatINR(totalBilled)} subtitle="Current active ledger" icon={Receipt} />
        <StatCard
          title="Collected"
          value={formatINR(totalCollected)}
          subtitle={`${Math.round((totalCollected / (totalBilled || 1)) * 100)}% collection rate`}
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-500/10"
        />
        <StatCard
          title="Pending Dues"
          value={formatINR(pendingDues)}
          subtitle="Outstanding balance"
          icon={Clock}
          iconColor="text-amber-600 bg-amber-500/10"
        />
        <StatCard
          title="Overdue Accounts"
          value={overdueCount}
          subtitle="Past invoice due dates"
          icon={AlertCircle}
          iconColor="text-rose-600 bg-rose-500/10"
        />
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice # or tenant name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoices Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Adjust your search criteria or create a new invoice."
          actionLabel="Create Invoice"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card overflow-x-auto shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                <th className="p-3.5 font-semibold">Invoice #</th>
                <th className="p-3.5 font-semibold">Resident</th>
                <th className="p-3.5 font-semibold">Billing Month</th>
                <th className="p-3.5 font-semibold">Issue Date</th>
                <th className="p-3.5 font-semibold">Due Date</th>
                <th className="p-3.5 font-semibold">Total Amount</th>
                <th className="p-3.5 font-semibold">Paid</th>
                <th className="p-3.5 font-semibold">Balance</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((inv) => {
                const tenant = tenants.find((t) => t.id === inv.tenantId);

                return (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-foreground">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline text-primary">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-foreground">{tenant ? tenant.name : 'Resident'}</p>
                      <p className="text-[10px] text-muted-foreground">{tenant?.phone}</p>
                    </td>
                    <td className="p-3.5 font-medium text-foreground">{inv.month}</td>
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">{formatDate(inv.issueDate)}</td>
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                    <td className="p-3.5 font-extrabold text-foreground">{formatINR(inv.totalAmount)}</td>
                    <td className="p-3.5 font-semibold text-emerald-600">{formatINR(inv.paidAmount)}</td>
                    <td className="p-3.5 font-bold text-rose-600">{formatINR(inv.balanceAmount)}</td>
                    <td className="p-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <Link href={`/invoices/${inv.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          View Invoice →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Custom Invoice Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Resident Invoice</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add monthly room rent, electricity charges, and mess dues.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomInvoice} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Resident Tenant *</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.tenantCode} • ₹{t.monthlyRent}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Billing Month</Label>
                <Input
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Room Rent (₹)</Label>
                <Input
                  type="number"
                  step={500}
                  value={rentAmount}
                  onChange={(e) => setRentAmount(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Electricity Charges (₹)</Label>
                <Input
                  type="number"
                  step={50}
                  value={electricityAmount}
                  onChange={(e) => setElectricityAmount(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Food / Mess Charges (₹)</Label>
                <Input
                  type="number"
                  step={100}
                  value={foodAmount}
                  onChange={(e) => setFoodAmount(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Late Fee / Penalty (₹)</Label>
                <Input
                  type="number"
                  step={50}
                  value={lateFee}
                  onChange={(e) => setLateFee(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Total Invoice Amount:</span>
              <span className="text-base font-extrabold text-foreground">
                {formatINR(rentAmount + electricityAmount + foodAmount + lateFee)}
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Generate Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
