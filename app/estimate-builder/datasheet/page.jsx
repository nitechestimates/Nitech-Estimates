"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import Tabs from "../components/Tabs";

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
  { key: "buildings", label: "Buildings", icon: "🏢", color: "blue" },
  { key: "roads",     label: "Roads",     icon: "🛣️",  color: "amber" },
  { key: "bridges",   label: "Bridges",   icon: "🌉", color: "emerald" },
];

const COLOR_MAP = {
  blue:    { bg: "bg-blue-600",    light: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   ring: "focus:ring-blue-400"   },
  amber:   { bg: "bg-amber-500",   light: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  ring: "focus:ring-amber-400"  },
  emerald: { bg: "bg-emerald-600", light: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-700",ring: "focus:ring-emerald-400" },
};

export default function DatasheetPage() {
  // ── Yojana ──
  const yojanaList  = useStore(s => s.yojanaList);
  const addYojana   = useStore(s => s.addYojana);
  const removeYojana = useStore(s => s.removeYojana);
  const [newYojana, setNewYojana] = useState("");
  const [editingYojana, setEditingYojana] = useState(null);
  const [editYojanaVal, setEditYojanaVal] = useState("");

  // ── Lead Profiles ──
  const leadsProfiles            = useStore(s => s.leadsProfiles);
  const addLeadsProfile          = useStore(s => s.addLeadsProfile);
  const deleteLeadsProfile       = useStore(s => s.deleteLeadsProfile);
  const renameLeadsProfile       = useStore(s => s.renameLeadsProfile);
  const updateLeadsProfileMaterials = useStore(s => s.updateLeadsProfileMaterials);
  const addCustomLeadToProfile   = useStore(s => s.addCustomLeadToProfile);
  const removeCustomLeadFromProfile = useStore(s => s.removeCustomLeadFromProfile);

  const [activeCategory, setActiveCategory] = useState("buildings");
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [customLeadName, setCustomLeadName] = useState("");
  const [customLeadKm, setCustomLeadKm] = useState("");
  const [customLeadRate, setCustomLeadRate] = useState("");

  const cat = CATEGORIES.find(c => c.key === activeCategory);
  const clr = COLOR_MAP[cat.color];
  const profiles = leadsProfiles[activeCategory] || [];
  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || null;

  const toggleMaterial = (matName) => {
    if (!selectedProfile) return;
    const current = selectedProfile.materials || [];
    const updated = current.includes(matName) ? current.filter(m => m !== matName) : [...current, matName];
    updateLeadsProfileMaterials(activeCategory, selectedProfileId, updated);
  };

  const handleAddProfile = () => {
    if (!newProfileName.trim()) return;
    if (profiles.length >= 30) return alert("Max 30 profiles per category.");
    addLeadsProfile(activeCategory, newProfileName);
    setNewProfileName("");
  };

  const handleAddCustomToProfile = () => {
    if (!customLeadName.trim() || !customLeadRate) return;
    const lead = { name: customLeadName.trim(), distance: parseFloat(customLeadKm) || 0, leadCharge: parseFloat(customLeadRate) || 0 };
    addCustomLeadToProfile(activeCategory, selectedProfileId, lead);
    setCustomLeadName(""); setCustomLeadKm(""); setCustomLeadRate("");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="w-full px-2 md:px-6 py-6">
        <Tabs />

        {/* ══ SECTION 1: YOJANA / FUNDS ══════════════════════════════════════ */}
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Yojana / Funds</h2>
          <p className="text-sm text-gray-500 mb-4">Manage yojana/fund names. They appear as suggestions when creating an estimate.</p>

          <div className="flex gap-2 mb-4">
            <input
              value={newYojana}
              onChange={e => setNewYojana(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (() => { if (newYojana.trim()) { addYojana(newYojana); setNewYojana(""); } })()}
              placeholder="Enter yojana/fund name…"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => { if (!newYojana.trim()) return; addYojana(newYojana); setNewYojana(""); }}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition"
            >Add</button>
          </div>

          {yojanaList.length === 0 ? (
            <div className="text-gray-400 italic text-sm py-6 text-center border-2 border-dashed border-gray-200 rounded-xl">No yojana/fund names added yet.</div>
          ) : (
            <div className="space-y-2">
              {yojanaList.map(item => (
                <div key={item} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                  {editingYojana === item ? (
                    <>
                      <input value={editYojanaVal} onChange={e => setEditYojanaVal(e.target.value)} className="flex-1 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <button onClick={() => { if (editYojanaVal.trim() && editYojanaVal !== item) { removeYojana(item); addYojana(editYojanaVal); } setEditingYojana(null); }} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg font-semibold">Save</button>
                      <button onClick={() => setEditingYojana(null)} className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-lg">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{item}</span>
                      <button onClick={() => { setEditingYojana(item); setEditYojanaVal(item); }} className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-medium transition">Edit</button>
                      <button onClick={() => { if (confirm(`Delete "${item}"?`)) removeYojana(item); }} className="text-xs px-3 py-1 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 font-medium transition">Delete</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-gray-200 mb-8" />

        {/* ══ SECTION 2: LEADS PROFILES ══════════════════════════════════════ */}
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Lead Profiles</h2>
          <p className="text-sm text-gray-500 mb-5">Create material profiles for Buildings, Roads, or Bridges. Apply a profile on the Leads page to auto-add materials.</p>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-6">
            {CATEGORIES.map(c => {
              const cl = COLOR_MAP[c.color];
              return (
                <button
                  key={c.key}
                  onClick={() => { setActiveCategory(c.key); setSelectedProfileId(null); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                    activeCategory === c.key
                      ? `${cl.bg} text-white border-transparent shadow-md`
                      : `bg-white ${cl.text} ${cl.border} hover:${cl.light}`
                  }`}
                >{c.icon} {c.label}</button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Profile List */}
            <div className={`${clr.light} border ${clr.border} rounded-2xl p-4`}>
              <h3 className={`font-bold text-sm ${clr.text} mb-3 uppercase tracking-wide`}>Profiles — {cat.label}</h3>

              {/* Add profile */}
              <div className="flex gap-2 mb-4">
                <input
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddProfile()}
                  placeholder="New profile name…"
                  className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${clr.ring}`}
                />
                <button
                  onClick={handleAddProfile}
                  className={`px-4 py-2 ${clr.bg} text-white rounded-lg font-bold text-sm hover:opacity-90 transition`}
                >+</button>
              </div>

              {profiles.length === 0 ? (
                <div className="text-gray-400 text-xs italic text-center py-6">No profiles yet. Create one above.</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {profiles.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProfileId(p.id)}
                      className={`rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                        selectedProfileId === p.id
                          ? `${clr.bg} text-white border-transparent shadow-md`
                          : `bg-white border-gray-200 hover:border-gray-300 text-gray-800`
                      }`}
                    >
                      {renamingId === p.id ? (
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <input
                            value={renameVal}
                            onChange={e => setRenameVal(e.target.value)}
                            className="flex-1 border rounded px-2 py-0.5 text-xs text-gray-800 focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => { renameLeadsProfile(activeCategory, p.id, renameVal); setRenamingId(null); }} className="text-xs px-2 py-0.5 bg-white text-green-700 rounded font-bold">✓</button>
                          <button onClick={() => setRenamingId(null)} className="text-xs px-2 py-0.5 bg-white text-gray-500 rounded">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-sm truncate">{p.name}</span>
                          <span className={`text-xs opacity-70`}>{(p.materials?.length || 0) + (p.customLeads?.length || 0)} items</span>
                          <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => { setRenamingId(p.id); setRenameVal(p.name); }}
                              className={`text-xs px-1.5 py-0.5 rounded ${selectedProfileId === p.id ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'} transition`}
                            >✏️</button>
                            <button
                              onClick={() => { if (confirm(`Delete "${p.name}"?`)) { deleteLeadsProfile(activeCategory, p.id); if (selectedProfileId === p.id) setSelectedProfileId(null); } }}
                              className={`text-xs px-1.5 py-0.5 rounded ${selectedProfileId === p.id ? 'bg-white/20 hover:bg-red-500' : 'bg-red-50 hover:bg-red-100'} transition`}
                            >🗑️</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3 text-right">{profiles.length}/30 profiles</p>
            </div>

            {/* Right: Profile Editor */}
            <div className="lg:col-span-2">
              {!selectedProfile ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                  <div className="text-4xl mb-3">👈</div>
                  <p className="font-medium">Select a profile to edit its materials</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">{selectedProfile.name}</h3>
                  <p className="text-xs text-gray-500 mb-4">Click materials to toggle them on/off. Green = included in this profile.</p>

                  {/* Standard material boxes */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {STANDARD_MATERIALS.map(mat => {
                      const selected = (selectedProfile.materials || []).includes(mat);
                      return (
                        <button
                          key={mat}
                          onClick={() => toggleMaterial(mat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            selected
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {selected && "✓ "}{mat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom leads in profile */}
                  {(selectedProfile.customLeads || []).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Custom Leads</p>
                      <div className="space-y-1">
                        {selectedProfile.customLeads.map(cl => (
                          <div key={cl.name} className="flex items-center justify-between px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                            <span className="font-semibold text-purple-700">{cl.name}</span>
                            <span className="text-purple-500 text-xs">{cl.distance} km · ₹{cl.leadCharge}</span>
                            <button onClick={() => removeCustomLeadFromProfile(activeCategory, selectedProfileId, cl.name)} className="text-red-400 hover:text-red-600 text-xs ml-2">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add custom lead to profile */}
                  <div className={`border-t ${clr.border} pt-4 mt-4`}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Add Custom Lead to Profile</p>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[160px]">
                        <label className="text-xs text-gray-400 mb-1 block">Name</label>
                        <input value={customLeadName} onChange={e => setCustomLeadName(e.target.value)} placeholder="Material name…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-gray-400 mb-1 block">km</label>
                        <input type="number" value={customLeadKm} onChange={e => setCustomLeadKm(e.target.value)} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                      </div>
                      <div className="w-28">
                        <label className="text-xs text-gray-400 mb-1 block">Rate (₹)</label>
                        <input type="number" value={customLeadRate} onChange={e => setCustomLeadRate(e.target.value)} placeholder="0.00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                      </div>
                      <button
                        onClick={handleAddCustomToProfile}
                        disabled={!customLeadName.trim() || !customLeadRate}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 disabled:opacity-40 transition"
                      >Add</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}