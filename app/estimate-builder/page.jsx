"use client";

import { useRouter } from "next/navigation";

export default function EstimateBuilderHome() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
      <h1 className="text-3xl font-bold">Estimate Builder</h1>

      <button
        onClick={() => router.push("/estimate-builder/create")}
        className="bg-blue-500 text-white px-6 py-3 rounded text-lg"
      >
        Create New Estimate
      </button>

      <button
        onClick={() => router.push("/estimate-builder/history")}
        className="bg-gray-500 text-white px-6 py-3 rounded text-lg"
      >
        View Old Estimates
      </button>
    </div>
  );
}