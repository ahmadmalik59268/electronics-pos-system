import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CameraModal } from '../common/CameraModal';
import {
  CalendarClock,
  User,
  Package,
  Calculator,
  CalendarCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  ShieldAlert,
  Search,
  Users,
  Camera,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Customer, Product, SaleItem } from '../../types';

export const InstallmentSaleWizard: React.FC = () => {
  const {
    customers,
    addCustomer,
    products,
    createInstallmentContract,
    openPrintModal,
    setActiveView,
    addToast,
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Camera Modal State
  const [cameraModalConfig, setCameraModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    onCapture: (dataUrl: string) => void;
  }>({
    isOpen: false,
    title: 'Capture Photo',
    onCapture: () => {},
  });

  // Step 1: Customer Info
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    full_name: '',
    father_name: '',
    phone: '',
    alternate_phone: '',
    cnic: '',
    address: '',
    city: 'Lahore',
    notes: '',
    image_url: '',
  });

  // Guarantor Details (Crucial for Qist contracts)
  const [guarantor1, setGuarantor1] = useState({
    name: '',
    phone: '',
    cnic: '',
    relation: 'Friend / Colleague',
    address: '',
    image_url: '',
  });
  const [guarantor2, setGuarantor2] = useState({
    name: '',
    phone: '',
    cnic: '',
    relation: 'Relative',
    address: '',
    image_url: '',
  });

  // Step 2: Selected Products
  const [selectedProducts, setSelectedProducts] = useState<SaleItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Step 3: Financial & Duration Setup
  const [downPayment, setDownPayment] = useState<number>(0);
  const [durationType, setDurationType] = useState<'monthly' | 'weekly' | 'custom'>('monthly');
  const [durationMonths, setDurationMonths] = useState<number>(10);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customMarkupPercent, setCustomMarkupPercent] = useState<number>(0);

  // Available matching products for search
  const matchingProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products.slice(0, 8);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.imei && p.imei.toLowerCase().includes(q)) ||
        (p.serial_number && p.serial_number.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Financial Calculations
  const totalCashPrice = selectedProducts.reduce((acc, it) => acc + it.purchase_price * it.quantity, 0);
  const baseInstallmentPrice = selectedProducts.reduce((acc, it) => acc + it.unit_price * it.quantity, 0);
  const totalInstallmentPrice = baseInstallmentPrice + (baseInstallmentPrice * customMarkupPercent) / 100;
  const remainingBalance = Math.max(0, totalInstallmentPrice - downPayment);
  const installmentCount = durationMonths || 1;
  const perInstallmentAmount = Math.round(remainingBalance / installmentCount);

  // Generated Preview Schedule
  const previewSchedule = useMemo(() => {
    const list = [];
    const baseDate = new Date(startDate);
    for (let i = 1; i <= installmentCount; i++) {
      const d = new Date(baseDate);
      if (durationType === 'weekly') {
        d.setDate(d.getDate() + i * 7);
      } else {
        d.setMonth(d.getMonth() + i);
      }
      const isLast = i === installmentCount;
      const amt = isLast
        ? remainingBalance - perInstallmentAmount * (installmentCount - 1)
        : perInstallmentAmount;

      list.push({
        installment_number: i,
        due_date: d.toISOString().split('T')[0],
        amount_due: amt,
      });
    }
    return list;
  }, [startDate, durationType, installmentCount, remainingBalance, perInstallmentAmount]);

  // Product Selection Handlers
  const addProductToContract = (prod: Product) => {
    if (prod.stock_quantity <= 0) {
      addToast('error', 'This item is out of stock!');
      return;
    }
    const exists = selectedProducts.find((it) => it.product_id === prod.id);
    if (exists) {
      if (exists.quantity >= prod.stock_quantity) {
        addToast('warning', `Only ${prod.stock_quantity} available in stock.`);
        return;
      }
      setSelectedProducts(
        selectedProducts.map((it) =>
          it.product_id === prod.id
            ? { ...it, quantity: it.quantity + 1, total: (it.quantity + 1) * it.unit_price }
            : it
        )
      );
    } else {
      const newItem: SaleItem = {
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        brand: prod.brand,
        model: prod.model,
        serial_number: prod.serial_number,
        imei: prod.imei,
        quantity: 1,
        unit_price: prod.installment_price, // uses installment price
        purchase_price: prod.purchase_price,
        discount: 0,
        total: prod.installment_price,
      };
      setSelectedProducts([...selectedProducts, newItem]);
    }
  };

  const removeProductFromContract = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((it) => it.product_id !== productId));
  };

  const updateItemInstallmentPrice = (productId: string, newPrice: number) => {
    setSelectedProducts(
      selectedProducts.map((it) =>
        it.product_id === productId
          ? { ...it, unit_price: newPrice, total: it.quantity * newPrice }
          : it
      )
    );
  };

  // Submission
  const handleCreateContract = async () => {
    let custId = selectedCustomerId;
    let custName = '';
    let custPhone = '';
    let custCnic = '';
    let custAddress = '';

    if (isNewCustomer || !custId) {
      if (!customerForm.full_name.trim()) {
        addToast('error', 'Please enter customer name (e.g. Jameel).', 'Missing Customer Name');
        setStep(1);
        return;
      }
      const customerPhone = customerForm.phone.trim() || '0300-0000000';
      const customerCnic = customerForm.cnic.trim() || 'N/A';
      const customerAddress = customerForm.address.trim() || 'Lahore';

      const created = await addCustomer({
        name: customerForm.full_name.trim(),
        full_name: customerForm.full_name.trim(),
        father_name: customerForm.father_name.trim(),
        phone: customerPhone,
        alternate_phone: customerForm.alternate_phone.trim(),
        cnic: customerCnic,
        address: customerAddress,
        city: customerForm.city.trim() || 'Lahore',
        notes: customerForm.notes.trim(),
        status: 'active',
      });
      custId = created.id;
      custName = created.full_name || created.name || customerForm.full_name.trim();
      custPhone = created.phone || customerPhone;
      custCnic = created.cnic || customerCnic;
      custAddress = created.address || customerAddress;
    } else if (activeCustomer) {
      custName = activeCustomer.full_name || activeCustomer.name || '';
      custPhone = activeCustomer.phone || '';
      custCnic = activeCustomer.cnic || '';
      custAddress = activeCustomer.address || '';
    }

    if (selectedProducts.length === 0) {
      addToast('error', 'Please select at least one product for the installment sale.');
      setStep(2);
      return;
    }

    const result = await createInstallmentContract({
      customer_id: custId,
      customer_name: custName,
      customer_phone: custPhone,
      customer_cnic: custCnic,
      customer_address: custAddress,
      items: selectedProducts,
      total_cash_price: totalCashPrice,
      total_installment_price: totalInstallmentPrice,
      down_payment: downPayment,
      duration_type: durationType,
      duration_months: durationMonths,
      installment_count: installmentCount,
      start_date: startDate,
      guarantor1: guarantor1.name ? guarantor1 : undefined,
      guarantor2: guarantor2.name ? guarantor2 : undefined,
      notes: customerForm.notes,
    });

    const contract = result?.contract;

    // Open Printable Contract Agreement
    if (contract) {
      openPrintModal('installment_contract', contract);
    }

    // Switch to Installments management view
    setActiveView('installments');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Wizard Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Step {step} of 4
              </span>
              <span className="text-xs text-slate-400">Installment Agreement Setup</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              New Installment (Qist) Sale Agreement
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Automated financial schedule calculation, guarantor records, and instant agreement print.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  step === i
                    ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/30'
                    : step > i
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step > i ? '✓' : i}
              </div>
            ))}
          </div>
        </div>

        {/* Step Indicator Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 pt-4 border-t border-slate-800 text-xs">
          <button
            onClick={() => setStep(1)}
            className={`text-left p-2 rounded-xl transition-all ${
              step === 1
                ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Customer & Zamin
          </button>
          <button
            onClick={() => setStep(2)}
            className={`text-left p-2 rounded-xl transition-all ${
              step === 2
                ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Products & Price
          </button>
          <button
            onClick={() => setStep(3)}
            className={`text-left p-2 rounded-xl transition-all ${
              step === 3
                ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Financials & Schedule
          </button>
          <button
            onClick={() => setStep(4)}
            className={`text-left p-2 rounded-xl transition-all ${
              step === 4
                ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            4. Review & Issue
          </button>
        </div>
      </div>

      {/* STEP 1: Customer & Guarantors */}
      {step === 1 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Customer & Guarantor Information
              </h3>
              <p className="text-xs text-slate-500">Select existing customer or register a new one with CNIC and guarantor</p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setIsNewCustomer(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !isNewCustomer
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Existing Customer
              </button>
              <button
                onClick={() => setIsNewCustomer(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isNewCustomer
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                + New Customer
              </button>
            </div>
          </div>

          {!isNewCustomer ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Existing Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone}) - CNIC: {c.cnic} [{c.customer_code}]
                    </option>
                  ))}
                </select>
              </div>

              {activeCustomer && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-slate-400">Full Name</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">{activeCustomer.full_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Phone</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">{activeCustomer.phone}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">CNIC / ID</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">{activeCustomer.cnic}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Outstanding Balance</span>
                      <p className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {formatCurrency(activeCustomer.total_outstanding)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Address: </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{activeCustomer.address}, {activeCustomer.city}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Usman Khan"
                  value={customerForm.full_name}
                  onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Father / Guardian Name</label>
                <input
                  type="text"
                  placeholder="e.g. Abdul Rasheed Khan"
                  value={customerForm.father_name}
                  onChange={(e) => setCustomerForm({ ...customerForm, father_name: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Primary Mobile Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="0300-1234567"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">CNIC / National ID *</label>
                <input
                  type="text"
                  required
                  placeholder="35202-1234567-1"
                  value={customerForm.cnic}
                  onChange={(e) => setCustomerForm({ ...customerForm, cnic: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">Complete Home / Office Address *</label>
                <input
                  type="text"
                  placeholder="House #, Street #, Area, Lahore"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">Customer Photo / CNIC Document</label>
                <div className="mt-1.5 flex items-center gap-3">
                  {customerForm.image_url ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 flex-shrink-0">
                      <img src={customerForm.image_url} alt="Customer" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCustomerForm({ ...customerForm, image_url: '' })}
                        className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl text-[9px]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCameraModalConfig({
                          isOpen: true,
                          title: 'Capture Customer Photo / CNIC',
                          onCapture: (url) => setCustomerForm({ ...customerForm, image_url: url }),
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Live Photo
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () =>
                            setCustomerForm((prev) => ({ ...prev, image_url: reader.result as string }));
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="block text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guarantors Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-6">
            {/* Guarantor 1 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Guarantor 1 (Zamin #1 / Primary Reference)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Guarantor 1 Name *"
                  value={guarantor1.name}
                  onChange={(e) => setGuarantor1({ ...guarantor1, name: e.target.value })}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Guarantor 1 Phone *"
                  value={guarantor1.phone}
                  onChange={(e) => setGuarantor1({ ...guarantor1, phone: e.target.value })}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Guarantor 1 CNIC *"
                  value={guarantor1.cnic}
                  onChange={(e) => setGuarantor1({ ...guarantor1, cnic: e.target.value })}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Guarantor 1 Photo / Document Capture */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {guarantor1.image_url ? (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 flex-shrink-0">
                    <img src={guarantor1.image_url} alt="Guarantor 1" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setGuarantor1({ ...guarantor1, image_url: '' })}
                      className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl text-[9px]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700/50 border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCameraModalConfig({
                        isOpen: true,
                        title: 'Capture Guarantor 1 Photo / CNIC',
                        onCapture: (url) => setGuarantor1({ ...guarantor1, image_url: url }),
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Take Guarantor 1 Photo
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () =>
                          setGuarantor1((prev) => ({ ...prev, image_url: reader.result as string }));
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800 dark:file:bg-amber-950 dark:file:text-amber-200"
                  />
                </div>
              </div>
            </div>

            {/* Guarantor 2 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-500" />
                Guarantor 2 (Zamin #2 / Secondary Reference - Optional)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Guarantor 2 Name"
                  value={guarantor2.name}
                  onChange={(e) => setGuarantor2({ ...guarantor2, name: e.target.value })}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Guarantor 2 Phone"
                  value={guarantor2.phone}
                  onChange={(e) => setGuarantor2({ ...guarantor2, phone: e.target.value })}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Guarantor 2 CNIC"
                  value={guarantor2.cnic}
                  onChange={(e) => setGuarantor2({ ...guarantor2, cnic: e.target.value })}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Guarantor 2 Photo / Document Capture */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {guarantor2.image_url ? (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 flex-shrink-0">
                    <img src={guarantor2.image_url} alt="Guarantor 2" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setGuarantor2({ ...guarantor2, image_url: '' })}
                      className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl text-[9px]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700/50 border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCameraModalConfig({
                        isOpen: true,
                        title: 'Capture Guarantor 2 Photo / CNIC',
                        onCapture: (url) => setGuarantor2({ ...guarantor2, image_url: url }),
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Take Guarantor 2 Photo
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () =>
                          setGuarantor2((prev) => ({ ...prev, image_url: reader.result as string }));
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 dark:file:bg-emerald-950 dark:file:text-emerald-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                if (!isNewCustomer && !selectedCustomerId) {
                  if (customerForm.full_name.trim()) {
                    setIsNewCustomer(true);
                  } else {
                    addToast('error', 'Please select an existing customer or switch to "+ New Customer" and enter name.', 'Customer Required');
                    return;
                  }
                }
                if (isNewCustomer && !customerForm.full_name.trim()) {
                  addToast('error', 'Please enter customer name (e.g. Jameel).', 'Customer Name Required');
                  return;
                }
                setStep(2);
              }}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-600/30"
            >
              <span>Next: Select Products</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Products & Price Selection */}
      {step === 2 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                Select Product(s) for Installment Sale
              </h3>
              <p className="text-xs text-slate-500">Choose devices and customize specific installment sale prices if needed</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>
          </div>

          {/* Selected Items for Contract */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Contract Items ({selectedProducts.length})
            </h4>

            {selectedProducts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                <p className="text-xs font-medium">No items selected yet</p>
                <p className="text-[11px] mt-0.5">Click items from the catalog below to add them to this contract.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedProducts.map((item) => (
                  <div
                    key={item.product_id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{item.product_name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        SKU: {item.sku} {item.imei && `• IMEI: ${item.imei}`} • Purchase Cost: {formatCurrency(item.purchase_price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <label className="text-[10px] text-slate-400">Qist Sale Price</label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItemInstallmentPrice(item.product_id, parseFloat(e.target.value) || 0)
                          }
                          className="w-28 px-2 py-1 text-right rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={() => removeProductFromContract(item.product_id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Catalog Picker Grid */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Available Inventory</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {matchingProducts.map((p) => {
                const isOutOfStock = p.stock_quantity <= 0;
                const isSelected = selectedProducts.some((it) => it.product_id === p.id);

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addProductToContract(p)}
                    className={`p-3 rounded-xl border text-xs flex flex-col justify-between cursor-pointer transition-all ${
                      isOutOfStock
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">{p.brand}</span>
                      <p className="font-bold text-slate-900 dark:text-white line-clamp-2 mt-0.5">{p.name}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400">Qist Price</span>
                        <p className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(p.installment_price)}</p>
                      </div>
                      <span className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        {isSelected ? '✓ Added' : '+ Add'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => {
                if (selectedProducts.length === 0) {
                  addToast('error', 'Please select at least one product.');
                  return;
                }
                setStep(3);
              }}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-600/30"
            >
              <span>Next: Duration & Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Duration, Down Payment & Schedule Preview */}
      {step === 3 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" />
              Financial Terms & Payment Schedule Calculation
            </h3>
            <p className="text-xs text-slate-500">Configure down payment, monthly installments, and start date</p>
          </div>

          {/* Financial Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Total Installment Price Display */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Total Qist Sale Price</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(totalInstallmentPrice)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Sum of selected items</p>
            </div>

            {/* Down Payment Input */}
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
              <label className="font-bold text-indigo-950 dark:text-indigo-200">Down Payment (Advance Rs.) *</label>
              <input
                type="number"
                min="0"
                max={totalInstallmentPrice}
                value={downPayment || ''}
                onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 20000"
                className="w-full mt-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-sm font-bold text-slate-900 dark:text-white text-right"
              />
              <p className="text-[10px] text-indigo-600 dark:text-indigo-300 mt-1 font-medium">
                Advance received upon device handover
              </p>
            </div>

            {/* Remaining Balance Display */}
            <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
              <span className="text-rose-700 dark:text-rose-400 font-semibold">Remaining Qist Balance</span>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(remainingBalance)}
              </p>
              <p className="text-[10px] text-rose-500 mt-1">Total to be distributed in schedule</p>
            </div>
          </div>

          {/* Duration & Installment Period Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Duration Frequency</label>
              <select
                value={durationType}
                onChange={(e) => setDurationType(e.target.value as any)}
                className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
              >
                <option value="monthly">Monthly Installments</option>
                <option value="weekly">Weekly Installments</option>
                <option value="custom">Custom Term</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Number of Installments (Months)</label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value) || 1)}
                className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={8}>8 Months</option>
                <option value={10}>10 Months (Standard)</option>
                <option value={12}>12 Months (1 Year)</option>
                <option value={18}>18 Months</option>
                <option value={24}>24 Months (2 Years)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Agreement Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Automatic Calculation Highlight Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-emerald-700/20">
            <div>
              <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                Monthly Installment per Month
              </span>
              <p className="text-2xl sm:text-3xl font-black mt-0.5">
                {formatCurrency(perInstallmentAmount)} / mo
              </p>
              <p className="text-xs text-emerald-100 mt-0.5">
                {installmentCount} equal monthly payments of {formatCurrency(perInstallmentAmount)}
              </p>
            </div>
            <div className="text-right sm:border-l sm:border-emerald-500/50 sm:pl-6">
              <span className="text-xs text-emerald-100">First Due Date</span>
              <p className="text-lg font-bold">{formatDate(previewSchedule[0]?.due_date)}</p>
            </div>
          </div>

          {/* Generated Schedule Table Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Payment Schedule Breakdown ({previewSchedule.length} Installments)
            </h4>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold sticky top-0">
                  <tr>
                    <th className="p-2.5">Installment #</th>
                    <th className="p-2.5">Due Date</th>
                    <th className="p-2.5 text-right">Amount Due</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewSchedule.map((sch) => (
                    <tr key={sch.installment_number}>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">
                        Installment #{sch.installment_number}
                      </td>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                        {formatDate(sch.due_date)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(sch.amount_due)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Pending
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-600/30"
            >
              <span>Next: Final Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Finalize Contract */}
      {step === 4 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
              Review & Finalize Installment Agreement
            </h3>
            <p className="text-xs text-slate-500">Verify all contract parameters before issuing and generating printable document</p>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Customer Summary
              </h4>
              <p>
                <strong className="text-slate-700 dark:text-slate-300">Name:</strong>{' '}
                {isNewCustomer ? customerForm.full_name : activeCustomer?.full_name}
              </p>
              <p>
                <strong className="text-slate-700 dark:text-slate-300">Phone:</strong>{' '}
                {isNewCustomer ? customerForm.phone : activeCustomer?.phone}
              </p>
              <p>
                <strong className="text-slate-700 dark:text-slate-300">CNIC:</strong>{' '}
                {isNewCustomer ? customerForm.cnic : activeCustomer?.cnic}
              </p>
              {guarantor1.name && (
                <p>
                  <strong className="text-slate-700 dark:text-slate-300">Guarantor:</strong>{' '}
                  {guarantor1.name} ({guarantor1.phone})
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Financial Summary
              </h4>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Qist Value:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totalInstallmentPrice)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Down Payment Received:</span>
                <span>{formatCurrency(downPayment)}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold border-t border-slate-200 dark:border-slate-700 pt-1">
                <span>Remaining Balance:</span>
                <span>{formatCurrency(remainingBalance)}</span>
              </div>
              <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                <span>Monthly Installment:</span>
                <span>{formatCurrency(perInstallmentAmount)} x {installmentCount} mos</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleCreateContract}
              className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Issue Qist Contract & Print Agreement</span>
            </button>
          </div>
        </div>
      )}

      <CameraModal
        isOpen={cameraModalConfig.isOpen}
        onClose={() => setCameraModalConfig({ ...cameraModalConfig, isOpen: false })}
        onCapture={cameraModalConfig.onCapture}
        title={cameraModalConfig.title}
      />
    </div>
  );
};
