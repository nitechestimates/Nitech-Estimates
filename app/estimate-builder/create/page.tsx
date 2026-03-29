"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateEstimate() {
  const [name, setName] = useState("");
  const [isTribal, setIsTribal] = useState(false);
  const router = useRouter();

  const handleCreate = () => {
    if (!name.trim()) {
      alert("Please enter Name of Work");
      return;
    }
    // Pass both name and tribal status in the URL
    router.push(`/estimate-builder/rate-analysis?name=${encodeURIComponent(name)}&tribal=${isTribal}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] bg-gray-50 px-4 animate-fade-in-up">
      <div className="bg-white p-10 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full text-center">
        
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">New Estimate</h1>
        <p className="text-gray-500 mb-8 text-sm">Give your new project a descriptive name and type.</p>

        <div className="text-left mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Name of Work</label>
          <input
            type="text"
            placeholder="e.g., Road Construction Phase 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
          />
        </div>

        <div className="text-left mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Estimate Area Type</label>
          <div className="flex gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer text-gray-800">
              <input
                type="radio"
                name="areaType"
                checked={!isTribal}
                onChange={() => setIsTribal(false)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-medium">Non-Tribal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-gray-800">
              <input
                type="radio"
                name="areaType"
                checked={isTribal}
                onChange={() => setIsTribal(true)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-medium">Tribal</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2"
        >
          Continue to Rate Analysis
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>
    </div>
  );
}