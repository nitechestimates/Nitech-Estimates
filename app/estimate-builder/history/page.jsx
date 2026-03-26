"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HistoryPage() {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/estimate/get")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEstimates(data.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const deleteEstimate = async (id) => {
    if (!confirm("Delete this estimate?")) return;

    const res = await fetch(`/api/estimate/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setEstimates(estimates.filter(e => e._id !== id));
      alert("Deleted");
    } else {
      alert(data.error || "Delete failed");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Estimates</h1>

      {estimates.length === 0 ? (
        <p>No estimates found. Create one first.</p>
      ) : (
        <div className="space-y-4">
          {estimates.map((est) => (
            <div key={est._id} className="border p-4 rounded shadow flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">{est.nameOfWork}</h2>
                <p className="text-sm text-gray-500">
                  Created: {new Date(est.createdAt).toLocaleString()}
                </p>
                <p className="text-sm">Items: {est.rows.length}</p>
                <Link
                  href={`/estimate-builder/rate-analysis?load=${est._id}`}
                  className="inline-block mt-2 text-blue-600 hover:underline"
                >
                  Load Estimate
                </Link>
              </div>
              <button
                onClick={() => deleteEstimate(est._id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}