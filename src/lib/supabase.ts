import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isValidUUID, generateUUID } from './utils';
import {
  Product,
  Customer,
  Supplier,
  Category,
  Sale,
  SaleItem,
  InstallmentContract,
  InstallmentScheduleItem,
  PaymentRecord,
  Expense,
  Purchase,
  PurchaseItem,
  ReturnRecord,
  ReturnItem,
  ShopSettings,
} from '../types';

export const STORAGE_KEYS_SUPABASE = {
  URL: 'zdogar_supabase_url',
  KEY: 'zdogar_supabase_key',
  OLD_URL: 'voltqist_supabase_url',
  OLD_KEY: 'voltqist_supabase_key',
};

// Retrieve credentials from Vite env, process.env, or localStorage
export const getSupabaseCredentials = () => {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

  // Support VITE_SUPABASE_URL
  const envUrl =
    metaEnv.VITE_SUPABASE_URL ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') ||
    '';

  // Support both VITE_SUPABASE_PUBLISHABLE_KEY and VITE_SUPABASE_ANON_KEY
  const envKey =
    metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
    metaEnv.VITE_SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined'
      ? (process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.VITE_SUPABASE_ANON_KEY)
      : '') ||
    '';

  let localUrl = '';
  let localKey = '';
  if (typeof localStorage !== 'undefined') {
    localUrl =
      localStorage.getItem(STORAGE_KEYS_SUPABASE.URL) ||
      localStorage.getItem(STORAGE_KEYS_SUPABASE.OLD_URL) ||
      '';
    localKey =
      localStorage.getItem(STORAGE_KEYS_SUPABASE.KEY) ||
      localStorage.getItem(STORAGE_KEYS_SUPABASE.OLD_KEY) ||
      '';
  }

  // If valid environment variables are present, prioritize them over cached local storage
  const isEnvUrlValid = Boolean(envUrl && envUrl.startsWith('https://') && !envUrl.includes('your-project'));
  const isEnvKeyValid = Boolean(
    envKey &&
    envKey !== 'your-anon-key' &&
    envKey !== 'your-publishable-key' &&
    envKey.length > 20
  );

  const url = (isEnvUrlValid ? envUrl : (localUrl || envUrl || '')).trim();
  const key = (isEnvKeyValid ? envKey : (localKey || envKey || '')).trim();

  const isConfigured = Boolean(
    url &&
      key &&
      url.startsWith('https://') &&
      !url.includes('your-project') &&
      key !== 'your-anon-key' &&
      key !== 'your-publishable-key'
  );

  return { url, key, isConfigured };
};

export const SUPABASE_URL = getSupabaseCredentials().url;
export const SUPABASE_ANON_KEY = getSupabaseCredentials().key;
export const SUPABASE_PUBLISHABLE_KEY = getSupabaseCredentials().key;
export const IS_SUPABASE_CONFIGURED = getSupabaseCredentials().isConfigured;

let clientInstance: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

export function getSupabase(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) return null;

  if (!clientInstance || currentClientUrl !== url || currentClientKey !== key) {
    try {
      clientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      currentClientUrl = url;
      currentClientKey = key;
    } catch (err) {
      console.warn('Could not initialize Supabase client:', err);
      return null;
    }
  }
  return clientInstance;
}

export function saveSupabaseCredentials(url: string, key: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  const cleanUrl = url.trim();
  const cleanKey = key.trim();

  localStorage.setItem(STORAGE_KEYS_SUPABASE.URL, cleanUrl);
  localStorage.setItem(STORAGE_KEYS_SUPABASE.KEY, cleanKey);
  // Also clean old keys
  localStorage.removeItem(STORAGE_KEYS_SUPABASE.OLD_URL);
  localStorage.removeItem(STORAGE_KEYS_SUPABASE.OLD_KEY);

  clientInstance = null;
  if (cleanUrl && cleanKey) {
    try {
      clientInstance = createClient(cleanUrl, cleanKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      return true;
    } catch (err) {
      console.error('Failed to create Supabase client:', err);
      return false;
    }
  }
  return true;
}

export function clearSupabaseCredentials() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS_SUPABASE.URL);
  localStorage.removeItem(STORAGE_KEYS_SUPABASE.KEY);
  localStorage.removeItem(STORAGE_KEYS_SUPABASE.OLD_URL);
  localStorage.removeItem(STORAGE_KEYS_SUPABASE.OLD_KEY);
  clientInstance = null;
}

