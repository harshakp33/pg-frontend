'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertTriangle,
  ArrowLeft,
  User,
  Wrench,
  Clock,
  Send,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { operationsService } from '@/services/operationsService';
import { tenantService } from '@/services/tenantService';
import { propertyService } from '@/services/propertyService';
import { ComplaintStatus } from '@/types/operations';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const complaintId = resolvedParams.id;
  const router = useRouter();

  const [complaint, setComplaint] = useState(() => operationsService.getComplaintById(complaintId));
  const tenant = complaint ? tenantService.getTenantById(complaint.tenantId) : undefined;
  const property = complaint ? propertyService.getPropertyById(complaint.propertyId) : undefined;
  const staffMembers = operationsService.getStaff();

  // New comment
  const [commentText, setCommentText] = useState('');
  const [resolutionRemarks, setResolutionRemarks] = useState(complaint?.resolutionRemarks || '');

  if (!complaint) {
    return (
      <AppShell>
        <div className="py-12 text-center">
          <h2 className="text-xl font-bold">Complaint ticket not found</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">No complaint with this ticket number exists.</p>
          <Link href="/complaints">
            <Button size="sm">Back to Complaints</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const handleStatusChange = async (status: ComplaintStatus) => {
    const updated = await operationsService.updateComplaint(complaint.id, {
      status,
      ...(status === 'resolved' ? { resolvedDate: new Date().toISOString().split('T')[0] } : {}),
      resolutionRemarks,
    });
    if (updated) {
      setComplaint({ ...updated });
      toast.success(`Ticket marked as: ${status.replace('_', ' ').toUpperCase()}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const updated = await operationsService.addComplaintComment(complaint.id, {
      senderName: 'Facility Manager',
      role: 'Staff',
      message: commentText.trim(),
    });

    if (updated) {
      setComplaint({ ...updated });
      setCommentText('');
      toast.success('Comment posted to ticket thread');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={`Ticket ${complaint.ticketNumber}`}
        description={complaint.title}
        badge={<StatusBadge status={complaint.status} />}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Complaints', href: '/complaints' },
          { label: complaint.ticketNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/complaints">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs rounded-xl">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Complaints</span>
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto">
        {/* Main Details and Comments Thread */}
        <div className="md:col-span-8 space-y-6">
          <Card className="p-6 bg-card border-border/80 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category: <strong className="text-foreground capitalize">{complaint.category}</strong>
                </span>
                <StatusBadge status={complaint.priority} />
              </div>
              <span className="text-xs text-muted-foreground">
                Logged on {formatDate(complaint.createdDate)}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground">{complaint.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {complaint.description}
              </p>
            </div>

            {complaint.resolutionRemarks && (
              <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                <p className="font-bold text-emerald-800 dark:text-emerald-300">Resolution Remarks:</p>
                <p className="text-muted-foreground mt-1">{complaint.resolutionRemarks}</p>
                {complaint.resolvedDate && (
                  <p className="text-[10px] text-emerald-600 mt-1">Closed on {formatDate(complaint.resolvedDate)}</p>
                )}
              </div>
            )}
          </Card>

          {/* Discussion & Activity Thread */}
          <Card className="p-6 bg-card border-border/80 rounded-2xl shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-foreground">Updates & Conversation Thread</h4>

            <div className="space-y-3">
              {complaint.comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No comments on this ticket yet.</p>
              ) : (
                complaint.comments.map((cm) => (
                  <div key={cm.id} className="p-3 rounded-xl border border-border/70 bg-muted/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{cm.senderName} ({cm.role})</span>
                      <span className="text-[10px] text-muted-foreground">{cm.createdAt}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{cm.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-border/60 flex gap-2">
              <Input
                placeholder="Post reply or technician update..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="h-9 text-xs flex-1"
              />
              <Button type="submit" size="sm" className="h-9 text-xs gap-1.5 rounded-xl">
                <Send className="h-3.5 w-3.5" />
                <span>Reply</span>
              </Button>
            </form>
          </Card>
        </div>

        {/* Status & Assignment Sidebar */}
        <div className="md:col-span-4 space-y-4">
          <Card className="p-5 bg-card border-border/80 rounded-2xl shadow-xs space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ticket Management
            </h4>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">Workflow Status</Label>
                <Select value={complaint.status} onValueChange={(val: ComplaintStatus) => handleStatusChange(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Assigned Technician</Label>
                <p className="font-bold text-foreground">{complaint.assignedStaffName || 'Unassigned'}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">SLA Target Due Date</Label>
                <p className="font-semibold text-foreground">{formatDate(complaint.dueDate)}</p>
              </div>

              <div className="pt-2 border-t border-border/60 space-y-1.5">
                <Label className="text-xs">Resolution Notes</Label>
                <Input
                  placeholder="e.g. Cleaned filter and tightened switch"
                  value={resolutionRemarks}
                  onChange={(e) => setResolutionRemarks(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('resolved')}
                  className="w-full text-xs h-8 mt-1 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark as Resolved</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Resident Details */}
          <Card className="p-5 bg-card border-border/80 rounded-2xl shadow-xs space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Resident Information
            </h4>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-foreground">{tenant?.name || 'Resident'}</p>
              <p className="text-muted-foreground">{tenant?.phone}</p>
              <p className="text-muted-foreground font-mono">{tenant?.tenantCode}</p>
              <p className="text-primary font-medium pt-1">
                {property?.name} • Bed {tenant?.bedId ? tenant.bedId.split('-').slice(1).join('-') : '101-A'}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
