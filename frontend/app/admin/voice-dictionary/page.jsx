"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";
import secureStorage from "@/lib/secureStorage";

function useAdminGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = secureStorage.getItem("token");
    const raw = secureStorage.getItem("user");
    if (!token || !raw) {
      router.replace("/login?redirect=/admin/voice-dictionary");
      return;
    }
    try {
      const user = JSON.parse(raw);
      if (user.user_type !== "admin" && user.role !== "admin") {
        router.replace("/");
        return;
      }
      queueMicrotask(() => setReady(true));
    } catch {
      router.replace("/login?redirect=/admin/voice-dictionary");
    }
  }, [router]);

  return { ready };
}

function normalizeEntry(text) {
  return String(text || "").trim().toLowerCase();
}

const VOICE_DICT_CACHE_KEY = "mk_voice_dict_te_v1";
const VOICE_DICT_CACHE_TS_KEY = "mk_voice_dict_te_v1_ts";

export default function VoiceDictionaryAdminPage() {
  const { ready } = useAdminGuard();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("info");
  const [testInput, setTestInput] = useState("");

  const syncLocalVoiceCache = (dictionaryMap) => {
    try {
      localStorage.setItem(VOICE_DICT_CACHE_KEY, JSON.stringify(dictionaryMap));
      localStorage.setItem(VOICE_DICT_CACHE_TS_KEY, String(Date.now()));
      window.dispatchEvent(new Event("voiceDictionaryUpdated"));
    } catch {
      // Ignore local storage errors
    }
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => a.key.localeCompare(b.key, "te"));
  }, [rows]);

  const testResult = useMemo(() => {
    const needle = normalizeEntry(testInput);
    if (!needle) return "";
    const exact = sortedRows.find((r) => r.key === needle);
    if (exact) return exact.value;
    const partial = sortedRows.find(
      (r) => needle.includes(r.key) || r.key.includes(needle),
    );
    return partial?.value || "";
  }, [testInput, sortedRows]);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setNotice("");
      try {
        const res = await api.get("/settings/voice-dictionary", { lang: "te" });
        const dict = res?.data?.dictionary || {};
        const loadedRows = Object.entries(dict)
          .filter(([k, v]) => typeof k === "string" && typeof v === "string")
          .map(([key, value]) => ({ key, value }));
        if (mounted) {
          setRows(loadedRows);
          setNotice(`Loaded ${loadedRows.length} Telugu entries`);
          setNoticeType("success");
        }
      } catch (e) {
        if (mounted) {
          setNotice(e.message || "Failed to load dictionary");
          setNoticeType("error");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [ready]);

  const updateRow = (idx, field, value) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeRow = (idx) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveDictionary = async () => {
    setSaving(true);
    setNotice("");

    try {
      const map = {};
      for (const row of rows) {
        const k = normalizeEntry(row.key);
        const v = normalizeEntry(row.value);
        if (!k || !v) continue;
        map[k] = v;
      }

      await api.put("/settings/voice-dictionary", {
        lang: "te",
        dictionary: map,
      });

      const normalizedRows = Object.entries(map).map(([key, value]) => ({
        key,
        value,
      }));
      setRows(normalizedRows);
      syncLocalVoiceCache(map);
      setNotice(`Saved ${normalizedRows.length} entries successfully`);
      setNoticeType("success");
    } catch (e) {
      setNotice(e.message || "Failed to save dictionary");
      setNoticeType("error");
    } finally {
      setSaving(false);
    }
  };

  const syncFromDb = async () => {
    setSaving(true);
    setNotice("");
    try {
      await api.post("/settings/voice-dictionary/sync", {});
      const res = await api.get("/settings/voice-dictionary", { lang: "te" });
      const dict = res?.data?.dictionary || {};
      const loadedRows = Object.entries(dict).map(([key, value]) => ({
        key,
        value,
      }));
      setRows(loadedRows);
      syncLocalVoiceCache(dict);
      setNotice(`Synced ${loadedRows.length} entries from database translations`);
      setNoticeType("success");
    } catch (e) {
      setNotice(e.message || "Failed to sync dictionary from DB");
      setNoticeType("error");
    } finally {
      setSaving(false);
    }
  };

  const exportJson = () => {
    const payload = {
      lang: "te",
      exportedAt: new Date().toISOString(),
      count: sortedRows.length,
      dictionary: sortedRows.reduce((acc, row) => {
        const k = normalizeEntry(row.key);
        const v = normalizeEntry(row.value);
        if (k && v) acc[k] = v;
        return acc;
      }, {}),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-dictionary-te-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const source = parsed?.dictionary && typeof parsed.dictionary === "object"
        ? parsed.dictionary
        : parsed;

      if (!source || typeof source !== "object" || Array.isArray(source)) {
        throw new Error("Invalid JSON format");
      }

      const normalizedRows = Object.entries(source)
        .filter(([k, v]) => typeof k === "string" && typeof v === "string")
        .map(([k, v]) => ({ key: normalizeEntry(k), value: normalizeEntry(v) }))
        .filter((r) => r.key && r.value);

      if (!normalizedRows.length) {
        throw new Error("No valid dictionary rows found");
      }

      setRows(normalizedRows);
      setNotice(`Imported ${normalizedRows.length} rows. Click Save Dictionary to persist.`);
      setNoticeType("success");
    } catch (e) {
      setNotice(e.message || "Failed to import JSON file");
      setNoticeType("error");
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Voice Dictionary</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage Telugu-to-English runtime mappings used by voice search.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
              <input type="file" accept="application/json" className="hidden" onChange={importJson} />
              Import JSON
            </label>
            <button
              onClick={exportJson}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Export JSON
            </button>
            <button
              onClick={syncFromDb}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              {saving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <ArrowPathIcon className="w-3.5 h-3.5" />}
              Sync from DB
            </button>
            <button
              onClick={saveDictionary}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
              Save Dictionary
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Entries</h2>
              <p className="text-xs text-gray-500 mt-1">Blank rows are ignored while saving. Keys and values are normalized to lowercase.</p>
            </div>
            <button
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add row
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex items-center gap-3 text-gray-500">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Loading dictionary...
            </div>
          ) : (
            <div className="max-h-[68vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Telugu key</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">English value</th>
                    <th className="px-4 py-2.5 w-14" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={`${idx}-${row.key}`} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 align-top">
                        <input
                          value={row.key}
                          onChange={(e) => updateRow(idx, "key", e.target.value)}
                          placeholder="ఉల్లిపాయ"
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <input
                          value={row.value}
                          onChange={(e) => updateRow(idx, "value", e.target.value)}
                          placeholder="onion"
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <button
                          onClick={() => removeRow(idx)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete row"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900">Quick test</h3>
            <p className="mt-1 text-xs text-gray-500">Type Telugu speech text and see which English value will be picked first.</p>
            <input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="బియ్యం"
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5 text-sm">
              <span className="text-gray-500">Result: </span>
              <span className="font-semibold text-gray-800">{testResult || "No match"}</span>
            </div>
          </div>

          {notice && (
            <div
              className={`rounded-2xl border p-4 text-sm flex items-start gap-2 ${
                noticeType === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {noticeType === "error" ? (
                <ExclamationTriangleIcon className="w-4 h-4 mt-0.5" />
              ) : (
                <CheckCircleIcon className="w-4 h-4 mt-0.5" />
              )}
              <span>{notice}</span>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900">How this works</h3>
            <ul className="mt-2 space-y-1.5 text-xs text-gray-600 list-disc pl-4">
              <li>Frontend loads this dictionary dynamically from backend settings.</li>
              <li>Entries are cached in browser for 24 hours for fast lookup.</li>
              <li>If API fails, built-in static dictionary remains fallback.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
