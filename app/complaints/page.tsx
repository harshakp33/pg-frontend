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
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Wrench,
  Wifi,
  Sparkles,
  Zap,
} from 'lucide-react';
import { operationsService } from '@/services/operationsService';
import { tenantService } from '@/services/tenantService';
import { propertyService } from '@/services/propertyService';
import { Complaint, ComplaintCategory, ComplaintStatus, Priority } from '@/types/operations';
import { useStorageState } from '@/hooks/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage';
import { initialComplaints } from '@/data/operations';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function ComplaintsPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useStorageState<Complaint[]>(
    STORAGE_KEYS.COMPLAINTS,
    initialComplaints
  );

  const tenants = tenantService.getTenants();
  const properties = propertyService.getProperties();
  const staffMembers = operationsService.getStaff();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add Complaint Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [tenantId, setTenantId] = useState(tenants[0]?.id || '');
  const [category, setCategory] = useState<ComplaintCategory>('internet');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [dueDate, setDueDate] = useState('2024-10-25');

  // Counts
  const totalTickets = complaints.length;
  const openCount = complaints.filter((c) => c.status === 'open').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress' || c.status === 'assigned').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;

  const filtered = complaints.filter((c) => {
    const tenant = tenants.find((t) => t.id === c.tenantId);
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant && tenant.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesCat && matchesPriority && matchesStatus;
  });

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !tenantId) {
      toast.error('Please enter title, description, and select tenant.');
      return;
    }

    const tenant = tenants.find((t) => t.id === tenantId);
    const staff = staffMembers.find((s) => s.id === assignedStaffId);

    const newTicket = await operationsService.createComplaint({
      tenantId,
      propertyId: tenant?.propertyId || 'prop-1',
      roomId: tenant?.roomId,
      category,
      title,
      description,
      priority,
      assignedStaffId: staff?.id,
      assignedStaffName: staff ? `${staff.name} (${staff.role})` : undefined,
      status: assignedStaffId ? 'assigned' : 'open',
      dueDate,
    });

    setIsAddOpen(false);
    toast.success(`Complaint ${newTicket.ticketNumber} logged!`);
    setTitle('');
    setDescription('');
  };

  const handleUpdateStatus = (id: string, status: ComplaintStatus) => {
    operationsService.updateComplaint(id, {
      status,
      ...(status === 'resolved' ? { resolvedDate: new Date().toISOString().split('T')[0] } : {}),
    });
    toast.success(`Ticket status updated to: ${status.replace('_', ' ').toUpperCase()}`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Complaints & Helpdesk"
        description="Track maintenance requests, assign staff specialists, and monitor resolution turnaround SLAs."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Complaints' }]}
        actions={
          <Button onClick={() => setIsAddOpen(true)} className="h-9 gap-1.5 text-xs rounded-xl shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Log New Complaint</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Tickets" value={totalTickets} subtitle="All recorded requests" icon={AlertTriangle} />
        <StatCard
          title="Open / Unassigned"
          value={openCount}
          subtitle="Awaiting triage"
          icon={Clock}
          iconColor="text-rose-600 bg-rose-500/10"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Staff currently working"
          icon={Wrench}
          iconColor="text-amber-600 bg-amber-500/10"
        />
        <StatCard
          title="Resolved"
          value={resolvedCount}
          subtitle="Closed within SLA"
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-500/10"
        />
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ticket # or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 text-xs w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="plumbing">Plumbing</SelectItem>
              <SelectItem value="cleaning">Cleaning</SelectItem>
              <SelectItem value="internet">Internet / WiFi</SelectItem>
              <SelectItem value="furniture">Furniture</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No complaints found"
          description="Adjust your search criteria or log a new resident maintenance ticket."
          actionLabel="Log Complaint"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card overflow-x-auto shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                <th className="p-3.5 font-semibold">Ticket #</th>
                <th className="p-3.5 font-semibold">Resident</th>
                <th className="p-3.5 font-semibold">Category</th>
                <th className="p-3.5 font-semibold">Issue Summary</th>
                <th className="p-3.5 font-semibold">Priority</th>
                <th className="p-3.5 font-semibold">Assigned Staff</th>
                <th className="p-3.5 font-semibold">Created</th>
                <th className="p-3.5 font-semibold">Due Date</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((c) => {
                const tenant = tenants.find((t) => t.id === c.tenantId);

                return (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-foreground">
                      <Link href={`/complaints/${c.id}`} className="hover:underline text-primary">
                        {c.ticketNumber}
                      </Link>
                    </td>
                    <td className="p-3.5 font-semibold text-foreground">
                      {tenant ? tenant.name : 'Resident'}
                    </td>
                    <td className="p-3.5 capitalize font-medium text-foreground">
                      {c.category}
                    </td>
                    <td className="p-3.5 max-w-xs truncate">
                      <p className="font-bold text-foreground truncate">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.description}</p>
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={c.priority} />
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {c.assignedStaffName || 'Unassigned'}
                    </td>
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                      {formatDate(c.createdDate)}
                    </td>
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                      {formatDate(c.dueDate)}
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Select
                          value={c.status}
                          onValueChange={(val: ComplaintStatus) => handleUpdateStatus(c.id, val)}
                        >
                          <SelectTrigger className="h-7 text-[11px] w-28">
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
                        <Link href={`/complaints/${c.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Complaint Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Maintenance Complaint</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit a resident request and assign to facility staff.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateComplaint} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Resident Tenant *</Label>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={(val: ComplaintCategory) => setCategory(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="internet">Internet / WiFi</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={(val: Priority) => setPriority(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Issue Title *</Label>
                <Input
                  required
                  placeholder="e.g. WiFi latency issue on 2nd floor"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Detailed Description *</Label>
                <Input
                  required
                  placeholder="e.g. Ping spikes occurring during evening peak hours"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Assign Staff Member</Label>
                <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">SLA Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Log Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
