import { Invoice, Payment, SecurityDeposit, Expense } from '@/types/finance';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { initialInvoices, initialPayments, initialDeposits, initialExpenses } from '@/data/finance';
import { tenantService } from './tenantService';
import { apiClient } from '@/lib/apiClient';

function mapBackendInvoice(bi: any): Invoice {
  return {
    id: bi.id,
    invoiceNumber: bi.invoiceNumber,
    tenantId: bi.residentId,
    propertyId: bi.propertyId,
    month: bi.billingPeriodStart ? new Date(bi.billingPeriodStart).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'Current Month',
    issueDate: bi.issuedAt ? bi.issuedAt.split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: bi.dueDate ? bi.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
    items: Array.isArray(bi.invoice_items) && bi.invoice_items.length > 0
      ? bi.invoice_items.map((it: any) => ({
          id: it.id,
          description: it.description,
          amount: Number(it.amount),
          category: (it.chargeType ? it.chargeType.toLowerCase() : 'rent') as any,
        }))
      : [
          {
            id: `item-${bi.id}`,
            description: bi.notes || 'Room Rent',
            amount: Number(bi.baseRent || bi.netPayable),
            category: 'rent',
          },
        ],
    subtotal: Number(bi.baseRent || bi.netPayable),
    discount: Number(bi.discounts || 0),
    lateFee: Number(bi.lateFees || 0),
    previousBalance: 0,
    totalAmount: Number(bi.netPayable),
    paidAmount: Number(bi.paidAmount),
    balanceAmount: Number(bi.outstandingAmount),
    status: (bi.status ? bi.status.toLowerCase() : 'sent') as any,
  };
}

function mapBackendPayment(bp: any): Payment {
  return {
    id: bp.id,
    paymentNumber: bp.receiptNumber,
    invoiceId: bp.payment_allocations?.[0]?.invoiceId || undefined,
    tenantId: bp.residentId,
    propertyId: bp.propertyId,
    amount: Number(bp.amount),
    paymentMethod: (bp.paymentMethod ? bp.paymentMethod.toLowerCase() : 'upi') as any,
    referenceNumber: bp.referenceNumber || undefined,
    date: bp.paymentDate ? bp.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0],
    status: (bp.status ? bp.status.toLowerCase() : 'completed') as any,
    collectedBy: 'Staff',
    remarks: bp.notes || undefined,
  };
}

