import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CameraModal } from '../common/CameraModal';
import {
  Package,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  X,
  Plus,
  Minus,
  Barcode,
  Sparkles,
  Camera,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Product } from '../../types';

export const ProductsView: React.FC = () => {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    currentUser,
    addToast,
  } = useApp();

  const isAdmin = currentUser.role === 'admin';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Product Create/Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Smartphones',
    brand: 'Samsung',
    model: '',
    serial_number: '',
    imei: '',
    purchase_price: 0,
    cash_price: 0,
    installment_price: 0,
    stock_quantity: 1,
    min_stock_level: 2,
    warranty_months: 12,
    description: '',
    image_url: '',
  });

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Stock Adjustment Modal
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockTargetProduct, setStockTargetProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState<number>(1);
  const [stockReason, setStockReason] = useState('Purchase Restock');

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && p.stock_quantity <= p.min_stock_level && p.stock_quantity > 0) ||
        (stockFilter === 'out' && p.stock_quantity <= 0);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        (p.imei && p.imei.toLowerCase().includes(q)) ||
        (p.serial_number && p.serial_number.toLowerCase().includes(q));

      return matchesCat && matchesStock && matchesSearch;
    });
  }, [products, categoryFilter, stockFilter, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingProductId(null);
    setFormData({
      name: '',
      category: categories[0]?.name || 'Smartphones',
      brand: '',
      model: '',
      serial_number: '',
      imei: '',
      purchase_price: 0,
      cash_price: 0,
      installment_price: 0,
      stock_quantity: 1,
      min_stock_level: 2,
      warranty_months: 12,
      description: '',
      image_url: '',
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: Product) => {
    setEditingProductId(p.id);
    setFormData({
      name: p.name,
      category: p.category,
      brand: p.brand,
      model: p.model,
      serial_number: p.serial_number || '',
      imei: p.imei || '',
      purchase_price: p.purchase_price,
      cash_price: p.cash_price,
      installment_price: p.installment_price,
      stock_quantity: p.stock_quantity,
      min_stock_level: p.min_stock_level,
      warranty_months: p.warranty_months ?? 12,
      description: p.description || '',
      image_url: p.image_url || '',
    });
    setModalOpen(true);
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.brand) {
      addToast('error', 'Please fill product name and brand.');
      return;
    }

    if (editingProductId) {
      updateProduct(editingProductId, formData);
    } else {
      addProduct(formData);
    }
    setModalOpen(false);
  };

  // Stock Adjustment Submit
  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockTargetProduct) return;
    adjustStock(stockTargetProduct.id, stockDelta, stockReason);
    setStockModalOpen(false);
    setStockTargetProduct(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & New Product Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Electronics Inventory & Products
          </h2>
          <p className="text-xs text-slate-500">
            Manage electronic catalog, IMEI / serial numbers, cash & installment pricing, and stock levels.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Product name, SKU, IMEI, Brand, Model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Stock Status</option>
            <option value="low">Low Stock Alerts</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Product & SKU</th>
                <th className="p-3.5">Category & Brand</th>
                <th className="p-3.5">IMEI / Serial</th>
                {isAdmin && <th className="p-3.5">Cost Price</th>}
                <th className="p-3.5">Cash Price</th>
                <th className="p-3.5">Qist Price</th>
                <th className="p-3.5 text-center">Stock</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock_quantity <= 0;
                const isLowStock = p.stock_quantity <= p.min_stock_level && !isOutOfStock;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{p.brand}</p>
                      <p className="text-[11px] text-slate-500">{p.category}</p>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {p.imei ? (
                        <span>IMEI: {p.imei}</span>
                      ) : p.serial_number ? (
                        <span>SN: {p.serial_number}</span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="p-3.5 font-medium text-slate-600 dark:text-slate-400">
                        {formatCurrency(p.purchase_price)}
                      </td>
                    )}
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.cash_price)}
                    </td>
                    <td className="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(p.installment_price)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {p.stock_quantity} in stock
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setStockTargetProduct(p);
                              setStockDelta(1);
                              setStockModalOpen(true);
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600"
                            title="Adjust stock"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4 text-indigo-500" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                                deleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No products found</p>
            <p className="text-xs mt-1">Try changing your search keywords or filters.</p>
          </div>
        )}
      </div>

      {/* Product Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingProductId ? 'Edit Product Details' : 'Add New Electronics Product'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Product Title / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samsung Galaxy S24 Ultra (256GB Titanium Gray)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samsung, Apple, Haier, Sony"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Model / Edition</label>
                  <input
                    type="text"
                    placeholder="e.g. SM-S928B"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">IMEI Number (Phones / Cellular)</label>
                  <input
                    type="text"
                    placeholder="354892019283741"
                    value={formData.imei}
                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Serial Number (SN)</label>
                  <input
                    type="text"
                    placeholder="SN-928472910"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Warranty (Months)</label>
                  <input
                    type="number"
                    value={formData.warranty_months}
                    onChange={(e) => setFormData({ ...formData, warranty_months: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Pricing & Stock Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Purchase / Cost (Rs.) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.purchase_price || ''}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-emerald-700 dark:text-emerald-400">Cash Sale Price (Rs.) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.cash_price || ''}
                    onChange={(e) => setFormData({ ...formData, cash_price: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-indigo-700 dark:text-indigo-400">
                      Qist (Installment) Price (Rs.) *
                    </label>
                    {formData.installment_price > 0 && (
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-300 font-semibold">
                        Custom Qist Calculator Available
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.installment_price || ''}
                    onChange={(e) => setFormData({ ...formData, installment_price: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 85000"
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 font-bold text-slate-900 dark:text-white"
                  />

                  {/* Live Custom Installment Months Breakdown Preview */}
                  {formData.installment_price > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-200">
                        <span>Qist Breakdown Preview (مختلف مہینوں کی قسط):</span>
                        <span className="text-slate-500 font-normal">Based on 0% advance</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        {[3, 6, 10, 12].map((m) => (
                          <div key={m} className="p-1.5 rounded bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 text-center">
                            <span className="text-slate-500 font-medium">{m} Months:</span>
                            <p className="font-bold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(Math.round(formData.installment_price / m))}/mo
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Initial Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Min Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">Product Image / Warranty Card Photo</label>
                <div className="mt-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {formData.image_url ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 flex-shrink-0">
                      <img src={formData.image_url} alt="Product" className="w-full h-full object-cover" />
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
                      onChange={handleProductImageUpload}
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
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {editingProductId ? 'Update Product' : 'Save & Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Quick Adjustment Modal */}
      {stockModalOpen && stockTargetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Adjust Stock Level</h3>
              <button
                onClick={() => setStockModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="space-y-3 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">{stockTargetProduct.name}</p>
              <p className="text-slate-500">Current Stock: {stockTargetProduct.stock_quantity} units</p>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Adjustment Quantity (+ to add, - to reduce)</label>
                <input
                  type="number"
                  required
                  value={stockDelta}
                  onChange={(e) => setStockDelta(parseInt(e.target.value) || 0)}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Reason</label>
                <input
                  type="text"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={(dataUrl) => setFormData({ ...formData, image_url: dataUrl })}
        title="Capture Product / Warranty Photo"
      />
    </div>
  );
};
