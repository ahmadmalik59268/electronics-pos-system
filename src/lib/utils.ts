export function formatCurrency(amount: number | undefined | null, currency = 'Rs.'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return `${currency} 0`;
  return `${currency} ${Math.round(amount).toLocaleString('en-PK')}`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

export function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `INV-${timestamp}-${random}`;
}

export function generateContractNumber(): string {
  const timestamp = Date.now().toString().slice(-5);
  const random = Math.floor(10 + Math.random() * 90);
  return `QIST-${timestamp}${random}`;
}

export function generateReceiptNumber(): string {
  const timestamp = Date.now().toString().slice(-5);
  const random = Math.floor(10 + Math.random() * 90);
  return `REC-${timestamp}${random}`;
}

export function generatePurchaseNumber(): string {
  const timestamp = Date.now().toString().slice(-5);
  return `PO-${timestamp}`;
}

export function generateReturnNumber(): string {
  const timestamp = Date.now().toString().slice(-5);
  return `RET-${timestamp}`;
}

export function getDaysOverdue(dueDateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateString);
  due.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function isDateOverdue(dueDateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateString);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUUID(str: string | undefined | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
