'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
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
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { operationsService } from '@/services/operationsService';
import { propertyService } from '@/services/propertyService';
import { MaintenanceTask, MaintenanceStatus, Priority } from '@/types/operations';
import { useStorageState } from '@/hooks/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage';
import { initialMaintenanceTasks } from '@/data/operations';
import { formatINR, formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function MaintenancePage() {
  const [tasks, setTasks] = useStorageState<MaintenanceTask[]>(
    STORAGE_KEYS.MAINTENANCE,
    initialMaintenanceTasks
  );

  const properties = propertyService.getProperties();
  const rooms = propertyService.getRooms();
  const staffMembers = operationsService.getStaff().filter((s) => s.role === 'maintenance' || s.role === 'manager');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [roomId, setRoomId] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [estimatedCost, setEstimatedCost] = useState(3500);
  const [dueDate, setDueDate] = useState('2024-10-28');
  const [description, setDescription] = useState('');

  const openTasks = tasks.filter((t) => t.status === 'open');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const totalCost = tasks.reduce((acc, t) => acc + (t.actualCost || t.estimatedCost), 0);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error('Please enter task title');
      return;
    }

    const staff = staffMembers.find((s) => s.id === assignedStaffId);

    const newTask = await operationsService.createMaintenanceTask({
      title,
      propertyId,
      roomId: roomId || undefined,
      assignedStaffId: staff?.id,
      assignedStaffName: staff?.name,
      priority,
      estimatedCost,
      status: 'open',
      dueDate,
      description,
    });

    setIsAddOpen(false);
    toast.success(`Maintenance Task ${newTask.taskNumber} scheduled!`);
    setTitle('');
    setDescription('');
  };

  const handleAdvanceStatus = (taskId: string, nextStatus: MaintenanceStatus) => {
    operationsService.updateMaintenanceTask(taskId, {
      status: nextStatus,
      ...(nextStatus === 'completed'
        ? { completedDate: new Date().toISOString().split('T')[0], actualCost: estimatedCost }
        : {}),
    });
    toast.success(`Task moved to: ${nextStatus.replace('_', ' ').toUpperCase()}`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Facility Maintenance Kanban"
        description="Preventative maintenance schedules, equipment servicing, and room repair work orders."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Maintenance' }]}
        actions={
          <Button onClick={() => setIsAddOpen(true)} className="h-9 gap-1.5 text-xs rounded-xl shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Tasks" value={tasks.length} subtitle="Maintenance backlog" icon={Wrench} />
        <StatCard
          title="Open Tasks"
          value={openTasks.length}
          subtitle="Pending scheduling"
          icon={Clock}
          iconColor="text-rose-600 bg-rose-500/10"
        />
        <StatCard
          title="In Progress"
          value={inProgressTasks.length}
          subtitle="Actively underway"
          icon={AlertCircle}
          iconColor="text-amber-600 bg-amber-500/10"
        />
        <StatCard
          title="Maintenance Cost"
          value={formatINR(totalCost)}
          subtitle="Repairs & AMC total"
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-500/10"
        />
      </div>

      {/* Kanban Board Columns: Open | In Progress | Completed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Open */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/80">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Open / Scheduled ({openTasks.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {openTasks.map((t) => (
              <Card key={t.id} className="p-4 bg-card border-border/80 rounded-2xl shadow-2xs space-y-3 hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-muted-foreground">{t.taskNumber}</span>
                  <StatusBadge status={t.priority} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground leading-snug">{t.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                  <span>Due: {formatDate(t.dueDate)}</span>
                  <span className="font-bold text-foreground">{formatINR(t.estimatedCost)}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdvanceStatus(t.id, 'in_progress')}
                  className="w-full text-xs h-7 rounded-lg gap-1"
                >
                  <span>Start Task</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/80">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                In Progress ({inProgressTasks.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {inProgressTasks.map((t) => (
              <Card key={t.id} className="p-4 bg-card border-amber-500/30 rounded-2xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-muted-foreground">{t.taskNumber}</span>
                  <StatusBadge status={t.priority} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground leading-snug">{t.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                </div>
                <div className="space-y-1 pt-2 border-t border-border/60 text-[11px]">
                  <p className="text-muted-foreground">Assigned: <strong className="text-foreground">{t.assignedStaffName || 'Staff'}</strong></p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Due: {formatDate(t.dueDate)}</span>
                    <span className="font-bold text-foreground">{formatINR(t.estimatedCost)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAdvanceStatus(t.id, 'completed')}
                  className="w-full text-xs h-7 rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Mark Completed</span>
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/80">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Completed ({completedTasks.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {completedTasks.map((t) => (
              <Card key={t.id} className="p-4 bg-card border-border/80 rounded-2xl shadow-2xs space-y-3 opacity-90">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-muted-foreground">{t.taskNumber}</span>
                  <StatusBadge status="completed" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground leading-snug line-through opacity-75">{t.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1">{t.description}</p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                  <span>Done: {formatDate(t.completedDate)}</span>
                  <span className="font-bold text-emerald-600">{formatINR(t.actualCost || t.estimatedCost)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance Task</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a preventative servicing work order.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Task Name / Title *</Label>
              <Input
                required
                placeholder="e.g. Lift AMC Inspection & Greasing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Property Location</Label>
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

              <div className="space-y-1">
                <Label className="text-xs">Est. Cost (₹)</Label>
                <Input
                  type="number"
                  step={500}
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Assign Lead</Label>
                <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select technician" />
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
                <Label className="text-xs">Target Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Task Scope & Description</Label>
                <Input
                  placeholder="e.g. Certified technician inspection"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Schedule Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
