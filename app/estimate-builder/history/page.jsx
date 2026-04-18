"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HistoryPage() {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/estimate/get", {
      credentials: "include", // ✅ ensures session cookie is sent
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEstimates(data);
        } else {
          console.error("Failed to load estimates:", data.error);
          setEstimates([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const deleteEstimate = async (id) => {
    if (!confirm("Are you sure you want to delete this estimate? This action cannot be undone.")) return;

    const res = await fetch(`/api/estimate/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setEstimates(estimates.filter((e) => e._id !== id));
    } else {
      alert(data.error || "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading your estimates...</p>
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition-colors"
        >
          + New Estimate
        </Link>
      </div>

      {estimates.length === 0 ? (
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
          <p className="text-gray-500">You haven't created any estimates yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {estimates.map((est) => (
            <div
              key={est._id}
              className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
                  {est.nameOfWork?.charAt(0).toUpperCase() || "E"}
                </div>
                <button
                  onClick={() => deleteEstimate(est._id)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Estimate"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              <h2 className="font-bold text-xl text-gray-900 mb-1 line-clamp-1" title={est.nameOfWork}>
                {est.nameOfWork || "Untitled Project"}
              </h2>

              <div className="flex gap-4 text-sm text-gray-500 mb-6">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {est.createdAt
                    ? new Date(est.createdAt).toLocaleDateString()
                    : "—"}
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                  Saved Project
                </span>
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
    </div>
  );
}