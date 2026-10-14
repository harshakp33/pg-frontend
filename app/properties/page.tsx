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
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  User,
  BedDouble,
  DoorOpen,
  ArrowRight,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { propertyService } from '@/services/propertyService';
import { Property, PropertyType, PropertyStatus } from '@/types/property';
import { useStorageState } from '@/hooks/useStorageState';
import { STORAGE_KEYS } from '@/lib/storage';
import { initialProperties } from '@/data/properties';
import { formatINR } from '@/lib/format';
import { toast } from 'sonner';

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useStorageState<Property[]>(
    STORAGE_KEYS.PROPERTIES,
    initialProperties
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('coliving');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [area, setArea] = useState('Koramangala');
  const [pincode, setPincode] = useState('560034');
  const [contactNumber, setContactNumber] = useState('+91 98450 12345');
  const [email, setEmail] = useState('');
  const [managerName, setManagerName] = useState('');
  const [status, setStatus] = useState<PropertyStatus>('active');
  const [totalFloors, setTotalFloors] = useState(3);

  // Related data for calculations
  const allRooms = propertyService.getRooms();
  const allBeds = propertyService.getBeds();

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !area || !managerName) {
      toast.error('Please fill in all required property details.');
      return;
    }

    const newProp = await propertyService.createProperty({
      name,
      type,
      address,
      city,
      area,
      pincode,
      contactNumber,
      email: email || `${area.toLowerCase()}@pgmanager.in`,
      managerName,
      status,
      totalFloors,
      amenities: ['High Speed WiFi', 'Daily Cleaning', '3 Meals Mess', 'RO Water', 'CCTV Security'],
      image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
    });

    setIsAddOpen(false);
    toast.success(`Property "${newProp.name}" added successfully!`);

    // Reset form fields
    setName('');
    setAddress('');
    setEmail('');
    setManagerName('');
  };

  const handleDeleteProperty = () => {
    if (deleteTargetId) {
      propertyService.deleteProperty(deleteTargetId);
      toast.success('Property removed.');
      setDeleteTargetId(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Properties"
        description="Manage all your PG buildings, coliving hostels, and branch locations across cities."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Properties' }]}
        actions={
          <Button onClick={() => setIsAddOpen(true)} className="h-9 gap-1.5 text-xs rounded-xl shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Add Property</span>
          </Button>
        }
      />

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, area or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 text-xs w-44">
              <SelectValue placeholder="All Property Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="coliving">Coliving</SelectItem>
              <SelectItem value="mens_pg">Men's PG</SelectItem>
              <SelectItem value="womens_pg">Women's PG</SelectItem>
              <SelectItem value="luxury_pg">Luxury PG</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Property Cards Grid */}
      {filteredProperties.length === 0 ? (
        <EmptyState
          title="No properties found"
          description="Try adjusting your search criteria or add your first property location."
          actionLabel="Add Property"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProperties.map((prop) => {
            const propRooms = allRooms.filter((r) => r.propertyId === prop.id);
            const propBeds = allBeds.filter((b) => b.propertyId === prop.id);
            const occupied = propBeds.filter((b) => b.status === 'occupied').length;
            const available = propBeds.filter((b) => b.status === 'available').length;
            const occupancyPct = propBeds.length > 0 ? Math.round((occupied / propBeds.length) * 100) : 0;
            const monthlyRevenue = propBeds
              .filter((b) => b.status === 'occupied')
              .reduce((acc, b) => acc + b.monthlyRent, 0);

            return (
              <Card
                key={prop.id}
                className="overflow-hidden bg-card border-border/80 rounded-2xl shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Property Header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-foreground">
                            {prop.name}
                          </h3>
                          <StatusBadge status={prop.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                          <span>{prop.address}, {prop.area}, {prop.city} - {prop.pincode}</span>
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTargetId(prop.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Delete Property"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Meta details */}
                    <div className="grid grid-cols-2 gap-2 my-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Manager: <strong className="text-foreground">{prop.managerName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{prop.contactNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Occupancy & Bed Statistics Grid */}
                  <div className="grid grid-cols-4 divide-x divide-border/60 border-y border-border/60 bg-muted/30 p-3 text-center text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rooms</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{propRooms.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Beds</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{propBeds.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Available</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{available}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Occupancy</p>
                      <p className="text-sm font-bold text-primary mt-0.5">{occupancyPct}%</p>
                    </div>
                  </div>
                </div>

                {/* Footer bar */}
                <div className="p-4 bg-card flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Est. Monthly Revenue</p>
                    <p className="text-sm font-extrabold text-foreground">{formatINR(monthlyRevenue)}</p>
                  </div>
                  <Link href={`/properties/${prop.id}`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-xl">
                      <span>View Details</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Property Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New PG Property</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure a new building or branch in your PG management portfolio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProperty} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Property Name *</Label>
                <Input
                  required
                  placeholder="e.g. Starlight Luxury Coliving - Koramangala"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Property Type</Label>
                <Select value={type} onValueChange={(val: PropertyType) => setType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coliving">Coliving</SelectItem>
                    <SelectItem value="mens_pg">Men's PG</SelectItem>
                    <SelectItem value="womens_pg">Women's PG</SelectItem>
                    <SelectItem value="luxury_pg">Luxury PG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Number of Floors</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Address</Label>
                <Input
                  placeholder="e.g. 142, 5th Main, 4th Block"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Area / Locality *</Label>
                <Input
                  required
                  placeholder="e.g. Koramangala"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Pincode</Label>
                <Input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Contact Phone</Label>
                <Input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Manager Name *</Label>
                <Input
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(val: PropertyStatus) => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Save Property
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Property?"
        description="Are you sure you want to delete this property? This action will unlink associated rooms and beds."
        confirmLabel="Delete Property"
        variant="destructive"
        onConfirm={handleDeleteProperty}
      />
    </AppShell>
  );
}
