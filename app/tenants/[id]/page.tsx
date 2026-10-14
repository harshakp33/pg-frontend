'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Phone,
  Mail,
  Building2,
  BedDouble,
  CreditCard,
  FileCheck,
  AlertTriangle,
  CalendarDays,
  FileText,
  Clock,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Upload,
} from 'lucide-react';
import { tenantService } from '@/services/tenantService';
import { propertyService } from '@/services/propertyService';
import { financeService } from '@/services/financeService';
import { operationsService } from '@/services/operationsService';
import { formatINR, formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function TenantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.id;
  const router = useRouter();

  const [tenant, setTenant] = useState(() => tenantService.getTenantById(tenantId));
  const property = tenant ? propertyService.getPropertyById(tenant.propertyId) : undefined;
  const room = tenant ? propertyService.getRoomById(tenant.roomId) : undefined;
  const bed = tenant ? propertyService.getBedById(tenant.bedId) : undefined;

  const invoices = financeService.getInvoicesByTenantId(tenantId);
  const payments = financeService.getPaymentsByTenantId(tenantId);
  const deposit = financeService.getDepositByTenantId(tenantId);
  const complaints = operationsService.getComplaints().filter((c) => c.tenantId === tenantId);
  const leaves = operationsService.getLeaveRequests().filter((l) => l.tenantId === tenantId);

  // New Document Upload State
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<'aadhaar' | 'pan' | 'agreement' | 'police_form' | 'other'>('aadhaar');

  if (!tenant) {
    return (
      <AppShell>
        <div className="py-12 text-center">
          <h2 className="text-xl font-bold">Tenant not found</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">No tenant with this ID exists.</p>
          <Link href="/tenants">
            <Button size="sm">Back to Tenants</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const handleVerifyKyc = (status: 'verified' | 'rejected') => {
    const updated = tenantService.updateKyc(tenant.id, {
      status,
      aadhaarStatus: status,
      panStatus: status,
      verifiedAt: new Date().toISOString().split('T')[0],
      verifiedBy: 'Admin Manager',
    });
    if (updated) {
      setTenant({ ...updated });
      tenantService.addActivity(
        tenant.id,
        `KYC Marked ${status.toUpperCase()}`,
        `Document status updated by Manager`,
        'Admin'
      );
      toast.success(`KYC status updated to: ${status.toUpperCase()}`);
    }
  };

  const handleUploadMockDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) {
      toast.error('Please enter a document title');
      return;
    }
    const updated = await tenantService.addDocument(tenant.id, {
      title: docTitle,
      type: docType,
      fileUrl: '/docs/mock-document.pdf',
    });
    if (updated) {
      setTenant({ ...updated });
      setDocTitle('');
      toast.success('Document uploaded to tenant repository');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={tenant.name}
        description={`${tenant.tenantCode} • ${tenant.occupation} at ${tenant.companyOrCollege}`}
        badge={<StatusBadge status={tenant.status} />}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Tenants', href: '/tenants' },
          { label: tenant.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/tenants">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs rounded-xl">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Tenants</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Top Tenant Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Monthly Rent"
          value={formatINR(tenant.monthlyRent)}
          subtitle={tenant.paymentStatus.toUpperCase()}
          icon={CreditCard}
        />
        <StatCard
          title="Security Deposit"
          value={formatINR(tenant.securityDeposit)}
          subtitle={`Paid: ${formatINR(tenant.depositPaid)}`}
          icon={ShieldCheck}
        />
        <StatCard
          title="Room & Bed"
          value={bed ? `Bed ${bed.bedNumber}` : 'Unassigned'}
          subtitle={`Room ${room?.roomNumber || 'N/A'} • ${property?.name || 'PG'}`}
          icon={BedDouble}
        />
        <StatCard
          title="KYC Status"
          value={tenant.kyc.status.toUpperCase()}
          subtitle={`Police verification: ${tenant.kyc.policeVerificationStatus}`}
          icon={FileCheck}
        />
      </div>

      {/* Tabbed Comprehensive 12-Section Profile */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 rounded-xl flex-wrap h-auto">
          <TabsTrigger value="profile" className="text-xs rounded-lg">Personal & Emergency</TabsTrigger>
          <TabsTrigger value="kyc" className="text-xs rounded-lg">KYC & Verification</TabsTrigger>
          <TabsTrigger value="room" className="text-xs rounded-lg">Room & Bed</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs rounded-lg">Rent & Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs rounded-lg">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="complaints" className="text-xs rounded-lg">Complaints ({complaints.length})</TabsTrigger>
          <TabsTrigger value="leave" className="text-xs rounded-lg">Leave ({leaves.length})</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs rounded-lg">Documents ({tenant.documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs rounded-lg">Activity Timeline</TabsTrigger>
        </TabsList>

        {/* TAB 1: Personal & Emergency Contact */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 bg-card border-border/80 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="font-semibold text-foreground mt-0.5">{tenant.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gender</p>
                  <p className="font-semibold text-foreground capitalize mt-0.5">{tenant.gender}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone Number</p>
                  <p className="font-semibold text-foreground mt-0.5">{tenant.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-semibold text-foreground mt-0.5">{tenant.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Occupation</p>
                  <p className="font-semibold text-foreground mt-0.5">{tenant.occupation}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Company / College</p>
                  <p className="font-semibold text-foreground mt-0.5">{tenant.companyOrCollege}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Move-in Date</p>
                  <p className="font-semibold text-foreground mt-0.5">{formatDate(tenant.moveInDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Agreement End</p>
                  <p className="font-semibold text-foreground mt-0.5">{formatDate(tenant.agreementEndDate)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-card border-border/80 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-foreground">Emergency Contact Details</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact Name:</span>
                    <strong className="text-foreground">{tenant.emergencyContact.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Relationship:</span>
                    <strong className="text-foreground">{tenant.emergencyContact.relation}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emergency Phone:</span>
                    <strong className="text-primary">{tenant.emergencyContact.phone}</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-dashed border-border/80 text-[11px] text-muted-foreground">
                  ℹ In case of medical emergencies or late night unattended absence, staff will notify this verified emergency family member.
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: KYC & Verification */}
        <TabsContent value="kyc" className="space-y-6">
          <Card className="p-6 bg-card border-border/80 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div>
                <h3 className="text-base font-bold text-foreground">Digital KYC Verification Desk</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review and certify government ID proofs, PAN, and address documents.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleVerifyKyc('verified')}
                  className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verify Tenant</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerifyKyc('rejected')}
                  className="h-8 gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Aadhaar Card</span>
                  <StatusBadge status={tenant.kyc.aadhaarStatus} />
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  {tenant.kyc.aadhaarNumber || 'Not submitted'}
                </p>
                <p className="text-[10px] text-muted-foreground">ID Proof Verified</p>
              </div>

              <div className="p-4 rounded-xl border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">PAN Card</span>
                  <StatusBadge status={tenant.kyc.panStatus} />
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  {tenant.kyc.panNumber || 'Not submitted'}
                </p>
                <p className="text-[10px] text-muted-foreground">Tax Identification</p>
              </div>

              <div className="p-4 rounded-xl border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Police Verification</span>
                  <StatusBadge status={tenant.kyc.policeVerificationStatus} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {tenant.kyc.verifiedBy || 'Pending police portal filing'}
                </p>
                <p className="text-[10px] text-muted-foreground">Bengaluru City Police Form</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: Room & Bed Details */}
        <TabsContent value="room" className="space-y-4">
          <Card className="p-5 bg-card border-border/80 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-foreground">Assigned Accommodation</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                <span className="text-muted-foreground">Property</span>
                <p className="text-sm font-bold text-foreground mt-0.5">{property?.name}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                <span className="text-muted-foreground">Room Number</span>
                <p className="text-sm font-bold text-foreground mt-0.5">Room {room?.roomNumber}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                <span className="text-muted-foreground">Bed Number</span>
                <p className="text-sm font-bold text-primary mt-0.5">Bed {bed?.bedNumber}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                <span className="text-muted-foreground">Room Configuration</span>
                <p className="text-sm font-bold text-foreground mt-0.5 capitalize">{room?.roomType.replace('_', ' ')}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: Invoices */}
        <TabsContent value="finance" className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="p-3 font-semibold">Invoice #</th>
                  <th className="p-3 font-semibold">Billing Month</th>
                  <th className="p-3 font-semibold">Due Date</th>
                  <th className="p-3 font-semibold">Total Amount</th>
                  <th className="p-3 font-semibold">Paid Amount</th>
                  <th className="p-3 font-semibold">Balance</th>
                  <th className="p-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/20">
                    <td className="p-3 font-mono font-bold text-foreground">{inv.invoiceNumber}</td>
                    <td className="p-3 font-medium text-foreground">{inv.month}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    <td className="p-3 font-bold text-foreground">{formatINR(inv.totalAmount)}</td>
                    <td className="p-3 text-emerald-600 font-semibold">{formatINR(inv.paidAmount)}</td>
                    <td className="p-3 text-rose-600 font-semibold">{formatINR(inv.balanceAmount)}</td>
                    <td className="p-3 text-right"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB 5: Payments */}
        <TabsContent value="payments" className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="p-3 font-semibold">Receipt Number</th>
                  <th className="p-3 font-semibold">Amount</th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Method</th>
                  <th className="p-3 font-semibold">Reference</th>
                  <th className="p-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="p-3 font-mono font-bold text-foreground">{p.paymentNumber}</td>
                    <td className="p-3 font-bold text-foreground">{formatINR(p.amount)}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(p.date)}</td>
                    <td className="p-3 uppercase text-[11px] text-muted-foreground">{p.paymentMethod}</td>
                    <td className="p-3 font-mono text-[10px] text-muted-foreground">{p.referenceNumber || '-'}</td>
                    <td className="p-3 text-right"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB 6: Complaints */}
        <TabsContent value="complaints" className="space-y-4">
          {complaints.length === 0 ? (
            <EmptyState title="No complaints logged" description="This tenant has not reported any issues." />
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl border border-border/80 bg-card flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{c.title}</span>
                      <StatusBadge status={c.priority} />
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                    <p className="text-[10px] text-muted-foreground">Created {formatDate(c.createdDate)} • Assigned to {c.assignedStaffName || 'Staff'}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 7: Leave Requests */}
        <TabsContent value="leave" className="space-y-4">
          {leaves.length === 0 ? (
            <EmptyState title="No leave applications" description="No vacation or holiday leaves recorded." />
          ) : (
            <div className="space-y-3">
              {leaves.map((l) => (
                <div key={l.id} className="p-4 rounded-2xl border border-border/80 bg-card flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">{l.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Duration: {formatDate(l.startDate)} to {formatDate(l.endDate)}
                    </p>
                    {l.reviewRemarks && <p className="text-[10px] text-emerald-600 font-medium">Remarks: {l.reviewRemarks}</p>}
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 8: Documents */}
        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 bg-card border-border/80 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-foreground">Upload Tenant Document</h3>
              <form onSubmit={handleUploadMockDoc} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Document Title *</Label>
                  <Input
                    required
                    placeholder="e.g. Company ID / Aadhaar Scan"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Document Category</Label>
                  <Select value={docType} onValueChange={(val: any) => setDocType(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                      <SelectItem value="pan">PAN Card</SelectItem>
                      <SelectItem value="agreement">Rental Agreement</SelectItem>
                      <SelectItem value="police_form">Police Verification Form</SelectItem>
                      <SelectItem value="other">Other Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" size="sm" className="h-9 gap-1.5 text-xs w-full">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Attach Document</span>
                </Button>
              </form>
            </Card>

            <Card className="p-5 bg-card border-border/80 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-foreground">Archived Documents</h3>
              <div className="space-y-2">
                {tenant.documents && tenant.documents.length > 0 ? (
                  tenant.documents.map((doc) => (
                    <div key={doc.id} className="p-2.5 rounded-xl border border-border/70 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{doc.title}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{doc.type} • {formatDate(doc.uploadedAt)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        Encrypted
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">No documents uploaded yet.</p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 9: Activity History */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="p-5 bg-card border-border/80 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-foreground">Tenant Lifecycle Audit Trail</h3>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {tenant.activities && tenant.activities.map((act) => (
                <div key={act.id} className="relative space-y-0.5">
                  <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <p className="text-xs font-bold text-foreground">{act.action}</p>
                  <p className="text-xs text-muted-foreground">{act.details}</p>
                  <p className="text-[10px] text-muted-foreground/70">{act.timestamp} • By {act.actor}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
