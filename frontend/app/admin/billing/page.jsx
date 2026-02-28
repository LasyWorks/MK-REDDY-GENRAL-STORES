"use client";
import { useState, useEffect } from "react";
import {
  PrinterIcon as Printer,
  ArrowLeftIcon as ArrowLeft,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import api from "@/lib/api";

export default function BillingPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);

  // Fetch all orders
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders", { limit: 100 });
      // ApiResponse.paginated wraps array in res.data
      const orders = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setOrders(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoice = async (orderId) => {
    setInvoiceLoading(true);
    setInvoiceError(null);
    try {
      const res = await api.get(`/invoices/order/${orderId}`);
      if (res.data) {
        setInvoice(res.data);
      } else {
        // Order exists but has no invoice yet
        setInvoice(null);
        setInvoiceError("No invoice generated for this order yet.");
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      setInvoiceError(error.message || "Failed to load invoice.");
      setInvoice(null);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
    fetchInvoice(order.id);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedOrder) return;
    setInvoiceLoading(true);
    setInvoiceError(null);
    try {
      const res = await api.post(
        `/invoices/order/${selectedOrder.id}/generate`,
      );
      setInvoice(res.data);
    } catch (error) {
      console.error("Error generating invoice:", error);
      setInvoiceError(error.message || "Failed to generate invoice.");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handlePrint = () => {
    const content = document.getElementById("invoice-content");
    if (!content) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
      <head>
        <title>Invoice - ${invoice?.invoice_number || ""}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; line-height: 1.4; }
          table { width: 100%; border-collapse: collapse; }

          /* Tailwind utility classes used in invoice */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .italic { font-style: italic; }
          .tracking-wide { letter-spacing: 0.025em; }
          .leading-tight { line-height: 1.25; }
          .border { border: 1px solid #d1d5db; }
          .border-b { border-bottom: 1px solid #d1d5db; }
          .border-t { border-top: 1px solid #d1d5db; }
          .border-collapse { border-collapse: collapse; }
          .w-full { width: 100%; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .gap-2 { gap: 0.5rem; }
          .gap-4 { gap: 1rem; }
          .mb-0\\.5, .mb-0\\.5 { margin-bottom: 0.125rem; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .pb-2 { padding-bottom: 0.5rem; }
          .pt-1 { padding-top: 0.25rem; }
          .p-1\\.5, .p-1\\.5 { padding: 0.375rem; }
          .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
          .py-0 { padding-top: 0; padding-bottom: 0; }
          .py-0\\.5, .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
          .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
          .text-xs { font-size: 0.75rem; line-height: 1rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .text-base { font-size: 1rem; line-height: 1.5rem; }
          .text-lg { font-size: 1.125rem; line-height: 1.75rem; }

          /* Colors */
          .text-gray-600 { color: #4b5563; }
          .text-gray-700 { color: #374151; }
          .text-gray-900 { color: #111827; }
          .text-purple-600 { color: #9333ea; }
          .text-white { color: #ffffff; }
          .bg-purple-600 { background-color: #9333ea !important; }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `Rs ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const numberToWords = (num) => {
    if (num === 0) return "Zero Rupees only";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];

    const convertChunk = (n) => {
      if (n === 0) return "";
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100)
        return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convertChunk(n % 100) : "")
      );
    };

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = Math.floor(num % 1000);

    let words = "";
    if (crore) words += convertChunk(crore) + " Crore ";
    if (lakh) words += convertChunk(lakh) + " Lakh ";
    if (thousand) words += convertChunk(thousand) + " Thousand ";
    if (remainder) words += convertChunk(remainder);

    return words.trim() + " Rupees only";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Billing System</h1>
          <div className="w-32" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List */}
          <div className="lg:col-span-1 print:hidden">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">
                  Orders ({orders.length})
                </h2>
              </div>
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {orders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No orders found
                  </div>
                ) : (
                  orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => handleOrderSelect(order)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                        selectedOrder?.id === order.id
                          ? "bg-blue-50 border-l-4 border-blue-600"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {order.order_number}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {order.customer_name || "Customer"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </div>
                          <div
                            className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block capitalize ${
                              order.status === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : order.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : order.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : order.status === "picked_up"
                                      ? "bg-purple-100 text-purple-700"
                                      : order.status === "ready_for_pickup"
                                        ? "bg-cyan-100 text-cyan-700"
                                        : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {order.status?.replace(/_/g, " ")}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b flex justify-between items-center print:hidden">
                <h2 className="font-semibold text-gray-900">Invoice Preview</h2>
                {invoice && (
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Printer className="w-4 h-4" />
                    Print Invoice
                  </button>
                )}
              </div>

              <div className="p-8">
                {!selectedOrder ? (
                  <div className="text-center py-16 text-gray-500">
                    Select an order to view invoice
                  </div>
                ) : invoiceLoading ? (
                  <div className="text-center py-16 text-gray-500">
                    Loading invoice...
                  </div>
                ) : invoiceError ? (
                  <div className="text-center py-16">
                    <p className="text-gray-500 mb-4">{invoiceError}</p>
                    <button
                      onClick={handleGenerateInvoice}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Generate Invoice
                    </button>
                  </div>
                ) : !invoice ? (
                  <div className="text-center py-16 text-gray-500">
                    No invoice available for this order
                  </div>
                ) : (
                  <div
                    className="max-w-4xl mx-auto text-sm"
                    id="invoice-content"
                  >
                    {/* Store Header */}
                    <div className="text-center mb-2 border-b pb-2">
                      <h1 className="text-lg font-bold text-gray-900 tracking-wide mb-0.5">
                        M K REDDY GENERAL STORES
                      </h1>
                      <p className="text-xs text-gray-700">SALIPETA, NELLORE</p>
                      <p className="text-xs text-gray-600">
                        GSTIN : 37D1C9A5877L1Z0
                      </p>
                      <p className="text-xs text-gray-600">
                        State: 37-Andhra Pradesh
                      </p>
                    </div>

                    {/* SALE Title */}
                    <div className="text-center mb-2">
                      <h2 className="text-base font-bold text-purple-600">
                        SALE
                      </h2>
                    </div>

                    {/* Bill To and Invoice Details */}
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <h3 className="font-bold text-xs mb-1">Bill To</h3>
                        <p className="text-xs font-semibold leading-tight">
                          {invoice.customer?.name}
                        </p>
                        <p className="text-xs text-gray-600 leading-tight">
                          Contact No : {invoice.customer?.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <h3 className="font-bold text-xs mb-1">
                          Invoice Details
                        </h3>
                        <p className="text-xs leading-tight">
                          Invoice No : {invoice.invoice_number}
                        </p>
                        <p className="text-xs leading-tight">
                          Date :{" "}
                          {formatDate(invoice.order_date || invoice.created_at)}
                        </p>
                        <p className="text-xs leading-tight">
                          Time :{" "}
                          {new Date(invoice.order_date || invoice.created_at)
                            .toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                            .toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full mb-2 text-xs border-collapse">
                      <thead className="bg-purple-600 text-white">
                        <tr>
                          <th
                            className="py-1 px-1 text-center border"
                            style={{ width: "5%" }}
                          >
                            #
                          </th>
                          <th
                            className="py-1 px-1 text-left border"
                            style={{ width: "45%" }}
                          >
                            Item Name
                          </th>
                          <th
                            className="py-1 px-1 text-center border"
                            style={{ width: "15%" }}
                          >
                            Quantity
                          </th>
                          <th
                            className="py-1 px-1 text-right border"
                            style={{ width: "17.5%" }}
                          >
                            Price/Unit
                          </th>
                          <th
                            className="py-1 px-1 text-right border"
                            style={{ width: "17.5%" }}
                          >
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items?.map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-0.5 px-1 text-center border">
                              {idx + 1}
                            </td>
                            <td className="py-0.5 px-1 border">
                              <div className="font-medium leading-tight">
                                {item.product_name}
                              </div>
                            </td>
                            <td className="py-0.5 px-1 text-center border">
                              {item.quantity}
                            </td>
                            <td className="py-0.5 px-1 text-right border">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="py-0.5 px-1 text-right border">
                              {formatCurrency(item.total)}
                            </td>
                          </tr>
                        ))}
                        {/* Reduce empty rows to max 5 */}
                        {invoice.items?.length < 8 &&
                          Array.from({
                            length: Math.max(0, 8 - invoice.items.length),
                          }).map((_, idx) => (
                            <tr
                              key={`empty-${idx}`}
                              className="border-b"
                              style={{ height: "20px" }}
                            >
                              <td className="py-0.5 px-1 border">&nbsp;</td>
                              <td className="py-0.5 px-1 border">&nbsp;</td>
                              <td className="py-0.5 px-1 border">&nbsp;</td>
                              <td className="py-0.5 px-1 border">&nbsp;</td>
                              <td className="py-0.5 px-1 border">&nbsp;</td>
                            </tr>
                          ))}
                        <tr className="font-bold">
                          <td
                            colSpan="2"
                            className="py-0.5 px-1 text-left border"
                          >
                            Total
                          </td>
                          <td className="py-0.5 px-1 text-center border">
                            {invoice.items?.reduce(
                              (sum, item) => sum + parseFloat(item.quantity),
                              0,
                            )}
                          </td>
                          <td className="py-0.5 px-1 border"></td>
                          <td className="py-0.5 px-1 text-right border">
                            {formatCurrency(invoice.subtotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Amount in Words and Totals */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="border p-1.5">
                        <p className="text-xs font-bold mb-0.5 leading-tight">
                          Invoice Amount In Words
                        </p>
                        <p className="text-xs italic leading-tight">
                          {numberToWords(Math.round(invoice.total_amount))}
                        </p>
                      </div>
                      <div className="border p-1.5">
                        <table className="w-full text-xs">
                          <tbody>
                            <tr>
                              <td className="py-0">Sub Total</td>
                              <td className="py-0 text-right">
                                {formatCurrency(invoice.subtotal)}
                              </td>
                            </tr>
                            <tr className="font-bold bg-purple-600 text-white">
                              <td className="py-0 px-1">Total</td>
                              <td className="py-0 px-1 text-right">
                                {formatCurrency(invoice.total_amount)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-0">Received</td>
                              <td className="py-0 text-right">
                                {invoice.is_paid
                                  ? formatCurrency(invoice.total_amount)
                                  : "Rs 0.00"}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-0">Balance</td>
                              <td className="py-0 text-right">
                                {invoice.is_paid
                                  ? "Rs 0.00"
                                  : formatCurrency(invoice.total_amount)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-0">Previous Balance</td>
                              <td className="py-0 text-right">Rs 0.00</td>
                            </tr>
                            <tr className="font-bold">
                              <td className="py-0">Current Balance</td>
                              <td className="py-0 text-right">
                                {invoice.is_paid
                                  ? "Rs 0.00"
                                  : formatCurrency(invoice.total_amount)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="border-t pt-1">
                      <p className="text-xs font-bold leading-tight">
                        Terms and Conditions
                      </p>
                      <p className="text-xs text-gray-700 leading-tight">
                        Return items are not accepted after two days of bill
                        date.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
