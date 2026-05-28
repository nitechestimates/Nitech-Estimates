"use client";

import { useEffect, useRef, useState } from "react";
import Tabs from "../components/Tabs";
import { useStore } from "@/lib/store";

// ─── Standard materials list ──────────────────────────────────────────────────
const STANDARD_MATERIALS = [
  "Sand",
  "Stone ≤40mm (Crushed Metal)",
  "Normal Brick Sider Aggregate",
  "Timber",
  "Stone Aggregate 40mm Normal Size & Above",
  "Murrum",
  "Building Rubbish",
  "Earth",
  "Manure",
  "Sludge",
  "Excavated Rock",
  "Soling Stone",
  "Concrete Block (FORM)",
  "Cement",
  "Lime",
  "Stone Block",
  "Sheet & Plate",
  "Glass in Packs",
  "Distemper",
  "AC Sheet",
  "Fitting Iron Sheet",
  "GI Pipes",
  "CI Pipes",
  "CC Pipes",
  "AC Pipes",
  "Bricks — Per 1000 Nos",
  "Tiles",
  "Half Round Tiles",
  "Roofing Tiles",
  "Manglore Tiles",
  "Steel MS",
  "Steel TMT",
  "Steel HYSD",
  "Structural Steel",
  "Flooring Tiles Ceramic",
  "Flooring Tiles Marbonate",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function interpolateRate(rates, km) {
  // Build sorted [numericKey, value] pairs — avoids the "1.0" → 1 → "1" mismatch
  const entries = Object.entries(rates)
    .map(([k, v]) => [parseFloat(k), v])
    .sort((a, b) => a[0] - b[0]);

  if (entries.length === 0) return 0;
  if (km <= entries[0][0]) return entries[0][1];
  if (km >= entries[entries.length - 1][0]) return entries[entries.length - 1][1];

  for (let i = 0; i < entries.length - 1; i++) {
    const [k0, v0] = entries[i];
    const [k1, v1] = entries[i + 1];
    if (km >= k0 && km <= k1) {
      const t = (km - k0) / (k1 - k0);
      return +(v0 + t * (v1 - v0)).toFixed(2);
    }
  }
  return 0;
}

function getRateForMaterial(leadsData, materialName, km) {
  if (!leadsData || !materialName || !km || km <= 0) return 0;
  const groupKey = leadsData.materialToGroup?.[materialName];
  if (!groupKey) return 0;
  const group = leadsData.groups?.[groupKey];
  if (!group) return 0;
  return interpolateRate(group.rates, km);
}

function getUnitForMaterial(leadsData, materialName) {
  const groupKey = leadsData?.materialToGroup?.[materialName];
  if (!groupKey) return "";
  return leadsData?.groups?.[groupKey]?.unit || "";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leadsData, setLeadsData] = useState(null);
  const [mode, setMode] = useState(null); // "regular" | "custom" | null
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [regularKm, setRegularKm] = useState("");
  const [customName, setCustomName] = useState("");
  const [customKm, setCustomKm] = useState("");
  const [customRate, setCustomRate] = useState("");
  const searchRef = useRef(null);

  const leadSettings = useStore((s) => s.leadSettings);
  const setLeadSettings = useStore((s) => s.setLeadSettings);
  const updateLeadSetting = useStore((s) => s.updateLeadSetting);
  const recalculate = useStore((s) => s.recalculateRARowsWithLeadSettings);

  // Load lead data from API
  useEffect(() => {
    fetch("/api/leads-data")
      .then((r) => r.json())
      .then(setLeadsData)
      .catch(console.error);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Filtered materials for dropdown ────────────────────────────────────────
  const filteredMaterials = STANDARD_MATERIALS.filter((m) =>
    m.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Derived rate preview for regular mode ───────────────────────────────────
  const regularRatePreview =
    selectedMaterial && regularKm && leadsData
      ? getRateForMaterial(leadsData, selectedMaterial, parseFloat(regularKm))
      : null;

  // ─── Current leads as array for table ────────────────────────────────────────
  const leadsArray = Object.entries(leadSettings).map(([name, val]) => ({ name, ...val }));

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleAddRegular = () => {
    if (!selectedMaterial || !regularKm || parseFloat(regularKm) <= 0) return;
    const km = parseFloat(regularKm);
    const leadCharge = getRateForMaterial(leadsData, selectedMaterial, km);
    const unit = getUnitForMaterial(leadsData, selectedMaterial);
    updateLeadSetting(selectedMaterial, {
      distance: km,
      leadCharge,
      unit,
      type: "regular",
    });
    setTimeout(recalculate, 0);
    // Reset form
    setSelectedMaterial("");
    setSearchQuery("");
    setRegularKm("");
    setMode(null);
  };

  const handleAddCustom = () => {
    if (!customName.trim() || !customRate || parseFloat(customRate) < 0) return;
    const isStandard = STANDARD_MATERIALS.includes(customName.trim());
    const displayName = isStandard
      ? `${customName.trim()} (Custom)`
      : customName.trim();
    const km = parseFloat(customKm) || 0;
    updateLeadSetting(displayName, {
      distance: km,
      leadCharge: parseFloat(customRate),
      unit: "",
      type: "custom",
    });
    setTimeout(recalculate, 0);
    setCustomName("");
    setCustomKm("");
    setCustomRate("");
    setMode(null);
  };

  const handleDeleteLead = (name) => {
    const updated = { ...leadSettings };
    delete updated[name];
    setLeadSettings(updated);
    setTimeout(recalculate, 0);
  };

  const handleUpdateKm = (name, km) => {
    const entry = leadSettings[name];
    if (!entry) return;
    const newKm = parseFloat(km) || 0;
    let newCharge = entry.leadCharge;
    if (entry.type === "regular" && leadsData) {
      newCharge = getRateForMaterial(leadsData, name, newKm);
    }
    updateLeadSetting(name, { distance: newKm, leadCharge: newCharge });
    setTimeout(recalculate, 0);
  };

  const handleUpdateRate = (name, rate) => {
    updateLeadSetting(name, { leadCharge: parseFloat(rate) || 0 });
    setTimeout(recalculate, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full text-gray-900 font-sans">
      <div className="w-full px-2 md:px-6 py-6 mx-auto">
        <Tabs />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Lead Charges</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Configure transportation lead rates for materials. Select from standard materials or add a custom entry.
          </p>
        </div>

        {/* Add Lead Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setMode(mode === "regular" ? null : "regular")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm border ${
              mode === "regular"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Regular Lead
          </button>
          <button
            onClick={() => setMode(mode === "custom" ? null : "custom")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm border ${
              mode === "custom"
                ? "bg-purple-600 text-white border-purple-600 shadow-md"
                : "bg-white text-purple-700 border-purple-300 hover:bg-purple-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Add Custom Lead
          </button>
        </div>

        {/* ── Regular Lead Form ─────────────────────────────────────────────── */}
        {mode === "regular" && (
          <div className="bg-white border border-blue-200 rounded-2xl shadow-md p-5 mb-6 animate-fade-in">
            <h2 className="text-base font-bold text-blue-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">R</span>
              Add Regular Lead
            </h2>
            <div className="flex flex-wrap gap-4 items-end">
              {/* Material Search */}
              <div className="flex-1 min-w-[220px]" ref={searchRef}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Material</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery || selectedMaterial}
                    placeholder="Search or select material..."
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedMaterial("");
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  />
                  {selectedMaterial && !searchQuery && (
                    <button
                      onClick={() => { setSelectedMaterial(""); setSearchQuery(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >✕</button>
                  )}
                  {showDropdown && filteredMaterials.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                      {filteredMaterials.map((mat) => (
                        <li
                          key={mat}
                          onClick={() => {
                            setSelectedMaterial(mat);
                            setSearchQuery("");
                            setShowDropdown(false);
                          }}
                          className="px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          {mat}
                          {leadsData && (
                            <span className="ml-2 text-xs text-gray-400">
                              ({getUnitForMaterial(leadsData, mat)})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* KM Input */}
              <div className="w-32">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Distance (km)</label>
                <div className="relative">
                  <input
                    type="number" min="0" step="0.5"
                    value={regularKm}
                    onChange={(e) => setRegularKm(e.target.value)}
                    placeholder="km"
                    className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">km</span>
                </div>
              </div>

              {/* Rate Preview */}
              <div className="w-40">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Auto Rate (₹)</label>
                <div className={`flex items-center justify-center border rounded-lg px-3 py-2.5 text-sm font-bold ${
                  regularRatePreview != null
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}>
                  {regularRatePreview != null ? `₹ ${regularRatePreview.toFixed(2)}` : "— enter km —"}
                </div>
                {leadsData && selectedMaterial && (
                  <p className="text-xs text-gray-400 mt-0.5 text-center">
                    per {getUnitForMaterial(leadsData, selectedMaterial)}
                  </p>
                )}
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddRegular}
                disabled={!selectedMaterial || !regularKm || parseFloat(regularKm) <= 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-all text-sm shadow-sm"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* ── Custom Lead Form ──────────────────────────────────────────────── */}
        {mode === "custom" && (
          <div className="bg-white border border-purple-200 rounded-2xl shadow-md p-5 mb-6 animate-fade-in">
            <h2 className="text-base font-bold text-purple-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-bold">C</span>
              Add Custom Lead
            </h2>
            <div className="flex flex-wrap gap-4 items-end">
              {/* Name */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Material Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. River Sand"
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                />
                {customName && STANDARD_MATERIALS.includes(customName.trim()) && (
                  <p className="text-xs text-orange-500 mt-0.5 font-medium">
                    Matches a standard material — will be saved as "{customName.trim()} (Custom)"
                  </p>
                )}
              </div>

              {/* km */}
              <div className="w-32">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Distance (km)</label>
                <div className="relative">
                  <input
                    type="number" min="0" step="0.5"
                    value={customKm}
                    onChange={(e) => setCustomKm(e.target.value)}
                    placeholder="km"
                    className="w-full border border-gray-300 px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">km</span>
                </div>
              </div>

              {/* Rate */}
              <div className="w-40">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rate (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₹</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 pl-7 pr-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                  />
                </div>
              </div>

              {/* Add */}
              <button
                onClick={handleAddCustom}
                disabled={!customName.trim() || !customRate || parseFloat(customRate) < 0}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-all text-sm shadow-sm"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* ── Leads Table ───────────────────────────────────────────────────── */}
        {leadsArray.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-semibold text-gray-400">No leads added yet</p>
            <p className="text-sm mt-1">Use the buttons above to add regular or custom lead charges.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 w-8">#</th>
                    <th className="px-5 py-3">Material</th>
                    <th className="px-4 py-3 text-center w-32">Type</th>
                    <th className="px-4 py-3 text-center w-36">Distance (km)</th>
                    <th className="px-4 py-3 text-center w-44">Lead Rate (₹)</th>
                    <th className="px-4 py-3 text-center w-24">Unit</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leadsArray.map((entry, idx) => (
                    <tr key={entry.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{entry.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          entry.type === "custom"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {entry.type === "custom" ? "Custom" : "Regular"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative max-w-[110px] mx-auto">
                          <input
                            type="number" min="0" step="0.5"
                            value={entry.distance || ""}
                            onChange={(e) => handleUpdateKm(entry.name, e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">km</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative max-w-[140px] mx-auto">
                          {entry.type === "regular" ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-center text-sm font-bold text-emerald-700">
                              ₹ {(entry.leadCharge || 0).toFixed(2)}
                            </div>
                          ) : (
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                              <input
                                type="number" min="0" step="0.01"
                                value={entry.leadCharge || ""}
                                onChange={(e) => handleUpdateRate(entry.name, e.target.value)}
                                className="w-full border border-purple-200 rounded-lg pl-6 pr-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">{entry.unit || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteLead(entry.name)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{leadsArray.length} lead{leadsArray.length !== 1 ? "s" : ""} configured</span>
              <span>·</span>
              <span>{leadsArray.filter(l => l.type === "regular").length} regular</span>
              <span>·</span>
              <span>{leadsArray.filter(l => l.type === "custom").length} custom</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}