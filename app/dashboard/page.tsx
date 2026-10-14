'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  BedDouble,
  CheckCircle,
  Clock,
  Percent,
  Wallet,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  CalendarCheck,
  CreditCard,
  Receipt,
  UserCheck,
  TrendingUp,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { propertyService } from '@/services/propertyService';
import { tenantService } from '@/services/tenantService';
import { financeService } from '@/services/financeService';
import { operationsService } from '@/services/operationsService';
import { bookingService } from '@/services/bookingService';
import { formatINR, formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const [dataVersion, setDataVersion] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const syncBackend = async () => {
      try {
        setIsSyncing(true);
        await Promise.allSettled([
          propertyService.fetchProperties(),
          tenantService.fetchTenants(),
          financeService.fetchInvoices(),
          financeService.fetchPayments(),
          financeService.fetchExpenses(),
          operationsService.fetchComplaints(),
          bookingService.fetchBookings(),
          bookingService.fetchMoveIns(),
        ]);
        if (mounted) {
          setDataVersion((v) => v + 1);
        }
      } catch (err) {
        console.warn('Dashboard sync from backend failed:', err);
      } finally {
        if (mounted) setIsSyncing(false);
      }
    };
    syncBackend();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch live calculated metrics from store
  const properties = propertyService.getProperties();
  const rooms = propertyService.getRooms();
  const beds = propertyService.getBeds();
  const tenants = tenantService.getTenants();
  const invoices = financeService.getInvoices();
  const payments = financeService.getPayments();
  const expenses = financeService.getExpenses();
  const complaints = operationsService.getComplaints();
  const bookings = bookingService.getBookings();
  const moveIns = bookingService.getMoveIns();
  const moveOuts = bookingService.getMoveOuts();

  // Computations
  const totalProperties = properties.length;
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === 'occupied').length;
  const availableBeds = beds.filter((b) => b.status === 'available').length;
  const reservedBeds = beds.filter((b) => b.status === 'reserved').length;
  const maintenanceBeds = beds.filter((b) => b.status === 'maintenance').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Monthly Revenue calculated from payments in October / paid invoices
  const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
  const pendingPayments = invoices
    .filter((i) => i.status === 'overdue' || i.status === 'partially_paid' || i.status === 'sent')
    .reduce((acc, i) => acc + i.balanceAmount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netRevenue = totalRevenue - totalExpenses;
  const openComplaints = complaints.filter(
    (c) => c.status === 'open' || c.status === 'assigned' || c.status === 'in_progress'
  ).length;

  // Recharts Chart Data
  const monthlyRevenueData = [
    { month: 'May', revenue: 145000, expenses: 62000 },
    { month: 'Jun', revenue: 160000, expenses: 71000 },
    { month: 'Jul', revenue: 178000, expenses: 80000 },
    { month: 'Aug', revenue: 192000, expenses: 84000 },
    { month: 'Sep', revenue: 205000, expenses: 89000 },
    { month: 'Oct', revenue: 218000, expenses: 92000 },
  ];

  const occupancyTrendData = [
    { month: 'May', rate: 76 },
    { month: 'Jun', rate: 81 },
    { month: 'Jul', rate: 85 },
    { month: 'Aug', rate: 88 },
    { month: 'Sep', rate: 91 },
    { month: 'Oct', rate: occupancyRate },
  ];

  const paymentStatusData = [
    { name: 'Paid', value: invoices.filter((i) => i.status === 'paid').length, color: '#10b981' },
    { name: 'Partially Paid', value: invoices.filter((i) => i.status === 'partially_paid').length, color: '#f59e0b' },
    { name: 'Overdue', value: invoices.filter((i) => i.status === 'overdue').length, color: '#ef4444' },
    { name: 'Draft/Sent', value: invoices.filter((i) => i.status === 'sent' || i.status === 'draft').length, color: '#3b82f6' },
  ].filter((item) => item.value > 0);

  const handleGenerateInvoices = () => {
    const count = financeService.generateMonthlyRentInvoices('November 2024', '2024-11-05');
    toast.success(`Generated ${count} rent invoices for next billing cycle!`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Executive Dashboard"
        description="Consolidated overview of occupancy, financial health, tenant requests, and maintenance operations."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateInvoices}
              className="h-9 gap-1.5 text-xs rounded-xl"
            >
              <Receipt className="h-4 w-4 text-primary" />
              <span>Generate Invoices</span>
            </Button>
            <Link href="/tenants">
              <Button size="sm" className="h-9 gap-1.5 text-xs rounded-xl shadow-xs">
                <PlusCircle className="h-4 w-4" />
                <span>Add Tenant</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Properties"
          value={totalProperties}
          subtitle={`${properties.reduce((acc, p) => acc + p.totalFloors, 0)} floors across Bengaluru`}
          icon={Building2}
          iconColor="text-primary bg-primary/10"
          onClick={() => router.push('/properties')}
        />
        <StatCard
          title="Total Beds"
          value={totalBeds}
          subtitle={`${occupiedBeds} occupied • ${availableBeds} vacant`}
          icon={BedDouble}
          iconColor="text-emerald-600 bg-emerald-500/10"
          onClick={() => router.push('/beds')}
        />
        <StatCard
          title="Occupancy Rate"
          value={`${occupancyRate}%`}
          subtitle={`${reservedBeds} reserved • ${maintenanceBeds} maintenance`}
          trend={{ value: '+4.2% vs last month', isPositive: true }}
          icon={Percent}
          iconColor="text-sky-600 bg-sky-500/10"
          onClick={() => router.push('/beds')}
        />
        <StatCard
          title="Monthly Collections"
          value={formatINR(totalRevenue)}
          subtitle={`Net profit: ${formatINR(netRevenue)}`}
          trend={{ value: '+12.5%', isPositive: true }}
          icon={Wallet}
          iconColor="text-emerald-600 bg-emerald-500/10"
          onClick={() => router.push('/payments')}
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Pending Payments"
          value={formatINR(pendingPayments)}
          subtitle={`${invoices.filter((i) => i.status === 'overdue').length} overdue accounts`}
          trend={{ value: '2 Overdue', isPositive: false }}
          icon={CreditCard}
          iconColor="text-rose-600 bg-rose-500/10"
          onClick={() => router.push('/billing')}
        />
        <StatCard
          title="Open Complaints"
          value={openComplaints}
          subtitle="Tickets pending resolution"
          icon={AlertTriangle}
          iconColor="text-amber-600 bg-amber-500/10"
          onClick={() => router.push('/complaints')}
        />
        <StatCard
          title="Active Bookings"
          value={bookings.length}
          subtitle={`${bookings.filter((b) => b.status === 'confirmed').length} confirmed move-ins`}
          icon={CalendarCheck}
          iconColor="text-violet-600 bg-violet-500/10"
          onClick={() => router.push('/bookings')}
        />
        <StatCard
          title="Total Expenses"
          value={formatINR(totalExpenses)}
          subtitle="Electricity, ration, salaries"
          icon={Activity}
          iconColor="text-slate-600 bg-slate-500/10"
          onClick={() => router.push('/expenses')}
        />
      </div>

      {/* Quick Action Buttons Bar */}
      <Card className="p-4 mb-8 bg-card border-border/80 rounded-2xl shadow-2xs">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          <Link href="/tenants">
            <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start gap-2 rounded-xl">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              <span>Add Tenant</span>
            </Button>
          </Link>
          <Link href="/bookings">
            <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start gap-2 rounded-xl">
              <CalendarCheck className="h-3.5 w-3.5 text-sky-500" />
              <span>New Booking</span>
            </Button>
          </Link>
          <Link href="/payments">
            <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start gap-2 rounded-xl">
              <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
              <span>Collect Payment</span>
            </Button>
          </Link>
          <Link href="/complaints">
            <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start gap-2 rounded-xl">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>Log Complaint</span>
            </Button>
          </Link>
          <Link href="/properties">
            <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start gap-2 rounded-xl">
              <Building2 className="h-3.5 w-3.5 text-violet-500" />
              <span>Add Property</span>
            </Button>
          </Link>
          <Link href="/billing">
            <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start gap-2 rounded-xl">
              <Receipt className="h-3.5 w-3.5 text-rose-500" />
              <span>Generate Invoice</span>
            </Button>
          </Link>
        </div>
      </Card>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Monthly Revenue vs Expenses Bar Chart */}
        <Card className="p-5 lg:col-span-8 bg-card border-border/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Revenue & Expenses Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Monthly collections vs operating overheads (INR)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Expenses
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: any) => formatINR(Number(val))}
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Payment Status Distribution Pie */}
        <Card className="p-5 lg:col-span-4 bg-card border-border/80 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Invoice Status Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Current billing cycle breakdown</p>
          </div>
          <div className="h-48 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
            {paymentStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Occupancy Trend & Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Occupancy Rate Trend Line Chart */}
        <Card className="p-5 lg:col-span-5 bg-card border-border/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Occupancy Rate Growth</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Past 6 months average occupancy (%)</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {occupancyRate}% Current
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={occupancyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={11}
                  domain={[60, 100]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  formatter={(val: any) => `${val}% Occupancy`}
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--primary)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Payments Table */}
        <Card className="p-5 lg:col-span-7 bg-card border-border/80 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Payments</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Latest receipts and collections</p>
            </div>
            <Link href="/payments" className="text-xs text-primary hover:underline font-medium">
              View All Payments →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground">
                  <th className="pb-2 font-medium">Receipt #</th>
                  <th className="pb-2 font-medium">Resident</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.slice(0, 4).map((p) => {
                  const tenant = tenants.find((t) => t.id === p.tenantId);
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-2.5 font-mono text-[11px] font-medium text-foreground">
                        {p.paymentNumber}
                      </td>
                      <td className="py-2.5 font-medium text-foreground truncate max-w-[120px]">
                        {tenant ? tenant.name : 'Resident'}
                      </td>
                      <td className="py-2.5 font-bold text-foreground">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-2.5 uppercase text-[10px] text-muted-foreground">
                        {p.paymentMethod}
                      </td>
                      <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-2.5 text-right">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Bottom Grid: Recent Complaints & Upcoming Move-ins/Move-outs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Complaints */}
        <Card className="p-5 bg-card border-border/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Active Complaints & Maintenance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Tickets requiring staff attention</p>
            </div>
            <Link href="/complaints" className="text-xs text-primary hover:underline font-medium">
              View All Complaints →
            </Link>
          </div>
          <div className="space-y-3">
            {complaints.slice(0, 3).map((c) => (
              <div
                key={c.id}
                onClick={() => router.push('/complaints')}
                className="p-3 rounded-xl border border-border/70 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground truncate max-w-[240px]">
                    {c.title}
                  </span>
                  <StatusBadge status={c.priority} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="capitalize">{c.category} • Due: {formatDate(c.dueDate)}</span>
                  <StatusBadge status={c.status} dot={false} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Move-ins and Move-outs */}
        <Card className="p-5 bg-card border-border/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Upcoming Move-ins & Move-outs</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Scheduled resident transitions</p>
            </div>
            <Link href="/bookings" className="text-xs text-primary hover:underline font-medium">
              View Bookings →
            </Link>
          </div>
          <div className="space-y-3">
            {/* Bookings / Move ins */}
            {bookings.slice(0, 2).map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    Move-in: {b.applicantName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Bed: {b.bedId} • Move-in date: {formatDate(b.moveInDate)}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}

            {/* Move outs */}
            {moveOuts.slice(0, 1).map((mo) => {
              const tenant = tenants.find((t) => t.id === mo.tenantId);
              return (
                <div
                  key={mo.id}
                  className="p-3 rounded-xl border border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">
                      Move-out: {tenant ? tenant.name : 'Resident'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Settlement: {formatINR(mo.finalRefundAmount)} • Date: {formatDate(mo.moveOutDate)}
                    </p>
                  </div>
                  <StatusBadge status={mo.settlementStatus} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
