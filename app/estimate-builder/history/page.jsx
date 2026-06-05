"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AlertDialog, { useAlertDialog } from '@/components/AlertDialog';

export default function HistoryPage() {
  // loading defaults to true so the spinner shows immediately on first mount;
  // we don't toggle it back to true on every refetch — that would re-trigger
  // the spinner and feel jarring when the user is just refreshing the list.
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ estimateName: "", nameOfWork: "" });
  const { dialog, triggerAlert, triggerConfirm } = useAlertDialog();

  const fetchEstimates = useCallback(() => {
    setError("");
    fetch("/api/estimate/get", {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? "Unauthorized: Please log in to view estimates."
              : `Request failed with status ${res.status}`
          );
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setEstimates(data);
        } else {
          setError(data.error || "Unknown API error");
          setEstimates([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Network error");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchEstimates();
    });
  }, [fetchEstimates]);

  const deleteEstimate = async (id) => {
    if (!await triggerConfirm("Are you sure you want to delete this estimate? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/estimate/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setEstimates(estimates.filter((e) => e._id !== id));
      } else {
        await triggerAlert(data.error || "Delete failed");
      }
    } catch {
      await triggerAlert("Network error: Could not delete the estimate.");
    }
  };

  const duplicateEstimate = async (id) => {
    setLoading(true);
    try {
      const res = await fetch("/api/estimate/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchEstimates(); // Reload the list
      } else {
        await triggerAlert(data.error || "Duplicate failed");
        setLoading(false);
      }
    } catch {
      await triggerAlert("Network error while duplicating");
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      const res = await fetch(`/api/estimate/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEstimates(estimates.map(e => e._id === id ? { ...e, ...editForm } : e));
        setEditingId(null);
      } else {
        await triggerAlert("Failed to update estimate details");
      }
    } catch {
      await triggerAlert("Network error");
    }
  };

  const filteredEstimates = estimates.filter(est => {
    const q = searchQuery.toLowerCase();
    return (est.estimateName || "").toLowerCase().includes(q) ||
           (est.nameOfWork || "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading your estimates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center p-10 bg-white shadow rounded-2xl">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={fetchEstimates}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 animate-fade-in-up">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Estimates</h1>
          <p className="text-gray-500 mt-1">Manage and load your saved projects.</p>
        </div>
        <Link
          href="/estimate-builder/create"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition-colors whitespace-nowrap"
        >
          + New Estimate
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by estimate name or name of work..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/2 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {filteredEstimates.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-16 text-center">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
          <h2 className="text-xl font-bold text-gray-700 mb-2">No estimates found</h2>
          <p className="text-gray-500">{estimates.length === 0 ? "You haven't created any estimates yet." : "No estimates match your search."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEstimates.map((est) => (
            <div
              key={est._id}
              className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xl flex-shrink-0">
                  {(est.estimateName || est.nameOfWork)?.charAt(0).toUpperCase() || "E"}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => duplicateEstimate(est._id)}
                    className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors"
                    title="Duplicate Estimate"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteEstimate(est._id)}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors"
                    title="Delete Estimate"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Inline Edit Form */}
              {editingId === est._id ? (
                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-inner">
                  <input
                    type="text"
                    value={editForm.estimateName}
                    onChange={(e) => setEditForm({ ...editForm, estimateName: e.target.value })}
                    className="w-full text-sm font-bold text-gray-900 mb-2 px-2 py-1.5 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Estimate Name"
                  />
                  <textarea
                    value={editForm.nameOfWork}
                    onChange={(e) => setEditForm({ ...editForm, nameOfWork: e.target.value })}
                    className="w-full text-xs text-gray-700 mb-3 px-2 py-1.5 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none min-h-[60px]"
                    placeholder="Name of Work"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(est._id)} className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-blue-700 transition">Save Changes</button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded hover:bg-gray-300 transition">Cancel</button>
                  </div>
                </div>
              ) : (
                <div 
                  className="group/edit relative cursor-pointer bg-white rounded-md transition-colors"
                  onClick={() => { setEditingId(est._id); setEditForm({ estimateName: est.estimateName || "", nameOfWork: est.nameOfWork || "" }); }}
                  title="Click to edit titles"
                >
                  <div className="absolute -left-6 top-1 opacity-0 group-hover/edit:opacity-100 text-blue-500 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </div>
                  {/* Estimate Name (primary) */}
                  <h2 className="font-bold text-xl text-gray-900 mb-0.5 line-clamp-1">
                    {est.estimateName || est.nameOfWork || "Untitled Estimate"}
                  </h2>
                  
                  {/* Name of Work (subtitle, only if estimateName exists and is different) */}
                  {est.estimateName && est.nameOfWork && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {est.nameOfWork}
                    </p>
                  )}
                  {!est.estimateName && (
                    <p className="text-xs text-gray-400 mb-3">No estimate name set</p>
                  )}
                </div>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-5">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {(() => {
                    const d = est.updatedAt || est.createdAt;
                    if (!d) return "—";
                    const date = new Date(d);
                    return `Last saved: ${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
                  })()}
                </span>
                {est.isTribal && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">Tribal</span>
                )}
                {est.yojana && (
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{est.yojana}</span>
                )}
              </div>

              <Link
                href={`/estimate-builder/rate-analysis?load=${est._id}`}
                className="w-full inline-flex justify-center items-center bg-gray-50 hover:bg-blue-50 text-blue-600 border border-gray-200 hover:border-blue-200 font-semibold py-2.5 rounded-xl transition-all"
              >
                Open Project &rarr;
              </Link>
            </div>
          ))}
        </div>
      )}
      <AlertDialog dialog={dialog} />
    </div>
  );
}