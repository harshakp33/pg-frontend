'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  CreditCard,
  Plus,
  Search,
  Filter,
  Printer,
  CheckCircle2,
  Calendar,
  Building2,
  QrCode,
  DollarSign,
} from 'lucide-react';
import { financeService } from '@/services/financeService';
import { tenantService } from '@/services/tenantService';
import { propertyService } from '@/services/propertyService';
import { Payment, PaymentMethod } from '@/types/finance';
import { useStorageState } from '@/hooks/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage';
import { initialPayments } from '@/data/finance';
import { formatINR, formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const [payments, setPayments] = useStorageState<Payment[]>(
    STORAGE_KEYS.PAYMENTS,
    initialPayments
  );

  const tenants = tenantService.getTenants();
  const invoices = financeService.getInvoices();
  const properties = propertyService.getProperties();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  // Record Payment Dialog
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [tenantId, setTenantId] = useState(tenants[0]?.id || '');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState(12000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('Full rent paid via PhonePe');

  // Printable Receipt Modal State
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);
  const upiTotal = payments.filter((p) => p.paymentMethod === 'upi').reduce((acc, p) => acc + p.amount, 0);
  const cashTotal = payments.filter((p) => p.paymentMethod === 'cash').reduce((acc, p) => acc + p.amount, 0);

  const filtered = payments.filter((p) => {
    const tenant = tenants.find((t) => t.id === p.tenantId);
    const matchesSearch =
      p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant && tenant.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || amount <= 0) {
      toast.error('Please select resident and enter valid amount.');
      return;
    }

    const tenant = tenants.find((t) => t.id === tenantId);

    const newPayment = await financeService.recordPayment({
      tenantId,
      invoiceId: invoiceId || undefined,
      propertyId: tenant?.propertyId || 'prop-1',
      amount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      referenceNumber: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
      status: 'successful',
      collectedBy: 'Manager',
      remarks,
    });

    setIsRecordOpen(false);
    toast.success(`Payment receipt ${newPayment.paymentNumber} created!`);
    setAmount(12000);
    setReferenceNumber('');
  };

  return (
    <AppShell>
      <PageHeader
        title="Payment Receipts & Collections"
        description="Complete ledger of all rent, electricity, and security deposit payments collected."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Payments' }]}
        actions={
          <Button onClick={() => setIsRecordOpen(true)} className="h-9 gap-1.5 text-xs rounded-xl shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Record Payment</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Collections" value={formatINR(totalCollected)} subtitle="All recorded receipts" icon={CreditCard} />
        <StatCard
          title="UPI Collections"
          value={formatINR(upiTotal)}
          subtitle={`${Math.round((upiTotal / (totalCollected || 1)) * 100)}% of total`}
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-500/10"
        />
        <StatCard
          title="Cash Receipts"
          value={formatINR(cashTotal)}
          subtitle="Physical cash in register"
          icon={DollarSign}
          iconColor="text-amber-600 bg-amber-500/10"
        />
        <StatCard title="Total Receipts" value={payments.length} subtitle="Processed payments" icon={Calendar} />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search receipt #, tenant, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="h-9 text-xs w-48">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Methods</SelectItem>
            <SelectItem value="upi">UPI (GPay / PhonePe)</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="online">Online Gateway</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No payments found"
          description="Try adjusting your search criteria or record a new resident payment."
          actionLabel="Record Payment"
          onAction={() => setIsRecordOpen(true)}
        />
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card overflow-x-auto shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                <th className="p-3.5 font-semibold">Receipt #</th>
                <th className="p-3.5 font-semibold">Resident</th>
                <th className="p-3.5 font-semibold">Linked Invoice</th>
                <th className="p-3.5 font-semibold">Amount</th>
                <th className="p-3.5 font-semibold">Date</th>
                <th className="p-3.5 font-semibold">Method</th>
                <th className="p-3.5 font-semibold">Transaction Ref</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((p) => {
                const tenant = tenants.find((t) => t.id === p.tenantId);
                const invoice = invoices.find((i) => i.id === p.invoiceId);

                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-foreground">{p.paymentNumber}</td>
                    <td className="p-3.5 font-bold text-foreground">
                      {tenant ? tenant.name : 'Resident'}
                    </td>
                    <td className="p-3.5 text-muted-foreground font-mono">
                      {invoice ? invoice.invoiceNumber : 'Direct Collection'}
                    </td>
                    <td className="p-3.5 font-extrabold text-foreground">{formatINR(p.amount)}</td>
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="p-3.5 uppercase font-medium text-foreground text-[11px]">{p.paymentMethod}</td>
                    <td className="p-3.5 font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">
                      {p.referenceNumber || '-'}
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReceiptPayment(p)}
                        className="h-7 text-xs gap-1.5 rounded-lg"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print Receipt</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Resident Payment</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Log an offline or online payment collected from a resident.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Resident Tenant *</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.tenantCode} • Rent: {formatINR(t.monthlyRent)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount Collected (₹) *</Label>
                <Input
                  type="number"
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(val: PaymentMethod) => setPaymentMethod(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI (GPay/PhonePe)</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Transaction / UPI Reference Number</Label>
                <Input
                  placeholder="e.g. UPI/428190281928"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Remarks</Label>
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRecordOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Log Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Printable Receipt Modal */}
      <Dialog open={!!receiptPayment} onOpenChange={(open) => !open && setReceiptPayment(null)}>
        <DialogContent className="max-w-md p-6">
          <div className="text-center space-y-2 pb-4 border-b border-border/60">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-black text-foreground">PG Manager</h3>
            </div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Official Payment Receipt
            </p>
            <p className="text-xs font-mono font-bold text-primary">{receiptPayment?.paymentNumber}</p>
          </div>

          <div className="space-y-3 py-4 text-xs">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Received From:</span>
              <strong className="text-foreground">
                {tenants.find((t) => t.id === receiptPayment?.tenantId)?.name || 'Resident'}
              </strong>
            </div>

            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Amount Paid:</span>
              <strong className="text-base text-emerald-600 font-extrabold">
                {formatINR(receiptPayment?.amount)}
              </strong>
            </div>

            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Payment Date:</span>
              <span>{formatDate(receiptPayment?.date)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="uppercase font-semibold">{receiptPayment?.paymentMethod}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Transaction Reference:</span>
              <span className="font-mono text-[11px]">{receiptPayment?.referenceNumber || 'N/A'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Received By:</span>
              <span>{receiptPayment?.collectedBy || 'Staff'}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-2xs">
              <QrCode className="h-10 w-10 text-slate-900" />
            </div>
            <div className="text-left text-[11px] text-muted-foreground">
              <p className="font-bold text-foreground">Verified Digital Receipt</p>
              <p>Scan to verify transaction on PG Manager Portal</p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs gap-1.5 w-full">
              <Printer className="h-3.5 w-3.5" />
              <span>Print Payment Receipt</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
