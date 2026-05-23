"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function CreateEstimate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isTribal, setIsTribal] = useState(false);
  const [tribalPercent, setTribalPercent] = useState<string>("");
  const [yojana, setYojana] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [estAmount, setEstAmount] = useState("");
  const [labourInsurance, setLabourInsurance] = useState("");
  const [year, setYear] = useState("");
  const [dist, setDist] = useState("");
  const [taluka, setTaluka] = useState("");
  const [village, setVillage] = useState("");

  const yojanaList = useStore((state) => state.yojanaList);
  const addYojana = useStore((state) => state.addYojana);
  const resetEstimate = useStore((state) => state.resetEstimate);

  const dropdownRef = useRef(null);

  const filteredSuggestions = yojanaList.filter((item) =>
    item.toLowerCase().includes(yojana.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto switch to non-tribal if percentage is 0
  const handleTribalPercentChange = (val: string) => {
    setTribalPercent(val);
    if (val === "0" || val === "") {
      setIsTribal(false);
    }
  };

  const handleSelectTribal = () => {
    setIsTribal(true);
    if (tribalPercent === "" || tribalPercent === "0") {
      setTribalPercent("");
    }
  };

  const handleSelectNonTribal = () => {
    setIsTribal(false);
    setTribalPercent("");
  };

  const handleCreate = () => {
    if (!name.trim()) {
      alert("Please enter Name of Work");
      return;
    }

    // Save new yojana if not already in list
    if (yojana.trim() && !yojanaList.includes(yojana.trim())) {
      addYojana(yojana.trim());
    }

    // Reset all previous estimate data so new estimate is clean
    resetEstimate();

    const params = new URLSearchParams();
    params.set("name", name);
    params.set("tribal", String(isTribal));
    if (isTribal && tribalPercent) params.set("tribalPercent", tribalPercent);
    if (yojana.trim()) params.set("yojana", yojana.trim());
    if (estAmount.trim()) params.set("estAmount", estAmount.trim());
    if (labourInsurance.trim()) params.set("labourInsurance", labourInsurance.trim());
    if (year.trim()) params.set("year", year.trim());
    if (dist.trim()) params.set("dist", dist.trim());
    if (taluka.trim()) params.set("taluka", taluka.trim());
    if (village.trim()) params.set("village", village.trim());

    router.push(`/estimate-builder/rate-analysis?${params.toString()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50 px-4 py-10 animate-fade-in-up">
      <div className="bg-white p-10 rounded-2xl shadow-lg border border-gray-100 max-w-lg w-full">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">New Estimate</h1>
          <p className="text-gray-500 text-sm text-center">Fill in the project details to get started.</p>
        </div>

        {/* Name of Work */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Name of Work</label>
          <input
            type="text"
            placeholder="e.g., Road Construction Phase 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
          />
        </div>

        {/* Yojana / Fund */}
        <div className="mb-5 relative" ref={dropdownRef}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Yojana / Fund</label>
          <input
            type="text"
            placeholder="Select or type new"
            value={yojana}
            onChange={(e) => { setYojana(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
          />
          {showDropdown && filteredSuggestions.length > 0 && (
            <ul className="absolute z-10 bg-white border border-gray-200 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredSuggestions.map((suggestion) => (
                <li
                  key={suggestion}
                  onClick={() => { setYojana(suggestion); setShowDropdown(false); }}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-left text-gray-800"
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

        {/* Tribal / Non-Tribal Boxes */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Estimate Area Type</label>
          <div className="grid grid-cols-2 gap-3">

            {/* Non-Tribal Box */}
            <button
              type="button"
              onClick={handleSelectNonTribal}
              className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                !isTribal
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {!isTribal && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-sm font-semibold">Non-Tribal</span>
            </button>

            {/* Tribal Box */}
            <button
              type="button"
              onClick={handleSelectTribal}
              className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                isTribal
                  ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {isTribal && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
              <span className="text-sm font-semibold">Tribal</span>
            </button>
          </div>

          {/* Tribal Percentage Input */}
          <div className={`mt-3 overflow-hidden transition-all duration-300 ${isTribal ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tribal Percentage <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Enter tribal %"
                value={tribalPercent}
                disabled={!isTribal}
                onChange={(e) => handleTribalPercentChange(e.target.value)}
                className="w-full border border-orange-300 bg-orange-50 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all text-gray-900 pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold text-sm">%</span>
            </div>
            <p className="text-xs text-orange-500 mt-1">Setting to 0 will auto-switch to Non-Tribal.</p>
          </div>
        </div>

        {/* Est. Amount */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Est. Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
            <input
              type="number"
              min="0"
              placeholder="Enter estimated amount"
              value={estAmount}
              onChange={(e) => setEstAmount(e.target.value)}
              className="w-full border border-gray-300 pl-8 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
            />
          </div>
        </div>

        {/* Labour Insurance */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Labour Insurance (%)</label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Enter labour insurance %"
              value={labourInsurance}
              onChange={(e) => setLabourInsurance(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">%</span>
          </div>
        </div>

        {/* Year */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
          <input
            type="text"
            placeholder="e.g., 2024-25"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
          />
        </div>

        {/* Dist / Taluka / Village */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Dist.</label>
            <input
              type="text"
              placeholder="District"
              value={dist}
              onChange={(e) => setDist(e.target.value)}
              className="w-full border border-gray-300 px-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Taluka</label>
            <input
              type="text"
              placeholder="Taluka"
              value={taluka}
              onChange={(e) => setTaluka(e.target.value)}
              className="w-full border border-gray-300 px-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Village</label>
            <input
              type="text"
              placeholder="Village"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="w-full border border-gray-300 px-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 text-sm"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleCreate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 mb-4"
        >
          Continue to Rate Analysis
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

        <button
          onClick={() => router.push("/estimate-builder/datasheet")}
          className="w-full text-blue-600 hover:text-blue-800 text-sm underline"
        >
          Manage Yojana / Fund data sheet
        </button>
      </div>
    </div>
  );
}