export type UserRole = 'admin' | 'employee';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  username?: string;
  role: UserRole;
  phone?: string;
  status?: 'active' | 'inactive';
  created_at: string;
}

export type User = UserProfile;

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  item_count?: number;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  category_id?: string;
  brand: string;
  model: string;
  serial_number?: string;
  imei?: string;
  purchase_price: number;
  cash_price: number;
  installment_price: number;
  stock_quantity: number;
  min_stock_level: number;
  minimum_stock?: number;
  supplier_id?: string;
  supplier_name?: string;
  purchase_date?: string;
  warranty_period?: string;
  warranty_months?: number;
  description?: string;
  image_url?: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  alternate_phone?: string;
  address?: string;
  city?: string;
  customer_code?: string;
  full_name?: string;
  father_name?: string;
  cnic?: string;
  notes?: string;
  image_url?: string;
  total_purchases?: number;
  total_purchased?: number;
  total_paid?: number;
  total_outstanding?: number;
  status?: 'active' | 'defaulter' | 'cleared' | 'blacklisted' | 'inactive';
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  company_name?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  balance?: number;
  products_supplied?: string;
  amount_payable: number;
  notes?: string;
  created_at: string;
}

export interface PurchaseItem {
  id?: string;
  purchase_id?: string;
  product_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  purchase_price?: number;
  unit_cost?: number;
  total_cost?: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  invoice_number?: string;
  supplier_id: string;
  supplier_name: string;
  purchase_date?: string;
  items: PurchaseItem[];
  total_amount: number;
  paid_amount?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_id: string;
  product_name: string;
  sku?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  imei?: string;
  quantity: number;
  unit_price: number;
  price?: number;
  installment_price?: number;
  purchase_price: number;
  discount?: number;
  total: number;
  warranty_months?: number;
}

export type PaymentMethod = 'cash' | 'bank' | 'mobile_wallet' | 'other';

export interface Sale {
  id: string;
  invoice_number: string;
  sale_type: 'cash' | 'installment';
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_cnic?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discount_amount?: number;
  tax: number;
  tax_amount?: number;
  total_amount: number;
  total_cost?: number;
  paid_amount: number;
  change_amount: number;
  payment_method: PaymentMethod;
  payment_status?: string;
  profit: number;
  notes?: string;
  cashier_name: string;
  created_at: string;
}

export type InstallmentDurationType = 'monthly' | 'weekly' | 'custom';
export type ContractStatus = 'active' | 'paid' | 'overdue' | 'completed' | 'cancelled';
export type ScheduleItemStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'partial';

export interface InstallmentScheduleItem {
  id: string;
  contract_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount?: number;
  amount_paid: number;
  paid_amount?: number;
  remaining_amount: number;
  status: ScheduleItemStatus;
  paid_date?: string;
  notes?: string;
}

export interface Guarantor {
  name: string;
  phone: string;
  cnic: string;
  relation: string;
  address?: string;
  image_url?: string;
  cnic_image_url?: string;
}

export interface InstallmentContract {
  id: string;
  contract_number: string;
  sale_id?: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_cnic: string;
  customer_address: string;
  items: SaleItem[];
  product_summary: string;
  total_cash_price: number;
  total_installment_price: number;
  total_price?: number;
  down_payment: number;
  remaining_balance: number;
  remaining_amount?: number;
  duration_type: InstallmentDurationType;
  duration_months: number;
  installment_count: number;
  installment_amount: number;
  monthly_installment?: number;
  paid_amount: number;
  outstanding_amount: number;
  paid_installments_count: number;
  remaining_installments_count: number;
  total_profit?: number;
  total_paid_installments?: number;
  frequency?: string;
  start_date: string;
  next_due_date: string;
  status: ContractStatus;
  guarantor1?: Guarantor;
  guarantor2?: Guarantor;
  guarantor_1_name?: string;
  guarantor_1_phone?: string;
  guarantor_1_cnic?: string;
  guarantor_2_name?: string;
  guarantor_2_phone?: string;
  guarantor_2_cnic?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  schedule: InstallmentScheduleItem[];
}

export interface PaymentRecord {
  id: string;
  receipt_number: string;
  contract_id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  previous_balance: number;
  remaining_balance: number;
  schedule_id?: string;
  installment_schedule_id?: string;
  installment_number?: number;
  notes?: string;
  collected_by: string;
  created_at: string;
}

export type InstallmentPayment = PaymentRecord;

export type ExpenseCategory =
  | 'electricity'
  | 'rent'
  | 'salary'
  | 'transport'
  | 'maintenance'
  | 'marketing'
  | 'tea_snacks'
  | 'other'
  | string;

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date?: string;
  expense_date?: string;
  description?: string;
  notes?: string;
  payment_method?: string;
  added_by?: string;
  created_at: string;
}

export interface ReturnItem {
  id?: string;
  return_id?: string;
  product_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  amount?: number;
  refund_price?: number;
  reason?: string;
}

export interface ReturnRecord {
  id: string;
  return_number: string;
  sale_id?: string;
  invoice_number?: string;
  customer_id?: string;
  customer_name: string;
  return_type?: 'full' | 'partial';
  items: ReturnItem[];
  total_refund_amount: number;
  total_amount?: number;
  return_date?: string;
  reason: string;
  processed_by?: string;
  created_at: string;
}

export interface ShopSettings {
  shop_name: string;
  tagline: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  address: string;
  city: string;
  currency: string;
  tax_rate: number;
  invoice_footer_note: string;
  installment_terms: string;
  allow_partial_payments: boolean;
  overdue_grace_days: number;
  default_installment_profit_percentage?: number;
  default_down_payment_percentage?: number;
  late_penalty_per_month?: number;
}
