"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Tabs from "../components/Tabs";
import { useStore } from "@/lib/store";

// ─── Standard materials ───────────────────────────────────────────────────────
const STANDARD_MATERIALS = [
  "Sand","Stone ≤40mm (Crushed Metal)","Normal Brick Sider Aggregate","Timber",
  "Stone Aggregate 40mm Normal Size & Above","Murrum","Building Rubbish","Earth",
  "Manure","Sludge","Excavated Rock","Soling Stone","Concrete Block (FORM)",
  "Cement","Lime","Stone Block","Sheet & Plate","Glass in Packs","Distemper",
  "AC Sheet","Fitting Iron Sheet","GI Pipes","CI Pipes","CC Pipes","AC Pipes",
  "Bricks — Per 1000 Nos","Tiles","Half Round Tiles","Roofing Tiles","Manglore Tiles",
  "Steel MS","Steel TMT","Steel HYSD","Structural Steel",
  "Flooring Tiles Ceramic","Flooring Tiles Marbonate",
];

const CATEGORIES = [
  { key: "buildings", label: "Buildings", icon: "🏢", color: "blue"    },
  { key: "roads",     label: "Roads",     icon: "🛣️",  color: "amber"   },
  { key: "bridges",   label: "Bridges",   icon: "🌉", color: "emerald" },
];

import { interpolateRate as libInterpolateRate, getUnitForMaterial } from "@/lib/leadUtils";

// ─── Rate helpers ─────────────────────────────────────────────────────────────
function getRateForMaterial(leadsData, materialName, km) {
  return libInterpolateRate(leadsData, materialName, km);
}

// ─── Toast component ──────────────────────────────────────────────────────────
function SaveToast({ show }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      <div className="bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Saved
      </div>
    </div>
  );
}

