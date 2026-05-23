"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function CreateEstimate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isTribal, setIsTribal] = useState(false);
  const [yojana, setYojana] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const yojanaList = useStore((state) => state.yojanaList);
  const addYojana = useStore((state) => state.addYojana);

  const dropdownRef = useRef(null);

  // Filter suggestions based on typed text
  const filteredSuggestions = yojanaList.filter((item) =>
    item.toLowerCase().includes(yojana.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = () => {
    if (!name.trim()) {
      alert("Please enter Name of Work");
      return;
    }

    // If a yojana is typed and not already in the list, add it to the store
    if (yojana.trim() && !yojanaList.includes(yojana.trim())) {
      addYojana(yojana.trim());
    }

    // Encode yojana in the URL as well
    const params = new URLSearchParams();
    params.set("name", name);
    params.set("tribal", isTribal);
    if (yojana.trim()) params.set("yojana", yojana.trim());

    router.push(`/estimate-builder/rate-analysis?${params.toString()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50 px-4 animate-fade-in-up">
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

        <div className="text-left mb-4 relative" ref={dropdownRef}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Yojana / Fund</label>
          <input
            type="text"
            placeholder="Select or type new"
            value={yojana}
            onChange={(e) => {
              setYojana(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
          />
          {showDropdown && filteredSuggestions.length > 0 && (
            <ul className="absolute z-10 bg-white border border-gray-200 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredSuggestions.map((suggestion) => (
                <li
                  key={suggestion}
                  onClick={() => {
                    setYojana(suggestion);
                    setShowDropdown(false);
                  }}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-left"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
          {yojana.trim() && !yojanaList.includes(yojana.trim()) && (
            <p className="text-xs text-gray-500 mt-1">New entry – will be saved automatically.</p>
          )}
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 mb-4"
        >
          Continue to Rate Analysis
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>

        {/* Button to open Data Sheet */}
        <button
          onClick={() => router.push("/estimate-builder/datasheet")}
          className="text-blue-600 hover:text-blue-800 text-sm underline"
        >
          Manage Yojana / Fund data sheet
        </button>
      </div>
    </div>
  );
}