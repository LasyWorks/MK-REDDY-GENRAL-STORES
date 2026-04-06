"use client";
import { useState, useEffect, useMemo } from "react";
import {
  PrinterIcon as Printer,
  ArrowLeftIcon as ArrowLeft,
  MagnifyingGlassIcon as Search,
  EyeIcon as Eye,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import api from "@/lib/api";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";

function getPresetRange(preset) {
  const now = new Date();
  if (preset === "today") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  if (preset === "last_7_days") {
    return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
  }
  if (preset === "this_week") {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }
  if (preset === "last_month") {
    const firstOfCurrentMonth = startOfMonth(now);
    const lastMonthDate = subDays(firstOfCurrentMonth, 1);
    return {
      from: startOfMonth(lastMonthDate),
      to: endOfMonth(lastMonthDate),
    };
  }

  return { from: startOfMonth(now), to: endOfDay(now) };
}

export default function BillingPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(() => getPresetRange("this_month"));

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders", {
        limit: 500,
        page: 1,
        sort: "created_at_desc",
        status: "picked_up",
      });
      const fetchedRaw = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
      const fetched = fetchedRaw.filter((order) => order.status === "picked_up");
      setOrders(fetched);
      if (fetched.length > 0 && !selectedOrder) {
        handleOrderSelect(fetched[0]);
      }
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
      const res = await api.post(`/invoices/order/${selectedOrder.id}/generate`);
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
          body { font-family: Arial, sans-serif; font-size: 10.5px; color: #111827; line-height: 1.35; }
          table { width: 100%; border-collapse: collapse; }

          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .italic { font-style: italic; }
          .uppercase { text-transform: uppercase; }
          .tracking-wide { letter-spacing: 0.025em; }
          .leading-tight { line-height: 1.25; }
          .leading-snug { line-height: 1.375; }
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
          .p-2 { padding: 0.5rem; }
          .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
          .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
          .py-0 { padding-top: 0; padding-bottom: 0; }
          .py-0\\.5, .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
          .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
          .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
          .text-xs { font-size: 0.75rem; line-height: 1rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .text-base { font-size: 1rem; line-height: 1.5rem; }
          .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
          .text-xl { font-size: 1.25rem; }
          .font-mono { font-family: monospace; }
          .tabular-nums { font-variant-numeric: tabular-nums; }
          .break-words { word-break: break-word; }
          .hover\\:bg-gray-50:hover { background-color: #f9fafb; }
          .bg-gray-50 { background-color: #f9fafb; }
          .bg-gray-100 { background-color: #f3f4f6; }
          .bg-purple-50 { background-color: #faf5ff; }
          .border-purple-700 { border-color: #7c3aed; }

          .text-gray-500 { color: #6b7280; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-700 { color: #374151; }
          .text-gray-800 { color: #1f2937; }
          .text-gray-900 { color: #111827; }
          .text-purple-600 { color: #9333ea; }
          .text-purple-700 { color: #7c3aed; }
          .text-green-700 { color: #166534; }
          .text-red-600 { color: #dc2626; }
          .text-white { color: #ffffff; }
          .bg-purple-600 { background-color: #9333ea !important; }
          .bg-purple-700 { background-color: #7c3aed !important; }
          
          /* Print responsive - stack on narrow prints */
          @media print and (max-width: 600px) {
            .grid-cols-2 { grid-template-columns: 1fr; }
            table { font-size: 0.7rem; }
            .text-lg { font-size: 1rem; }
          }
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
      if (n < 100) {
        return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      }
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

  const getBestCustomerName = (...candidates) => {
    const cleaned = candidates
      .map((v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : ""))
      .filter(Boolean);
    if (!cleaned.length) return "Customer";

    const score = (name) => {
      const words = name.split(" ").filter(Boolean).length;
      return words * 100 + name.length;
    };

    return cleaned.sort((a, b) => score(b) - score(a))[0];
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const statusMatch = o.status === "picked_up";

      const needle = search.trim().toLowerCase();
      const searchMatch = !needle
        ? true
        : [o.order_number, o.customer_name, o.customer_phone]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(needle));

      const dateMatch = (() => {
        if (!dateRange?.from) return true;
        const from = startOfDay(dateRange.from);
        const to = endOfDay(dateRange.to || dateRange.from);
        const createdAt = new Date(o.created_at);
        return createdAt >= from && createdAt <= to;
      })();

      return statusMatch && searchMatch && dateMatch;
    });
  }, [orders, search, dateRange]);

  useEffect(() => {
    if (!filteredOrders.length) return;
    const onKeyDown = (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (!selectedOrder) {
        handleOrderSelect(filteredOrders[0]);
        return;
      }
      const idx = filteredOrders.findIndex((o) => o.id === selectedOrder.id);
      if (idx < 0) {
        handleOrderSelect(filteredOrders[0]);
        return;
      }
      if (e.key === "ArrowDown" && idx < filteredOrders.length - 1) {
        handleOrderSelect(filteredOrders[idx + 1]);
      }
      if (e.key === "ArrowUp" && idx > 0) {
        handleOrderSelect(filteredOrders[idx - 1]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredOrders, selectedOrder]);

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-md print:hidden">
        <div className="mx-auto max-w-[1400px] px-5 py-3">
          <div className="grid grid-cols-1 items-center gap-3 xl:grid-cols-[250px_1fr_760px]">
            <div>
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-[#6B7280] transition hover:bg-gray-100 hover:text-[#111827]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>

            <h1 className="text-center text-xl font-bold tracking-tight text-[#111827]">
              Billing System
            </h1>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_260px_150px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search orders..."
                  className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm outline-none ring-[#6C3EF4] transition focus:ring-2"
                />
              </div>
              <DateRangePicker
                value={dateRange}
                onChange={(range) => {
                  setDateRange(range);
                }}
                align="end"
              />
              <button
                onClick={handlePrint}
                disabled={!invoice}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#6C3EF4] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[34%_66%]">
          <div className="print:hidden">
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
              <div className="space-y-3 border-b border-[#E5E7EB] bg-white p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search order id or customer"
                    className="h-10 w-full rounded-xl border border-[#E5E7EB] pl-9 pr-3 text-sm outline-none ring-[#6C3EF4] transition focus:ring-2"
                  />
                </div>
                <div>
                  <DateRangePicker
                    value={dateRange}
                    onChange={(range) => {
                      setDateRange(range);
                    }}
                    align="start"
                    className="h-9"
                  />
                </div>
                <p className="text-xs font-medium text-[#6B7280]">Orders ({filteredOrders.length})</p>
              </div>

              <div className="max-h-[calc(100vh-220px)] space-y-3 overflow-y-auto p-4">
                {loading &&
                  [...Array(6)].map((_, idx) => (
                    <div key={idx} className="animate-pulse rounded-2xl border border-[#E5E7EB] bg-white p-4">
                      <div className="mb-2 h-4 w-36 rounded bg-gray-200" />
                      <div className="mb-2 h-3 w-28 rounded bg-gray-200" />
                      <div className="mb-3 h-3 w-24 rounded bg-gray-200" />
                      <div className="h-3 w-20 rounded bg-gray-200" />
                    </div>
                  ))}

                {!loading && filteredOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F8F9FC] px-6 py-14 text-center">
                    <p className="text-base font-semibold text-[#111827]">No orders found</p>
                    <p className="mt-1 text-sm text-[#6B7280]">Try adjusting filters</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOrderSelect(order)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOrderSelect(order);
                        }
                      }}
                      className={`group w-full rounded-2xl border bg-white p-4 text-left transition-all duration-150 ${
                        selectedOrder?.id === order.id
                          ? "border-[#6C3EF4] shadow-md ring-2 ring-[#6C3EF4]/15"
                          : "border-[#E5E7EB] hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-[#111827]">
                          {order.order_number || `ORD-${order.id?.slice(0, 8)}`}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            order.status === "picked_up" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {order.status === "picked_up" ? "Picked" : "Pending"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#111827]">
                        {getBestCustomerName(order.customer_name, order.user?.name)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">{formatDate(order.created_at)}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-base font-bold text-[#111827]">₹{parseFloat(order.total_amount || 0).toFixed(2)}</p>
                        <div className="flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderSelect(order);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2 py-1 text-xs font-medium text-[#374151] hover:bg-gray-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderSelect(order);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2 py-1 text-xs font-medium text-[#374151] hover:bg-gray-50"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4 print:hidden">
                <h2 className="text-base font-bold text-[#111827]">Invoice Preview</h2>
                {invoice && (
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#6C3EF4] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    <Printer className="h-4 w-4" />
                    Print Invoice
                  </button>
                )}
              </div>

              <div className="bg-[#F8F9FC] p-6">
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                  {!selectedOrder ? (
                    <div className="text-center py-16 text-gray-500">Select an order to view invoice</div>
                  ) : invoiceLoading ? (
                    <div className="text-center py-16 text-gray-500">Loading invoice...</div>
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
                    <div className="text-center py-16 text-gray-500">No invoice available for this order</div>
                  ) : (
                    <div className="max-w-4xl mx-auto text-xs leading-snug text-gray-900" id="invoice-content">
                      {/* Store Header */}
                      <div className="mb-1 text-left">
                        <h1 className="text-sm font-bold tracking-wide text-gray-900">M K REDDY GENERAL STORES</h1>
                        <p className="text-xs text-gray-700">SALIPETA, NELLORE</p>
                        <p className="text-xs text-gray-600">GSTIN : 37D1C9A5877L1Z0</p>
                        <p className="text-xs text-gray-600">State: 37-Andhra Pradesh</p>
                      </div>

                      <div className="mb-2" style={{ height: "1px", backgroundColor: "#8F8BDD" }} />

                      {/* SALE Title */}
                      <div className="text-center mb-2">
                        <span className="text-sm font-bold tracking-wide" style={{ color: "#8F8BDD" }}>SALE</span>
                      </div>

                      {/* Bill To and Invoice Details */}
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <div className="text-xs font-bold text-gray-700 mb-1">BILL TO</div>
                          <p className="text-xs font-semibold text-gray-900 break-words mb-0.5">
                            {getBestCustomerName(
                              invoice.customer?.name,
                              selectedOrder?.customer_name,
                              selectedOrder?.user?.name,
                            ) || "Customer"}
                          </p>
                          <p className="text-xs text-gray-700 break-words">
                            Contact No : {invoice.customer?.phone || selectedOrder?.customer_phone || "N/A"}
                          </p>
                          {invoice.customer?.address && (
                            <p className="text-xs text-gray-600 break-words mb-0.5">
                              {invoice.customer.address}
                            </p>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-700 mb-1 text-right">INVOICE DETAILS</div>
                          <div className="text-xs">
                            <div className="flex justify-between mb-0.5">
                              <span className="text-gray-600">Invoice No :</span>
                              <span className="text-gray-900 font-mono tabular-nums font-semibold">
                                {invoice.invoice_number || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between mb-0.5">
                              <span className="text-gray-600">Date :</span>
                              <span className="text-gray-900 font-mono tabular-nums">
                                {formatDate(invoice.order_date || invoice.created_at)}
                              </span>
                            </div>
                            <div className="flex justify-between mb-0.5">
                              <span className="text-gray-600">Time :</span>
                              <span className="text-gray-900 font-mono tabular-nums">
                                {new Date(invoice.order_date || invoice.created_at)
                                  .toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })
                                  .toUpperCase()}
                              </span>
                            </div>
                            {selectedOrder?.order_number && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Order No :</span>
                                <span className="text-gray-900 font-mono tabular-nums font-semibold">
                                  {selectedOrder.order_number}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items Table */}
                      <table className="w-full mb-2 text-xs border-collapse">
                        <thead style={{ backgroundColor: "#8F8BDD", color: "#ffffff" }}>
                          <tr>
                            <th className="py-1 px-2 text-center font-semibold" style={{ width: "5%" }}>
                              #
                            </th>
                            <th className="py-1 px-2 text-left font-semibold" style={{ width: "45%" }}>
                              Item name
                            </th>
                            <th className="py-1 px-2 text-center font-semibold" style={{ width: "15%" }}>
                              Quantity
                            </th>
                            <th className="py-1 px-2 text-right font-semibold" style={{ width: "15%" }}>
                              Price / Unit
                            </th>
                            <th className="py-1 px-2 text-right font-semibold" style={{ width: "20%" }}>
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items?.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-1 px-2 text-center border-b text-gray-600 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="py-1 px-2 border-b">
                                <div className="font-semibold text-gray-900 uppercase break-words">
                                  {item.product_name}
                                </div>
                                {item.variant && (
                                  <div className="text-xs text-gray-600 break-words">{item.variant}</div>
                                )}
                              </td>
                              <td className="py-1 px-2 text-center border-b text-gray-700 font-mono tabular-nums">
                                {item.quantity}
                              </td>
                              <td className="py-1 px-2 text-right border-b text-gray-700 font-mono tabular-nums">
                                {formatCurrency(item.unit_price)}
                              </td>
                              <td className="py-1 px-2 text-right border-b text-gray-900 font-mono tabular-nums">
                                {formatCurrency(item.total)}
                              </td>
                            </tr>
                          ))}
                          {invoice.items?.length < 8 &&
                            Array.from({ length: Math.max(0, 8 - invoice.items.length) }).map((_, idx) => (
                              <tr key={`empty-${idx}`} style={{ height: "22px" }}>
                                <td className="py-1 px-2 border-b">&nbsp;</td>
                                <td className="py-1 px-2 border-b">&nbsp;</td>
                                <td className="py-1 px-2 border-b">&nbsp;</td>
                                <td className="py-1 px-2 border-b">&nbsp;</td>
                                <td className="py-1 px-2 border-b">&nbsp;</td>
                              </tr>
                            ))}
                          <tr className="font-bold">
                            <td colSpan="2" className="py-1 px-2 text-left border-t text-gray-900">
                              Total
                            </td>
                            <td className="py-1 px-2 text-center border-t text-gray-900 font-mono tabular-nums">
                              {invoice.items?.reduce((sum, item) => sum + parseFloat(item.quantity), 0)}
                            </td>
                            <td className="py-1 px-2 border-t"></td>
                            <td className="py-1 px-2 text-right border-t text-gray-900 font-mono tabular-nums">
                              {formatCurrency(invoice.total_amount)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Amount in Words and Totals */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-bold text-gray-700 mb-1">INVOICE AMOUNT IN WORDS</div>
                          <div className="text-xs text-gray-900 break-words mb-2">
                            {numberToWords(Math.round(invoice.total_amount))}
                          </div>
                          <div className="text-xs font-bold text-gray-700 mb-1">TERMS AND CONDITIONS</div>
                          <div className="text-xs text-gray-700 break-words">
                            Return items are not accepted after two days of bill date.
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between border-b pb-2 mb-1">
                            <span className="text-xs text-gray-700">Sub Total</span>
                            <span className="text-xs text-gray-900 font-mono tabular-nums">
                              {formatCurrency(invoice.subtotal)}
                            </span>
                          </div>

                          {(invoice.cgst || invoice.sgst) && (
                            <div className="mb-1">
                              {invoice.cgst > 0 && (
                                <div className="flex justify-between mb-0.5">
                                  <span className="text-xs text-gray-600">CGST</span>
                                  <span className="text-xs text-gray-900 font-mono tabular-nums">
                                    {formatCurrency(invoice.cgst)}
                                  </span>
                                </div>
                              )}
                              {invoice.sgst > 0 && (
                                <div className="flex justify-between mb-0.5">
                                  <span className="text-xs text-gray-600">SGST</span>
                                  <span className="text-xs text-gray-900 font-mono tabular-nums">
                                    {formatCurrency(invoice.sgst)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className="flex justify-between px-2 py-1 mb-1"
                            style={{ backgroundColor: "#8F8BDD", color: "#ffffff" }}
                          >
                            <span className="text-xs font-bold">Total</span>
                            <span className="text-xs font-mono tabular-nums font-bold">
                              {formatCurrency(invoice.total_amount)}
                            </span>
                          </div>

                          {(() => {
                            const isPaid = invoice.is_paid || selectedOrder?.status === "picked_up";
                            const receivedValue = isPaid ? formatCurrency(invoice.total_amount) : "Rs 0.00";
                            const balanceValue = isPaid ? "Rs 0.00" : formatCurrency(invoice.total_amount);
                            return (
                              <>
                                <div className="flex justify-between mb-0.5">
                                  <span className="text-xs text-gray-700">Received</span>
                                  <span className="text-xs font-mono tabular-nums text-gray-900">
                                    {receivedValue}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs text-gray-700">Balance</span>
                                  <span
                                    className={`text-xs font-mono tabular-nums ${
                                      isPaid ? "text-gray-900" : "text-red-600"
                                    }`}
                                  >
                                    {balanceValue}
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