export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{ success: boolean; message: string; tablesFound?: boolean; rlsNotice?: boolean }> {
  try {
    const creds =
      customUrl && customKey
        ? { url: customUrl.trim(), key: customKey.trim(), isConfigured: true }
        : getSupabaseCredentials();

    if (!creds.url || !creds.key) {
      return {
        success: false,
        message: 'Supabase URL or Anon Key is missing. Please provide both.',
      };
    }

    if (!creds.url.startsWith('https://')) {
      return {
        success: false,
        message: 'Invalid Supabase URL. Must start with https:// (e.g., https://your-project.supabase.co)',
      };
    }

    const testClient = createClient(creds.url, creds.key, {
      auth: { persistSession: false },
    });

    // Test a basic query to verify connection
    const { error } = await testClient.from('products').select('id').limit(1);

    if (error) {
      if (
        error.code === '42P01' ||
        error.message?.toLowerCase().includes('relation') ||
        error.message?.toLowerCase().includes('does not exist')
      ) {
        return {
          success: true,
          tablesFound: false,
          message:
            'Connected to Supabase successfully! Tables have not been created yet. Please execute the SQL Schema in your Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Supabase error: ${error.message} (code: ${error.code || 'unknown'})`,
      };
    }

    // Test write permission / Row Level Security policy
    let rlsNotice = false;
    try {
      const probeId = '00000000-0000-0000-0000-000000000000';
      const probeRes = await testClient.from('products').insert({
        id: probeId,
        sku: 'PROBE_CHECK_TEMP',
        name: 'Probe',
        category: 'Test',
        brand: 'Test',
        model: 'Test',
        purchase_price: 0,
        cash_price: 0,
        installment_price: 0,
        stock_quantity: 0,
      });

      if (probeRes.error) {
        if (probeRes.error.code === '42501' || probeRes.error.message?.toLowerCase().includes('row-level security')) {
          rlsNotice = true;
        }
      } else {
        // Clean up test probe row
        await testClient.from('products').delete().eq('id', probeId);
      }
    } catch {
      // Ignore probe errors
    }

    if (rlsNotice) {
      return {
        success: true,
        tablesFound: true,
        rlsNotice: true,
        message:
          'Connected! URL aur Key sahi hain, lekin Row Level Security (RLS) policies ki zaroorat hai taake data save ho sake. Neeche diya gaya SQL script Supabase SQL Editor me Run karein.',
      };
    }

    return {
      success: true,
      tablesFound: true,
      message: 'Connection verified! Supabase PostgreSQL database se bilkul theek connect ho gaya hai.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Failed to connect: ${msg}. Please verify your project URL and network.`,
    };
  }
}

// Push local data into Supabase
export async function syncLocalToSupabase(data: {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  categories: Category[];
  sales: Sale[];
  contracts: InstallmentContract[];
  payments: PaymentRecord[];
  expenses: Expense[];
  purchases: Purchase[];
  returns: ReturnRecord[];
  settings: ShopSettings;
}): Promise<{ success: boolean; message: string; count?: number }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase is not configured yet.' };
  }

  try {
    let totalSynced = 0;

    // 1. Categories (id, name, created_at)
    if (data.categories.length > 0) {
      const { error } = await supabase.from('categories').upsert(
        data.categories.map((c) => ({
          id: isValidUUID(c.id) ? c.id : generateUUID(),
          name: c.name,
        }))
      );
      if (error) throw new Error(`Categories sync error: ${error.message}`);
      totalSynced += data.categories.length;
    }

    // 2. Suppliers (id, name, company, phone, address, notes, created_at)
    if (data.suppliers.length > 0) {
      const { error } = await supabase.from('suppliers').upsert(
        data.suppliers.map((s) => ({
          id: isValidUUID(s.id) ? s.id : generateUUID(),
          name: s.name,
          company: s.company || s.company_name || s.name,
          phone: s.phone || '',
          address: s.address || null,
          notes: s.notes || s.products_supplied || null,
        }))
      );
      if (error) throw new Error(`Suppliers sync error: ${error.message}`);
      totalSynced += data.suppliers.length;
    }

    // 3. Customers (id, name, phone, alternate_phone, address, city, notes, created_at)
    if (data.customers.length > 0) {
      const customerPayloads = data.customers.map((c) => ({
        id: isValidUUID(c.id) ? c.id : generateUUID(),
        name: c.name || c.full_name || '',
        phone: c.phone || '',
        alternate_phone: c.alternate_phone || null,
        address: c.address || null,
        city: c.city || null,
        notes: c.notes || null,
      }));

      const { error } = await supabase.from('customers').upsert(customerPayloads);
      if (error) throw new Error(`Customers sync error: ${error.message}`);
      totalSynced += data.customers.length;
    }

    // 4. Products (id, name, category_id, brand, model, sku, imei, serial_number, purchase_price, cash_price, installment_price, stock_quantity, minimum_stock, warranty_months, image_url)
    if (data.products.length > 0) {
      const { error } = await supabase.from('products').upsert(
        data.products.map((p) => {
          let warrantyMonths = 12;
          if (typeof p.warranty_months === 'number') {
            warrantyMonths = p.warranty_months;
          } else if (p.warranty_period) {
            const num = parseInt(p.warranty_period.replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > 0) warrantyMonths = num;
          }

          return {
            id: isValidUUID(p.id) ? p.id : generateUUID(),
            name: p.name,
            category_id: isValidUUID(p.category_id) ? p.category_id : null,
            brand: p.brand || '',
            model: p.model || '',
            sku: p.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            imei: p.imei || null,
            serial_number: p.serial_number || null,
            purchase_price: p.purchase_price || 0,
            cash_price: p.cash_price || 0,
            installment_price: p.installment_price || p.cash_price || 0,
            stock_quantity: Math.max(0, p.stock_quantity ?? 0),
            minimum_stock: p.minimum_stock ?? p.min_stock_level ?? 2,
            warranty_months: warrantyMonths,
            image_url: p.image_url || null,
          };
        })
      );
      if (error) throw new Error(`Products sync error: ${error.message}`);
      totalSynced += data.products.length;
    }

    // 5. Sales & Sale Items
    if (data.sales.length > 0) {
      const salesPayloads = data.sales.map((s) => ({
        id: isValidUUID(s.id) ? s.id : generateUUID(),
        invoice_number: s.invoice_number,
        customer_id: isValidUUID(s.customer_id) ? s.customer_id : null,
        sale_type: s.sale_type === 'installment' ? 'installment' : 'cash',
        subtotal: s.subtotal || s.total_amount,
        discount: s.discount || 0,
        total_amount: s.total_amount,
        paid_amount: s.paid_amount,
        remaining_amount: Math.max(0, s.total_amount - s.paid_amount),
        payment_method: s.payment_method || 'cash',
        created_at: s.created_at || new Date().toISOString(),
      }));

      const { error: salesErr } = await supabase.from('sales').upsert(salesPayloads);
      if (salesErr) throw new Error(`Sales sync error: ${salesErr.message}`);

      // Insert sale items
      const allSaleItems: any[] = [];
      for (const s of data.sales) {
        const saleId = isValidUUID(s.id) ? s.id : salesPayloads.find((sp) => sp.invoice_number === s.invoice_number)?.id;
        if (s.items && s.items.length > 0 && saleId) {
          for (const item of s.items) {
            allSaleItems.push({
              id: isValidUUID(item.id) ? item.id : generateUUID(),
              sale_id: saleId,
              product_id: isValidUUID(item.product_id) ? item.product_id : null,
              quantity: item.quantity || 1,
              unit_price: item.unit_price || item.price || 0,
              purchase_price: item.purchase_price || 0,
              total_price: item.total || (item.unit_price || 0) * (item.quantity || 1),
            });
          }
        }
      }
      if (allSaleItems.length > 0) {
        await supabase.from('sale_items').upsert(allSaleItems);
      }
      totalSynced += data.sales.length;
    }

    // 6. Installment Contracts & Schedule
    if (data.contracts.length > 0) {
      const contractPayloads = data.contracts.map((ct) => ({
        id: isValidUUID(ct.id) ? ct.id : generateUUID(),
        contract_number: ct.contract_number,
        sale_id: isValidUUID(ct.sale_id) ? ct.sale_id : null,
        customer_id: isValidUUID(ct.customer_id) ? ct.customer_id : null,
        total_price: ct.total_installment_price || ct.total_price,
        down_payment: ct.down_payment || 0,
        remaining_amount: ct.remaining_balance ?? ct.remaining_amount ?? (ct.total_installment_price - ct.down_payment),
        duration_months: ct.duration_months || ct.installment_count || 1,
        installment_amount: ct.installment_amount || ct.monthly_installment || 0,
        frequency: ct.duration_type || ct.frequency || 'monthly',
        start_date: ct.start_date || new Date().toISOString().split('T')[0],
        status: ct.status === 'completed' ? 'completed' : ct.status === 'cancelled' ? 'cancelled' : 'active',
        created_at: ct.created_at || new Date().toISOString(),
      }));

      const { error: cntErr } = await supabase.from('installment_contracts').upsert(contractPayloads);
      if (cntErr) throw new Error(`Installment contracts sync error: ${cntErr.message}`);

      // Insert schedules
      const allSchedules: any[] = [];
      for (const ct of data.contracts) {
        const contractId = isValidUUID(ct.id) ? ct.id : contractPayloads.find((cp) => cp.contract_number === ct.contract_number)?.id;
        if (ct.schedule && ct.schedule.length > 0 && contractId) {
          for (const s of ct.schedule) {
            allSchedules.push({
              id: isValidUUID(s.id) ? s.id : generateUUID(),
              contract_id: contractId,
              installment_number: s.installment_number,
              due_date: s.due_date,
              amount: s.amount_due ?? s.amount ?? 0,
              paid_amount: s.amount_paid ?? s.paid_amount ?? 0,
              remaining_amount: s.remaining_amount ?? ((s.amount_due ?? s.amount ?? 0) - (s.amount_paid ?? 0)),
              status: s.status === 'paid' ? 'paid' : s.status === 'overdue' ? 'overdue' : s.status === 'partial' || s.status === 'partially_paid' ? 'partial' : 'pending',
            });
          }
        }
      }
      if (allSchedules.length > 0) {
        await supabase.from('installment_schedule').upsert(allSchedules);
      }
      totalSynced += data.contracts.length;
    }

    // 7. Payments (receipt_number, customer_id, contract_id, schedule_id, amount, payment_method, notes, payment_date)
    if (data.payments.length > 0) {
      const paymentPayloads = data.payments.map((p) => ({
        id: isValidUUID(p.id) ? p.id : generateUUID(),
        receipt_number: p.receipt_number,
        contract_id: isValidUUID(p.contract_id) ? p.contract_id : null,
        schedule_id: isValidUUID(p.installment_schedule_id || p.schedule_id) ? (p.installment_schedule_id || p.schedule_id) : null,
        customer_id: isValidUUID(p.customer_id) ? p.customer_id : null,
        amount: p.amount,
        payment_date: p.payment_date ? p.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
        payment_method: p.payment_method || 'cash',
        notes: p.notes || null,
      }));

      const { error: payErr } = await supabase.from('payments').upsert(paymentPayloads);
      if (payErr) throw new Error(`Payments sync error: ${payErr.message}`);
      totalSynced += data.payments.length;
    }

    // 8. Expenses (id, title, category, amount, description, expense_date)
    if (data.expenses.length > 0) {
      const { error: expErr } = await supabase.from('expenses').upsert(
        data.expenses.map((e) => ({
          id: isValidUUID(e.id) ? e.id : generateUUID(),
          title: e.title,
          category: e.category,
          amount: e.amount,
          description: e.description || e.notes || null,
          expense_date: e.date || e.expense_date || new Date().toISOString().split('T')[0],
        }))
      );
      if (expErr) throw new Error(`Expenses sync error: ${expErr.message}`);
      totalSynced += data.expenses.length;
    }

    // 9. Purchases & Purchase Items
    if (data.purchases.length > 0) {
      const purchasePayloads = data.purchases.map((pc) => ({
        id: isValidUUID(pc.id) ? pc.id : generateUUID(),
        invoice_number: pc.purchase_number || pc.invoice_number,
        supplier_id: isValidUUID(pc.supplier_id) ? pc.supplier_id : null,
        purchase_date: pc.purchase_date ? pc.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0],
        total_amount: pc.total_amount,
        notes: pc.notes || null,
      }));

      const { error: purErr } = await supabase.from('purchases').upsert(purchasePayloads);
      if (purErr) throw new Error(`Purchases sync error: ${purErr.message}`);

      const allPurchaseItems: any[] = [];
      for (const pc of data.purchases) {
        const purId = isValidUUID(pc.id) ? pc.id : purchasePayloads.find((p) => p.invoice_number === (pc.purchase_number || pc.invoice_number))?.id;
        if (pc.items && pc.items.length > 0 && purId) {
          for (const item of pc.items) {
            allPurchaseItems.push({
              id: isValidUUID(item.id) ? item.id : generateUUID(),
              purchase_id: purId,
              product_id: isValidUUID(item.product_id) ? item.product_id : null,
              quantity: item.quantity || 1,
              unit_cost: item.purchase_price || item.unit_cost || 0,
              total_cost: item.total || (item.purchase_price || item.unit_cost || 0) * (item.quantity || 1),
            });
          }
        }
      }
      if (allPurchaseItems.length > 0) {
        await supabase.from('purchase_items').upsert(allPurchaseItems);
      }
      totalSynced += data.purchases.length;
    }

    // 10. Returns & Return Items
    if (data.returns.length > 0) {
      const returnPayloads = data.returns.map((r) => ({
        id: isValidUUID(r.id) ? r.id : generateUUID(),
        sale_id: isValidUUID(r.sale_id) ? r.sale_id : null,
        customer_id: isValidUUID(r.customer_id) ? r.customer_id : null,
        reason: r.reason || 'Customer Return',
        total_amount: r.total_refund_amount || r.total_amount || 0,
        return_date: r.return_date || new Date().toISOString(),
      }));

      const { error: retErr } = await supabase.from('returns').upsert(returnPayloads);
      if (retErr) throw new Error(`Returns sync error: ${retErr.message}`);

      const allReturnItems: any[] = [];
      for (const r of data.returns) {
        const retId = isValidUUID(r.id) ? r.id : returnPayloads.find((rp) => rp.reason === r.reason)?.id;
        if (r.items && r.items.length > 0 && retId) {
          for (const item of r.items) {
            allReturnItems.push({
              id: isValidUUID(item.id) ? item.id : generateUUID(),
              return_id: retId,
              product_id: isValidUUID(item.product_id) ? item.product_id : null,
              quantity: item.quantity || 1,
              amount: item.refund_price || item.amount || 0,
            });
          }
        }
      }
      if (allReturnItems.length > 0) {
        await supabase.from('return_items').upsert(allReturnItems);
      }
      totalSynced += data.returns.length;
    }

    // 11. Shop Settings
    if (data.settings) {
      await supabase.from('shop_settings').upsert({
        id: 'current',
        settings: data.settings,
        updated_at: new Date().toISOString(),
      });
    }

    return {
      success: true,
      count: totalSynced,
      message: `Successfully synchronized ${totalSynced} records with Supabase!`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Sync failed: ${msg}` };
  }
}

// Pull cloud data from Supabase
export async function fetchSupabaseData(): Promise<{
  success: boolean;
  message: string;
  data?: {
    products?: Product[];
    customers?: Customer[];
    suppliers?: Supplier[];
    categories?: Category[];
    sales?: Sale[];
    contracts?: InstallmentContract[];
    payments?: PaymentRecord[];
    expenses?: Expense[];
    purchases?: Purchase[];
    returns?: ReturnRecord[];
    settings?: ShopSettings;
  };
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase is not configured yet.' };
  }

  try {
    const [
      productsRes,
      customersRes,
      suppliersRes,
      categoriesRes,
      salesRes,
      saleItemsRes,
      contractsRes,
      scheduleRes,
      paymentsRes,
      expensesRes,
      purchasesRes,
      purchaseItemsRes,
      returnsRes,
      returnItemsRes,
      settingsRes,
    ] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('sale_items').select('*'),
      supabase.from('installment_contracts').select('*'),
      supabase.from('installment_schedule').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('purchases').select('*'),
      supabase.from('purchase_items').select('*'),
      supabase.from('returns').select('*'),
      supabase.from('return_items').select('*'),
      supabase.from('shop_settings').select('*').limit(1),
    ]);

    const result: {
      products?: Product[];
      customers?: Customer[];
      suppliers?: Supplier[];
      categories?: Category[];
      sales?: Sale[];
      contracts?: InstallmentContract[];
      payments?: PaymentRecord[];
      expenses?: Expense[];
      purchases?: Purchase[];
      returns?: ReturnRecord[];
      settings?: ShopSettings;
    } = {};

    const categoriesMap: Record<string, string> = {};
    if (categoriesRes.data && categoriesRes.data.length > 0) {
      result.categories = categoriesRes.data.map((c: any) => {
        categoriesMap[c.id] = c.name;
        return {
          id: c.id,
          name: c.name,
          created_at: c.created_at,
        };
      }) as Category[];
    }

    if (suppliersRes.data && suppliersRes.data.length > 0) {
      result.suppliers = suppliersRes.data.map((s: any) => ({
        id: s.id,
        name: s.name,
        company: s.company || s.name,
        company_name: s.company || s.name,
        phone: s.phone || '',
        address: s.address || '',
        notes: s.notes || '',
        amount_payable: 0,
        balance: 0,
        created_at: s.created_at,
      })) as Supplier[];
    }

    const customersMap: Record<string, any> = {};
    if (customersRes.data && customersRes.data.length > 0) {
      result.customers = customersRes.data.map((c: any) => {
        customersMap[c.id] = c;
        return {
          id: c.id,
          name: c.name || c.full_name || '',
          full_name: c.name || c.full_name || '',
          phone: c.phone || '',
          alternate_phone: c.alternate_phone || '',
          address: c.address || '',
          city: c.city || 'Burewala',
          notes: c.notes || '',
          customer_code: `CUST-${c.id.slice(0, 4).toUpperCase()}`,
          status: 'active',
          total_purchases: 0,
          total_purchased: 0,
          total_paid: 0,
          total_outstanding: 0,
          created_at: c.created_at,
        };
      }) as Customer[];
    }

    if (productsRes.data && productsRes.data.length > 0) {
      result.products = productsRes.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: categoriesMap[p.category_id] || 'General',
        category_id: p.category_id,
        brand: p.brand || '',
        model: p.model || '',
        sku: p.sku || `SKU-${p.id.slice(0, 4)}`,
        imei: p.imei || '',
        serial_number: p.serial_number || '',
        purchase_price: Number(p.purchase_price) || 0,
        cash_price: Number(p.cash_price) || 0,
        installment_price: Number(p.installment_price) || Number(p.cash_price) || 0,
        stock_quantity: Number(p.stock_quantity) || 0,
        min_stock_level: Number(p.minimum_stock) || 2,
        minimum_stock: Number(p.minimum_stock) || 2,
        warranty_period: p.warranty_months ? `${p.warranty_months} Months` : '1 Year',
        warranty_months: p.warranty_months,
        image_url: p.image_url || '',
        status: (Number(p.stock_quantity) || 0) > 0 ? 'active' : 'out_of_stock',
        created_at: p.created_at,
        updated_at: p.created_at,
      })) as Product[];
    }

    // Map sale items to sales
    const saleItemsMap: Record<string, SaleItem[]> = {};
    if (saleItemsRes.data) {
      saleItemsRes.data.forEach((it: any) => {
        if (!saleItemsMap[it.sale_id]) saleItemsMap[it.sale_id] = [];
        saleItemsMap[it.sale_id].push({
          id: it.id,
          product_id: it.product_id,
          product_name: 'Product Item',
          quantity: it.quantity,
          unit_price: Number(it.unit_price) || 0,
          purchase_price: Number(it.purchase_price) || 0,
          total: Number(it.total_price) || (Number(it.unit_price) || 0) * (it.quantity || 1),
        });
      });
    }

    if (salesRes.data && salesRes.data.length > 0) {
      result.sales = salesRes.data.map((s: any) => {
        const linkedCustomer = customersMap[s.customer_id];
        const items = saleItemsMap[s.id] || [];
        return {
          id: s.id,
          invoice_number: s.invoice_number,
          sale_type: s.sale_type || 'cash',
          customer_id: s.customer_id,
          customer_name: linkedCustomer?.name || 'Walk-in Customer',
          customer_phone: linkedCustomer?.phone || '',
          items,
          subtotal: Number(s.subtotal) || Number(s.total_amount) || 0,
          discount: Number(s.discount) || 0,
          tax: 0,
          total_amount: Number(s.total_amount) || 0,
          paid_amount: Number(s.paid_amount) || 0,
          change_amount: 0,
          payment_method: s.payment_method || 'cash',
          payment_status: Number(s.paid_amount) >= Number(s.total_amount) ? 'paid' : 'partial',
          profit: (Number(s.total_amount) || 0) - items.reduce((acc, it) => acc + (it.purchase_price * it.quantity), 0),
          cashier_name: 'Staff',
          created_at: s.created_at,
        };
      }) as Sale[];
    }

    // Map installment schedule to contracts
    const scheduleMap: Record<string, InstallmentScheduleItem[]> = {};
    if (scheduleRes.data) {
      scheduleRes.data.forEach((sch: any) => {
        if (!scheduleMap[sch.contract_id]) scheduleMap[sch.contract_id] = [];
        scheduleMap[sch.contract_id].push({
          id: sch.id,
          contract_id: sch.contract_id,
          installment_number: sch.installment_number,
          due_date: sch.due_date,
          amount_due: Number(sch.amount) || 0,
          amount_paid: Number(sch.paid_amount) || 0,
          remaining_amount: Number(sch.remaining_amount) || 0,
          status: sch.status === 'paid' ? 'paid' : sch.status === 'overdue' ? 'overdue' : sch.status === 'partial' ? 'partially_paid' : 'pending',
        });
      });
    }

    if (contractsRes.data && contractsRes.data.length > 0) {
      result.contracts = contractsRes.data.map((c: any) => {
        const linkedCustomer = customersMap[c.customer_id];
        const sch = (scheduleMap[c.id] || []).sort((a, b) => a.installment_number - b.installment_number);
        const totalPrice = Number(c.total_price) || 0;
        const downPayment = Number(c.down_payment) || 0;
        const remaining = Number(c.remaining_amount) || Math.max(0, totalPrice - downPayment);
        const paidInstallments = sch.filter((s) => s.status === 'paid').length;
        const nextUnpaid = sch.find((s) => s.status !== 'paid');

        return {
          id: c.id,
          contract_number: c.contract_number,
          sale_id: c.sale_id,
          customer_id: c.customer_id,
          customer_name: linkedCustomer?.name || 'Valued Customer',
          customer_phone: linkedCustomer?.phone || '',
          customer_cnic: linkedCustomer?.cnic || '',
          customer_address: linkedCustomer?.address || '',
          items: [],
          product_summary: 'Installment Item',
          total_cash_price: Math.round(totalPrice * 0.8),
          total_installment_price: totalPrice,
          down_payment: downPayment,
          remaining_balance: remaining,
          outstanding_amount: remaining,
          duration_type: c.frequency || 'monthly',
          duration_months: c.duration_months || sch.length || 1,
          installment_count: c.duration_months || sch.length || 1,
          installment_amount: Number(c.installment_amount) || 0,
          monthly_installment: Number(c.installment_amount) || 0,
          paid_amount: downPayment + sch.reduce((acc, s) => acc + s.amount_paid, 0),
          paid_installments_count: paidInstallments,
          remaining_installments_count: Math.max(0, (c.duration_months || sch.length || 1) - paidInstallments),
          start_date: c.start_date,
          next_due_date: nextUnpaid ? nextUnpaid.due_date : c.start_date,
          status: c.status || 'active',
          schedule: sch,
          created_by: 'Staff',
          created_at: c.created_at,
        };
      }) as InstallmentContract[];
    }

    if (paymentsRes.data && paymentsRes.data.length > 0) {
      result.payments = paymentsRes.data.map((p: any) => {
        const linkedCustomer = customersMap[p.customer_id];
        return {
          id: p.id,
          receipt_number: p.receipt_number,
          contract_id: p.contract_id,
          contract_number: `CNT-${(p.contract_id || '').slice(0, 4).toUpperCase()}`,
          customer_id: p.customer_id,
          customer_name: linkedCustomer?.name || 'Customer',
          customer_phone: linkedCustomer?.phone || '',
          amount: Number(p.amount) || 0,
          payment_date: p.payment_date || new Date().toISOString(),
          payment_method: p.payment_method || 'cash',
          previous_balance: 0,
          remaining_balance: 0,
          notes: p.notes || '',
          collected_by: 'Staff',
          created_at: p.payment_date || new Date().toISOString(),
        };
      }) as PaymentRecord[];
    }

    if (expensesRes.data && expensesRes.data.length > 0) {
      result.expenses = expensesRes.data.map((e: any) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: Number(e.amount) || 0,
        date: e.expense_date,
        expense_date: e.expense_date,
        description: e.description || '',
        notes: e.description || '',
        added_by: 'Staff',
        created_at: e.created_at,
      })) as Expense[];
    }

    const purchaseItemsMap: Record<string, PurchaseItem[]> = {};
    if (purchaseItemsRes.data) {
      purchaseItemsRes.data.forEach((it: any) => {
        if (!purchaseItemsMap[it.purchase_id]) purchaseItemsMap[it.purchase_id] = [];
        purchaseItemsMap[it.purchase_id].push({
          id: it.id,
          product_id: it.product_id,
          product_name: 'Purchased Item',
          quantity: it.quantity,
          unit_cost: Number(it.unit_cost) || 0,
          purchase_price: Number(it.unit_cost) || 0,
          total: Number(it.total_cost) || (Number(it.unit_cost) || 0) * (it.quantity || 1),
        });
      });
    }

    if (purchasesRes.data && purchasesRes.data.length > 0) {
      result.purchases = purchasesRes.data.map((pc: any) => ({
        id: pc.id,
        purchase_number: pc.invoice_number,
        supplier_id: pc.supplier_id,
        supplier_name: 'Supplier',
        purchase_date: pc.purchase_date,
        items: purchaseItemsMap[pc.id] || [],
        total_amount: Number(pc.total_amount) || 0,
        notes: pc.notes || '',
        created_by: 'Staff',
        created_at: pc.created_at,
      })) as Purchase[];
    }

    const returnItemsMap: Record<string, any[]> = {};
    if (returnItemsRes.data) {
      returnItemsRes.data.forEach((it: any) => {
        if (!returnItemsMap[it.return_id]) returnItemsMap[it.return_id] = [];
        returnItemsMap[it.return_id].push({
          id: it.id,
          product_id: it.product_id,
          product_name: 'Returned Item',
          quantity: it.quantity,
          refund_price: Number(it.amount) || 0,
          amount: Number(it.amount) || 0,
        });
      });
    }

    if (returnsRes.data && returnsRes.data.length > 0) {
      result.returns = returnsRes.data.map((r: any) => ({
        id: r.id,
        return_number: `RET-${r.id.slice(0, 5).toUpperCase()}`,
        sale_id: r.sale_id,
        customer_id: r.customer_id,
        customer_name: 'Customer',
        items: returnItemsMap[r.id] || [],
        total_refund_amount: Number(r.total_amount) || 0,
        total_amount: Number(r.total_amount) || 0,
        reason: r.reason || '',
        return_date: r.return_date,
        created_at: r.return_date,
      })) as ReturnRecord[];
    }

    if (settingsRes && settingsRes.data && settingsRes.data.length > 0 && settingsRes.data[0]?.settings) {
      result.settings = settingsRes.data[0].settings as ShopSettings;
    }

    return {
      success: true,
      message: 'Cloud data fetched successfully from Supabase.',
      data: result,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Failed to fetch data: ${msg}` };
  }
}

