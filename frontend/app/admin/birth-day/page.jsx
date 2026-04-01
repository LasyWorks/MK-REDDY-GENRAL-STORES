"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";
import secureStorage from "@/lib/secureStorage";

function useAdminGuard() {
  const router = useRouter();
  const token = secureStorage.getItem("token");
  const raw = secureStorage.getItem("user");

  const parsedUser = useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [raw]);

  const isAdmin = Boolean(parsedUser && (parsedUser.user_type === "admin" || parsedUser.role === "admin"));

  useEffect(() => {
    if (!token || !raw || !parsedUser) {
      router.replace("/login?redirect=/admin/birth-day");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [router, token, raw, parsedUser, isAdmin]);

  return { ready: Boolean(token && isAdmin) };
}

export default function BirthDayAdminPage() {
  const { ready } = useAdminGuard();
  const [hydrated, setHydrated] = useState(() => false);
  
  useEffect(() => {
    setHydrated(true);
  }, []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState({});
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkTemplateId, setBulkTemplateId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setNotice("");
    try {
      const [templatesRes, usersRes] = await Promise.all([
        api.get("/birth-day/templates"),
        api.get("/birth-day/upcoming-users", { year, month }),
      ]);

      const templateRows = templatesRes?.data || [];
      const userRows = usersRes?.data?.users || [];
      setTemplates(templateRows);
      setUsers(userRows);

      const next = {};
      for (const row of userRows) {
        if (row.offer_template_id) next[row.id] = row.offer_template_id;
      }
      setSelectedTemplate(next);
    } catch (err) {
      setNotice(err.message || "Failed to load birth day data");
      setNoticeType("error");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    if (!ready) return;
    loadData();
  }, [ready, loadData]);

  const assignOffer = async (row) => {
    const templateId = selectedTemplate[row.id];
    if (!templateId) {
      setNotice("Please select a template before assigning");
      setNoticeType("error");
      return;
    }

    setSavingId(row.id);
    setNotice("");
    try {
      await api.post("/birth-day/assign", {
        user_id: row.user_id,
        campaign_year: row.campaign_year,
        offer_template_id: templateId,
      });
      setNotice(`Offer assigned for ${row.display_name || row.name || row.email}`);
      setNoticeType("success");
      await loadData();
    } catch (err) {
      setNotice(err.message || "Failed to assign offer");
      setNoticeType("error");
    } finally {
      setSavingId("");
    }
  };
  const bulkAssignOffer = async () => {
    if (!bulkTemplateId) {
      setNotice("Please select a template for bulk assignment");
      setNoticeType("error");
      return;
    }

    setBulkAssigning(true);
    setNotice("");
    try {
      const res = await api.post("/birth-day/bulk-assign", {
        year,
        month,
        offer_template_id: bulkTemplateId,
      });
      const { assigned, total } = res.data || {};
      setNotice(`Successfully assigned to ${assigned} of ${total} users`);
      setNoticeType("success");
      setShowBulkDialog(false);
      setBulkTemplateId("");
      await loadData();
    } catch (err) {
      setNotice(err.message || "Failed to bulk assign offers");
      setNoticeType("error");
    } finally {
      setBulkAssigning(false);
    }
  };


  if (!hydrated || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Dashboard
              </Link>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">Birth Day Offers</h1>
              <p className="text-sm text-gray-500 mt-1">Assign templates to upcoming birthday users for the selected month.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                min="2000"
                max="3000"
                value={year}
                onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))}
                className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowBulkDialog(true)}
                disabled={loading || !users.length}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Bulk Assign
              </button>
            </div>
          </div>

          {notice && (
            <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${noticeType === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              <span className="inline-flex items-center gap-2">
                {noticeType === "error" ? <ExclamationTriangleIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}
                {notice}
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Birthday</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Template</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{row.display_name || row.name || "-"}</p>
                      <p className="text-xs text-gray-500">{row.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{new Date(row.birthday_date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 text-gray-700">{row.status}</td>
                    <td className="px-4 py-3">
                      <select
                        value={selectedTemplate[row.id] || ""}
                        onChange={(e) => setSelectedTemplate((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                      >
                        <option value="">Select template</option>
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} ({tpl.discount_type === "percentage" ? `${tpl.discount_value}%` : `Rs ${tpl.discount_value}`})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => assignOffer(row)}
                        disabled={savingId === row.id || loading}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {savingId === row.id ? "Assigning..." : "Assign"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!users.length && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No upcoming users found for this month.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showBulkDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-lg animate-in">
              <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Bulk Assign Template</h2>
                <button
                  onClick={() => {
                    setShowBulkDialog(false);
                    setBulkTemplateId("");
                  }}
                  className="rounded-lg text-gray-500 hover:bg-gray-100 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Template
                  </label>
                  <select
                    value={bulkTemplateId}
                    onChange={(e) => setBulkTemplateId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Choose a template...</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.discount_type === "percentage" ? `${tpl.discount_value}%` : `Rs ${tpl.discount_value}`}) - {tpl.valid_days} day(s)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                  <p className="text-sm text-blue-700">
                    This will assign the selected template to <span className="font-semibold">{users.filter((u) => !selectedTemplate[u.id]).length}</span> pending users in {new Date(year, month - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowBulkDialog(false);
                    setBulkTemplateId("");
                  }}
                  disabled={bulkAssigning}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={bulkAssignOffer}
                  disabled={bulkAssigning || !bulkTemplateId}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {bulkAssigning ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    "Assign to All"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
