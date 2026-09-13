import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  X,
  FileText,
  Building2,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { InstallmentContract, Sale, PaymentRecord } from '../../types';

export const PrintModal: React.FC = () => {
  const { printModal, closePrintModal, settings } = useApp();
  const printRef = useRef<HTMLDivElement>(null);

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

  const g1Name = contractData?.guarantor_1_name || contractData?.guarantor1?.name || 'Verified';
  const g1Phone = contractData?.guarantor_1_phone || contractData?.guarantor1?.phone || '-';
  const g1Cnic = contractData?.guarantor_1_cnic || contractData?.guarantor1?.cnic || '-';

  const g2Name = contractData?.guarantor_2_name || contractData?.guarantor2?.name;
  const g2Phone = contractData?.guarantor_2_phone || contractData?.guarantor2?.phone || '-';
  const g2Cnic = contractData?.guarantor_2_cnic || contractData?.guarantor2?.cnic || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static print:inset-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:w-full print:rounded-none">
        {/* Modal Top Header (Hidden on print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">
              {isSale && `Cash Sale Invoice: ${saleData?.invoice_number}`}
              {isContract && `Installment Contract Agreement: ${contractData?.contract_number}`}
              {isReceipt && `Installment Payment Receipt: ${receiptData?.receipt_number}`}
              {isStatement && 'Customer Statement'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerPrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now</span>
            </button>
            <button
              onClick={closePrintModal}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div
          ref={printRef}
          className="p-6 sm:p-10 overflow-y-auto bg-white text-slate-900 font-sans text-xs space-y-6 print:p-0 print:overflow-visible"
        >
          {/* 1. Header & Store Info */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                {settings.shop_name}
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">{settings.tagline}</p>
              <div className="mt-2 text-[11px] text-slate-600 space-y-0.5">
                <p>{settings.address}</p>
                <p>Helpline: {settings.phone} • Email: {settings.email}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                {isSale && 'TAX / CASH INVOICE'}
                {isContract && 'QIST FINANCING AGREEMENT'}
                {isReceipt && 'PAYMENT RECEIPT'}
              </span>
              <p className="mt-2 font-mono font-bold text-sm text-slate-900">
                {isSale && saleData?.invoice_number}
                {isContract && contractData?.contract_number}
                {isReceipt && receiptData?.receipt_number}
              </p>
              <p className="text-[11px] text-slate-500">
                Date: {formatDate(isSale ? saleData?.created_at : isContract ? contractData?.created_at : receiptData?.payment_date)}
              </p>
            </div>
          </div>

          {/* ==================== 2A. CASH SALE INVOICE ==================== */}
          {isSale && saleData && (
            <div className="space-y-6">
              {/* Customer Details */}
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
                    <th className="py-2">Item Description & Identifiers</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Total (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {saleData.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 text-slate-500">{idx + 1}</td>
                      <td className="py-2.5">
                        <p className="font-bold text-slate-900">{it.product_name}</p>
                        {it.imei && <p className="text-[10px] text-slate-500 font-mono">IMEI: {it.imei}</p>}
                        {it.serial_number && <p className="text-[10px] text-slate-500 font-mono">SN: {it.serial_number}</p>}
                        {it.warranty_months && <p className="text-[10px] text-indigo-600 font-semibold">{it.warranty_months} Months Official Warranty</p>}
                      </td>
                      <td className="py-2.5 text-center font-semibold">{it.quantity}</td>
                      <td className="py-2.5 text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="py-2.5 text-right font-bold">{formatCurrency(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Calculation */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
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
                  {(saleData.tax || saleData.tax_amount || 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Sales Tax:</span>
                      <span>+{formatCurrency(saleData.tax || saleData.tax_amount)}</span>
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
            <div className="space-y-5">
              {/* Product Purchased Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm">{contractData.product_summary}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Cash Market Price:</span>
                    <p className="font-bold">{formatCurrency(contractData.total_cash_price)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Advance / Down Payment:</span>
                    <p className="font-bold text-emerald-600">{formatCurrency(contractData.down_payment)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Contract Value:</span>
                    <p className="font-bold text-indigo-600">{formatCurrency(contractData.total_installment_price)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Monthly Installment:</span>
                    <p className="font-bold text-rose-600">{formatCurrency(contractData.installment_amount || contractData.monthly_installment)} / month</p>
                  </div>
                </div>
              </div>

              {/* Customer and Guarantors Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Buyer */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-indigo-600">Buyer / Purchaser</span>
                  <p className="font-bold text-slate-900 mt-1">{contractData.customer_name}</p>
                  <p className="text-[11px] text-slate-600 font-mono">CNIC: {contractData.customer_cnic}</p>
                  <p className="text-[11px] text-slate-600">Phone: {contractData.customer_phone}</p>
                </div>

                {/* Guarantor 1 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Guarantor #1 (Zamin)</span>
                  <p className="font-bold text-slate-900 mt-1">{g1Name}</p>
                  <p className="text-[11px] text-slate-600 font-mono">CNIC: {g1Cnic}</p>
                  <p className="text-[11px] text-slate-600">Phone: {g1Phone}</p>
                </div>

                {/* Guarantor 2 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Guarantor #2 (Zamin)</span>
                  {g2Name ? (
                    <>
                      <p className="font-bold text-slate-900 mt-1">{g2Name}</p>
                      <p className="text-[11px] text-slate-600 font-mono">CNIC: {g2Cnic}</p>
                      <p className="text-[11px] text-slate-600">Phone: {g2Phone}</p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">Single Guarantor Verified</p>
                  )}
                </div>
              </div>

              {/* Installment Repayment Schedule Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Payment Schedule ({contractData.installment_count} Months)
                </h4>
                <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2">Inst #</th>
                      <th className="p-2">Due Date</th>
                      <th className="p-2">Amount Due</th>
                      <th className="p-2">Amount Paid</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {contractData.schedule.map((sch) => (
                      <tr key={sch.installment_number}>
                        <td className="p-2 font-bold">{sch.installment_number}</td>
                        <td className="p-2">{formatDate(sch.due_date)}</td>
                        <td className="p-2 font-bold">{formatCurrency(sch.amount_due)}</td>
                        <td className="p-2">{formatCurrency(sch.amount_paid)}</td>
                        <td className="p-2 uppercase font-bold text-[10px]">
                          <span
                            className={
                              sch.status === 'paid'
                                ? 'text-emerald-600'
                                : sch.status === 'overdue'
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }
                          >
                            {sch.status}
                          </span>
                        </td>
                        <td className="p-2 text-slate-500">{sch.paid_date ? formatDate(sch.paid_date) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legal Terms */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-600 leading-relaxed space-y-1">
                <p className="font-bold text-slate-800 uppercase">Legal Agreement & Terms of Sale:</p>
                <p>{settings.installment_terms}</p>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-4 gap-4 pt-10 text-center text-[10px] font-bold">
                <div className="border-t border-slate-900 pt-1">Buyer's Signature</div>
                <div className="border-t border-slate-900 pt-1">Guarantor #1 Signature</div>
                <div className="border-t border-slate-900 pt-1">Guarantor #2 Signature</div>
                <div className="border-t border-slate-900 pt-1">Authorized Shop Stamp</div>
              </div>
            </div>
          )}

          {/* ==================== 2C. INSTALLMENT PAYMENT RECEIPT ==================== */}
          {isReceipt && receiptData && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Customer Name</span>
                  <p className="font-bold text-slate-900 text-base">{receiptData.customer_name}</p>
                  <p className="text-slate-600 font-mono text-xs">Contract #{receiptData.contract_number}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Amount Received</span>
                  <p className="text-2xl font-black text-emerald-600">{formatCurrency(receiptData.amount)}</p>
                </div>
              </div>

              <table className="w-full text-left text-xs">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 text-slate-500 font-medium">Payment Date:</td>
                    <td className="py-2 font-bold text-right">{formatDate(receiptData.payment_date)}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 text-slate-500 font-medium">Payment Mode:</td>
                    <td className="py-2 font-bold uppercase text-right">{receiptData.payment_method}</td>
                  </tr>
                  {receiptData.previous_balance !== undefined && (
                    <tr className="border-b border-slate-200">
                      <td className="py-2 text-slate-500 font-medium">Previous Balance:</td>
                      <td className="py-2 font-bold text-slate-700 text-right">{formatCurrency(receiptData.previous_balance)}</td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-200 bg-emerald-50/50">
                    <td className="py-2 text-emerald-800 font-bold">Amount Paid Now:</td>
                    <td className="py-2 font-black text-emerald-700 text-right">{formatCurrency(receiptData.amount)}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 text-slate-500 font-medium">Remaining Balance:</td>
                    <td className="py-2 font-black text-rose-600 text-right">{formatCurrency(receiptData.remaining_balance)}</td>
                  </tr>
                  {receiptData.collected_by && (
                    <tr className="border-b border-slate-200">
                      <td className="py-2 text-slate-500 font-medium">Collected By:</td>
                      <td className="py-2 font-semibold text-slate-800 text-right">{receiptData.collected_by}</td>
                    </tr>
                  )}
                  {receiptData.notes && (
                    <tr className="border-b border-slate-200">
                      <td className="py-2 text-slate-500 font-medium">Remarks / Description:</td>
                      <td className="py-2 font-medium text-slate-700 text-right">{receiptData.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="pt-8 flex justify-between items-end">
                <div className="text-[10px] text-slate-500">
                  <p>Computer generated payment receipt.</p>
                  <p>Thank you for your prompt installment payment!</p>
                </div>
                <div className="text-center w-40 border-t border-slate-900 pt-1 font-bold text-xs">
                  Cashier Signature
                </div>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">
            {settings.invoice_footer_note}
          </div>
        </div>
      </div>
    </div>
  );
};
