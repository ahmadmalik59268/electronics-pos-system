import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  Category,
  Customer,
  Expense,
  InstallmentContract,
  InstallmentScheduleItem,
  PaymentMethod,
  PaymentRecord,
  Product,
  Purchase,
  ReturnRecord,
  Sale,
  SaleItem,
  ShopSettings,
  Supplier,
  UserProfile,
  UserRole,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_CONTRACTS,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_PAYMENTS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASES,
  INITIAL_RETURNS,
  INITIAL_SALES,
  INITIAL_SETTINGS,
  INITIAL_USER,
  INITIAL_USERS,
  INITIAL_SUPPLIERS,
} from '../lib/demoData';
import {
  generateContractNumber,
  generateInvoiceNumber,
  generateReceiptNumber,
  generatePurchaseNumber,
  generateReturnNumber,
  generateUUID,
  isValidUUID,
  isDateOverdue,
} from '../lib/utils';
import {
  getSupabase,
  getSupabaseCredentials,
  syncLocalToSupabase,
  fetchSupabaseData,
} from '../lib/supabase';
import {
  supabaseSignIn,
  supabaseSignUp,
  supabaseResetPassword,
  supabaseSignOut,
  supabaseGetCurrentSession,
  getRegisteringState,
  isOwnerAccount,
} from '../lib/auth';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
}

