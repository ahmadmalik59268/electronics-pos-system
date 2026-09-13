import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Package, Users, FileText, Calendar, CreditCard, ArrowRight, X } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

export const GlobalSearchModal: React.FC = () => {
  const {
    globalSearchOpen,
    setGlobalSearchOpen,
    products,
    customers,
    sales,
    contracts,
    setActiveView,
    openPrintModal,
  } = useApp();

  const [query, setQuery] = useState('');

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(!globalSearchOpen);
      } else if (e.key === 'Escape' && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen, setGlobalSearchOpen]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { products: [], customers: [], sales: [], contracts: [] };

    const matchedProducts = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          (p.imei && p.imei.toLowerCase().includes(q)) ||
          (p.serial_number && p.serial_number.toLowerCase().includes(q))
      )
      .slice(0, 5);

    const matchedCustomers = customers
      .filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.cnic.toLowerCase().includes(q) ||
          c.customer_code.toLowerCase().includes(q)
      )
      .slice(0, 5);

    const matchedSales = sales
      .filter(
        (s) =>
          s.invoice_number.toLowerCase().includes(q) ||
          s.customer_name.toLowerCase().includes(q) ||
          (s.customer_phone && s.customer_phone.toLowerCase().includes(q))
      )
      .slice(0, 5);

    const matchedContracts = contracts
      .filter(
        (c) =>
          c.contract_number.toLowerCase().includes(q) ||
          c.customer_name.toLowerCase().includes(q) ||
          c.customer_phone.toLowerCase().includes(q) ||
          c.customer_cnic.toLowerCase().includes(q) ||
          c.product_summary.toLowerCase().includes(q)
      )
      .slice(0, 5);

    return {
      products: matchedProducts,
      customers: matchedCustomers,
      sales: matchedSales,
      contracts: matchedContracts,
    };
  }, [query, products, customers, sales, contracts]);

  if (!globalSearchOpen) return null;

  const totalResults =
    searchResults.products.length +
    searchResults.customers.length +
    searchResults.sales.length +
    searchResults.contracts.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            type="text"
            placeholder="Search products, IMEIs, customers, CNIC, invoices, or Qist contracts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-base focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 rounded-md border border-slate-300 dark:border-slate-700">
            ESC
          </kbd>
          <button
            onClick={() => setGlobalSearchOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!query && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Quick Global Search</p>
              <p className="text-xs mt-1">Type IMEI, phone number, customer CNIC, or product SKU to quickly find records.</p>
            </div>
          )}

          {query && totalResults === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <p className="text-sm font-medium">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try checking for typos or searching by different keywords.</p>
            </div>
          )}

          {/* Products */}
          {searchResults.products.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Products ({searchResults.products.length})</span>
              </div>
              <div className="space-y-1">
                {searchResults.products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActiveView('products');
                      setGlobalSearchOpen(false);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        SKU: {p.sku} • Stock: {p.stock_quantity} • IMEI/SN: {p.imei || p.serial_number || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(p.cash_price)}
                      </p>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        Qist: {formatCurrency(p.installment_price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Installment Contracts */}
          {searchResults.contracts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Installment Contracts ({searchResults.contracts.length})</span>
              </div>
              <div className="space-y-1">
                {searchResults.contracts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveView('installments');
                      setGlobalSearchOpen(false);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          {c.contract_number}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {c.customer_name}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                          c.status === 'overdue' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {c.product_summary} • Phone: {c.customer_phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Balance</p>
                      <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(c.outstanding_amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {searchResults.customers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Customers ({searchResults.customers.length})</span>
              </div>
              <div className="space-y-1">
                {searchResults.customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveView('customers');
                      setGlobalSearchOpen(false);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-blue-600">
                        {c.full_name} <span className="text-xs text-slate-400">({c.customer_code})</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Phone: {c.phone} • CNIC: {c.cnic} • City: {c.city}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Outstanding</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(c.total_outstanding)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales Invoices */}
          {searchResults.sales.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Invoices ({searchResults.sales.length})</span>
              </div>
              <div className="space-y-1">
                {searchResults.sales.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      openPrintModal('sale_invoice', s);
                      setGlobalSearchOpen(false);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {s.invoice_number}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Customer: {s.customer_name} • {formatDate(s.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(s.total_amount)}
                      </p>
                      <span className="text-[11px] text-slate-500 capitalize">{s.payment_method}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