export const financeService = {
  // Invoices
  getInvoices: (propertyId?: string): Invoice[] => {
    const list = getItem<Invoice[]>(STORAGE_KEYS.INVOICES, initialInvoices);
    if (propertyId) return list.filter((i) => i.propertyId === propertyId);
    return list;
  },

  getInvoiceById: (id: string): Invoice | undefined => {
    const list = financeService.getInvoices();
    return list.find((i) => i.id === id);
  },

  getInvoicesByTenantId: (tenantId: string): Invoice[] => {
    const list = financeService.getInvoices();
    return list.filter((i) => i.tenantId === tenantId);
  },

  /**
   * Fetch live invoices from backend API
   */
  fetchInvoices: async (propertyId?: string): Promise<Invoice[]> => {
    try {
      const q = propertyId ? `?propertyId=${propertyId}&limit=100` : '?limit=100';
      const response = await apiClient.get(`/invoices${q}`);
      const items = Array.isArray(response) ? response : response?.items || [];
      const mapped = items.map(mapBackendInvoice);
      if (mapped.length > 0) {
        setItem(STORAGE_KEYS.INVOICES, mapped);
        return mapped;
      }
      return financeService.getInvoices(propertyId);
    } catch (err) {
      console.warn('Using local invoices cache:', err);
      return financeService.getInvoices(propertyId);
    }
  },

  createInvoice: async (data: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<Invoice> => {
    const now = new Date();
    const billingStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const billingEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const dueDate = data.dueDate || new Date(now.getFullYear(), now.getMonth(), 5).toISOString().split('T')[0];

    const payload = {
      propertyId: data.propertyId,
      residentId: data.tenantId,
      billingPeriodStart: billingStart,
      billingPeriodEnd: billingEnd,
      dueDate,
      baseRent: Number(data.subtotal || data.totalAmount),
      additionalCharges: 0,
      notes: data.items?.[0]?.description || 'Monthly Rent Invoice',
    };

    try {
      const created = await apiClient.post('/invoices', payload);
      const mapped = mapBackendInvoice(created);
      const current = financeService.getInvoices();
      const updated = [mapped, ...current.filter((i) => i.id !== mapped.id)];
      setItem(STORAGE_KEYS.INVOICES, updated);
      return mapped;
    } catch {
      // Local fallback
      const list = financeService.getInvoices();
      const count = list.length + 1;
      const newInvoice: Invoice = {
        ...data,
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-2024-${1000 + count}`,
      };
      setItem(STORAGE_KEYS.INVOICES, [newInvoice, ...list]);
      return newInvoice;
    }
  },

  updateInvoice: async (id: string, updates: Partial<Invoice>): Promise<Invoice | null> => {
    const list = financeService.getInvoices();
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    setItem(STORAGE_KEYS.INVOICES, [...list]);
    return list[idx];
  },

  deleteInvoice: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/invoices/${id}`);
    } catch {}
    const list = financeService.getInvoices();
    const filtered = list.filter((i) => i.id !== id);
    if (filtered.length === list.length) return false;
    setItem(STORAGE_KEYS.INVOICES, filtered);
    return true;
  },

  generateMonthlyRentInvoices: (month: string, dueDate: string): number => {
    const tenants = tenantService.getTenants().filter((t) => t.status === 'active');
    let count = 0;
    tenants.forEach((t) => {
      financeService.createInvoice({
        tenantId: t.id,
        propertyId: t.propertyId,
        month,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate,
        items: [
          {
            id: `item-${Date.now()}-${t.id}`,
            description: `Room Rent for ${month}`,
            amount: t.monthlyRent,
            category: 'rent',
          },
        ],
        subtotal: t.monthlyRent,
        discount: 0,
        lateFee: 0,
        previousBalance: 0,
        totalAmount: t.monthlyRent,
        paidAmount: 0,
        balanceAmount: t.monthlyRent,
        status: 'sent',
      });
      count++;
    });
    return count;
  },

  // Payments
  getPayments: (propertyId?: string): Payment[] => {
    const list = getItem<Payment[]>(STORAGE_KEYS.PAYMENTS, initialPayments);
    if (propertyId) return list.filter((p) => p.propertyId === propertyId);
    return list;
  },

  getPaymentById: (id: string): Payment | undefined => {
    const list = financeService.getPayments();
    return list.find((p) => p.id === id);
  },

  getPaymentsByTenantId: (tenantId: string): Payment[] => {
    const list = financeService.getPayments();
    return list.filter((p) => p.tenantId === tenantId);
  },

  /**
   * Fetch live payments from backend API
   */
  fetchPayments: async (propertyId?: string): Promise<Payment[]> => {
    try {
      const q = propertyId ? `?propertyId=${propertyId}&limit=100` : '?limit=100';
      const response = await apiClient.get(`/payments${q}`);
      const items = Array.isArray(response) ? response : response?.items || [];
      const mapped = items.map(mapBackendPayment);
      if (mapped.length > 0) {
        setItem(STORAGE_KEYS.PAYMENTS, mapped);
        return mapped;
      }
      return financeService.getPayments(propertyId);
    } catch (err) {
      console.warn('Using local payments cache:', err);
      return financeService.getPayments(propertyId);
    }
  },

  recordPayment: async (data: Omit<Payment, 'id' | 'paymentNumber'>): Promise<Payment> => {
    const methodUpper = (data.paymentMethod || 'UPI').toUpperCase();
    const payload = {
      propertyId: data.propertyId,
      residentId: data.tenantId,
      invoiceId: data.invoiceId && data.invoiceId.length > 20 ? data.invoiceId : undefined,
      amount: Number(data.amount),
      paymentMethod: ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE'].includes(methodUpper)
        ? methodUpper
        : 'UPI',
      referenceNumber: data.referenceNumber || `REF-${Date.now()}`,
      notes: data.remarks || `Payment received via ${methodUpper}`,
    };

    try {
      const created = await apiClient.post('/payments', payload);
      const mapped = mapBackendPayment(created);
      const current = financeService.getPayments();
      const updated = [mapped, ...current.filter((p) => p.id !== mapped.id)];
      setItem(STORAGE_KEYS.PAYMENTS, updated);

      // Refresh invoice if linked
      if (data.invoiceId) {
        const invoice = financeService.getInvoiceById(data.invoiceId);
        if (invoice) {
          const newPaid = invoice.paidAmount + data.amount;
          const newBalance = Math.max(0, invoice.totalAmount - newPaid);
          const newStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : invoice.status;
          financeService.updateInvoice(invoice.id, {
            paidAmount: newPaid,
            balanceAmount: newBalance,
            status: newStatus,
          });
        }
      }

      tenantService.addActivity(
        data.tenantId,
        'Payment Recorded',
        `Received ₹${data.amount} via ${methodUpper}`,
        data.collectedBy
      );

      return mapped;
    } catch {
      // Local fallback
      const list = financeService.getPayments();
      const count = list.length + 1;
      const newPayment: Payment = {
        ...data,
        id: `pay-${Date.now()}`,
        paymentNumber: `REC-2024-${5000 + count}`,
      };
      setItem(STORAGE_KEYS.PAYMENTS, [newPayment, ...list]);
      return newPayment;
    }
  },

  // Deposits
  getDeposits: (): SecurityDeposit[] => {
    return getItem<SecurityDeposit[]>(STORAGE_KEYS.DEPOSITS, initialDeposits);
  },

  getDepositByTenantId: (tenantId: string): SecurityDeposit | undefined => {
    const list = financeService.getDeposits();
    return list.find((d) => d.tenantId === tenantId);
  },

  updateDeposit: (id: string, updates: Partial<SecurityDeposit>): SecurityDeposit | null => {
    const list = financeService.getDeposits();
    const idx = list.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    setItem(STORAGE_KEYS.DEPOSITS, [...list]);
    return list[idx];
  },

  // Expenses
  getExpenses: (propertyId?: string): Expense[] => {
    const list = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
    if (propertyId) return list.filter((e) => e.propertyId === propertyId);
    return list;
  },

  fetchExpenses: async (propertyId?: string): Promise<Expense[]> => {
    try {
      const q = propertyId ? `?propertyId=${propertyId}&limit=100` : '?limit=100';
      const response = await apiClient.get(`/expenses${q}`);
      const items = Array.isArray(response) ? response : response?.items || [];
      if (items.length > 0) {
        const mapped = items.map((e: any) => ({
          id: e.id,
          expenseNumber: e.expenseNumber || `EXP-${e.id.slice(0, 4)}`,
          propertyId: e.propertyId,
          category: (e.category ? e.category.toLowerCase() : 'other') as any,
          title: e.title || e.description || 'Expense',
          amount: Number(e.amount),
          date: e.expenseDate ? e.expenseDate.split('T')[0] : new Date().toISOString().split('T')[0],
          paymentMethod: (e.paymentMethod ? e.paymentMethod.toLowerCase() : 'bank_transfer') as any,
          paidTo: e.vendorName || e.paidTo || 'Vendor',
          approvedBy: 'Admin',
          status: 'paid' as any,
          description: e.description || undefined,
        }));
        setItem(STORAGE_KEYS.EXPENSES, mapped);
        return mapped;
      }
      return financeService.getExpenses(propertyId);
    } catch (err) {
      return financeService.getExpenses(propertyId);
    }
  },

  createExpense: async (data: Omit<Expense, 'id' | 'expenseNumber'>): Promise<Expense> => {
    try {
      const created = await apiClient.post('/expenses', {
        propertyId: data.propertyId,
        category: 'MAINTENANCE',
        title: data.title,
        amount: Number(data.amount),
        expenseDate: data.date,
        paymentMethod: 'BANK_TRANSFER',
        vendorName: data.paidTo,
        description: data.description,
      });
      const list = financeService.getExpenses();
      const newExpense: Expense = {
        ...data,
        id: created.id,
        expenseNumber: created.expenseNumber || `EXP-${created.id.slice(0, 4)}`,
      };
      setItem(STORAGE_KEYS.EXPENSES, [newExpense, ...list]);
      return newExpense;
    } catch {
      const list = financeService.getExpenses();
      const count = list.length + 1;
      const newExpense: Expense = {
        ...data,
        id: `exp-${Date.now()}`,
        expenseNumber: `EXP-2024-${String(count).padStart(3, '0')}`,
      };
      setItem(STORAGE_KEYS.EXPENSES, [newExpense, ...list]);
      return newExpense;
    }
  },

  updateExpense: (id: string, updates: Partial<Expense>): Expense | null => {
    const list = financeService.getExpenses();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    setItem(STORAGE_KEYS.EXPENSES, [...list]);
    return list[idx];
  },

  deleteExpense: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/expenses/${id}`);
    } catch {}
    const list = financeService.getExpenses();
    const filtered = list.filter((e) => e.id !== id);
    if (filtered.length === list.length) return false;
    setItem(STORAGE_KEYS.EXPENSES, filtered);
    return true;
  },
};