export interface PrintModalState {
  isOpen: boolean;
  type: 'sale_invoice' | 'installment_contract' | 'payment_receipt' | 'installment_receipt' | 'customer_statement';
  data: any;
}

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  setUserRole: (role: UserRole) => void;
  users: UserProfile[];
  addUser: (user: Partial<UserProfile>) => void;
  updateUser: (id: string, user: Partial<UserProfile>) => void;
  switchUser: (user: UserProfile) => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;
  settings: ShopSettings;
  updateSettings: (newSettings: Partial<ShopSettings>) => void;

  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'sku'> & { sku?: string }) => Product;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, delta: number, reason?: string) => void;

  categories: Category[];
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'customer_code' | 'total_purchases' | 'total_paid' | 'total_outstanding' | 'created_at'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'created_at' | 'amount_payable'> & { amount_payable?: number }) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  sales: Sale[];
  createSale: (saleData: {
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    customer_cnic?: string;
    items: SaleItem[];
    discount?: number;
    tax?: number;
    payment_method: PaymentMethod;
    paid_amount: number;
    notes?: string;
  }) => Sale;

  contracts: InstallmentContract[];
  createInstallmentContract: (contractData: {
    customer_id: string;
    customer_name: string;
    customer_phone: string;
    customer_cnic: string;
    customer_address: string;
    items: SaleItem[];
    total_cash_price: number;
    total_installment_price: number;
    down_payment: number;
    duration_type: 'monthly' | 'weekly' | 'custom';
    duration_months: number;
    installment_count: number;
    start_date: string;
    guarantor1?: any;
    guarantor2?: any;
    notes?: string;
  }) => { contract: InstallmentContract; payment?: PaymentRecord };

  payments: PaymentRecord[];
  recordInstallmentPayment: (data: {
    contract_id: string;
    amount: number;
    payment_method: PaymentMethod;
    notes?: string;
  }) => PaymentRecord;

  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => void;
  deleteExpense: (id: string) => void;

  purchases: Purchase[];
  addPurchase: (purchase: Omit<Purchase, 'id' | 'purchase_number' | 'created_at'>) => void;
  createPurchase: (purchase: Omit<Purchase, 'id' | 'purchase_number' | 'created_at'>) => void;

  returns: ReturnRecord[];
  processReturn: (returnData: Omit<ReturnRecord, 'id' | 'return_number' | 'created_at'>) => void;
  createSalesReturn: (returnData: Omit<ReturnRecord, 'id' | 'return_number' | 'created_at'> & { restock_inventory?: boolean }) => void;

  printModal: PrintModalState;
  openPrintModal: (type: PrintModalState['type'], data: any) => void;
  closePrintModal: () => void;

  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], message: string, title?: string) => void;
  removeToast: (id: string) => void;

  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;

  resetToDemoData: () => void;
  activeView: string;
  setActiveView: (view: string) => void;

  stats: {
    todaySalesAmount: number;
    todayCashReceived: number;
    totalSalesAmount: number;
    totalProfit: number;
    totalExpenses: number;
    netProfit: number;
    totalCustomersCount: number;
    totalProductsCount: number;
    totalOutstandingInstallments: number;
    todayInstallmentCollections: number;
    overdueInstallmentsCount: number;
    overdueInstallmentsAmount: number;
    lowStockCount: number;
  };

  isSupabaseConfigured: boolean;
  syncToCloud: () => Promise<{ success: boolean; message: string; count?: number }>;
  loadFromCloud: () => Promise<{ success: boolean; message: string }>;

  isAuthenticated: boolean;
  authLoading: boolean;
  signInWithSupabase: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  signUpWithSupabase: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  resetPasswordWithSupabase: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOutUser: () => Promise<void>;

  isAdminUnlockOpen: boolean;
  setIsAdminUnlockOpen: (open: boolean) => void;
  claimAdminPrivileges: (pin?: string) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  SETTINGS: 'voltqist_settings_v1',
  PRODUCTS: 'voltqist_products_v1',
  CATEGORIES: 'voltqist_categories_v1',
  CUSTOMERS: 'voltqist_customers_v1',
  SUPPLIERS: 'voltqist_suppliers_v1',
  SALES: 'voltqist_sales_v1',
  CONTRACTS: 'voltqist_contracts_v1',
  PAYMENTS: 'voltqist_payments_v1',
  EXPENSES: 'voltqist_expenses_v1',
  PURCHASES: 'voltqist_purchases_v1',
  RETURNS: 'voltqist_returns_v1',
  THEME: 'voltqist_theme_v1',
  USER: 'voltqist_user_v1',
  USERS: 'voltqist_users_v1',
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null || saved === undefined) return defaultValue;
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback for non-JSON string values (like raw "light" or "dark")
      if (typeof defaultValue === 'string') {
        return saved as unknown as T;
      }
      return defaultValue;
    }
  } catch (err) {
    console.warn(`Error accessing storage key ${key}:`, err);
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error saving to storage key ${key}:`, err);
  }
}

export const EMPTY_USER: UserProfile = {
  id: '',
  email: '',
  name: '',
  full_name: '',
  role: 'employee',
  status: 'active',
  created_at: '',
};

const DEFAULT_ADMIN_USER: UserProfile = {
  id: 'usr_admin_01',
  name: 'Zohaib Dogar (Store Owner)',
  full_name: 'Zohaib Dogar (Store Owner)',
  email: 'admin@zohaibdogarelectronics.com',
  role: 'admin',
  status: 'active',
  created_at: new Date().toISOString(),
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_ADMIN_USER);
  const [actualRole, setActualRole] = useState<UserRole>('admin');
  const [isAdminUnlockOpen, setIsAdminUnlockOpen] = useState<boolean>(false);
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const loaded = loadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    if (Array.isArray(loaded)) {
      return loaded.map((u) => {
        if (u.id === 'usr_admin_01' || u.name.includes('Ahmad Malik')) {
          return { ...u, name: 'Zohaib Dogar (Shop Owner)', full_name: 'Zohaib Dogar (Shop Owner)', email: 'admin@zohaibdogarelectronics.com' };
        }
        return u;
      });
    }
    return loaded;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    loadFromStorage<'light' | 'dark'>(STORAGE_KEYS.THEME, 'light')
  );
  const [settings, setSettings] = useState<ShopSettings>(() => {
    const loaded = loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    if (!loaded || !loaded.shop_name || loaded.shop_name.includes('VoltQist') || loaded.shop_name.includes('ElectroPos')) {
      return {
        ...INITIAL_SETTINGS,
        ...(loaded || {}),
        shop_name: 'Zohaib Dogar Electronics',
        email: 'sales@zohaibdogarelectronics.com',
        invoice_footer_note: 'Thank you for shopping with Zohaib Dogar Electronics! Goods once sold on cash can be exchanged within 3 days with original receipt and intact warranty seal.',
      };
    }
    return loaded;
  });

  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS)
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    loadFromStorage(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES)
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadFromStorage(STORAGE_KEYS.CUSTOMERS, [])
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadFromStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS)
  );
  const [sales, setSales] = useState<Sale[]>(() =>
    loadFromStorage(STORAGE_KEYS.SALES, [])
  );
  const [contracts, setContracts] = useState<InstallmentContract[]>(() =>
    loadFromStorage(STORAGE_KEYS.CONTRACTS, [])
  );
  const [payments, setPayments] = useState<PaymentRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.PAYMENTS, [])
  );
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    loadFromStorage(STORAGE_KEYS.EXPENSES, [])
  );
  const [purchases, setPurchases] = useState<Purchase[]>(() =>
    loadFromStorage(STORAGE_KEYS.PURCHASES, [])
  );
  const [returns, setReturns] = useState<ReturnRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.RETURNS, [])
  );

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [printModal, setPrintModal] = useState<PrintModalState>({
    isOpen: false,
    type: 'sale_invoice',
    data: null,
  });

  // Supabase Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Initialize and check active Supabase Auth session on app startup
  useEffect(() => {
    let isMounted = true;

    const initAuthSession = async () => {
      try {
        const sessionData = await supabaseGetCurrentSession();
        if (sessionData && sessionData.user) {
          if (isMounted) {
            const isOwner = isOwnerAccount(sessionData.user.email);
            const resolvedRole: UserRole = isOwner ? 'admin' : sessionData.role;
            const activeUser: UserProfile = {
              id: sessionData.user.id,
              name: sessionData.fullName,
              full_name: sessionData.fullName,
              email: sessionData.user.email || '',
              role: resolvedRole,
              phone: sessionData.user.phone || '',
              status: 'active',
              created_at: sessionData.user.created_at || new Date().toISOString(),
            };
            setActualRole(resolvedRole);
            setCurrentUser(activeUser);
            setIsAuthenticated(true);
            if (resolvedRole === 'admin') {
              setActiveView('dashboard');
            } else {
              setActiveView('employee-dashboard');
            }
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(false);
            setCurrentUser(EMPTY_USER);
          }
        }
      } catch (err) {
        console.warn('Error checking Supabase session on startup:', err);
        if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUser(EMPTY_USER);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    initAuthSession();

    // Listen for real-time Supabase auth state changes
    const supabase = getSupabase();
    let subscription: any = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        // If a sign-up registration is in progress, ignore auto-login event and stay unauthenticated
        if (getRegisteringState()) {
          setIsAuthenticated(false);
          setCurrentUser(EMPTY_USER);
          setAuthLoading(false);
          return;
        }

        if (session?.user) {
          const sessionData = await supabaseGetCurrentSession();
          if (sessionData && isMounted) {
            const isOwner = isOwnerAccount(sessionData.user.email);
            const resolvedRole: UserRole = isOwner ? 'admin' : sessionData.role;
            const activeUser: UserProfile = {
              id: sessionData.user.id,
              name: sessionData.fullName,
              full_name: sessionData.fullName,
              email: sessionData.user.email || '',
              role: resolvedRole,
              phone: sessionData.user.phone || '',
              status: 'active',
              created_at: sessionData.user.created_at || new Date().toISOString(),
            };
            setActualRole(resolvedRole);
            setCurrentUser(activeUser);
            setIsAuthenticated(true);
            setAuthLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setIsAuthenticated(false);
            setCurrentUser(EMPTY_USER);
            setAuthLoading(false);
          }
        }
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signInWithSupabase = async (email: string, password: string) => {
    try {
      const { user, session, role, fullName } = await supabaseSignIn(email, password);
      const isOwner = isOwnerAccount(user.email || email);
      const effectiveRole: UserRole = isOwner ? 'admin' : role;
      const activeUser: UserProfile = {
        id: user.id,
        name: fullName,
        full_name: fullName,
        email: user.email || email,
        role: effectiveRole,
        status: 'active',
        created_at: user.created_at || new Date().toISOString(),
      };
      setActualRole(effectiveRole);
      setCurrentUser(activeUser);
      setIsAuthenticated(true);
      if (effectiveRole === 'admin') {
        setActiveView('dashboard');
      } else {
        setActiveView('employee-dashboard');
      }
      addToast('success', `Welcome back, ${fullName}! Logged in as ${effectiveRole === 'admin' ? 'Administrator' : 'Staff Employee'}.`, 'Signed In');
      return { success: true, role: effectiveRole };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  };

  const signUpWithSupabase = async (email: string, password: string, fullName: string, _role?: UserRole) => {
    try {
      const { user, requiresEmailVerification } = await supabaseSignUp(email, password, fullName);
      // Strictly do not authenticate on sign-up; user must manually sign in
      setIsAuthenticated(false);
      setCurrentUser(EMPTY_USER);
      return { success: true, requiresVerification: requiresEmailVerification };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  };

  const resetPasswordWithSupabase = async (email: string) => {
    try {
      await supabaseResetPassword(email);
      addToast('success', 'Password reset instructions have been sent to your email.', 'Email Sent');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', msg, 'Password Reset Error');
      return { success: false, error: msg };
    }
  };

  const signOutUser = async () => {
    try {
      await supabaseSignOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(EMPTY_USER);
      setActiveView('dashboard');
      addToast('info', 'You have been safely signed out.', 'Logged Out');
    }
  };

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
  }, [contracts]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
  }, [purchases]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  }, [suppliers]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Self-heal & sync: Ensure every customer with an installment contract appears in customers list as 'active'
  useEffect(() => {
    if (contracts.length === 0) return;
    setCustomers((prev) => {
      let changed = false;
      const updated = [...prev];

      contracts.forEach((contract) => {
        const custName = (contract.customer_name || '').trim();
        if (!custName) return;

        const existingIndex = updated.findIndex(
          (c) =>
            (contract.customer_id && c.id === contract.customer_id) ||
            (c.phone && contract.customer_phone && c.phone === contract.customer_phone) ||
            (c.cnic && contract.customer_cnic && c.cnic === contract.customer_cnic) ||
            ((c.name || c.full_name || '').trim().toLowerCase() === custName.toLowerCase())
        );

        if (existingIndex >= 0) {
          const cust = updated[existingIndex];
          const shouldBeActive = cust.status !== 'blacklisted';
          const newStatus = shouldBeActive ? 'active' : cust.status;
          const outstanding = Math.max(cust.total_outstanding || 0, contract.remaining_balance || contract.outstanding_amount || 0);
          const totalPurchased = Math.max(cust.total_purchased || cust.total_purchases || 0, contract.total_installment_price || 0);

          if (cust.status !== newStatus || cust.total_outstanding !== outstanding || (cust.total_purchased || 0) < totalPurchased) {
            updated[existingIndex] = {
              ...cust,
              status: newStatus,
              total_outstanding: outstanding,
              total_purchased: totalPurchased,
              total_purchases: totalPurchased,
            };
            changed = true;
          }
        } else {
          const brandNew: Customer = {
            id: contract.customer_id || generateUUID(),
            customer_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
            name: custName,
            full_name: custName,
            phone: contract.customer_phone || '0300-0000000',
            cnic: contract.customer_cnic || 'N/A',
            address: contract.customer_address || 'Lahore',
            city: 'Lahore',
            total_purchases: contract.total_installment_price || 0,
            total_purchased: contract.total_installment_price || 0,
            total_paid: contract.paid_amount || contract.down_payment || 0,
            total_outstanding: contract.remaining_balance || contract.outstanding_amount || 0,
            status: 'active',
            created_at: contract.created_at || new Date().toISOString(),
          };
          updated.unshift(brandNew);
          changed = true;
        }
      });

      if (changed) {
        saveToStorage(STORAGE_KEYS.CUSTOMERS, updated);
        return updated;
      }
      return prev;
    });
  }, [contracts]);

  // Apply dark mode class to root HTML
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));
  }, [theme]);

  // Toast notifications
  const addToast = (type: ToastMessage['type'], message: string, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Toggle theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Switch / Update User
  const setUserRole = (role: UserRole) => {
    if (role === 'admin') {
      const email = (currentUser.email || '').trim().toLowerCase();
      const isOwner = isOwnerAccount(email);
      if (!isOwner && actualRole !== 'admin') {
        addToast('error', 'Access Denied: Only the verified store administrator (ahmadmalik59268@gmail.com) can access Admin Mode.', 'Permission Denied');
        return;
      }
      setActualRole('admin');
      const updated: UserProfile = {
        ...currentUser,
        role: 'admin',
        name: currentUser.name || (isOwner ? 'Ahmad Malik (Store Owner)' : 'Store Administrator'),
        full_name: currentUser.full_name || currentUser.name || (isOwner ? 'Ahmad Malik (Store Owner)' : 'Store Administrator'),
      };
      setCurrentUser(updated);
      setActiveView('dashboard');
      addToast('success', 'Admin Dashboard Active', 'Admin Mode Active');
      return;
    }

    // Switch to employee / staff cashier view
    const updated = { ...currentUser, role: 'employee' as UserRole };
    setCurrentUser(updated);
    setActiveView('employee-dashboard');
    addToast('info', 'Switched to Staff Cashier View', 'Staff Mode');
  };

  const claimAdminPrivileges = async (_pin?: string): Promise<{ success: boolean; error?: string }> => {
    const email = (currentUser.email || '').trim().toLowerCase();
    const isOwner = isOwnerAccount(email);

    if (!isOwner && actualRole !== 'admin') {
      const errMsg = 'Access Denied: Only the verified store administrator (ahmadmalik59268@gmail.com) has Administrator privileges.';
      addToast('error', errMsg, 'Access Denied');
      return { success: false, error: errMsg };
    }

    setActualRole('admin');
    const updatedUser: UserProfile = {
      ...currentUser,
      role: 'admin',
      name: currentUser.name || (isOwner ? 'Ahmad Malik (Store Owner)' : 'Store Administrator'),
      full_name: currentUser.full_name || currentUser.name || (isOwner ? 'Ahmad Malik (Store Owner)' : 'Store Administrator'),
    };
    setCurrentUser(updatedUser);
    setActiveView('dashboard');

    const supabase = getSupabase();
    if (supabase && currentUser.id && isOwner) {
      try {
        await supabase
          .from('profiles')
          .update({ role: 'admin', updated_at: new Date().toISOString() })
          .eq('id', currentUser.id);
      } catch (err) {
        console.warn('Could not sync admin role to Supabase profile:', err);
      }
    }

    addToast(
      'success',
      'Administrator access active! Full shop analytics, profit/loss, inventory purchase prices, and store settings are accessible.',
      'Admin Access Active'
    );
    setIsAdminUnlockOpen(false);
    return { success: true };
  };

  const switchUser = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const addUser = (userData: Partial<UserProfile>) => {
    // Standard new users are employee unless created by an admin
    const assignedRole = (actualRole === 'admin' && userData.role === 'admin') ? 'admin' : 'employee';
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      email: userData.email || `${userData.username || 'user'}@voltqist.com`,
      name: userData.full_name || userData.name || 'Staff User',
      full_name: userData.full_name || userData.name || 'Staff User',
      username: userData.username || 'user',
      role: assignedRole,
      phone: userData.phone || '',
      status: userData.status || 'active',
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    addToast('success', `User account ${newUser.full_name} created!`);
  };

  const updateUser = async (id: string, updatedFields: Partial<UserProfile>) => {
    // Only an existing admin should be able to create/promote another admin
    if (actualRole !== 'admin' && updatedFields.role === 'admin') {
      addToast('error', 'Only an existing administrator can promote another user to Admin.', 'Permission Denied');
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updatedFields, name: updatedFields.full_name || u.name } : u))
    );
    if (currentUser.id === id) {
      setCurrentUser((prev) => ({ ...prev, ...updatedFields }));
    }

    // Sync role change to Supabase profiles table
    const supabase = getSupabase();
    if (supabase && updatedFields.role) {
      try {
        await supabase
          .from('profiles')
          .update({
            role: updatedFields.role,
            full_name: updatedFields.full_name,
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${id},email.eq.${updatedFields.email || ''}`);
      } catch (err) {
        console.warn('Could not sync profile role update to Supabase:', err);
      }
    }

    addToast('success', 'User profile updated.');
  };

  // Settings
  const updateSettings = async (newSettings: Partial<ShopSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    });
    addToast('success', 'Store settings and rules saved successfully!', 'Settings Updated');

    const supabase = getSupabase();
    if (supabase) {
      try {
        const merged = { ...settings, ...newSettings };
        await supabase.from('shop_settings').upsert({
          id: 'current',
          settings: merged,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Could not save shop settings to Supabase:', err);
      }
    }
  };

  // Products
  const addProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'sku'> & { sku?: string }): Promise<Product> => {
    const rawData = productData as any;
    const sku =
      productData.sku ||
      `${(productData.brand || 'PRD').slice(0, 3).toUpperCase()}-${(productData.model || 'MOD').slice(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newProductId = isValidUUID(rawData.id) ? rawData.id : generateUUID();
    const matchedCategory = categories.find((c) => c.name === productData.category || c.id === rawData.category_id);
    const category_id = isValidUUID(rawData.category_id) ? rawData.category_id : matchedCategory?.id && isValidUUID(matchedCategory.id) ? matchedCategory.id : null;

    let warrantyMonths = 12;
    if (typeof productData.warranty_months === 'number') {
      warrantyMonths = productData.warranty_months;
    } else if (productData.warranty_period) {
      const num = parseInt(productData.warranty_period.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) warrantyMonths = num;
    }

    const newProduct: Product = {
      ...productData,
      id: newProductId,
      category_id: category_id || undefined,
      warranty_months: warrantyMonths,
      sku,
      status: productData.stock_quantity > 0 ? 'active' : 'out_of_stock',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);
    addToast('success', `Product "${newProduct.name}" added with SKU ${newProduct.sku}`, 'Product Created');

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('products').insert({
        id: newProduct.id,
        name: newProduct.name,
        category_id: category_id,
        brand: newProduct.brand || '',
        model: newProduct.model || '',
        sku: newProduct.sku,
        imei: newProduct.imei || null,
        serial_number: newProduct.serial_number || null,
        purchase_price: newProduct.purchase_price || 0,
        cash_price: newProduct.cash_price || 0,
        installment_price: newProduct.installment_price || newProduct.cash_price || 0,
        stock_quantity: Math.max(0, newProduct.stock_quantity ?? 0),
        minimum_stock: newProduct.minimum_stock ?? newProduct.min_stock_level ?? 2,
        warranty_months: warrantyMonths,
        image_url: newProduct.image_url || null,
      });
      if (error) {
        addToast('error', `Supabase Product Insert Error: ${error.message}`);
      }
    }

    return newProduct;
  };

  const updateProduct = async (id: string, updatedFields: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = {
            ...p,
            ...updatedFields,
            updated_at: new Date().toISOString(),
          };
          if (updated.stock_quantity <= 0) {
            updated.status = 'out_of_stock';
          } else if (updated.status === 'out_of_stock' && updated.stock_quantity > 0) {
            updated.status = 'active';
          }
          return updated;
        }
        return p;
      })
    );
    addToast('success', 'Product details updated successfully.', 'Product Updated');

    const supabase = getSupabase();
    if (supabase) {
      const updatePayload: any = {};
      if (updatedFields.name !== undefined) updatePayload.name = updatedFields.name;
      if (updatedFields.brand !== undefined) updatePayload.brand = updatedFields.brand;
      if (updatedFields.model !== undefined) updatePayload.model = updatedFields.model;
      if (updatedFields.sku !== undefined) updatePayload.sku = updatedFields.sku;
      if (updatedFields.imei !== undefined) updatePayload.imei = updatedFields.imei || null;
      if (updatedFields.serial_number !== undefined) updatePayload.serial_number = updatedFields.serial_number || null;
      if (updatedFields.purchase_price !== undefined) updatePayload.purchase_price = updatedFields.purchase_price;
      if (updatedFields.cash_price !== undefined) updatePayload.cash_price = updatedFields.cash_price;
      if (updatedFields.installment_price !== undefined) updatePayload.installment_price = updatedFields.installment_price;
      if (updatedFields.stock_quantity !== undefined) updatePayload.stock_quantity = updatedFields.stock_quantity;
      if (updatedFields.min_stock_level !== undefined || updatedFields.minimum_stock !== undefined) {
        updatePayload.minimum_stock = updatedFields.minimum_stock ?? updatedFields.min_stock_level;
      }
      if (updatedFields.category_id !== undefined && isValidUUID(updatedFields.category_id)) {
        updatePayload.category_id = updatedFields.category_id;
      }
      if (updatedFields.image_url !== undefined) updatePayload.image_url = updatedFields.image_url;

      const { error } = await supabase.from('products').update(updatePayload).eq('id', id);
      if (error) {
        addToast('error', `Supabase Product Update Error: ${error.message}`);
      }
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast('info', 'Product removed from catalog.', 'Product Deleted');

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        addToast('error', `Supabase Product Delete Error: ${error.message}`);
      }
    }
  };

  const adjustStock = (id: string, delta: number, reason = 'Manual Adjustment') => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newQty = Math.max(0, p.stock_quantity + delta);
          return {
            ...p,
            stock_quantity: newQty,
            status: newQty > 0 ? 'active' : 'out_of_stock',
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      })
    );
    addToast('info', `Stock updated (${delta > 0 ? '+' : ''}${delta} units) - ${reason}`, 'Stock Adjusted');
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('products').select('stock_quantity').eq('id', id).single().then(({ data }) => {
        if (data) {
          const newQty = Math.max(0, (data.stock_quantity || 0) + delta);
          supabase.from('products').update({ stock_quantity: newQty }).eq('id', id);
        }
      });
    }
  };

  // Categories
  const addCategory = async (categoryData: Omit<Category, 'id' | 'created_at'>) => {
    const newCatId = generateUUID();
    const newCat: Category = {
      ...categoryData,
      id: newCatId,
      created_at: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);
    addToast('success', `Category "${newCat.name}" added.`);

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('categories').insert({
        id: newCat.id,
        name: newCat.name,
      });
      if (error) {
        addToast('error', `Supabase Category Insert Error: ${error.message}`);
      }
    }
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...category } : c)));
    const supabase = getSupabase();
    if (supabase && category.name) {
      const { error } = await supabase.from('categories').update({ name: category.name }).eq('id', id);
      if (error) {
        addToast('error', `Supabase Category Update Error: ${error.message}`);
      }
    }
  };

  const deleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        addToast('error', `Supabase Category Delete Error: ${error.message}`);
      }
    }
  };

  // Customers
  const addCustomer = async (
    customerData: Omit<Customer, 'id' | 'customer_code' | 'total_purchases' | 'total_paid' | 'total_outstanding' | 'created_at'>
  ): Promise<Customer> => {
    const customer_code = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullName = customerData.full_name || customerData.name || '';
    const newCustomer: Customer = {
      ...customerData,
      id: generateUUID(),
      customer_code,
      name: fullName,
      full_name: fullName,
      phone: customerData.phone || '',
      cnic: customerData.cnic || 'N/A',
      address: customerData.address || 'Lahore',
      city: customerData.city || 'Lahore',
      total_purchases: 0,
      total_purchased: 0,
      total_paid: 0,
      total_outstanding: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    setCustomers((prev) => {
      const updated = [newCustomer, ...prev.filter((c) => c.phone !== newCustomer.phone || !newCustomer.phone)];
      saveToStorage(STORAGE_KEYS.CUSTOMERS, updated);
      return updated;
    });

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('customers').insert({
        id: newCustomer.id,
        name: fullName,
        phone: newCustomer.phone,
        alternate_phone: newCustomer.alternate_phone || null,
        address: newCustomer.address,
        city: newCustomer.city,
        notes: newCustomer.notes || null,
      });

      if (error) {
        addToast('error', `Supabase Customer Insert Error: ${error.message}`, 'Customer Error');
      } else {
        addToast('success', `${fullName} added and saved to Supabase!`, 'Customer Added');
      }
    } else {
      addToast('success', `${fullName} saved locally. Active status assigned.`, 'Customer Added');
    }

    return newCustomer;
  };

  const updateCustomer = async (id: string, customerData: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...customerData } : c)));
    const supabase = getSupabase();
    if (supabase) {
      const updatePayload: any = {};
      if (customerData.name !== undefined) updatePayload.name = customerData.name;
      if (customerData.full_name !== undefined) updatePayload.name = customerData.full_name;
      if (customerData.phone !== undefined) updatePayload.phone = customerData.phone;
      if (customerData.alternate_phone !== undefined) updatePayload.alternate_phone = customerData.alternate_phone;
      if (customerData.address !== undefined) updatePayload.address = customerData.address;
      if (customerData.city !== undefined) updatePayload.city = customerData.city;
      if (customerData.notes !== undefined) updatePayload.notes = customerData.notes;

      const { error } = await supabase.from('customers').update(updatePayload).eq('id', id);
      if (error) {
        addToast('error', `Supabase Update Error: ${error.message}`, 'Update Failed');
      } else {
        addToast('success', 'Customer record updated and saved to Supabase.');
      }
    } else {
      addToast('success', 'Customer record updated.');
    }
  };

  const deleteCustomer = async (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) {
        addToast('error', `Supabase Delete Error: ${error.message}`, 'Delete Failed');
      } else {
        addToast('info', 'Customer removed from Supabase database.');
      }
    } else {
      addToast('info', 'Customer removed.');
    }
  };

  // Suppliers
  const addSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at' | 'amount_payable'> & { amount_payable?: number }) => {
    const newSupplierId = generateUUID();
    const newSupplier: Supplier = {
      ...supplierData,
      id: newSupplierId,
      company: supplierData.company || supplierData.company_name || supplierData.name,
      company_name: supplierData.company_name || supplierData.company || supplierData.name,
      amount_payable: supplierData.amount_payable || 0,
      balance: supplierData.amount_payable || 0,
      created_at: new Date().toISOString(),
    };
    setSuppliers((prev) => [...prev, newSupplier]);
    addToast('success', `Supplier "${newSupplier.name}" added.`);

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('suppliers').insert({
        id: newSupplier.id,
        name: newSupplier.name,
        company: newSupplier.company,
        phone: newSupplier.phone || '',
        address: newSupplier.address || null,
        notes: newSupplier.notes || newSupplier.products_supplied || null,
      });
      if (error) {
        addToast('error', `Supabase Supplier Insert Error: ${error.message}`);
      }
    }
  };

  const updateSupplier = async (id: string, supplierData: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...supplierData } : s)));
    const supabase = getSupabase();
    if (supabase) {
      const updatePayload: any = {};
      if (supplierData.name !== undefined) updatePayload.name = supplierData.name;
      if (supplierData.company !== undefined || supplierData.company_name !== undefined) {
        updatePayload.company = supplierData.company || supplierData.company_name;
      }
      if (supplierData.phone !== undefined) updatePayload.phone = supplierData.phone;
      if (supplierData.address !== undefined) updatePayload.address = supplierData.address;
      if (supplierData.notes !== undefined) updatePayload.notes = supplierData.notes;

      const { error } = await supabase.from('suppliers').update(updatePayload).eq('id', id);
      if (error) {
        addToast('error', `Supabase Supplier Update Error: ${error.message}`);
      }
    }
  };

  const deleteSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) {
        addToast('error', `Supabase Supplier Delete Error: ${error.message}`);
      }
    }
  };

  // POS Sales
  const createSale = async (saleData: {
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    customer_cnic?: string;
    items: SaleItem[];
    discount?: number;
    tax?: number;
    payment_method: PaymentMethod;
    paid_amount: number;
    notes?: string;
  }): Promise<Sale> => {
    const invoice_number = generateInvoiceNumber();
    const subtotal = saleData.items.reduce((acc, it) => acc + it.total, 0);
    const discount = saleData.discount || 0;
    const tax = saleData.tax || 0;
    const total_amount = subtotal - discount + tax;
    const total_cost = saleData.items.reduce((acc, it) => acc + (it.purchase_price || 0) * it.quantity, 0);
    const profit = total_amount - total_cost;
    const change_amount = Math.max(0, saleData.paid_amount - total_amount);
    const saleId = generateUUID();

    const newSale: Sale = {
      id: saleId,
      invoice_number,
      sale_type: 'cash',
      customer_id: isValidUUID(saleData.customer_id) ? saleData.customer_id : undefined,
      customer_name: saleData.customer_name,
      customer_phone: saleData.customer_phone,
      customer_cnic: saleData.customer_cnic,
      items: saleData.items,
      subtotal,
      discount,
      discount_amount: discount,
      tax,
      tax_amount: tax,
      total_amount,
      total_cost,
      paid_amount: saleData.paid_amount,
      change_amount,
      payment_method: saleData.payment_method,
      payment_status: 'paid',
      profit,
      notes: saleData.notes,
      cashier_name: currentUser.name || currentUser.full_name || 'Staff',
      created_at: new Date().toISOString(),
    };

    // Deduct stock for sold items
    setProducts((prev) =>
      prev.map((p) => {
        const soldItem = saleData.items.find((it) => it.product_id === p.id);
        if (soldItem) {
          const newStock = Math.max(0, p.stock_quantity - soldItem.quantity);
          return {
            ...p,
            stock_quantity: newStock,
            status: newStock === 0 ? 'out_of_stock' : 'active',
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    // Update customer total purchases if linked
    if (saleData.customer_id) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === saleData.customer_id
            ? {
                ...c,
                total_purchases: (c.total_purchases || 0) + total_amount,
                total_purchased: (c.total_purchased || 0) + total_amount,
                total_paid: (c.total_paid || 0) + total_amount,
              }
            : c
        )
      );
    }

    setSales((prev) => [newSale, ...prev]);
    addToast('success', `Invoice #${invoice_number} generated successfully!`, 'Cash Sale Completed');

    const supabase = getSupabase();
    if (supabase) {
      const { error: saleErr } = await supabase.from('sales').insert({
        id: newSale.id,
        invoice_number: newSale.invoice_number,
        customer_id: isValidUUID(newSale.customer_id) ? newSale.customer_id : null,
        sale_type: 'cash',
        subtotal: newSale.subtotal,
        discount: newSale.discount,
        total_amount: newSale.total_amount,
        paid_amount: newSale.paid_amount,
        remaining_amount: Math.max(0, newSale.total_amount - newSale.paid_amount),
        payment_method: newSale.payment_method || 'cash',
        created_at: newSale.created_at,
      });

      if (saleErr) {
        addToast('error', `Supabase Sale Insert Error: ${saleErr.message}`);
      } else {
        // Insert sale items
        if (newSale.items && newSale.items.length > 0) {
          const saleItemRows = newSale.items.map((it) => ({
            id: generateUUID(),
            sale_id: newSale.id,
            product_id: isValidUUID(it.product_id) ? it.product_id : null,
            quantity: it.quantity || 1,
            unit_price: it.unit_price || it.price || 0,
            purchase_price: it.purchase_price || 0,
            total_price: it.total || (it.unit_price || 0) * (it.quantity || 1),
          }));
          await supabase.from('sale_items').insert(saleItemRows);
        }

        // Update product stocks in Supabase
        for (const it of newSale.items) {
          if (it.product_id && isValidUUID(it.product_id)) {
            const { data: prodData } = await supabase.from('products').select('stock_quantity').eq('id', it.product_id).single();
            if (prodData) {
              const newQty = Math.max(0, (prodData.stock_quantity || 0) - (it.quantity || 1));
              await supabase.from('products').update({ stock_quantity: newQty }).eq('id', it.product_id);
            }
          }
        }
      }
    }

    return newSale;
  };

  // Installment Contract Generation
  const createInstallmentContract = async (contractData: {
    customer_id: string;
    customer_name: string;
    customer_phone: string;
    customer_cnic: string;
    customer_address: string;
    items: SaleItem[];
    total_cash_price: number;
    total_installment_price: number;
    down_payment: number;
    duration_type: 'monthly' | 'weekly' | 'custom';
    duration_months: number;
    installment_count: number;
    start_date: string;
    guarantor1?: any;
    guarantor2?: any;
    notes?: string;
  }) => {
    const contract_number = generateContractNumber();
    const remaining_balance = Math.max(0, contractData.total_installment_price - contractData.down_payment);
    const count = Math.max(1, contractData.installment_count || 1);
    const installment_amount = Math.round(remaining_balance / count);
    const product_summary = contractData.items.map((i) => `${i.product_name} (${i.quantity})`).join(', ');

    // Generate monthly or weekly repayment schedule
    const schedule: InstallmentScheduleItem[] = [];
    const startDateObj = new Date(contractData.start_date || new Date().toISOString().split('T')[0]);
    const contractId = generateUUID();

    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(startDateObj);
      if (contractData.duration_type === 'weekly') {
        dueDate.setDate(dueDate.getDate() + i * 7);
      } else {
        dueDate.setMonth(dueDate.getMonth() + i);
      }
      const isLast = i === count;
      const amount_due = isLast
        ? remaining_balance - installment_amount * (count - 1)
        : installment_amount;

      schedule.push({
        id: generateUUID(),
        contract_id: contractId,
        installment_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        amount_due,
        amount_paid: 0,
        remaining_amount: amount_due,
        status: 'pending',
      });
    }

    const next_due_date = schedule[0]?.due_date || new Date().toISOString().split('T')[0];

    const newContract: InstallmentContract = {
      id: contractId,
      contract_number,
      customer_id: contractData.customer_id,
      customer_name: contractData.customer_name,
      customer_phone: contractData.customer_phone,
      customer_cnic: contractData.customer_cnic,
      customer_address: contractData.customer_address,
      items: contractData.items,
      product_summary,
      total_cash_price: contractData.total_cash_price,
      total_installment_price: contractData.total_installment_price,
      down_payment: contractData.down_payment,
      remaining_balance,
      duration_type: contractData.duration_type,
      duration_months: contractData.duration_months,
      installment_count: contractData.installment_count,
      installment_amount,
      monthly_installment: installment_amount,
      paid_amount: contractData.down_payment,
      outstanding_amount: remaining_balance,
      paid_installments_count: 0,
      remaining_installments_count: contractData.installment_count,
      total_profit: contractData.total_installment_price - contractData.total_cash_price,
      total_paid_installments: 0,
      start_date: contractData.start_date,
      next_due_date,
      status: 'active',
      guarantor1: contractData.guarantor1,
      guarantor2: contractData.guarantor2,
      guarantor_1_name: contractData.guarantor1?.name,
      guarantor_1_phone: contractData.guarantor1?.phone,
      guarantor_1_cnic: contractData.guarantor1?.cnic,
      guarantor_2_name: contractData.guarantor2?.name,
      guarantor_2_phone: contractData.guarantor2?.phone,
      guarantor_2_cnic: contractData.guarantor2?.cnic,
      notes: contractData.notes,
      created_by: currentUser.name || currentUser.full_name || 'Staff',
      created_at: new Date().toISOString(),
      schedule,
    };

    // 1. Update local React state & LocalStorage immediately FIRST
    setContracts((prev) => {
      const updated = [newContract, ...prev];
      saveToStorage(STORAGE_KEYS.CONTRACTS, updated);
      return updated;
    });

    // Deduct stock
    setProducts((prev) => {
      const updated = prev.map((p) => {
        const soldItem = contractData.items.find((it) => it.product_id === p.id);
        if (soldItem) {
          const newStock = Math.max(0, p.stock_quantity - soldItem.quantity);
          return {
            ...p,
            stock_quantity: newStock,
            status: newStock === 0 ? 'out_of_stock' as const : 'active' as const,
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      });
      saveToStorage(STORAGE_KEYS.PRODUCTS, updated);
      return updated;
    });

    // Update or add customer to active customers state
    setCustomers((prev) => {
      let customerFound = false;
      const updated = prev.map((c) => {
        const matches =
          (contractData.customer_id && c.id === contractData.customer_id) ||
          (contractData.customer_phone && c.phone === contractData.customer_phone) ||
          (contractData.customer_cnic && c.cnic && c.cnic === contractData.customer_cnic);

        if (matches) {
          customerFound = true;
          return {
            ...c,
            status: 'active' as const,
            total_purchases: (c.total_purchases || 0) + contractData.total_installment_price,
            total_purchased: (c.total_purchased || 0) + contractData.total_installment_price,
            total_paid: (c.total_paid || 0) + contractData.down_payment,
            total_outstanding: (c.total_outstanding || 0) + remaining_balance,
          };
        }
        return c;
      });

      if (!customerFound && contractData.customer_name) {
        const brandNewCustomer: Customer = {
          id: contractData.customer_id || generateUUID(),
          customer_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
          name: contractData.customer_name,
          full_name: contractData.customer_name,
          phone: contractData.customer_phone || '',
          cnic: contractData.customer_cnic || '',
          address: contractData.customer_address || '',
          city: 'Lahore',
          total_purchases: contractData.total_installment_price,
          total_purchased: contractData.total_installment_price,
          total_paid: contractData.down_payment,
          total_outstanding: remaining_balance,
          status: 'active',
          created_at: new Date().toISOString(),
        };
        updated.unshift(brandNewCustomer);
      }

      saveToStorage(STORAGE_KEYS.CUSTOMERS, updated);
      return updated;
    });

    // Add installment transaction to sales history
    const saleId = generateUUID();
    const invoiceNumber = generateInvoiceNumber();
    const newInstallmentSale: Sale = {
      id: saleId,
      invoice_number: invoiceNumber,
      sale_type: 'installment',
      customer_id: contractData.customer_id,
      customer_name: contractData.customer_name,
      customer_phone: contractData.customer_phone,
      customer_cnic: contractData.customer_cnic,
      items: contractData.items,
      subtotal: contractData.total_cash_price,
      discount: 0,
      tax: 0,
      total_amount: contractData.total_installment_price,
      paid_amount: contractData.down_payment,
      change_amount: 0,
      payment_method: 'cash',
      profit: contractData.total_installment_price - contractData.total_cash_price,
      notes: contractData.notes || `Installment Contract #${contract_number}`,
      cashier_name: currentUser.name || currentUser.full_name || 'Staff',
      created_at: new Date().toISOString(),
    };
    setSales((prev) => {
      const updated = [newInstallmentSale, ...prev];
      saveToStorage(STORAGE_KEYS.SALES, updated);
      return updated;
    });

    // Down payment receipt
    let downPaymentReceipt: PaymentRecord | undefined;
    if (contractData.down_payment > 0) {
      downPaymentReceipt = {
        id: generateUUID(),
        receipt_number: generateReceiptNumber(),
        contract_id: newContract.id,
        contract_number: newContract.contract_number,
        customer_id: contractData.customer_id,
        customer_name: contractData.customer_name,
        customer_phone: contractData.customer_phone,
        amount: contractData.down_payment,
        payment_date: new Date().toISOString(),
        payment_method: 'cash',
        previous_balance: contractData.total_installment_price,
        remaining_balance,
        notes: 'Initial Down Payment / Advance for Installment Contract',
        collected_by: currentUser.name || currentUser.full_name || 'Staff',
        created_at: new Date().toISOString(),
      };
      setPayments((prev) => {
        const updated = [downPaymentReceipt!, ...prev];
        saveToStorage(STORAGE_KEYS.PAYMENTS, updated);
        return updated;
      });
    }

    addToast(
      'success',
      `Installment Contract #${contract_number} booked successfully! Down payment: Rs. ${contractData.down_payment.toLocaleString()}`,
      'Qist Contract Created'
    );

    // 2. Async Cloud Sync to Supabase in background
    const supabase = getSupabase();
    if (supabase) {
      try {
        const saleId = generateUUID();
        const saleCustomerId = isValidUUID(contractData.customer_id) ? contractData.customer_id : null;

        const { error: saleError } = await supabase.from('sales').insert({
          id: saleId,
          invoice_number: generateInvoiceNumber(),
          customer_id: saleCustomerId,
          sale_type: 'installment',
          subtotal: contractData.total_cash_price,
          discount: 0,
          total_amount: contractData.total_installment_price,
          paid_amount: contractData.down_payment,
          remaining_amount: Math.max(0, contractData.total_installment_price - contractData.down_payment),
          payment_method: 'cash',
          created_at: new Date().toISOString(),
        });

        if (saleError) {
          console.warn('Supabase installment sale notice:', saleError.message);
        } else if (contractData.items && contractData.items.length > 0) {
          const saleItemRows = contractData.items.map((it) => ({
            id: generateUUID(),
            sale_id: saleId,
            product_id: isValidUUID(it.product_id) ? it.product_id : null,
            quantity: it.quantity || 1,
            unit_price: it.unit_price || it.installment_price || it.price || 0,
            purchase_price: it.purchase_price || 0,
            total_price: it.total || (it.unit_price || 0) * (it.quantity || 1),
          }));
          await supabase.from('sale_items').insert(saleItemRows);
        }

        const { error: contractError } = await supabase.from('installment_contracts').insert({
          id: newContract.id,
          contract_number: newContract.contract_number,
          customer_id: saleCustomerId,
          sale_id: saleId,
          total_price: newContract.total_installment_price,
          down_payment: newContract.down_payment,
          remaining_amount: newContract.remaining_balance,
          duration_months: newContract.duration_months || newContract.installment_count || 12,
          installment_amount: newContract.installment_amount,
          frequency: newContract.duration_type === 'weekly' ? 'weekly' : 'monthly',
          start_date: newContract.start_date ? newContract.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
          status: 'active',
        });

        if (contractError) {
          addToast('error', `Supabase Contract Insert Error: ${contractError.message}`);
        } else {
          // Insert schedule items into installment_schedule
          const scheduleRows = schedule.map((s) => ({
            id: s.id,
            contract_id: contractId,
            installment_number: s.installment_number,
            due_date: s.due_date ? s.due_date.split('T')[0] : new Date().toISOString().split('T')[0],
            amount: s.amount_due,
            paid_amount: s.amount_paid || 0,
            remaining_amount: s.remaining_amount,
            status: 'pending',
          }));
          const { error: schedError } = await supabase.from('installment_schedule').insert(scheduleRows);
          if (schedError) {
            console.warn('Supabase Schedule notice:', schedError.message);
          }

          // If down payment was made, record in payments table
          if (downPaymentReceipt) {
            await supabase.from('payments').insert({
              id: downPaymentReceipt.id,
              receipt_number: downPaymentReceipt.receipt_number,
              customer_id: saleCustomerId,
              contract_id: newContract.id,
              schedule_id: null,
              amount: downPaymentReceipt.amount,
              payment_method: downPaymentReceipt.payment_method || 'cash',
              notes: downPaymentReceipt.notes || 'Advance / Down payment',
              payment_date: downPaymentReceipt.payment_date ? downPaymentReceipt.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
            });
          }
        }
      } catch (cloudErr: any) {
        console.warn('Supabase cloud background sync warning:', cloudErr);
      }
    }

    return { contract: newContract, payment: downPaymentReceipt };
  };

  // Record Installment Payment
  const recordInstallmentPayment = async (data: {
    contract_id: string;
    amount: number;
    payment_method: PaymentMethod;
    notes?: string;
  }): Promise<PaymentRecord> => {
    const contract = contracts.find((c) => c.id === data.contract_id);
    if (!contract) {
      throw new Error('Contract not found');
    }

    const receipt_number = generateReceiptNumber();
    const currentOutstanding = contract.outstanding_amount ?? contract.remaining_balance ?? 0;
    const previous_balance = currentOutstanding;
    const paymentAmount = Math.max(0, data.amount);
    const new_outstanding = Math.max(0, previous_balance - paymentAmount);

    // Distribute payment across schedule items
    let remainingPaymentToAllocate = paymentAmount;
    let targetScheduleId: string | null = null;

    const updatedSchedule = (contract.schedule || []).map((sch) => {
      if (remainingPaymentToAllocate <= 0 || sch.status === 'paid') return sch;

      if (!targetScheduleId && isValidUUID(sch.id)) {
        targetScheduleId = sch.id;
      }

      const currentDueOnItem = sch.amount_due - (sch.amount_paid || 0);
      if (remainingPaymentToAllocate >= currentDueOnItem) {
        remainingPaymentToAllocate -= currentDueOnItem;
        return {
          ...sch,
          amount_paid: sch.amount_due,
          remaining_amount: 0,
          status: 'paid' as const,
          paid_date: new Date().toISOString(),
        };
      } else {
        const newPaid = (sch.amount_paid || 0) + remainingPaymentToAllocate;
        remainingPaymentToAllocate = 0;
        return {
          ...sch,
          amount_paid: newPaid,
          remaining_amount: Math.max(0, sch.amount_due - newPaid),
          status: 'partially_paid' as const,
        };
      }
    });

    const totalInstallmentsPaidSum = updatedSchedule.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
    const paidInstallmentsCount = updatedSchedule.filter((s) => s.status === 'paid').length;
    const nextUnpaid = updatedSchedule.find((s) => s.status !== 'paid');
    const isCompleted = new_outstanding <= 0;

    const updatedContract: InstallmentContract = {
      ...contract,
      paid_amount: (contract.down_payment || 0) + totalInstallmentsPaidSum,
      outstanding_amount: new_outstanding,
      remaining_balance: new_outstanding,
      paid_installments_count: paidInstallmentsCount,
      total_paid_installments: totalInstallmentsPaidSum,
      remaining_installments_count: Math.max(0, (contract.installment_count || updatedSchedule.length) - paidInstallmentsCount),
      next_due_date: nextUnpaid ? nextUnpaid.due_date : contract.next_due_date,
      status: isCompleted ? 'completed' : 'active',
      schedule: updatedSchedule,
    };

    const newPayment: PaymentRecord = {
      id: generateUUID(),
      receipt_number,
      contract_id: contract.id,
      contract_number: contract.contract_number,
      customer_id: contract.customer_id,
      customer_name: contract.customer_name,
      customer_phone: contract.customer_phone,
      amount: paymentAmount,
      payment_date: new Date().toISOString(),
      payment_method: data.payment_method,
      previous_balance,
      remaining_balance: new_outstanding,
      notes: data.notes || `Installment collection for contract ${contract.contract_number}`,
      collected_by: currentUser.name || currentUser.full_name || 'Staff',
      created_at: new Date().toISOString(),
    };

    // 1. Update Local React State & LocalStorage FIRST
    setContracts((prev) => {
      const updated = prev.map((c) => (c.id === contract.id ? updatedContract : c));
      saveToStorage(STORAGE_KEYS.CONTRACTS, updated);
      return updated;
    });

    setPayments((prev) => {
      const updated = [newPayment, ...prev];
      saveToStorage(STORAGE_KEYS.PAYMENTS, updated);
      return updated;
    });

    // Update customer outstanding balance
    setCustomers((prev) => {
      const updated = prev.map((cust) =>
        cust.id === contract.customer_id || (contract.customer_phone && cust.phone === contract.customer_phone)
          ? {
              ...cust,
              total_paid: (cust.total_paid || 0) + data.amount,
              total_outstanding: Math.max(0, (cust.total_outstanding || 0) - data.amount),
            }
          : cust
      );
      saveToStorage(STORAGE_KEYS.CUSTOMERS, updated);
      return updated;
    });

    // 2. Background Cloud Sync to Supabase
    const supabase = getSupabase();
    if (supabase) {
      try {
        const paymentPayload = {
          id: newPayment.id,
          receipt_number: newPayment.receipt_number,
          customer_id: isValidUUID(newPayment.customer_id) ? newPayment.customer_id : null,
          contract_id: isValidUUID(contract.id) ? contract.id : null,
          schedule_id: targetScheduleId,
          amount: newPayment.amount,
          payment_method: newPayment.payment_method || 'cash',
          notes: newPayment.notes || null,
          payment_date: newPayment.payment_date ? newPayment.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
        };
        const { error: payError } = await supabase.from('payments').insert(paymentPayload);
        if (payError) {
          addToast('error', `Supabase Payment Error: ${payError.message}`);
        }

        // Update contract in installment_contracts
        if (isValidUUID(contract.id)) {
          await supabase.from('installment_contracts').update({
            remaining_amount: updatedContract.remaining_balance,
            status: isCompleted ? 'completed' : 'active',
          }).eq('id', contract.id);
        }

        // Update schedule rows
        for (const schItem of updatedSchedule) {
          if (isValidUUID(schItem.id)) {
            await supabase.from('installment_schedule').update({
              paid_amount: schItem.amount_paid || 0,
              remaining_amount: schItem.remaining_amount || 0,
              status: schItem.status === 'paid' ? 'paid' : (schItem.amount_paid || 0) > 0 ? 'partial' : 'pending',
            }).eq('id', schItem.id);
          }
        }
      } catch (cloudErr: any) {
        console.warn('Supabase record payment cloud sync notice:', cloudErr);
      }
    }

    addToast(
      'success',
      `Payment of Rs. ${data.amount.toLocaleString()} recorded & saved to Supabase! Receipt #${receipt_number}`,
      'Installment Collected'
    );

    return newPayment;
  };

  // Expenses
  const addExpense = async (expenseData: Omit<Expense, 'id' | 'created_at'>) => {
    const newExpenseId = generateUUID();
    const newExpense: Expense = {
      ...expenseData,
      id: newExpenseId,
      date: expenseData.date || expenseData.expense_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
    addToast('success', `Expense "${newExpense.title}" recorded!`, 'Expense Added');

    const supabase = getSupabase();
    if (supabase) {
      const expDate = newExpense.date ? newExpense.date.split('T')[0] : new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('expenses').insert({
        id: newExpense.id,
        title: newExpense.title,
        category: newExpense.category || 'General',
        amount: newExpense.amount || 0,
        description: newExpense.description || null,
        expense_date: expDate,
      });
      if (error) {
        addToast('error', `Supabase Expense Insert Error: ${error.message}`);
      }
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    addToast('info', 'Expense entry removed.');

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) {
        addToast('error', `Supabase Expense Delete Error: ${error.message}`);
      }
    }
  };

  // Purchases / Stock In
  const addPurchase = async (purchaseData: Omit<Purchase, 'id' | 'purchase_number' | 'created_at'>) => {
    const purchase_number = generatePurchaseNumber();
    const purchaseId = generateUUID();
    const newPurchase: Purchase = {
      ...purchaseData,
      id: purchaseId,
      purchase_number,
      created_at: new Date().toISOString(),
    };

    // Increment inventory stock
    setProducts((prev) =>
      prev.map((p) => {
        const item = purchaseData.items.find((it) => it.product_id === p.id);
        if (item) {
          const cost = item.purchase_price || item.unit_cost || p.purchase_price;
          return {
            ...p,
            stock_quantity: p.stock_quantity + item.quantity,
            purchase_price: cost,
            status: 'active',
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    setPurchases((prev) => [newPurchase, ...prev]);
    addToast(
      'success',
      `Purchase Order #${purchase_number} created and inventory restocked!`,
      'Purchase Recorded'
    );

    const supabase = getSupabase();
    if (supabase) {
      const supplierId = isValidUUID(newPurchase.supplier_id) ? newPurchase.supplier_id : null;
      const { error: purErr } = await supabase.from('purchases').insert({
        id: newPurchase.id,
        supplier_id: supplierId,
        invoice_number: newPurchase.purchase_number,
        total_amount: newPurchase.total_amount || 0,
        purchase_date: newPurchase.purchase_date ? newPurchase.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: newPurchase.notes || null,
      });

      if (purErr) {
        addToast('error', `Supabase Purchase Insert Error: ${purErr.message}`);
      } else {
        // Insert purchase items
        if (newPurchase.items && newPurchase.items.length > 0) {
          const purchaseItemRows = newPurchase.items.map((it) => ({
            id: generateUUID(),
            purchase_id: newPurchase.id,
            product_id: isValidUUID(it.product_id) ? it.product_id : null,
            quantity: it.quantity || 1,
            unit_cost: it.unit_cost || it.purchase_price || 0,
            total_cost: it.total_cost || it.total || (it.unit_cost || it.purchase_price || 0) * (it.quantity || 1),
          }));
          await supabase.from('purchase_items').insert(purchaseItemRows);
        }

        // Update product stock and purchase price in Supabase
        for (const item of newPurchase.items) {
          if (item.product_id && isValidUUID(item.product_id)) {
            const { data: prodData } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
            if (prodData) {
              const newQty = (prodData.stock_quantity || 0) + item.quantity;
              const unitCost = item.unit_cost || item.purchase_price;
              const updateObj: any = {
                stock_quantity: newQty,
                updated_at: new Date().toISOString(),
              };
              if (unitCost) updateObj.purchase_price = unitCost;
              await supabase.from('products').update(updateObj).eq('id', item.product_id);
            }
          }
        }
      }
    }
  };

  const createPurchase = addPurchase;

  // Sales Returns
  const processReturn = async (returnData: Omit<ReturnRecord, 'id' | 'return_number' | 'created_at'> & { restock_inventory?: boolean }) => {
    const return_number = generateReturnNumber();
    const restock = returnData.restock_inventory !== false;
    const returnId = generateUUID();
    const newReturn: ReturnRecord = {
      ...returnData,
      id: returnId,
      return_number,
      created_at: new Date().toISOString(),
    };

    // Restock items in frontend
    if (restock) {
      setProducts((prev) =>
        prev.map((p) => {
          const retItem = returnData.items.find((it) => it.product_id === p.id);
          if (retItem) {
            return {
              ...p,
              stock_quantity: p.stock_quantity + retItem.quantity,
              status: 'active',
              updated_at: new Date().toISOString(),
            };
          }
          return p;
        })
      );
    }

    setReturns((prev) => [newReturn, ...prev]);
    addToast('success', `Return #${return_number} processed and items returned to stock!`, 'Return Processed');

    const supabase = getSupabase();
    if (supabase) {
      const saleId = isValidUUID(newReturn.sale_id) ? newReturn.sale_id : null;
      const customerId = isValidUUID(newReturn.customer_id) ? newReturn.customer_id : null;

      const { error: retErr } = await supabase.from('returns').insert({
        id: newReturn.id,
        sale_id: saleId,
        customer_id: customerId,
        reason: newReturn.reason || 'Customer Return',
        total_amount: newReturn.total_refund_amount || 0,
        return_date: newReturn.created_at ? newReturn.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      });

      if (retErr) {
        addToast('error', `Supabase Return Insert Error: ${retErr.message}`);
      } else {
        // Insert return items
        if (newReturn.items && newReturn.items.length > 0) {
          const returnItemRows = newReturn.items.map((it) => ({
            id: generateUUID(),
            return_id: newReturn.id,
            product_id: isValidUUID(it.product_id) ? it.product_id : null,
            quantity: it.quantity || 1,
            amount: it.refund_amount || it.amount || (it.unit_price || 0) * (it.quantity || 1),
          }));
          await supabase.from('return_items').insert(returnItemRows);
        }

        // Restock in Supabase products
        if (restock) {
          for (const item of newReturn.items) {
            if (item.product_id && isValidUUID(item.product_id)) {
              const { data: prodData } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
              if (prodData) {
                await supabase.from('products').update({
                  stock_quantity: (prodData.stock_quantity || 0) + item.quantity,
                  updated_at: new Date().toISOString(),
                }).eq('id', item.product_id);
              }
            }
          }
        }
      }
    }
  };

  const createSalesReturn = processReturn;

  // Print Modal helpers
  const openPrintModal = (type: PrintModalState['type'], data: any) => {
    setPrintModal({ isOpen: true, type, data });
  };
  const closePrintModal = () => {
    setPrintModal({ isOpen: false, type: 'sale_invoice', data: null });
  };

  // Reset to initial rich demo data
  const resetToDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setSales(INITIAL_SALES);
    setContracts(INITIAL_CONTRACTS);
    setPayments(INITIAL_PAYMENTS);
    setExpenses(INITIAL_EXPENSES);
    setPurchases(INITIAL_PURCHASES);
    setReturns(INITIAL_RETURNS);
    setSettings(INITIAL_SETTINGS);
    setUsers(INITIAL_USERS);
    addToast('success', 'Demo data reloaded with fresh sample records!', 'Database Reset');
  };

  const isSupabaseConfigured = Boolean(getSupabaseCredentials().isConfigured);

  const syncToCloud = async () => {
    const res = await syncLocalToSupabase({
      products,
      customers,
      suppliers,
      categories,
      sales,
      contracts,
      payments,
      expenses,
      purchases,
      returns,
      settings,
    });
    if (res.success) {
      addToast('success', res.message, 'Supabase Cloud Sync');
    } else {
      addToast('error', res.message, 'Supabase Cloud Sync');
    }
    return res;
  };

  const loadFromCloud = async () => {
    const res = await fetchSupabaseData();
    if (res.success && res.data) {
      if (res.data.products && res.data.products.length > 0) setProducts(res.data.products);

      if (res.data.customers && res.data.customers.length > 0) {
        setCustomers((prev) => {
          const cloudList = res.data!.customers || [];
          const cloudIds = new Set(cloudList.map((c) => c.id));
          const localOnly = prev.filter(
            (c) =>
              !cloudIds.has(c.id) &&
              !cloudList.some(
                (cc) =>
                  (c.phone && cc.phone === c.phone) ||
                  (c.cnic && cc.cnic === c.cnic) ||
                  (c.customer_code && cc.customer_code === c.customer_code)
              )
          );
          const mergedCloud = cloudList.map((cc) => {
            const local = prev.find(
              (p) =>
                p.id === cc.id ||
                (p.phone && p.phone === cc.phone) ||
                (p.customer_code && p.customer_code === cc.customer_code)
            );
            return {
              ...local,
              ...cc,
              name: cc.name || cc.full_name || local?.name || local?.full_name || '',
              full_name: cc.full_name || cc.name || local?.full_name || local?.name || '',
              status: cc.status || local?.status || 'active',
              total_purchases: Number(cc.total_purchases ?? local?.total_purchases ?? 0),
              total_purchased: Number(cc.total_purchased ?? cc.total_purchases ?? local?.total_purchased ?? 0),
              total_paid: Number(cc.total_paid ?? local?.total_paid ?? 0),
              total_outstanding: Number(cc.total_outstanding ?? local?.total_outstanding ?? 0),
            };
          });
          const merged = [...mergedCloud, ...localOnly];
          saveToStorage(STORAGE_KEYS.CUSTOMERS, merged);
          return merged;
        });
      }

      if (res.data.suppliers && res.data.suppliers.length > 0) setSuppliers(res.data.suppliers);
      if (res.data.categories && res.data.categories.length > 0) setCategories(res.data.categories);
      if (res.data.sales && res.data.sales.length > 0) setSales(res.data.sales);

      if (res.data.contracts && res.data.contracts.length > 0) {
        setContracts((prev) => {
          const cloudContracts = res.data!.contracts || [];
          const cloudIds = new Set(cloudContracts.map((c) => c.id));
          const localOnly = prev.filter(
            (c) =>
              !cloudIds.has(c.id) &&
              !cloudContracts.some((cc) => cc.contract_number && cc.contract_number === c.contract_number)
          );
          const merged = [...cloudContracts, ...localOnly];
          saveToStorage(STORAGE_KEYS.CONTRACTS, merged);
          return merged;
        });
      }

      if (res.data.payments && res.data.payments.length > 0) {
        setPayments((prev) => {
          const cloudPayments = res.data!.payments || [];
          const cloudIds = new Set(cloudPayments.map((p) => p.id));
          const localOnly = prev.filter((p) => !cloudIds.has(p.id));
          const merged = [...cloudPayments, ...localOnly];
          saveToStorage(STORAGE_KEYS.PAYMENTS, merged);
          return merged;
        });
      }

      if (res.data.expenses && res.data.expenses.length > 0) setExpenses(res.data.expenses);
      if (res.data.purchases && res.data.purchases.length > 0) setPurchases(res.data.purchases);
      if (res.data.returns && res.data.returns.length > 0) setReturns(res.data.returns);
      if (res.data.settings) setSettings(res.data.settings);
      addToast('success', 'Cloud data loaded from Supabase successfully!', 'Supabase Cloud');
      return { success: true, message: 'Data imported from cloud' };
    } else {
      addToast('error', res.message || 'Could not fetch data from Supabase', 'Supabase Cloud');
      return { success: false, message: res.message };
    }
  };

  // Calculated Stats for Dashboard & Reports
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Today's POS cash sales
    const todaySales = sales.filter((s) => s.created_at.startsWith(todayStr));
    const todaySalesAmount = todaySales.reduce((acc, s) => acc + s.total_amount, 0);

    // Today's installment collections
    const todayPayments = payments.filter((p) => p.payment_date.startsWith(todayStr));
    const todayInstallmentCollections = todayPayments.reduce((acc, p) => acc + p.amount, 0);

    // Total cash received today (POS paid + Installment payments)
    const todayCashReceived =
      todaySales.reduce((acc, s) => acc + s.paid_amount, 0) + todayInstallmentCollections;

    // Total lifetime sales
    const totalSalesAmount = sales.reduce((acc, s) => acc + s.total_amount, 0);
    const totalProfit =
      sales.reduce((acc, s) => acc + s.profit, 0) +
      contracts.reduce((acc, c) => acc + (c.total_installment_price - c.total_cash_price), 0);

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalProfit - totalExpenses;

    const totalOutstandingInstallments = contracts
      .filter((c) => c.status === 'active' || c.status === 'overdue')
      .reduce((acc, c) => acc + c.outstanding_amount, 0);

    // Overdue analysis
    let overdueCount = 0;
    let overdueAmount = 0;
    const now = new Date();

    contracts.forEach((c) => {
      (c.schedule || []).forEach((s) => {
        if (s.status !== 'paid' && new Date(s.due_date) < now) {
          overdueCount++;
          overdueAmount += s.amount_due - s.amount_paid;
        }
      });
    });

    const lowStockCount = products.filter(
      (p) => p.stock_quantity <= p.min_stock_level && p.stock_quantity > 0
    ).length;

    return {
      todaySalesAmount,
      todayCashReceived,
      totalSalesAmount,
      totalProfit,
      totalExpenses,
      netProfit,
      totalCustomersCount: customers.length,
      totalProductsCount: products.length,
      totalOutstandingInstallments,
      todayInstallmentCollections,
      overdueInstallmentsCount: overdueCount,
      overdueInstallmentsAmount: overdueAmount,
      lowStockCount,
    };
  }, [sales, payments, contracts, expenses, products, customers]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        setUserRole,
        users,
        addUser,
        updateUser,
        switchUser,
        theme,
        toggleTheme,
        settings,
        updateSettings,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        sales,
        createSale,
        contracts,
        createInstallmentContract,
        payments,
        recordInstallmentPayment,
        expenses,
        addExpense,
        deleteExpense,
        purchases,
        addPurchase,
        createPurchase,
        returns,
        processReturn,
        createSalesReturn,
        printModal,
        openPrintModal,
        closePrintModal,
        toasts,
        addToast,
        removeToast,
        globalSearchOpen,
        setGlobalSearchOpen,
        resetToDemoData,
        activeView,
        setActiveView,
        stats,
        isSupabaseConfigured,
        syncToCloud,
        loadFromCloud,
        isAuthenticated,
        authLoading,
        signInWithSupabase,
        signUpWithSupabase,
        resetPasswordWithSupabase,
        signOutUser,
        isAdminUnlockOpen,
        setIsAdminUnlockOpen,
        claimAdminPrivileges,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
