import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Truck,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  PhoneCall,
  X,
  PackagePlus,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Supplier } from '../../types';

export const SuppliersView: React.FC = () => {
  const { suppliers, addSupplier, currentUser, addToast } = useApp();
  const isAdmin = currentUser.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Lahore',
  });

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.company && s.company.toLowerCase().includes(q)) ||
        (s.company_name && s.company_name.toLowerCase().includes(q)) ||
        s.phone.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q))
    );
  }, [suppliers, searchQuery]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      addToast('error', 'Supplier contact name and phone are required.');
      return;
    }
    addSupplier({
      ...formData,
      company: formData.company_name || formData.name,
      amount_payable: 0,
    });
    setModalOpen(false);
    setFormData({ name: '', company_name: '', phone: '', email: '', address: '', city: 'Lahore' });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            Suppliers & Electronics Vendors
          </h2>
          <p className="text-xs text-slate-500">
            Manage wholesale distributors, company balance ledgers, and contact information.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Supplier</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by vendor company, contact name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Company / Vendor</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5">Phone & Email</th>
                <th className="p-3.5">City & Address</th>
                <th className="p-3.5">Payable Balance</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {s.company_name}
                  </td>
                  <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                    {s.name}
                  </td>
                  <td className="p-3.5">
                    <p className="font-medium text-slate-900 dark:text-white">{s.phone}</p>
                    {s.email && <p className="text-[10px] text-slate-400">{s.email}</p>}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-400">
                    {s.city} • {s.address}
                  </td>
                  <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(s.balance)}
                  </td>
                  <td className="p-3.5 text-right space-x-1">
                    <a
                      href={`tel:${s.phone}`}
                      className="inline-flex p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-600"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No suppliers found</p>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Electronics Supplier</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Company / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Haier Pakistan Distribution"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Javed"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="0321-7654321"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">City & Address</label>
                <input
                  type="text"
                  placeholder="Hafeez Center, Gulberg, Lahore"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
