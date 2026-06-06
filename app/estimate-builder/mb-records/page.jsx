"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AlertDialog, { useAlertDialog } from "@/components/AlertDialog";

export default function MBRecordsRegistry() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    description: "",
    quantity: 0,
    unit: "",
    date: "",
  });

  const { dialog, triggerAlert, triggerConfirm } = useAlertDialog();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mb-records");
      if (res.ok) {
        const data = await res.json();
        setRecords(data || []);
      } else {
        await triggerAlert("Failed to fetch MB records.");
      }
    } catch (err) {
      console.error(err);
      await triggerAlert("Network error occurred while fetching records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (id) => {
    const confirmed = await triggerConfirm("Are you sure you want to delete this MB record permanently?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/mb-records/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords(records.filter((r) => r._id !== id));
      } else {
        await triggerAlert("Failed to delete the record.");
      }
    } catch (err) {
      console.error(err);
      await triggerAlert("Error deleting record.");
    }
  };

  const handleEditOpen = (record) => {
    setEditingRecord(record);
    const dateFormatted = record.date ? new Date(record.date).toISOString().split("T")[0] : "";
    setEditForm({
      description: record.description || "",
      quantity: record.quantity || 0,
      unit: record.unit || "",
      date: dateFormatted,
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      const res = await fetch(`/api/mb-records/${editingRecord._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setRecords(
          records.map((r) =>
            r._id === editingRecord._id
              ? { ...r, ...editForm, date: editForm.date ? new Date(editForm.date) : r.date }
              : r
          )
        );
        setEditingRecord(null);
      } else {
        await triggerAlert("Failed to update record.");
      }
    } catch (err) {
      console.error(err);
      await triggerAlert("Error updating record.");
    }
  };

  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.description || "").toLowerCase().includes(q) ||
      (r.recordNumber || "").toString().includes(q) ||
      (r.estimateId || "").toString().toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in-up">
      <AlertDialog dialog={dialog} />

      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40 z-0 pointer-events-none"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)] mb-6 z-10 relative">
        <div>
          <span className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-md border border-orange-200">
            Registry
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2">
            Sequential MB Records
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Search, view, and manage all Measurement Book Record Entries.
          </p>
        </div>
        <button
          onClick={() => router.push("/estimate-builder")}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer bg-white"
        >
          ← Back to Builder
        </button>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)] mb-6 z-10 relative">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <input
            type="text"
            placeholder="Search by description, record number, or estimate ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
          />
          <button
            onClick={fetchRecords}
            className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            🔄 Refresh List
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-semibold text-sm animate-pulse">Loading registry entries...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-2xl p-16 text-center bg-white/40">
            <svg
              className="w-12 h-12 text-slate-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h2 className="text-lg font-bold text-slate-700 mb-1">No MB Records found</h2>
            <p className="text-slate-500 text-xs">
              {records.length === 0
                ? "No items have been marked as RE in the billing sheets yet."
                : "No registry items match your search criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase">
                  <th className="p-4 w-[100px] text-center">Record No</th>
                  <th className="p-4 w-[120px]">Date</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 w-[120px] text-right">Quantity</th>
                  <th className="p-4 w-[100px] text-center">Unit</th>
                  <th className="p-4 w-[180px]">Estimate ID</th>
                  <th className="p-4 w-[140px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record._id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-slate-700 text-sm"
                  >
                    <td className="p-4 text-center font-bold text-orange-600 bg-orange-50/20">
                      {record.recordNumber}
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-500">
                      {record.date ? new Date(record.date).toLocaleDateString("en-GB") : "-"}
                    </td>
                    <td className="p-4 font-medium max-w-[300px] truncate" title={record.description}>
                      {record.description}
                    </td>
                    <td className="p-4 text-right font-bold text-blue-600">
                      {record.quantity !== undefined ? Number(record.quantity).toFixed(3) : "0.000"}
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-500 text-xs">
                      {record.unit || "-"}
                    </td>
                    <td className="p-4 text-xs text-slate-400 font-mono">
                      {record.estimateId || "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEditOpen(record)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(record._id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-lg shadow-sm transition active:scale-95 cursor-pointer border border-rose-100"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg animate-scale-up">
            <h2 className="text-xl font-black text-slate-900 mb-4">Edit MB Record #{editingRecord.recordNumber}</h2>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editForm.quantity}
                    onChange={(e) =>
                      setEditForm({ ...editForm, quantity: e.target.value === "" ? 0 : parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit</label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