// ─── Sortable Row ─────────────────────────────────────────────────────────────
function SortableLeadRow({ entry, idx, onUpdateKm, onUpdateRate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.name });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : "auto" };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50 transition-colors group">
      <td className="px-3 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
      <td className="px-2 py-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors inline-flex items-center justify-center w-5 h-5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm6-12a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-gray-800 text-sm">{entry.name}</td>
      <td className="px-3 py-3 text-center">
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${entry.type === "custom" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
          {entry.type === "custom" ? "Custom" : "Regular"}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="relative max-w-[110px] mx-auto">
          <input
            type="number" min="0" step="0.5"
            value={entry.distance || ""}
            onChange={e => onUpdateKm(entry.name, e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
            className="w-full border border-slate-200 shadow-sm rounded-xl px-3 py-1.5 text-center text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-8"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">km</span>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="max-w-[140px] mx-auto">
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
                onChange={e => onUpdateRate(entry.name, e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
                className="w-full border border-purple-200 shadow-sm rounded-xl pl-6 pr-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-center text-gray-400 text-xs">{entry.unit || "—"}</td>
      <td className="px-3 py-3 text-center">
        <button onClick={() => onDelete(entry.name)} className="w-7 h-7 flex items-center justify-center mx-auto rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leadsData, setLeadsData] = useState(null);
  const [mode, setMode] = useState(null);
  const [activeCategoryPanel, setActiveCategoryPanel] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [regularKm, setRegularKm] = useState("");
  const [customName, setCustomName] = useState("");
  const [customKm, setCustomKm] = useState("");
  const [customRate, setCustomRate] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const searchRef = useRef(null);
  const toastTimer = useRef(null);

  const leadSettings = useStore(s => s.leadSettings);
  const setLeadSettings = useStore(s => s.setLeadSettings);
  const updateLeadSetting = useStore(s => s.updateLeadSetting);
  const leadOrder = useStore(s => s.leadOrder);
  const setLeadOrder = useStore(s => s.setLeadOrder);
  const recalculate = useStore(s => s.recalculateRARowsWithLeadSettings);
  const leadsProfiles = useStore(s => s.leadsProfiles);

  // Load lead rate data
  useEffect(() => {
    fetch("/api/leads-data").then(r => r.json()).then(setLeadsData).catch(console.error);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const h = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Sync leadOrder when leadSettings changes — read current leadOrder via getState to avoid dep loop
  useEffect(() => {
    const currentOrder = useStore.getState().leadOrder;
    const allKeys = Object.keys(leadSettings);
    const missing = allKeys.filter(k => !currentOrder.includes(k));
    const pruned = currentOrder.filter(k => allKeys.includes(k));
    const needsAdd = missing.length > 0;
    const needsPrune = pruned.length !== currentOrder.length;
    if (needsAdd || needsPrune) {
      setLeadOrder([...pruned, ...missing]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadSettings]);

  // ─── Show toast ───────────────────────────────────────────────────────────
  const showToast = useCallback(() => {
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }, []);

  // ─── Manual save ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    try {
      const state = useStore.getState();
      if (state.currentEstimateId) {
        await fetch(`/api/estimate/${state.currentEstimateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadSettings: state.leadSettings, leadOrder: state.leadOrder }),
        });
      }
    } catch (e) { console.error(e); }
    showToast();
  }, [showToast]);

  // ─── Auto-save every 60s — stable ref so interval never restarts ──────────
  const saveRef = useRef(null);
  useEffect(() => { saveRef.current = handleSave; });
  useEffect(() => {
    const id = setInterval(() => saveRef.current?.(), 60000);
    return () => clearInterval(id);
  }, []);

  // ─── Derived (memoized) ───────────────────────────────────────────────────
  const filteredMaterials = useMemo(
    () => STANDARD_MATERIALS.filter(m => m.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );
  const regularRatePreview = useMemo(
    () => selectedMaterial && regularKm && leadsData
      ? getRateForMaterial(leadsData, selectedMaterial, parseFloat(regularKm))
      : null,
    [selectedMaterial, regularKm, leadsData]
  );

  // Ordered leads array (memoized)
  const leadsArray = useMemo(
    () => leadOrder.filter(name => leadSettings[name]).map(name => ({ name, ...leadSettings[name] })),
    [leadOrder, leadSettings]
  );


  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAddRegular = () => {
    if (!selectedMaterial || !regularKm || parseFloat(regularKm) <= 0) return;
    const km = parseFloat(regularKm);
    const leadCharge = getRateForMaterial(leadsData, selectedMaterial, km);
    const unit = getUnitForMaterial(leadsData, selectedMaterial);
    updateLeadSetting(selectedMaterial, { distance: km, leadCharge, unit, type: "regular" });
    setTimeout(recalculate, 0);
    setSelectedMaterial(""); setSearchQuery(""); setRegularKm(""); setMode(null);
  };

  const handleAddCustom = () => {
    if (!customName.trim() || !customRate || parseFloat(customRate) < 0) return;
    const isStandard = STANDARD_MATERIALS.includes(customName.trim());
    const displayName = isStandard ? `${customName.trim()} (Custom)` : customName.trim();
    const km = parseFloat(customKm) || 0;
    updateLeadSetting(displayName, { distance: km, leadCharge: parseFloat(customRate), unit: "", type: "custom", origin: "leads" });
    setTimeout(recalculate, 0);
    setCustomName(""); setCustomKm(""); setCustomRate(""); setMode(null);
  };

  const handleDeleteLead = name => {
    const updated = { ...leadSettings };
    delete updated[name];
    setLeadSettings(updated);
    setLeadOrder(leadOrder.filter(k => k !== name));
    setTimeout(recalculate, 0);
  };

  const handleUpdateKm = (name, km) => {
    const entry = leadSettings[name];
    if (!entry) return;
    const newKm = parseFloat(km) || 0;
    let newCharge = entry.leadCharge;
    if (entry.type === "regular" && leadsData) newCharge = getRateForMaterial(leadsData, name, newKm);
    updateLeadSetting(name, { distance: newKm, leadCharge: newCharge });
    setTimeout(recalculate, 0);
  };

  const handleUpdateRate = (name, rate) => {
    updateLeadSetting(name, { leadCharge: parseFloat(rate) || 0 });
    setTimeout(recalculate, 0);
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = leadsArray.findIndex(e => e.name === active.id);
    const newIdx = leadsArray.findIndex(e => e.name === over.id);
    setLeadOrder(arrayMove(leadsArray.map(e => e.name), oldIdx, newIdx));
  };

  // ─── Apply Profile ─────────────────────────────────────────────────────────
  const applyProfile = profile => {
    const updated = { ...leadSettings };
    const newOrder = [...leadOrder];
    // Add standard materials from profile
    // Support both legacy string[] and new { name, km }[] formats
    (profile.materials || []).forEach(matEntry => {
      const matName = typeof matEntry === "string" ? matEntry : matEntry.name;
      const matKm   = typeof matEntry === "string" ? 0 : (matEntry.km || 0);
      if (!updated[matName]) {
        updated[matName] = { distance: matKm, leadCharge: 0, unit: getUnitForMaterial(leadsData, matName), type: "regular" };
        if (!newOrder.includes(matName)) newOrder.push(matName);
      } else if (matKm > 0 && updated[matName].distance === 0) {
        // If the material already exists but has no distance set, fill it in from the profile
        updated[matName] = { ...updated[matName], distance: matKm };
      }
    });
    // Add custom leads from profile
    (profile.customLeads || []).forEach(cl => {
      const name = cl.name;
      if (!updated[name]) {
        updated[name] = { distance: cl.distance || 0, leadCharge: cl.leadCharge || 0, unit: "", type: "custom", origin: "leads" };
        if (!newOrder.includes(name)) newOrder.push(name);
      }
    });
    setLeadSettings(updated);
    setLeadOrder(newOrder);
    setTimeout(recalculate, 0);
    setActiveCategoryPanel(null);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  return (
    <div className="min-h-screen bg-gray-50 w-full text-gray-900 font-sans">
      <div className="w-full px-2 md:px-6 py-6 mx-auto">
        <Tabs />
        <SaveToast show={toastVisible} />

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Lead Charges</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Configure transportation lead rates. Apply a profile or add individually.</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold text-sm rounded-xl shadow-md active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>
        </div>

        {/* ─── Category Buttons (profile quick-apply) ─────────────────────── */}
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Apply Profile</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const isActive = activeCategoryPanel === cat.key;
              const colorMap = {
                blue:    { active: "bg-blue-600 text-white border-blue-600",    idle: "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"    },
                amber:   { active: "bg-amber-500 text-white border-amber-500",   idle: "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"   },
                emerald: { active: "bg-emerald-600 text-white border-emerald-600",idle: "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50" },
              };
              const cl = colorMap[cat.color];
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategoryPanel(isActive ? null : cat.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border shadow-sm ${isActive ? cl.active : cl.idle}`}
                >
                  {cat.icon} {cat.label}
                  <span className={`text-xs font-normal ${isActive ? "opacity-80" : "opacity-50"}`}>
                    ({(leadsProfiles[cat.key] || []).length})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Profile Panel */}
          {activeCategoryPanel && (() => {
            const profiles = leadsProfiles[activeCategoryPanel] || [];
            const cat = CATEGORIES.find(c => c.key === activeCategoryPanel);
            return (
              <div className="mt-3 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">{cat.icon} {cat.label} Profiles</h3>
                  <button onClick={() => setActiveCategoryPanel(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
                </div>
                {profiles.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4 italic">
                    No profiles yet — create one in <strong>Data Sheet → Lead Profiles</strong>
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {profiles.map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => applyProfile(profile)}
                        className="text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                      >
                        <p className="font-semibold text-sm text-gray-800 group-hover:text-blue-700 truncate">{profile.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(profile.materials?.length || 0) + (profile.customLeads?.length || 0)} materials
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ─── Add Lead Buttons ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 mb-5 mt-4">
          <p className="w-full text-xs font-bold text-gray-400 uppercase tracking-wider mb-0">Add Individual Lead</p>
          <button
            onClick={() => setMode(mode === "regular" ? null : "regular")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm border ${mode === "regular" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Regular Lead
          </button>
          <button
            onClick={() => setMode(mode === "custom" ? null : "custom")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm border ${mode === "custom" ? "bg-purple-600 text-white border-purple-600 shadow-md" : "bg-white text-purple-700 border-purple-300 hover:bg-purple-50"}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Add Custom Lead
          </button>
        </div>

        {/* ─── Regular Lead Form ───────────────────────────────────────────── */}
        {mode === "regular" && (
          <div className="bg-white/60 backdrop-blur-xl border border-blue-200/50 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] p-5 mb-5">
            <h2 className="text-base font-bold text-blue-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">R</span>
              Add Regular Lead
            </h2>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[220px]" ref={searchRef}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Material</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery || selectedMaterial}
                    placeholder="Search or select material…"
                    onChange={e => { setSearchQuery(e.target.value); setSelectedMaterial(""); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full border border-slate-200 shadow-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
                  />
                  {selectedMaterial && !searchQuery && (
                    <button onClick={() => { setSelectedMaterial(""); setSearchQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
                  )}
                  {showDropdown && filteredMaterials.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                      {filteredMaterials.map(mat => (
                        <li key={mat} onClick={() => { setSelectedMaterial(mat); setSearchQuery(""); setShowDropdown(false); }}
                          className="px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                          {mat}
                          {leadsData && <span className="ml-2 text-xs text-gray-400">({getUnitForMaterial(leadsData, mat)})</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="w-32">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Distance (km)</label>
                <div className="relative">
                  <input type="number" min="0" step="0.5" value={regularKm} onChange={e => setRegularKm(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} placeholder="km"
                    className="w-full border border-slate-200 shadow-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">km</span>
                </div>
              </div>
              <div className="w-40">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Auto Rate (₹)</label>
                <div className={`flex items-center justify-center border rounded-lg px-3 py-2.5 text-sm font-bold ${regularRatePreview != null ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                  {regularRatePreview != null ? `₹ ${regularRatePreview.toFixed(2)}` : "— enter km —"}
                </div>
                {leadsData && selectedMaterial && <p className="text-xs text-gray-400 mt-0.5 text-center">per {getUnitForMaterial(leadsData, selectedMaterial)}</p>}
              </div>
              <button onClick={handleAddRegular} disabled={!selectedMaterial || !regularKm || parseFloat(regularKm) <= 0}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all text-sm">Add</button>
            </div>
          </div>
        )}

        {/* ─── Custom Lead Form ────────────────────────────────────────────── */}
        {mode === "custom" && (
          <div className="bg-white/60 backdrop-blur-xl border border-purple-200/50 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] p-5 mb-5">
            <h2 className="text-base font-bold text-purple-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-bold">C</span>
              Add Custom Lead
            </h2>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Material Name</label>
                <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. River Sand"
                  className="w-full border border-slate-200 shadow-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm" />
                {customName && STANDARD_MATERIALS.includes(customName.trim()) && (
                  <p className="text-xs text-orange-500 mt-0.5 font-medium">Matches standard material — will be saved as &ldquo;{customName.trim()} (Custom)&rdquo;</p>
                )}
              </div>
              <div className="w-32">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Distance (km)</label>
                <div className="relative">
                  <input type="number" min="0" step="0.5" value={customKm} onChange={e => setCustomKm(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} placeholder="km"
                    className="w-full border border-slate-200 shadow-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">km</span>
                </div>
              </div>
              <div className="w-40">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rate (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₹</span>
                  <input type="number" min="0" step="0.01" value={customRate} onChange={e => setCustomRate(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} placeholder="0.00"
                    className="w-full border border-slate-200 shadow-sm pl-7 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm" />
                </div>
              </div>
              <button onClick={handleAddCustom} disabled={!customName.trim() || !customRate || parseFloat(customRate) < 0}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all text-sm">Add</button>
            </div>
          </div>
        )}

        {/* ─── Leads Table ─────────────────────────────────────────────────── */}
        {leadsArray.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-semibold text-gray-400">No leads added yet</p>
            <p className="text-sm mt-1">Apply a profile above, or use the Add buttons to add leads.</p>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={leadsArray.map(e => e.name)} strategy={verticalListSortingStrategy}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider text-xs font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 w-8">#</th>
                        <th className="px-2 py-3 w-8"></th>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-3 py-3 text-center w-28">Type</th>
                        <th className="px-3 py-3 text-center w-36">Distance</th>
                        <th className="px-3 py-3 text-center w-44">Lead Rate (₹)</th>
                        <th className="px-3 py-3 text-center w-20">Unit</th>
                        <th className="px-3 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leadsArray.map((entry, idx) => (
                        <SortableLeadRow
                          key={entry.name}
                          entry={entry}
                          idx={idx}
                          onUpdateKm={handleUpdateKm}
                          onUpdateRate={handleUpdateRate}
                          onDelete={handleDeleteLead}
                        />
                      ))}
                    </tbody>
                  </table>
                </SortableContext>
              </DndContext>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{leadsArray.length} lead{leadsArray.length !== 1 ? "s" : ""} configured</span>
              <span>·</span>
              <span>{leadsArray.filter(l => l.type === "regular").length} regular</span>
              <span>·</span>
              <span>{leadsArray.filter(l => l.type === "custom").length} custom</span>
              <span className="ml-auto text-gray-400 italic">Drag rows to reorder</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}