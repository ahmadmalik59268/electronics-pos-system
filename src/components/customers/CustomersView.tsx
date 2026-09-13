import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CameraModal } from '../common/CameraModal';
import {
  Users,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  PhoneCall,
  CalendarPlus,
  ShoppingCart,
  BookOpen,
  FileText,
  X,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Customer } from '../../types';

export const CustomersView: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    sales,
    contracts,
    payments,
    setActiveView,
    addToast,
    currentUser,
    openPrintModal,
    loadFromCloud,
  } = useApp();

  React.useEffect(() => {
    loadFromCloud().catch((err: any) => {
      addToast('error', `Failed to load data from Supabase: ${err?.message || err}`, 'Supabase Load Error');
    });
  }, []);

  const isAdmin = currentUser.role === 'admin';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blacklisted'>('all');

  // Customer Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    father_name: '',
    phone: '',
    alternate_phone: '',
    cnic: '',
    address: '',
    city: 'Lahore',
    notes: '',
    image_url: '',
    status: 'active' as 'active' | 'inactive' | 'blacklisted',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Customer Ledger Modal
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filtered list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const customerStatus = c.status || 'active';
      const matchesStatus = statusFilter === 'all' || customerStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const name = (c.name || c.full_name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const cnic = (c.cnic || '').toLowerCase();
      const code = (c.customer_code || '').toLowerCase();
      const address = (c.address || '').toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        phone.includes(q) ||
        cnic.includes(q) ||
        code.includes(q) ||
        address.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [customers, statusFilter, searchQuery]);

  // Open Create
  const handleOpenCreate = () => {
    setEditingCustomerId(null);
    setFormData({
      name: '',
      father_name: '',
      phone: '',
      alternate_phone: '',
      cnic: '',
      address: '',
      city: 'Lahore',
      notes: '',
      image_url: '',
      status: 'active',
    });
    setModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (c: Customer) => {
    setEditingCustomerId(c.id);
    setFormData({
      name: c.name || c.full_name || '',
      father_name: c.father_name || '',
      phone: c.phone || '',
      alternate_phone: c.alternate_phone || '',
      cnic: c.cnic || '',
      address: c.address || '',
      city: c.city || 'Lahore',
      notes: c.notes || '',
      image_url: c.image_url || '',
      status: c.status || 'active',
    });
    setModalOpen(true);
  };

  // Submit Form
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      addToast('error', 'Customer name and phone are required.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCustomerId) {
        await updateCustomer(editingCustomerId, formData);
      } else {
        await addCustomer(formData);
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error('Customer save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Customer Sales, Contracts & Payment Receipts for Ledger
  const customerSales = useMemo(() => {
    if (!ledgerCustomer) return [];
    const custId = ledgerCustomer.id;
    const custPhone = (ledgerCustomer.phone || '').trim();
    const custName = (ledgerCustomer.name || ledgerCustomer.full_name || '').trim().toLowerCase();

    return sales.filter(
      (s) =>
        s.customer_id === custId ||
        (custPhone && s.customer_phone && s.customer_phone.trim() === custPhone) ||
        (custName && (s.customer_name || '').trim().toLowerCase() === custName)
    );
  }, [sales, ledgerCustomer]);

  const customerContracts = useMemo(() => {
    if (!ledgerCustomer) return [];
    const custId = ledgerCustomer.id;
    const custPhone = (ledgerCustomer.phone || '').trim();
    const custCnic = (ledgerCustomer.cnic || '').trim();
    const custName = (ledgerCustomer.name || ledgerCustomer.full_name || '').trim().toLowerCase();

    return contracts.filter((c) => {
      const cIdMatch = c.customer_id && c.customer_id === custId;
      const cPhoneMatch = custPhone && c.customer_phone && c.customer_phone.trim() === custPhone;
      const cCnicMatch = custCnic && c.customer_cnic && c.customer_cnic.trim() === custCnic;
      const cNameMatch = custName && (c.customer_name || '').trim().toLowerCase() === custName;
      return cIdMatch || cPhoneMatch || cCnicMatch || cNameMatch;
    });
  }, [contracts, ledgerCustomer]);

  const customerPayments = useMemo(() => {
    if (!ledgerCustomer) return [];
    const custId = ledgerCustomer.id;
    const custPhone = (ledgerCustomer.phone || '').trim();
    const custName = (ledgerCustomer.name || ledgerCustomer.full_name || '').trim().toLowerCase();

    return payments.filter((p) => {
      const pIdMatch = p.customer_id && p.customer_id === custId;
      const pPhoneMatch = custPhone && p.customer_phone && p.customer_phone.trim() === custPhone;
      const pNameMatch = custName && (p.customer_name || '').trim().toLowerCase() === custName;
      const pContractMatch = customerContracts.some(
        (cnt) => cnt.id === p.contract_id || cnt.contract_number === p.contract_number
      );
      return pIdMatch || pPhoneMatch || pNameMatch || pContractMatch;
    });
  }, [payments, ledgerCustomer, customerContracts]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Customer Management & Passbooks
          </h2>
          <p className="text-xs text-slate-500">
            Maintain customer identities, CNIC verification, ledger history, and outstanding balances.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, CNIC or Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'active', 'blacklisted'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st} Customers
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table & Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Mobile Customer Cards (block md:hidden) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              onClick={() => setLedgerCustomer(c)}
            >
              {/* Top Row: Avatar, Name, Code, Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {c.image_url ? (
                    <img src={c.image_url} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(c.name || c.full_name || 'C').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {c.name || c.full_name}
                    </h4>
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                      {c.customer_code}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    c.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : c.status === 'blacklisted'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {c.status}
                </span>
              </div>

              {/* Phone, CNIC & Location */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{c.phone}</span>
                  </a>
                )}
                {c.cnic && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    CNIC: {c.cnic}
                  </span>
                )}
              </div>
              {c.address && (
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {c.address} {c.city ? `• ${c.city}` : ''}
                </p>
              )}

              {/* 2 Financial Metrics */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Purchases</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(c.total_purchased)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Outstanding Due</span>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(c.total_outstanding)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setLedgerCustomer(c)}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Passbook Ledger</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Customers Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Code & Name</th>
                <th className="p-3.5">Phone & CNIC</th>
                <th className="p-3.5">Address & City</th>
                <th className="p-3.5">Total Purchases</th>
                <th className="p-3.5">Outstanding Balance</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 flex items-center gap-3">
                    {c.image_url ? (
                      <img src={c.image_url} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {(c.name || c.full_name || 'C').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{c.name || c.full_name}</p>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        {c.customer_code}
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <p className="font-medium text-slate-900 dark:text-white">{c.phone}</p>
                    <p className="text-[10px] text-slate-400 font-mono">CNIC: {c.cnic}</p>
                  </td>
                  <td className="p-3.5">
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-1">{c.address}</p>
                    <p className="text-[10px] text-slate-400">{c.city}</p>
                  </td>
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {formatCurrency(c.total_purchased)}
                  </td>
                  <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(c.total_outstanding)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : c.status === 'blacklisted'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-1">
                    <button
                      onClick={() => setLedgerCustomer(c)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="View Customer Ledger / Passbook"
                    >
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit Customer"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={async () => {
                          if (confirm(`Delete customer ${c.name || c.full_name}?`)) {
                            try {
                              await deleteCustomer(c.id);
                            } catch (err: any) {
                              console.error('Delete customer error:', err);
                            }
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-rose-50 text-rose-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No customers found</p>
            <p className="text-xs mt-1">Try modifying your search or adding a new customer.</p>
          </div>
        )}
      </div>

      {/* Customer Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCustomerId ? 'Edit Customer Profile' : 'Register New Customer'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Farhan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Father / Guardian Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Mehmood"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Primary Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="0300-1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">CNIC / ID Number</label>
                  <input
                    type="text"
                    placeholder="35202-1234567-1"
                    value={formData.cnic}
                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Street Address</label>
                  <input
                    type="text"
                    placeholder="House / Shop address, Lahore"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="active">Active (Good Standing)</option>
                    <option value="inactive">Inactive</option>
                    <option value="blacklisted">Blacklisted (Defaulted)</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">Customer Picture / ID Document</label>
                <div className="mt-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {formData.image_url ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 flex-shrink-0">
                      <img src={formData.image_url} alt="Customer" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl text-[9px]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => setCameraModalOpen(true)}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Live Photo
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
                >
                  {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{isSaving ? 'Saving to Supabase...' : 'Save Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Ledger & Passbook Drawer/Modal */}
      {ledgerCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Customer Passbook: {ledgerCustomer.name || ledgerCustomer.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {ledgerCustomer.phone} • CNIC: {ledgerCustomer.cnic} • Code: {ledgerCustomer.customer_code}
                </p>
              </div>

              <button
                onClick={() => setLedgerCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Financial Snapshot for Customer */}
              {(() => {
                let totalDealPrice = 0;
                let totalAdvance = 0;
                let totalQistPaid = 0;
                let totalQistCount = 0;
                let paidQistCount = 0;

                customerContracts.forEach((c) => {
                  const sched = c.schedule || [];
                  totalDealPrice += Number(c.total_installment_price) || 0;
                  totalAdvance += Number(c.down_payment) || 0;
                  totalQistPaid += sched.reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);
                  totalQistCount += c.installment_count || sched.length || 0;
                  paidQistCount += sched.filter((s) => s.status === 'paid').length;
                });

                const totalPaidAll = totalAdvance + totalQistPaid;
                const totalBalance = Math.max(0, totalDealPrice - totalPaidAll);

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-amber-400">
                        Financial Summary & Account Overview
                      </span>
                      <span className="text-xs text-slate-300">
                        {customerContracts.length} Contracts • {customerPayments.length} Receipts
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/10">
                        <span className="text-slate-300 text-[10px]">Total Contract Volume</span>
                        <p className="text-base font-black text-white mt-0.5">
                          {formatCurrency(totalDealPrice)}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/10">
                        <span className="text-blue-300 text-[10px]">Advance / Down Payment</span>
                        <p className="text-base font-black text-blue-300 mt-0.5">
                          {formatCurrency(totalAdvance)}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                        <span className="text-emerald-300 text-[10px]">Installments Collected</span>
                        <p className="text-base font-black text-emerald-300 mt-0.5">
                          {formatCurrency(totalQistPaid)}
                        </p>
                        <span className="text-[10px] text-emerald-200 block">
                          ✓ {paidQistCount} of {totalQistCount} Cleared
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                        <span className="text-rose-300 text-[10px]">Outstanding Balance</span>
                        <p className="text-base font-black text-rose-300 mt-0.5">
                          {formatCurrency(totalBalance)}
                        </p>
                        <span className="text-[10px] text-rose-200 block">
                          {totalQistCount - paidQistCount} Remaining
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Installment Contracts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active & Completed Installment Contracts ({customerContracts.length})
                  </h4>
                  <button
                    onClick={() => {
                      setLedgerCustomer(null);
                      setActiveView('payment-collection');
                    }}
                    className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline"
                  >
                    + Collect Payment Now
                  </button>
                </div>

                {customerContracts.length === 0 ? (
                  <p className="text-slate-400">No installment contracts found.</p>
                ) : (
                  <div className="space-y-2.5">
                    {customerContracts.map((c) => {
                      const sched = c.schedule || [];
                      const qistPaid = sched.reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);
                      const advancePaid = Number(c.down_payment) || 0;
                      const totalPaid = advancePaid + qistPaid;
                      const totalDeal = Number(c.total_installment_price) || 0;
                      const remaining = Math.max(0, totalDeal - totalPaid);
                      const paidCount = sched.filter((s) => s.status === 'paid').length;
                      const totalCount = c.installment_count || sched.length || 0;

                      return (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                {c.contract_number}
                              </span>
                              <span className="text-slate-900 dark:text-white font-bold">
                                {c.product_summary}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  remaining <= 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {remaining <= 0 ? 'Completed' : 'Active'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Booked: {formatDate(c.created_at)} • Advance: {formatCurrency(advancePaid)} • Paid Qist: {formatCurrency(qistPaid)} ({paidCount}/{totalCount} Months)
                            </p>
                          </div>

                          <div className="text-right flex sm:flex-col items-center sm:items-end justify-between gap-1">
                            <p className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                              Bal: {formatCurrency(remaining)}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openPrintModal('installment_contract', c)}
                                className="text-[11px] text-indigo-600 hover:underline font-semibold"
                              >
                                Print Agreement
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment Receipts History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Payment Receipts History ({customerPayments.length} Recorded)
                </h4>
                {customerPayments.length === 0 ? (
                  <p className="text-slate-400">No payment receipts recorded yet for this customer.</p>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                        <tr>
                          <th className="p-2.5">Receipt #</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Amount</th>
                          <th className="p-2.5">Channel</th>
                          <th className="p-2.5">Balance After</th>
                          <th className="p-2.5 text-right">Print</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {customerPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {p.receipt_number}
                            </td>
                            <td className="p-2.5 text-slate-700 dark:text-slate-300">
                              {formatDate(p.payment_date)}
                            </td>
                            <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(p.amount)}
                            </td>
                            <td className="p-2.5 uppercase font-medium text-slate-500">
                              {p.payment_method}
                            </td>
                            <td className="p-2.5 font-bold text-rose-600 dark:text-rose-400">
                              {formatCurrency(p.remaining_balance)}
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => openPrintModal('payment_receipt', p)}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px]"
                              >
                                Print
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Cash Invoices */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Cash Sales Invoices ({customerSales.length})
                </h4>
                {customerSales.length === 0 ? (
                  <p className="text-slate-400">No cash sales invoices recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {customerSales.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{s.invoice_number}</span>
                          <p className="text-[11px] text-slate-500">
                            {formatDate(s.created_at)} • {s.items.length} items
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(s.total_amount)}</span>
                          <button
                            onClick={() => openPrintModal('sale_invoice', s)}
                            className="block text-[11px] text-indigo-600 hover:underline font-semibold"
                          >
                            Print Invoice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={(dataUrl) => setFormData({ ...formData, image_url: dataUrl })}
        title="Capture Customer Picture"
      />
    </div>
  );
};
