'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TenantPortalShell } from '@/components/layout/TenantPortalShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  BedDouble,
  AlertCircle,
  UtensilsCrossed,
  Megaphone,
  Calendar,
  ArrowRight,
  PlusCircle,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { tenantService } from '@/services/tenantService';
import { propertyService } from '@/services/propertyService';
import { financeService } from '@/services/financeService';
import { operationsService } from '@/services/operationsService';
import { portalService } from '@/services/portalService';
import { formatINR, formatDate } from '@/lib/format';

export default function TenantDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [liveDashboard, setLiveDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLivePortal = async () => {
      try {
        setIsLoading(true);
        const res = await portalService.getDashboard();
        if (res) {
          setLiveDashboard(res);
        }
      } catch (err) {
        console.warn('Could not load live portal dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLivePortal();
  }, []);

  // Find linked tenant record (defaults to Rahul Sharma tnt-1)
  const tenant = tenantService.getTenantById(user.tenantId || 'tnt-1') || tenantService.getTenants()[0];
  const property = tenant ? propertyService.getPropertyById(tenant.propertyId) : undefined;
  const room = tenant ? propertyService.getRoomById(tenant.roomId) : undefined;
  const bed = tenant ? propertyService.getBedById(tenant.bedId) : undefined;

  const invoices = tenant ? financeService.getInvoicesByTenantId(tenant.id) : [];
  const latestInvoice = invoices[0];
  const complaints = tenant ? operationsService.getComplaints().filter((c) => c.tenantId === tenant.id) : [];
  const notices = operationsService.getNotices().filter((n) => n.isPublished && (n.audience === 'all' || n.audience === 'tenants'));
  const weeklyMenu = operationsService.getFoodMenu();

  // Resolved display values prioritizing live backend data
  const displayName = liveDashboard?.profile?.fullName || tenant?.name || 'Resident';
  const displayProperty = liveDashboard?.property?.name || property?.name || 'BLR Luxury Stays';
  const displayRoom = liveDashboard?.currentAccommodation?.room?.roomNumber || room?.roomNumber || '101';
  const displayBed = liveDashboard?.currentAccommodation?.bed?.bedNumber || bed?.bedNumber || '101-A';
  const outstandingBal = liveDashboard ? Number(liveDashboard.outstandingBalance || 0) : (latestInvoice ? latestInvoice.balanceAmount : (tenant?.monthlyRent || 0));
  const activeComplaintsCount = liveDashboard?.openComplaintsCount ?? complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysOfWeek[new Date().getDay()];
  const defaultMeal = {
    id: 'm-default',
    day: 'Monday' as const,
    breakfast: 'Idli, Sambar, Coconut Chutney, Tea/Coffee',
    lunch: 'Steamed Rice, Dal Tadka, Seasonal Sabzi, Roti, Curd',
    dinner: 'Jeera Rice, Paneer Butter Masala, Roti, Salad',
  };
  const todayMeal = weeklyMenu.find((m) => m.day === todayName) || weeklyMenu[0] || defaultMeal;

  return (
    <TenantPortalShell>
      <PageHeader
        title={`Welcome back, ${displayName}!`}
        description={`${displayProperty} • Room ${displayRoom} • Bed ${displayBed}`}
        badge={<StatusBadge status={liveDashboard?.profile?.status?.toLowerCase() || tenant?.status || 'active'} />}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/portal/complaints">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-xl">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Report Issue</span>
              </Button>
            </Link>
            <Link href="/portal/rent">
              <Button size="sm" className="h-8 gap-1.5 text-xs rounded-xl shadow-xs">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Pay Rent Online</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Top Quick Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Rent Balance Due"
          value={formatINR(outstandingBal)}
          subtitle={latestInvoice ? `Due by ${formatDate(latestInvoice.dueDate)}` : 'Due on 5th'}
          icon={CreditCard}
          iconColor={outstandingBal > 0 ? 'text-amber-600 bg-amber-500/10' : 'text-emerald-600 bg-emerald-500/10'}
          onClick={() => router.push('/portal/rent')}
        />
        <StatCard
          title="My Bed & Room"
          value={`Bed ${displayBed}`}
          subtitle={`Floor ${displayRoom.startsWith('1') ? 1 : 2} • Single Deluxe`}
          icon={BedDouble}
        />
        <StatCard
          title="Active Complaints"
          value={activeComplaintsCount}
          subtitle="Tickets in progress"
          icon={AlertCircle}
          onClick={() => router.push('/portal/complaints')}
        />
        <StatCard
          title="KYC Status"
          value={tenant?.kyc?.status ? tenant.kyc.status.toUpperCase() : 'VERIFIED'}
          subtitle="Police verification done"
          icon={FileCheck}
          iconColor="text-emerald-600 bg-emerald-500/10"
          onClick={() => router.push('/portal/profile')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Rent & Food */}
        <div className="md:col-span-8 space-y-6">
          {/* Rent Due Banner */}
          <Card className="p-6 bg-card border-border/80 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Current Billing Status</h3>
              </div>
              <StatusBadge status={latestInvoice?.status || 'paid'} />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-black text-foreground">
                  {latestInvoice ? formatINR(latestInvoice.balanceAmount) : formatINR(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {latestInvoice?.balanceAmount === 0 ? 'All current dues are paid. Thank you!' : `Invoice ${latestInvoice?.invoiceNumber} due on ${formatDate(latestInvoice?.dueDate)}`}
                </p>
              </div>

              {latestInvoice && latestInvoice.balanceAmount > 0 && (
                <Link href="/portal/rent">
                  <Button size="sm" className="text-xs h-9 gap-1.5 shadow-sm">
                    <span>Pay via UPI / GPay</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </Card>

          {/* Today's Mess Menu Card */}
          <Card className="p-6 bg-card border-border/80 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">Today's Kitchen Menu ({todayMeal.day})</h3>
              </div>
              <Link href="/portal/food" className="text-xs text-primary font-medium hover:underline">
                View Weekly Menu →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="font-bold text-amber-600 dark:text-amber-400 block">Breakfast</span>
                <p className="text-muted-foreground">{todayMeal.breakfast}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="font-bold text-sky-600 dark:text-sky-400 block">Lunch</span>
                <p className="text-muted-foreground">{todayMeal.lunch}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="font-bold text-violet-600 dark:text-violet-400 block">Dinner</span>
                <p className="text-muted-foreground">{todayMeal.dinner}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Notices & Helpdesk */}
        <div className="md:col-span-4 space-y-6">
          {/* PG Notice Board */}
          <Card className="p-5 bg-card border-border/80 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Notice Board</h4>
              </div>
              <Link href="/portal/notices" className="text-xs text-primary hover:underline">
                All Notices
              </Link>
            </div>

            <div className="space-y-3">
              {notices.slice(0, 2).map((n) => (
                <div key={n.id} className="p-3 rounded-xl border border-border/70 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground truncate max-w-[180px]">{n.title}</span>
                    <StatusBadge status={n.priority} dot={false} />
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{n.content}</p>
                  <p className="text-[10px] text-muted-foreground/70 pt-1">{formatDate(n.publishedDate)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Leave Request */}
          <Card className="p-5 bg-card border-border/80 rounded-2xl shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Planning Vacation / Leave?</span>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Submit your absence request beforehand to pause mess charges and notify security.
            </p>
            <Link href="/portal/leave">
              <Button variant="outline" size="sm" className="w-full text-xs h-8 mt-1">
                Apply for Leave →
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </TenantPortalShell>
  );
}
