"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateEstimate() {
  const [name, setName] = useState("");
  const router = useRouter();

  const handleCreate = () => {
    if (!name.trim()) {
      alert("Please enter Name of Work");
      return;
    }

    // 👉 For now we just pass name in URL
    router.push(`/estimate-builder/rate-analysis?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
      <h1 className="text-3xl font-bold">Create New Estimate</h1>

      <input
        type="text"
        placeholder="Enter Name of Work"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border px-4 py-2 rounded w-[300px]"
      />

      <button
        onClick={handleCreate}
        className="bg-blue-500 text-white px-6 py-2 rounded"
      >
        Continue
      </button>
    </div>
  );
}