import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Tag,
  Receipt,
  AlertCircle,
  X,
  PlusCircle,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { PaymentMethod, Product, SaleItem } from '../../types';

export const POSView: React.FC = () => {
  const {
    products,
    categories,
    customers,
    addCustomer,
    createSale,
    openPrintModal,
    addToast,
    settings,
  } = useApp();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(settings.tax_rate || 0);

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [walkinName, setWalkinName] = useState<string>('Walk-in Customer');
  const [walkinPhone, setWalkinPhone] = useState<string>('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    full_name: '',
    phone: '',
    cnic: '',
    address: '',
    city: 'Lahore',
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        (p.imei && p.imei.toLowerCase().includes(q)) ||
        (p.serial_number && p.serial_number.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const grandTotal = Math.max(0, subtotal - discount + taxAmount);
  const paid = parseFloat(amountTendered) || grandTotal;
  const change = Math.max(0, paid - grandTotal);

  // Add Product to Cart
  const addToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      addToast('error', `${product.name} is currently out of stock!`, 'Out of Stock');
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product_id === product.id);
    if (existingIndex > -1) {
      const existingItem = cart[existingIndex];
      if (existingItem.quantity >= product.stock_quantity) {
        addToast('warning', `Cannot exceed available inventory (${product.stock_quantity} available)`, 'Stock Limit');
        return;
      }

      const updated = [...cart];
      const newQty = existingItem.quantity + 1;
      updated[existingIndex] = {
        ...existingItem,
        quantity: newQty,
        total: newQty * existingItem.unit_price - existingItem.discount,
      };
      setCart(updated);
    } else {
      const newItem: SaleItem = {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        brand: product.brand,
        model: product.model,
        serial_number: product.serial_number,
        imei: product.imei,
        quantity: 1,
        unit_price: product.cash_price,
        purchase_price: product.purchase_price,
        discount: 0,
        total: product.cash_price,
      };
      setCart([newItem, ...cart]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const max = prod ? prod.stock_quantity : 999;
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > max) {
              addToast('warning', `Maximum stock limit is ${max}`, 'Stock Exceeded');
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unit_price - item.discount,
            };
          }
          return item;
        })
        .filter(Boolean) as SaleItem[]
    );
  };

  const updateItemDiscount = (productId: string, discAmount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          const validDisc = Math.max(0, discAmount);
          return {
            ...item,
            discount: validDisc,
            total: Math.max(0, item.quantity * item.unit_price - validDisc),
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setAmountTendered('');
    setNotes('');
  };

  // Handle Quick Add Customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.full_name || !newCustomerForm.phone) {
      addToast('error', 'Please fill name and phone number');
      return;
    }

    const created = await addCustomer({
      full_name: newCustomerForm.full_name,
      phone: newCustomerForm.phone,
      cnic: newCustomerForm.cnic || 'N/A',
      address: newCustomerForm.address || 'Lahore',
      city: newCustomerForm.city || 'Lahore',
      status: 'active',
    });

    setSelectedCustomerId(created.id);
    setWalkinName(created.full_name || created.name || newCustomerForm.full_name);
    setWalkinPhone(created.phone || newCustomerForm.phone);
    setShowAddCustomerModal(false);
    setNewCustomerForm({ full_name: '', phone: '', cnic: '', address: '', city: 'Lahore' });
  };

  // Checkout Handler
  const handleCompleteSale = () => {
    if (cart.length === 0) {
      addToast('error', 'Cart is empty. Please add products to checkout.', 'Empty Cart');
      return;
    }

    // Determine customer details
    const selectedCust = customers.find((c) => c.id === selectedCustomerId);
    const customer_name = selectedCust ? selectedCust.full_name : walkinName || 'Walk-in Customer';
    const customer_phone = selectedCust ? selectedCust.phone : walkinPhone;
    const customer_cnic = selectedCust ? selectedCust.cnic : undefined;

    const sale = createSale({
      customer_id: selectedCustomerId || undefined,
      customer_name,
      customer_phone,
      customer_cnic,
      items: cart,
      discount,
      tax: taxAmount,
      payment_method: paymentMethod,
      paid_amount: paid,
      notes,
    });

    // Open print invoice modal immediately
    openPrintModal('sale_invoice', sale);

    // Reset POS
    clearCart();
  };

  return (
    <div className="space-y-4 pb-16 lg:pb-8">
      {/* Mobile Segmented Switch (visible on < lg screens) */}
      <div className="flex lg:hidden p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'catalog'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Products ({filteredProducts.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'cart'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Cart ({cart.length})</span>
          {cart.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold ml-1">
              {formatCurrency(grandTotal)}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Selection & Catalog (7 cols) */}
        <div className={`lg:col-span-7 space-y-4 ${mobileTab === 'catalog' ? 'block' : 'hidden lg:block'}`}>
        {/* Search & Category Filter Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by Name, SKU, IMEI, Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.name
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.stock_quantity <= 0;
            const inCart = cart.find((item) => item.product_id === p.id);

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isOutOfStock
                    ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/80 hover:shadow-md cursor-pointer active:scale-98'
                } ${inCart ? 'ring-2 ring-indigo-500/50 bg-indigo-50/20' : ''}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {p.brand} • {p.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : p.stock_quantity <= p.min_stock_level
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {isOutOfStock ? '0 Stock' : `${p.stock_quantity} In Stock`}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-2 leading-snug">
                    {p.name}
                  </h4>

                  {(p.imei || p.serial_number) && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                      {p.imei ? `IMEI: ${p.imei}` : `SN: ${p.serial_number}`}
                    </p>
                  )}
                </div>

                <div className="flex items-end justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] text-slate-400">Cash Price</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(p.cash_price)}
                    </p>
                  </div>

                  {inCart ? (
                    <span className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold">
                      {inCart.quantity} in Cart
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-colors">
                      + Add
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No products found</p>
            <p className="text-xs mt-1">Try modifying your search keywords or category filters.</p>
          </div>
        )}
      </div>

      {/* Right Column: Checkout & Cart Terminal (5 cols) */}
      <div className={`lg:col-span-5 space-y-4 ${mobileTab === 'cart' ? 'block' : 'hidden lg:block'}`}>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between h-full">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Current Cash Bill</h3>
                  <p className="text-[11px] text-slate-500">{cart.length} unique items</p>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Customer Selector */}
            <div className="py-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  Customer
                </span>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  + Add New
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const cust = customers.find((c) => c.id === e.target.value);
                  if (cust) {
                    setWalkinName(cust.full_name);
                    setWalkinPhone(cust.phone);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="">Walk-in Customer (Manual Name / Phone)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.phone}) - {c.customer_code}
                  </option>
                ))}
              </select>

              {!selectedCustomerId && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone (Optional)"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 py-2">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">Cart is empty</p>
                  <p className="text-[11px]">Click items from the catalog on the left</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product_id} className="py-2.5 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div className="pr-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{item.product_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatCurrency(item.unit_price)} each {item.imei && `• IMEI: ${item.imei}`}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white shrink-0">
                        {formatCurrency(item.total)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Quantity Selector */}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-900 dark:text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Discount Input */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Disc:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.discount || ''}
                          onChange={(e) => updateItemDiscount(item.product_id, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-16 px-1.5 py-0.5 text-right rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                        />
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checkout & Totals Summary */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {/* Discount & Tax Row */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-500">Invoice Discount (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white text-right"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500">Payment Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="cash">Cash (Counter)</option>
                  <option value="bank">Bank Transfer / POS</option>
                  <option value="mobile_wallet">JazzCash / Easypaisa</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Grand Total Display */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Discount Applied</span>
                  <span>- {formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Total Payable</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Cash Tendered & Change */}
            {paymentMethod === 'cash' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Cash Tendered (Rs.)</label>
                  <input
                    type="number"
                    placeholder={grandTotal.toString()}
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white text-right"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Change Due</label>
                  <div className="w-full mt-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 text-right">
                    {formatCurrency(change)}
                  </div>
                </div>
              </div>
            )}

            {/* Checkout Button */}
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Sale & Print Invoice</span>
            </button>

            {/* Mobile Back to Catalog Button */}
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className="w-full mt-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs lg:hidden flex items-center justify-center gap-1"
            >
              <span>← Back to Products Catalog</span>
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Floating Checkout Button for Mobile when viewing catalog and cart has items */}
      {mobileTab === 'catalog' && cart.length > 0 && (
        <div className="fixed bottom-20 left-3 right-3 z-30 lg:hidden animate-fadeIn">
          <button
            onClick={() => setMobileTab('cart')}
            className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center justify-between active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                {cart.reduce((sum, it) => sum + it.quantity, 0)}
              </span>
              <span>Review Cart & Checkout</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-black">
              <span>{formatCurrency(grandTotal)}</span>
              <span>→</span>
            </div>
          </button>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Register New Customer</h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Usman Khan"
                  value={newCustomerForm.full_name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, full_name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="0300-1234567"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">CNIC / ID Number</label>
                <input
                  type="text"
                  placeholder="35202-1234567-1"
                  value={newCustomerForm.cnic}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, cnic: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Address & City</label>
                <input
                  type="text"
                  placeholder="Street / Plaza address, Lahore"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