// Complete PostgreSQL schema for Supabase
export const SUPABASE_SQL_SCHEMA = `-- ==========================================================
-- Zohaib Dogar Electronics POS & Installment Management Database
-- Complete PostgreSQL Schema with Tables, Indexes & Row Level Security (RLS)
-- Paste this script into Supabase SQL Editor and click "Run"
-- ==========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    products_supplied TEXT,
    amount_payable NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Products Table (With Serial/IMEI Tracking & Dual Prices)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    serial_number TEXT,
    imei TEXT,
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    cash_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    installment_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 5,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    purchase_date DATE,
    warranty_period TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    customer_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    father_name TEXT,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    cnic TEXT NOT NULL,
    notes TEXT,
    total_purchases NUMERIC(14,2) DEFAULT 0,
    total_paid NUMERIC(14,2) DEFAULT 0,
    total_outstanding NUMERIC(14,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Sales Table (Cash and Installment Sales)
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    invoice_number TEXT NOT NULL UNIQUE,
    sale_type TEXT NOT NULL,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_cnic TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    profit NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    cashier_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Installment Contracts Table (Qist)
CREATE TABLE IF NOT EXISTS public.installment_contracts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    contract_number TEXT NOT NULL UNIQUE,
    sale_id TEXT,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_cnic TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    product_summary TEXT NOT NULL,
    total_cash_price NUMERIC(12,2) NOT NULL,
    total_installment_price NUMERIC(12,2) NOT NULL,
    down_payment NUMERIC(12,2) NOT NULL,
    remaining_balance NUMERIC(12,2) NOT NULL,
    duration_type TEXT NOT NULL DEFAULT 'monthly',
    duration_months INT NOT NULL,
    installment_count INT NOT NULL,
    installment_amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    outstanding_amount NUMERIC(12,2) NOT NULL,
    paid_installments_count INT NOT NULL DEFAULT 0,
    remaining_installments_count INT NOT NULL,
    start_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    guarantor1 JSONB,
    guarantor2 JSONB,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Installment Schedule Table (Per Installment Due Date & Status)
CREATE TABLE IF NOT EXISTS public.installment_schedule (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    contract_id TEXT NOT NULL,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    amount_due NUMERIC(12,2) NOT NULL,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_date TIMESTAMPTZ,
    notes TEXT
);

-- 10. Installment Payment Records Table
CREATE TABLE IF NOT EXISTS public.installment_payments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    receipt_number TEXT NOT NULL UNIQUE,
    contract_id TEXT NOT NULL,
    contract_number TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    amount NUMERIC(12,2) NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT NOT NULL,
    previous_balance NUMERIC(12,2) NOT NULL,
    remaining_balance NUMERIC(12,2) NOT NULL,
    installment_schedule_id TEXT,
    installment_number INT,
    notes TEXT,
    collected_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    added_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Supplier Purchases Table
CREATE TABLE IF NOT EXISTS public.purchases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    purchase_number TEXT NOT NULL UNIQUE,
    supplier_id TEXT,
    supplier_name TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Sales Returns Table
CREATE TABLE IF NOT EXISTS public.returns (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    return_number TEXT NOT NULL UNIQUE,
    sale_id TEXT,
    invoice_number TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    return_type TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_refund_amount NUMERIC(12,2) NOT NULL,
    return_date DATE NOT NULL,
    reason TEXT NOT NULL,
    processed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Shop Settings Table
CREATE TABLE IF NOT EXISTS public.shop_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- INDEXES FOR FAST QUERYING
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_imei ON public.products(imei);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_cnic ON public.customers(cnic);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_contracts_num ON public.installment_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON public.installment_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_schedule_contract ON public.installment_schedule(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON public.installment_payments(contract_id);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allows read & write access for both anon (public API key) and authenticated users
-- ==========================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon/authenticated access to %s" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Allow full access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert on profiles" ON public.profiles;
CREATE POLICY "Allow authenticated insert on profiles" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update on profiles" ON public.profiles;
CREATE POLICY "Allow authenticated update on profiles" ON public.profiles FOR UPDATE TO anon, authenticated USING (true);

-- Auto-sync Trigger: Automatically create or update public.profiles when an Auth User signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'employee')
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`;
