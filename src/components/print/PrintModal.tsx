import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  X,
  Share2,
  Copy,
  Check,
  FileText,
  Building2,
  Receipt,
  Smartphone,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { InstallmentContract, Sale, PaymentRecord, Customer } from '../../types';

export const PrintModal: React.FC = () => {
  const { printModal, closePrintModal, settings, contracts, addToast } = useApp();
  const printRef = useRef<HTMLDivElement>(null);
  const [printFormat, setPrintFormat] = useState<'standard' | 'thermal'>('standard');
  const [copied, setCopied] = useState(false);

  if (!printModal.isOpen || !printModal.data) return null;

  const handleTriggerPrint = () => {
    window.print();
  };

  const isSale = printModal.type === 'sale_invoice';
  const isContract = printModal.type === 'installment_contract';
  const isReceipt = printModal.type === 'payment_receipt' || printModal.type === 'installment_receipt';
  const isStatement = printModal.type === 'customer_statement';

  const saleData = isSale ? (printModal.data as Sale) : null;
  const contractData = isContract ? (printModal.data as InstallmentContract) : null;
  const receiptData = isReceipt ? (printModal.data as PaymentRecord) : null;
  const statementCustomer = isStatement ? (printModal.data as Customer) : null;

  const g1Name = contractData?.guarantor_1_name || contractData?.guarantor1?.name || 'Verified';
  const g1Phone = contractData?.guarantor_1_phone || contractData?.guarantor1?.phone || '-';
  const g1Cnic = contractData?.guarantor_1_cnic || contractData?.guarantor1?.cnic || '-';

  const g2Name = contractData?.guarantor_2_name || contractData?.guarantor2?.name;
  const g2Phone = contractData?.guarantor_2_phone || contractData?.guarantor2?.phone || '-';
  const g2Cnic = contractData?.guarantor_2_cnic || contractData?.guarantor2?.cnic || '-';

  // Construct text receipt for WhatsApp or Clipboard
  const generateTextReceipt = (): { text: string; phone: string } => {
    let text = '';
    let phone = '';

    if (isReceipt && receiptData) {
      phone = receiptData.customer_phone || '';
      if (!phone) {
        const linkedContract = contracts.find(
          (c) => c.contract_number === receiptData.contract_number || c.id === receiptData.contract_id
        );
        phone = linkedContract?.customer_phone || '';
      }
      text = `*${settings.shop_name}*
*قسط ادائیگی رسید / PAYMENT RECEIPT*
────────────────────────
رسید نمبر: ${receiptData.receipt_number}
معاہدہ نمبر: #${receiptData.contract_number}
گاہک کا نام: ${receiptData.customer_name}
تاریخ: ${formatDate(receiptData.payment_date)}
طریقہ ادائیگی: ${receiptData.payment_method?.toUpperCase() || 'CASH'}
────────────────────────
سابقہ بقایا: ${formatCurrency(receiptData.previous_balance || 0)}
ادا کردہ رقم: *${formatCurrency(receiptData.amount)}*
باقی بقایا جات: *${formatCurrency(receiptData.remaining_balance || 0)}*
────────────────────────
وصول کنندہ: ${receiptData.collected_by || 'Cashier'}
${receiptData.notes ? `ریمارکس: ${receiptData.notes}\n────────────────────────\n` : ''}شکریہ! ${settings.shop_name}
رابطہ نمبر: ${settings.phone}`;
    } else if (isSale && saleData) {
      phone = saleData.customer_phone || '';
      text = `*${settings.shop_name}*
*کیش سیل انوائس / CASH SALE INVOICE*
────────────────────────
انوائس نمبر: ${saleData.invoice_number}
گاہک کا نام: ${saleData.customer_name}
تاریخ: ${formatDate(saleData.created_at)}
آئٹمز: ${saleData.items.map((it) => `${it.product_name} (x${it.quantity})`).join(', ')}
────────────────────────
کل رقم: *${formatCurrency(saleData.total_amount)}*
وصول شدہ: *${formatCurrency(saleData.paid_amount)}*
────────────────────────
شکریہ! ${settings.shop_name}
رابطہ: ${settings.phone}`;
    } else if (isContract && contractData) {
      phone = contractData.customer_phone || '';
      text = `*${settings.shop_name}*
*اقساط کا معاہدہ / QIST CONTRACT*
────────────────────────
معاہدہ نمبر: #${contractData.contract_number}
گاہک کا نام: ${contractData.customer_name}
پروڈکٹ: ${contractData.product_summary}
کل قسط قیمت: ${formatCurrency(contractData.total_installment_price)}
ایڈوانس رقم: ${formatCurrency(contractData.down_payment)}
ماہانہ قسط: ${formatCurrency(contractData.installment_amount || contractData.monthly_installment || 0)} / ماہ
کل اقساط کی تعداد: ${contractData.installment_count || 10} مہینے
────────────────────────
شکریہ! ${settings.shop_name}
رابطہ نمبر: ${settings.phone}`;
    }

    return { text, phone };
  };

  const handleShareWhatsApp = () => {
    const { text, phone } = generateTextReceipt();
    if (!text) return;

    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('03')) {
      cleanPhone = '92' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('3')) {
      cleanPhone = '92' + cleanPhone;
    }

    const encoded = encodeURIComponent(text);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const { text } = generateTextReceipt();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('success', 'Receipt details copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="print-portal-root"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn print:p-0 print:m-0 print:bg-white print:static print:inset-auto print:block"
    >
      <div
        className={`w-full ${
          printFormat === 'thermal' ? 'max-w-md' : 'max-w-3xl'
        } bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:w-full print:max-w-none print:rounded-none transition-all`}
      >
        {/* Modal Action Header (Hidden during actual print) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 print:hidden select-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs sm:text-sm truncate">
                {isSale && `Cash Invoice: ${saleData?.invoice_number}`}
                {isContract && `Agreement: ${contractData?.contract_number}`}
                {isReceipt && `Qist Receipt: ${receiptData?.receipt_number}`}
                {isStatement && `Statement: ${statementCustomer?.name || 'Customer'}`}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {settings.shop_name} • Ready for print & WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Format Toggle (Standard vs Thermal) */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPrintFormat('standard')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  printFormat === 'standard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Standard A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  printFormat === 'thermal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Thermal (80mm)
              </button>
            </div>

            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-transform active:scale-95"
              title="Send formatted receipt to customer on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
              title="Copy receipt text to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Print Trigger Button */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-transform active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={closePrintModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div
          ref={printRef}
          id="printable-document"
          className={`overflow-y-auto bg-white text-slate-900 font-sans text-xs space-y-5 print:p-0 print:overflow-visible ${
            printFormat === 'thermal'
              ? 'p-4 sm:p-6 max-w-[380px] mx-auto text-[11px]'
              : 'p-6 sm:p-10'
          }`}
        >
          {/* 1. Header & Store Information */}
          <div className={`border-b-2 border-slate-900 pb-3 ${printFormat === 'thermal' ? 'text-center space-y-1' : 'flex justify-between items-start'}`}>
            <div className={printFormat === 'thermal' ? 'text-center' : ''}>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                {settings.shop_name}
              </h1>
              {settings.tagline && (
                <p className="text-xs text-slate-600 font-medium mt-0.5">{settings.tagline}</p>
              )}
              <div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
                <p>{settings.address}</p>
                <p>Phone: {settings.phone} {settings.email ? `• ${settings.email}` : ''}</p>
              </div>
            </div>

            <div className={printFormat === 'thermal' ? 'pt-2 border-t border-dashed border-slate-300' : 'text-right'}>
              <span className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                {isSale && 'TAX / CASH INVOICE'}
                {isContract && 'QIST FINANCING AGREEMENT'}
                {isReceipt && 'PAYMENT RECEIPT (قسط رسید)'}
                {isStatement && 'CUSTOMER ACCOUNT STATEMENT'}
              </span>
              <p className="mt-1 font-mono font-bold text-sm text-slate-900">
                {isSale && saleData?.invoice_number}
                {isContract && contractData?.contract_number}
                {isReceipt && receiptData?.receipt_number}
              </p>
              <p className="text-[11px] text-slate-600">
                Date: {formatDate(isSale ? saleData?.created_at : isContract ? contractData?.created_at : receiptData?.payment_date)}
              </p>
            </div>
          </div>

          {/* ==================== 2A. CASH SALE INVOICE ==================== */}
          {isSale && saleData && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Billed To</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{saleData.customer_name}</p>
                  <p className="text-slate-600">{saleData.customer_phone || 'Walk-in Counter Customer'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment Status</span>
                  <p className="font-bold text-emerald-600 text-sm mt-0.5 uppercase">{saleData.payment_status || 'PAID'}</p>
                  <p className="text-slate-600 uppercase text-[10px]">Method: {saleData.payment_method}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 font-bold">
                    <th className="py-2">#</th>
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Total (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {saleData.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 text-slate-500">{idx + 1}</td>
                      <td className="py-2">
                        <p className="font-bold text-slate-900">{it.product_name}</p>
                        {it.imei && <p className="text-[10px] text-slate-500 font-mono">IMEI: {it.imei}</p>}
                        {it.serial_number && <p className="text-[10px] text-slate-500 font-mono">SN: {it.serial_number}</p>}
                        {it.warranty_months && <p className="text-[10px] text-indigo-600 font-semibold">{it.warranty_months} Months Official Warranty</p>}
                      </td>
                      <td className="py-2 text-center font-semibold">{it.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="py-2 text-right font-bold">{formatCurrency(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(saleData.subtotal)}</span>
                  </div>
                  {(saleData.discount || saleData.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Discount:</span>
                      <span>-{formatCurrency(saleData.discount || saleData.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t-2 border-slate-900 pt-2 text-slate-900">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(saleData.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold pt-1">
                    <span>Paid Cash:</span>
                    <span>{formatCurrency(saleData.paid_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2B. INSTALLMENT CONTRACT ==================== */}
          {isContract && contractData && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm">{contractData.product_summary}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Market Price:</span>
                    <p className="font-bold">{formatCurrency(contractData.total_cash_price)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Advance / Down Payment:</span>
                    <p className="font-bold text-emerald-600">{formatCurrency(contractData.down_payment)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Contract Value:</span>
                    <p className="font-bold text-indigo-600">{formatCurrency(contractData.total_installment_price)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Monthly Installment:</span>
                    <p className="font-bold text-rose-600">{formatCurrency(contractData.installment_amount || contractData.monthly_installment || 0)} / mo</p>
                  </div>
                </div>
              </div>

              {/* Customer & Guarantors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-indigo-600">Buyer</span>
                  <p className="font-bold text-slate-900 mt-0.5">{contractData.customer_name}</p>
                  <p className="text-[11px] text-slate-600 font-mono">CNIC: {contractData.customer_cnic || '-'}</p>
                  <p className="text-[11px] text-slate-600">Ph: {contractData.customer_phone}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Guarantor #1</span>
                  <p className="font-bold text-slate-900 mt-0.5">{g1Name}</p>
                  <p className="text-[11px] text-slate-600 font-mono">CNIC: {g1Cnic}</p>
                  <p className="text-[11px] text-slate-600">Ph: {g1Phone}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Guarantor #2</span>
                  <p className="font-bold text-slate-900 mt-0.5">{g2Name || 'Single Guarantor'}</p>
                  <p className="text-[11px] text-slate-600 font-mono">CNIC: {g2Cnic}</p>
                  <p className="text-[11px] text-slate-600">Ph: {g2Phone}</p>
                </div>
              </div>

              {/* Schedule Table */}
              <div className="space-y-1.5 print-avoid-break">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Payment Schedule ({contractData.installment_count || 10} Months)
                </h4>
                <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-1.5">#</th>
                      <th className="p-1.5">Due Date</th>
                      <th className="p-1.5">Amount Due</th>
                      <th className="p-1.5">Paid</th>
                      <th className="p-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {contractData.schedule.map((sch) => (
                      <tr key={sch.installment_number}>
                        <td className="p-1.5 font-bold">{sch.installment_number}</td>
                        <td className="p-1.5">{formatDate(sch.due_date)}</td>
                        <td className="p-1.5 font-bold">{formatCurrency(sch.amount_due)}</td>
                        <td className="p-1.5">{formatCurrency(sch.amount_paid)}</td>
                        <td className="p-1.5 uppercase font-bold text-[10px]">
                          <span className={sch.status === 'paid' ? 'text-emerald-600' : sch.status === 'overdue' ? 'text-rose-600' : 'text-slate-600'}>
                            {sch.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Terms & Signatures */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-600 leading-relaxed space-y-0.5 print-avoid-break">
                <p className="font-bold text-slate-800 uppercase">Legal Agreement & Terms of Sale:</p>
                <p>{settings.installment_terms}</p>
              </div>

              <div className="grid grid-cols-4 gap-4 pt-8 text-center text-[10px] font-bold print-avoid-break">
                <div className="border-t border-slate-900 pt-1">Buyer's Signature</div>
                <div className="border-t border-slate-900 pt-1">Guarantor #1 Signature</div>
                <div className="border-t border-slate-900 pt-1">Guarantor #2 Signature</div>
                <div className="border-t border-slate-900 pt-1">Shop Stamp / Manager</div>
              </div>
            </div>
          )}

          {/* ==================== 2C. INSTALLMENT PAYMENT RECEIPT ==================== */}
          {isReceipt && receiptData && (
            <div className="space-y-4">
              {/* Highlight Banner */}
              <div className="p-3.5 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                    Customer Name (گاہک کا نام)
                  </span>
                  <p className="font-black text-slate-900 text-base sm:text-lg">{receiptData.customer_name}</p>
                  <p className="text-slate-600 font-mono text-xs mt-0.5">Contract #{receiptData.contract_number}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                    Amount Received (وصول شدہ رقم)
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-700">
                    {formatCurrency(receiptData.amount)}
                  </p>
                </div>
              </div>

              {/* Breakdown Ledger Table */}
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-600 font-medium">Payment Date (تاریخ ادائیگی):</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 text-right">{formatDate(receiptData.payment_date)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">Payment Mode (طریقہ):</td>
                    <td className="py-2.5 px-3 font-bold uppercase text-slate-900 text-right">{receiptData.payment_method || 'CASH'}</td>
                  </tr>
                  {receiptData.previous_balance !== undefined && (
                    <tr>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">Previous Outstanding (سابقہ بقایا رقم):</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 text-right">{formatCurrency(receiptData.previous_balance)}</td>
                    </tr>
                  )}
                  <tr className="bg-emerald-50/60">
                    <td className="py-2.5 px-3 text-emerald-900 font-bold">Amount Paid Now (اب ادا کی گئی قسط):</td>
                    <td className="py-2.5 px-3 font-black text-emerald-800 text-right text-sm">{formatCurrency(receiptData.amount)}</td>
                  </tr>
                  <tr className="bg-rose-50/40">
                    <td className="py-2.5 px-3 text-rose-900 font-bold">Remaining Balance (باقی بقایا جات):</td>
                    <td className="py-2.5 px-3 font-black text-rose-700 text-right text-sm">{formatCurrency(receiptData.remaining_balance)}</td>
                  </tr>
                  {receiptData.collected_by && (
                    <tr>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">Collected By (وصول کنندہ):</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 text-right">{receiptData.collected_by}</td>
                    </tr>
                  )}
                  {receiptData.notes && (
                    <tr>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">Remarks / Description:</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 text-right">{receiptData.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Receipt Footer & Cashier Signature */}
              <div className="pt-6 flex justify-between items-end print-avoid-break">
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p className="font-semibold text-slate-700">Computer generated verified installment receipt.</p>
                  <p>بروقت اقساط کی ادائیگی کا بے حد شکریہ۔</p>
                </div>
                <div className="text-center w-40 border-t-2 border-slate-900 pt-1 font-bold text-xs text-slate-900">
                  Cashier / Shop Signature
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2D. CUSTOMER ACCOUNT STATEMENT ==================== */}
          {isStatement && statementCustomer && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900 text-base">{statementCustomer.name || statementCustomer.full_name}</p>
                  <p className="text-slate-600 text-xs">Phone: {statementCustomer.phone} • CNIC: {statementCustomer.cnic || 'N/A'}</p>
                  <p className="text-slate-600 text-xs">Address: {statementCustomer.address || '-'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Current Outstanding</span>
                  <p className="text-xl font-black text-rose-600">{formatCurrency(statementCustomer.total_outstanding || 0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Clean Invoice Footer */}
          <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500 print-avoid-break">
            {settings.invoice_footer_note}
          </div>
        </div>
      </div>
    </div>
  );
};
