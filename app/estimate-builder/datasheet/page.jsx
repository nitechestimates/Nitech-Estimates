"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import Link from "next/link";
import AlertDialog, { useAlertDialog } from '@/components/AlertDialog';
import defaults from "@/lib/defaults.json";

const STANDARD_MATERIALS = defaults.STANDARD_MATERIALS;

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

function normaliseMaterials(mats) {
  if (!Array.isArray(mats)) return [];
  return mats.map(m => (typeof m === "string" ? { name: m, km: 0 } : m));
}

export default function DatasheetPage() {
  const { dialog, triggerAlert, triggerConfirm } = useAlertDialog();
  // ── Zustand Store Hooks ──
  const yojanaList   = useStore(s => s.yojanaList) || [];
  const addYojana    = useStore(s => s.addYojana);
  const removeYojana = useStore(s => s.removeYojana);
  
  const leadsProfiles               = useStore(s => s.leadsProfiles) || { buildings: [], roads: [], bridges: [] };
  const addLeadsProfile             = useStore(s => s.addLeadsProfile);
  const deleteLeadsProfile          = useStore(s => s.deleteLeadsProfile);
  const renameLeadsProfile          = useStore(s => s.renameLeadsProfile);
  const updateLeadsProfileMaterials = useStore(s => s.updateLeadsProfileMaterials);
  const addCustomLeadToProfile      = useStore(s => s.addCustomLeadToProfile);
  const removeCustomLeadFromProfile = useStore(s => s.removeCustomLeadFromProfile);

  const areaRateIncreases      = useStore(s => s.areaRateIncreases) || [];
  const basicMaterialRates     = useStore(s => s.basicMaterialRates) || [];
  const updateAreaRateIncrease = useStore(s => s.updateAreaRateIncrease);
  const updateBasicMaterialRate = useStore(s => s.updateBasicMaterialRate);
  const resetAreaRateIncreases = useStore(s => s.resetAreaRateIncreases);
  const resetBasicMaterialRates = useStore(s => s.resetBasicMaterialRates);

  const generalAllowances      = useStore(s => s.generalAllowances) || {};
  const updateGeneralAllowance = useStore(s => s.updateGeneralAllowance);
  const resetGeneralAllowances = useStore(s => s.resetGeneralAllowances);

  const projectDetailsProfiles      = useStore(s => s.projectDetailsProfiles) || [];
  const deleteProjectDetailsProfile = useStore(s => s.deleteProjectDetailsProfile);
  const updateProjectDetailsProfile = useStore(s => s.updateProjectDetailsProfile);
  const addProjectDetailsProfile    = useStore(s => s.addProjectDetailsProfile);

  // ── Modal UI States ──
  const [yojanaModalOpen, setYojanaModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // ── Yojana Workspace Internal States ──
  const [newYojana, setNewYojana] = useState("");
  const [editingYojana, setEditingYojana] = useState(null);
  const [editYojanaVal, setEditYojanaVal] = useState("");

  // ── Lead Profile Workspace Internal States ──
  const [activeCategory, setActiveCategory]     = useState("buildings");
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [newProfileName, setNewProfileName]       = useState("");
  const [renamingId, setRenamingId]               = useState(null);
  const [renameVal, setRenameVal]                 = useState("");
  const [customLeadName, setCustomLeadName]       = useState("");
  const [customLeadKm, setCustomLeadKm]           = useState("");
  const [customLeadRate, setCustomLeadRate]       = useState("");

  // ── Rates & Allowances Workspace Tab State ──
  const [ratesTab, setRatesTab] = useState("surcharges"); // "surcharges" | "materials"
  const [materialSearch, setMaterialSearch] = useState("");
  const [ratesSaveSuccess, setRatesSaveSuccess] = useState(false);

  // ── Details Profile Form States ──
  const [activeProfileIdToEdit, setActiveProfileIdToEdit] = useState(null); // null | "new" | string
  const [formProfileName, setFormProfileName] = useState("");
  const [formEstimateName, setFormEstimateName] = useState("");
  const [formNameOfWork, setFormNameOfWork] = useState("");
  const [formIsTribal, setFormIsTribal] = useState(false);
  const [formTribalPercent, setFormTribalPercent] = useState("");
  const [formYojana, setFormYojana] = useState("");
  const [formEstAmount, setFormEstAmount] = useState("");
  const [formLabourInsurance, setFormLabourInsurance] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formDist, setFormDist] = useState("");
  const [formTaluka, setFormTaluka] = useState("");
  const [formVillage, setFormVillage] = useState("");
  const [formHeadDivision, setFormHeadDivision] = useState("");
  const [formSubDivision, setFormSubDivision] = useState("");
  const [formDeputyEngineer, setFormDeputyEngineer] = useState("");
  const [formJrEngineer, setFormJrEngineer] = useState("");
  const [formAdminApprovalNo, setFormAdminApprovalNo] = useState("");

  // ── Prevent background scroll when any modal is open ──
  useEffect(() => {
    if (yojanaModalOpen || profileModalOpen || ratesModalOpen || detailsModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [yojanaModalOpen, profileModalOpen, ratesModalOpen, detailsModalOpen]);

  // ── Fallback Defaults (Resiliency for pre-existing storage) ──
  const finalAreaRateIncreases = areaRateIncreases.length > 0 ? areaRateIncreases : defaults.DEFAULT_AREA_RATE_INCREASES;

  const finalBasicMaterialRates = basicMaterialRates.length > 0 ? basicMaterialRates : defaults.DEFAULT_BASIC_MATERIAL_RATES;

  const finalGeneralAllowances = Object.keys(generalAllowances).length > 0 ? generalAllowances : defaults.DEFAULT_GENERAL_ALLOWANCES;

  // ── Lead Profile Helper Calculations ──
  const cat = CATEGORIES.find(c => c.key === activeCategory);
  const clr = COLOR_MAP[cat?.color || "blue"];
  const profiles = leadsProfiles[activeCategory] || [];
  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || null;
  const profileMaterials = normaliseMaterials(selectedProfile?.materials);

  const isMaterialSelected = (matName) => profileMaterials.some(m => m.name === matName);

  const toggleMaterial = (matName) => {
    if (!selectedProfile) return;
    const current = normaliseMaterials(selectedProfile.materials);
    let updated;
    if (isMaterialSelected(matName)) {
      updated = current.filter(m => m.name !== matName);
    } else {
      updated = [...current, { name: matName, km: 0 }];
    }
    updateLeadsProfileMaterials(activeCategory, selectedProfileId, updated);
  };

  const updateMaterialKm = (matName, km) => {
    if (!selectedProfile) return;
    const current = normaliseMaterials(selectedProfile.materials);
    const updated = current.map(m =>
      m.name === matName ? { ...m, km: parseFloat(km) || 0 } : m
    );
    updateLeadsProfileMaterials(activeCategory, selectedProfileId, updated);
  };

  const handleStartEdit = (p) => {
    setActiveProfileIdToEdit(p.id);
    setFormProfileName(p.profileName || "");
    setFormEstimateName(p.estimateName || "");
    setFormNameOfWork(p.nameOfWork || "");
    setFormIsTribal(!!p.isTribal);
    setFormTribalPercent(p.tribalPercent || "");
    setFormYojana(p.yojana || "");
    setFormEstAmount(p.estAmount || "");
    setFormLabourInsurance(p.labourInsurance || "");
    setFormYear(p.year || "");
    setFormDist(p.dist || "");
    setFormTaluka(p.taluka || "");
    setFormVillage(p.village || "");
    setFormHeadDivision(p.headDivision || "");
    setFormSubDivision(p.subDivision || "");
    setFormDeputyEngineer(p.deputyEngineer || "");
    setFormJrEngineer(p.jrEngineer || "");
    setFormAdminApprovalNo(p.adminApprovalNo || "");
  };

  const handleStartCreateNew = async () => {
    if (projectDetailsProfiles.length >= 50) {
      await triggerAlert("Maximum 50 details profiles allowed. Please delete some before creating a new one.");
      return;
    }
    setActiveProfileIdToEdit("new");
    setFormProfileName("");
    setFormEstimateName("");
    setFormNameOfWork("");
    setFormIsTribal(false);
    setFormTribalPercent("");
    setFormYojana("");
    setFormEstAmount("");
    setFormLabourInsurance("");
    setFormYear("");
    setFormDist("");
    setFormTaluka("");
    setFormVillage("");
    setFormHeadDivision("");
    setFormSubDivision("");
    setFormDeputyEngineer("");
    setFormJrEngineer("");
    setFormAdminApprovalNo("");
  };

  const handleSaveDetailsProfile = async () => {
    if (!formProfileName.trim()) {
      await triggerAlert("Please enter a Profile Name.");
      return;
    }
    const profileData = {
      profileName: formProfileName.trim(),
      estimateName: formEstimateName,
      nameOfWork: formNameOfWork,
      isTribal: formIsTribal,
      tribalPercent: formTribalPercent,
      yojana: formYojana,
      estAmount: formEstAmount,
      labourInsurance: formLabourInsurance,
      year: formYear,
      dist: formDist,
      taluka: formTaluka,
      village: formVillage,
      headDivision: formHeadDivision,
      subDivision: formSubDivision,
      deputyEngineer: formDeputyEngineer,
      jrEngineer: formJrEngineer,
      adminApprovalNo: formAdminApprovalNo
    };
    if (activeProfileIdToEdit === "new") {
      addProjectDetailsProfile(profileData);
    } else {
      updateProjectDetailsProfile(activeProfileIdToEdit, profileData);
    }
    setActiveProfileIdToEdit(null);
  };

  const handleAddProfile = async () => {
    if (!newProfileName.trim()) return;
    if (profiles.length >= 30) { await triggerAlert("Max 30 profiles per category."); return; }
    addLeadsProfile(activeCategory, newProfileName);
    setNewProfileName("");
  };

  const handleAddCustomToProfile = async () => {
    if (!customLeadName.trim()) { await triggerAlert("Please enter a material name."); return; }
    if (!customLeadRate) { await triggerAlert("Please enter a lead rate."); return; }
    const rate = parseFloat(customLeadRate);
    if (isNaN(rate) || rate < 0) { await triggerAlert("Rate must be a valid positive number."); return; }
    const km = parseFloat(customLeadKm) || 0;
    if (km < 0) { await triggerAlert("KM must be 0 or a positive number."); return; }
    const lead = { name: customLeadName.trim(), distance: km, leadCharge: rate };
    addCustomLeadToProfile(activeCategory, selectedProfileId, lead);
    setCustomLeadName(""); setCustomLeadKm(""); setCustomLeadRate("");
  };

  // ── Total profiles helper ──
  const totalProfilesCount = (leadsProfiles.buildings?.length || 0) + 
                             (leadsProfiles.roads?.length || 0) + 
                             (leadsProfiles.bridges?.length || 0);

  // ── Filtered Materials ──
  const filteredMaterialRates = finalBasicMaterialRates.filter(item => 
    item.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="w-full px-4 md:px-8 py-6 max-w-7xl mx-auto">
        
        {/* ── BACK NAVIGATION ── */}
        <div className="mb-4">
          <Link 
            href="/estimate-builder" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-950 tracking-tight">District Configuration Hub</h1>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                SSR 2022-23 Active
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Configure baseline yojanas, transport material lead templates, specific area surcharges, and raw district rates. All modifications sync automatically.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Syncing in Real Time
          </div>
        </div>

        {/* ── FOUR WORKSPACE CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Card 1: Yojana Manager */}
          <div className="group bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 p-6 flex flex-col justify-between hover:border-blue-400 hover:shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-300"></div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 text-blue-600 relative z-10">
                📁
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10 group-hover:text-blue-600 transition-colors">Yojana &amp; Funds Manager</h3>
              <p className="text-sm text-slate-500 leading-relaxed relative z-10 mb-4">
                Register administrative budget funds, public yojanas, and scheme classifications to categorize estimates.
              </p>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full mb-4">
                📊 {yojanaList.length} Registered Schemes
              </div>
              <button 
                onClick={() => setYojanaModalOpen(true)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl shadow-md active:scale-95 transition-all cursor-pointer block text-center"
              >
                Configure Yojanas →
              </button>
            </div>
          </div>

          {/* Card 2: Lead Profiles */}
          <div className="group bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 p-6 flex flex-col justify-between hover:border-amber-400 hover:shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-300"></div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl mb-4 text-amber-600 relative z-10">
                🛣️
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10 group-hover:text-amber-600 transition-colors">Lead Template Profiles</h3>
              <p className="text-sm text-slate-500 leading-relaxed relative z-10 mb-4">
                Define pre-set material templates and lead distances (KM) for Buildings, Roads, or Bridges to automate calculations.
              </p>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full mb-4">
                ⚡ {totalProfilesCount} Template Profiles
              </div>
              <button 
                onClick={() => setProfileModalOpen(true)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-xl shadow-md active:scale-95 transition-all cursor-pointer block text-center"
              >
                Configure Profiles →
              </button>
            </div>
          </div>

          {/* Card 3: Rates & Allowances */}
          <div className="group bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 p-6 flex flex-col justify-between hover:border-emerald-400 hover:shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-300"></div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl mb-4 text-emerald-600 relative z-10">
                🪙
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10 group-hover:text-emerald-600 transition-colors">District Rates &amp; Allowances</h3>
              <p className="text-sm text-slate-500 leading-relaxed relative z-10 mb-4">
                Manage specific area percentage surcharges (Tribal, Mining, Municipal) and baseline materials price sheets (excluding GST).
              </p>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full mb-4">
                🏛️ SSR 2022-23 Defaults
              </div>
              <button 
                onClick={() => setRatesModalOpen(true)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm rounded-xl shadow-md active:scale-95 transition-all cursor-pointer block text-center"
              >
                Configure Rates &amp; Allowances →
              </button>
            </div>
          </div>

          {/* Card 4: Estimate Details Profiles */}
          <div className="group bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 p-6 flex flex-col justify-between hover:border-purple-400 hover:shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-300"></div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl mb-4 text-purple-600 relative z-10">
                📋
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10 group-hover:text-purple-600 transition-colors">Estimate Details Profiles</h3>
              <p className="text-sm text-slate-500 leading-relaxed relative z-10 mb-4">
                Autofill templates for estimate details. Create up to 50 reusable templates containing engineer names, talukas, and divisions.
              </p>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full mb-4">
                📂 {projectDetailsProfiles.length}/50 Profiles Saved
              </div>
              <button 
                onClick={() => setDetailsModalOpen(true)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-sm rounded-xl shadow-md active:scale-95 transition-all cursor-pointer block text-center"
              >
                Configure Details Profiles →
              </button>
            </div>
          </div>

        </div>

        {/* ── INFO INSIGHT CARD ── */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_4px_30px_rgba(0,0,0,0.03)] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="text-3xl">💡</div>
          <div className="text-sm text-slate-600 leading-relaxed">
            <strong className="text-slate-800">What are these settings?</strong> The data modified here represents global district constraints. Adding a Yojana allows users to quickly bind projects to a fund source, and Lead Profiles automatically pre-populate lead tables in new estimates. District Rates define raw material baselines that drive individual item formulas.
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── MODAL 1: YOJANA & FUNDS WORKSPACE ── */}
        {/* ========================================================================= */}
        {yojanaModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl w-full max-w-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden flex flex-col my-8 max-h-[85vh] animate-in fade-in zoom-in duration-200">
              
              {/* Header */}
              <div className="bg-slate-950 text-white p-6 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">📁</div>
                  <div>
                    <h2 className="text-xl font-bold">Yojana &amp; Funds Workspace</h2>
                    <p className="text-xs text-slate-400">Add, rename, or remove yojanas in baseline lists</p>
                  </div>
                </div>
                <button 
                  onClick={() => setYojanaModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-300 font-bold hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Inputs */}
                <div className="bg-white/60 backdrop-blur-xl p-5 rounded-2xl border border-white/60 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Register New Yojana Name</label>
                  <div className="flex gap-2">
                    <input
                      value={newYojana}
                      onChange={e => setNewYojana(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newYojana.trim()) {
                          addYojana(newYojana);
                          setNewYojana("");
                        }
                      }}
                      placeholder="e.g. DPDC Scheme 2022-23..."
                      className="flex-1 border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium"
                    />
                    <button
                      onClick={() => {
                        if (!newYojana.trim()) return;
                        addYojana(newYojana);
                        setNewYojana("");
                      }}
                      className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition cursor-pointer"
                    >
                      Add Yojana
                    </button>
                  </div>
                </div>

                {/* List */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Registered Yojanas ({yojanaList.length})</h3>
                  {yojanaList.length === 0 ? (
                    <div className="text-slate-400 italic text-sm py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      No Yojana names registered yet. Add one above.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {yojanaList.map(item => (
                        <div key={item} className="flex items-center gap-3 bg-white/60 backdrop-blur-md border border-white/60 rounded-xl px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.03)] hover:bg-slate-50 transition">
                          {editingYojana === item ? (
                            <>
                              <input 
                                value={editYojanaVal} 
                                onChange={e => setEditYojanaVal(e.target.value)} 
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    if (editYojanaVal.trim() && editYojanaVal !== item) {
                                      removeYojana(item);
                                      addYojana(editYojanaVal);
                                    }
                                    setEditingYojana(null);
                                  }
                                }}
                                className="flex-1 border border-slate-200 bg-white/60 shadow-sm rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium" 
                              />
                              <button 
                                onClick={() => {
                                  if (editYojanaVal.trim() && editYojanaVal !== item) {
                                    removeYojana(item);
                                    addYojana(editYojanaVal);
                                  }
                                  setEditingYojana(null);
                                }} 
                                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold cursor-pointer"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingYojana(null)} 
                                className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm font-semibold text-slate-800">{item}</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => { setEditingYojana(item); setEditYojanaVal(item); }} 
                                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold transition cursor-pointer"
                                >
                                  ✏️ Edit
                                </button>
                                <button 
                                  onClick={async () => { if (await triggerConfirm(`Are you sure you want to delete "${item}"?`)) removeYojana(item); }} 
                                  className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 font-bold transition cursor-pointer"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="bg-slate-50/80 backdrop-blur-md p-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setYojanaModalOpen(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                >
                  Save &amp; Close
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ── MODAL 2: LEAD TEMPLATE PROFILES WORKSPACE ── */}
        {/* ========================================================================= */}
        {profileModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl w-full max-w-6xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden flex flex-col my-4 max-h-[92vh] animate-in fade-in zoom-in duration-200">
              
              {/* Header */}
              <div className="bg-slate-950 text-white p-6 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🛣️</div>
                  <div>
                    <h2 className="text-xl font-bold">Material Lead Profiles Configuration</h2>
                    <p className="text-xs text-slate-400">Configure baseline transport lead templates for estimate loading</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setProfileModalOpen(false); setSelectedProfileId(null); }}
                  className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-300 font-bold hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col space-y-6">
                
                {/* Category Toggles */}
                <div className="flex gap-2">
                  {CATEGORIES.map(c => {
                    const cl = COLOR_MAP[c.color];
                    return (
                      <button
                        key={c.key}
                        onClick={() => { setActiveCategory(c.key); setSelectedProfileId(null); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border cursor-pointer ${
                          activeCategory === c.key
                            ? `${cl.bg} text-white border-transparent shadow-md`
                            : `bg-slate-100 ${cl.text} ${cl.border} hover:${cl.light}`
                        }`}
                      >
                        {c.icon} {c.label} Template
                      </button>
                    );
                  })}
                </div>

                {/* Split workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[450px]">
                  
                  {/* Column A: Profile List */}
                  <div className={`${clr.light} border ${clr.border} rounded-2xl p-4 flex flex-col justify-between`}>
                    <div>
                      <h3 className={`font-bold text-sm ${clr.text} mb-3 uppercase tracking-wide`}>Profiles — {cat.label}</h3>

                      {/* Register Input */}
                      <div className="flex gap-2 mb-4">
                        <input
                          value={newProfileName}
                          onChange={e => setNewProfileName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAddProfile()}
                          placeholder="e.g. Standard Nashik Roads..."
                          className="flex-1 border border-slate-200 bg-white/60 shadow-sm rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium"
                        />
                        <button
                          onClick={handleAddProfile}
                          className={`px-4 py-2 ${clr.bg} text-white rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition cursor-pointer`}
                        >
                          +
                        </button>
                      </div>

                      {/* Items */}
                      {profiles.length === 0 ? (
                        <div className="text-slate-400 text-xs italic text-center py-12">No template profiles registered yet. Create one above.</div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {profiles.map(p => (
                            <div
                              key={p.id}
                              onClick={() => setSelectedProfileId(p.id)}
                              className={`rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                                selectedProfileId === p.id
                                  ? `${clr.bg} text-white border-transparent shadow-md`
                                  : `bg-white border-slate-200 hover:border-slate-300 text-slate-800`
                              }`}
                            >
                              {renamingId === p.id ? (
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                  <input
                                    value={renameVal}
                                    onChange={e => setRenameVal(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") {
                                        if (renameVal.trim()) renameLeadsProfile(activeCategory, p.id, renameVal);
                                        setRenamingId(null);
                                      }
                                    }}
                                    className="flex-1 border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium bg-white/60 shadow-sm"
                                    autoFocus
                                  />
                                  <button onClick={() => { if (renameVal.trim()) renameLeadsProfile(activeCategory, p.id, renameVal); setRenamingId(null); }} className="text-xs px-2 py-0.5 bg-white text-green-700 rounded font-bold">✓</button>
                                  <button onClick={() => setRenamingId(null)} className="text-xs px-2 py-0.5 bg-white text-slate-500 rounded">✕</button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-xs truncate flex-1">{p.name}</span>
                                  <span className="text-xs opacity-75 mr-2 shrink-0 font-medium">{(normaliseMaterials(p.materials).length) + (p.customLeads?.length || 0)} items</span>
                                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => { setRenamingId(p.id); setRenameVal(p.name); }}
                                      className={`text-xs p-1 rounded ${selectedProfileId === p.id ? 'bg-white/20 hover:bg-white/30' : 'bg-slate-100 hover:bg-slate-200'} transition`}
                                    >✏️</button>
                                    <button
                                      onClick={async () => { if (await triggerConfirm(`Delete template profile "${p.name}"?`)) { deleteLeadsProfile(activeCategory, p.id); if (selectedProfileId === p.id) setSelectedProfileId(null); } }}
                                      className={`text-xs p-1 rounded ${selectedProfileId === p.id ? 'bg-white/20 hover:bg-red-500' : 'bg-red-50 hover:bg-red-100'} transition`}
                                    >🗑️</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-semibold mt-4">
                      {profiles.length}/30 Profiles Max
                    </div>
                  </div>

                  {/* Column B/C: Profile Editor */}
                  <div className="lg:col-span-2 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
                    {!selectedProfile ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                        <div className="text-4xl mb-2">👈</div>
                        <p className="font-bold text-sm">Select a profile template to edit its constraints</p>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between h-full space-y-6">
                        
                        <div>
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <h3 className="font-bold text-slate-900 text-base">{selectedProfile.name}</h3>
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border">
                              Template Editor
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-4">Click materials to include, then input the specific lead travel distance (KM) below.</p>

                          {/* standard material selector grid */}
                          <div className="max-h-[170px] overflow-y-auto border border-slate-100 p-3 bg-slate-50 rounded-xl mb-4">
                            <div className="flex flex-wrap gap-1.5">
                              {STANDARD_MATERIALS.map(mat => {
                                const selected = isMaterialSelected(mat);
                                return (
                                  <button
                                    key={mat}
                                    onClick={() => toggleMaterial(mat)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                                      selected
                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                                    }`}
                                  >
                                    {selected && "✓ "}{mat}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Selected Standard Materials and distances */}
                          {profileMaterials.length > 0 && (
                            <div className="mb-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Standard Materials distances (KM)</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                                {profileMaterials.map(m => (
                                  <div key={m.name} className="flex items-center justify-between gap-3 px-3 py-1.5 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                    <span className="text-xs font-bold text-emerald-800 truncate flex-1">{m.name}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <label className="text-[10px] text-slate-400 font-semibold uppercase">km:</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={m.km === 0 ? "" : m.km}
                                        onChange={e => updateMaterialKm(m.name, e.target.value)}
                                        onBlur={e => { if (e.target.value === "") updateMaterialKm(m.name, 0); }}
                                        placeholder="0"
                                        className="w-16 border border-emerald-200 bg-white rounded px-1.5 py-0.5 text-xs text-center focus:outline-none font-bold"
                                      />
                                      <button
                                        onClick={() => toggleMaterial(m.name)}
                                        className="text-red-400 hover:text-red-600 text-xs font-bold ml-1 transition cursor-pointer"
                                        title="Remove"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Custom leads list */}
                          {(selectedProfile.customLeads || []).length > 0 && (
                            <div className="mb-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Registered Leads</p>
                              <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                                {selectedProfile.customLeads.map(cl => (
                                  <div key={cl.name} className="inline-flex items-center gap-2 px-2.5 py-1 bg-purple-50 border border-purple-100 rounded-lg text-xs">
                                    <span className="font-bold text-purple-700">{cl.name}</span>
                                    <span className="text-[10px] text-purple-400 font-bold bg-white px-1.5 py-0.5 rounded border">{cl.distance} km · ₹{cl.leadCharge}</span>
                                    <button onClick={() => removeCustomLeadFromProfile(activeCategory, selectedProfileId, cl.name)} className="text-red-400 hover:text-red-600 font-bold text-xs ml-1 cursor-pointer">✕</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Custom Lead Entry form */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Register Custom Material/Lead inside Profile</p>
                          <div className="flex flex-wrap gap-2 items-end">
                            <div className="flex-1 min-w-[140px]">
                              <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Material Name</label>
                              <input value={customLeadName} onChange={e => setCustomLeadName(e.target.value)} placeholder="e.g. Geotechnical Geotextile..." className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium" />
                            </div>
                            <div className="w-20">
                              <label className="text-[10px] text-slate-400 font-semibold mb-1 block">km</label>
                              <input type="number" min="0" step="0.1" value={customLeadKm} onChange={e => setCustomLeadKm(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} placeholder="0" className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-lg px-2.5 py-1.5 text-xs text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold" />
                            </div>
                            <div className="w-24">
                              <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Custom Rate (₹)</label>
                              <input type="number" min="0" step="0.01" value={customLeadRate} onChange={e => setCustomLeadRate(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} placeholder="0.00" className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-lg px-2.5 py-1.5 text-xs text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold" />
                            </div>
                            <button
                              onClick={handleAddCustomToProfile}
                              disabled={!customLeadName.trim() || !customLeadRate}
                              className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded shadow-sm font-bold text-xs disabled:opacity-40 transition cursor-pointer shrink-0"
                            >
                              Add Lead
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* Footer */}
              <div className="bg-slate-50/80 backdrop-blur-md p-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => { setProfileModalOpen(false); setSelectedProfileId(null); }}
                  className="px-6 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition cursor-pointer"
                >
                  Save &amp; Close Template
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ── MODAL 3: DISTRICT RATES & SURCHARGES WORKSPACE (THE MAIN EVENT) ── */}
        {/* ========================================================================= */}
        {ratesModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl w-full max-w-5xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden flex flex-col my-4 max-h-[92vh] animate-in fade-in zoom-in duration-200">
              
              {/* Header */}
              <div className="bg-slate-950 text-white p-6 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🪙</div>
                  <div>
                    <h2 className="text-xl font-bold">District Rates &amp; Area Surcharges</h2>
                    <p className="text-xs text-slate-400">Configure base-level material items and regional allowance surcharges</p>
                  </div>
                </div>
                <button 
                  onClick={() => setRatesModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-300 font-bold hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Sub-navigation tabs */}
              <div 
                className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 pb-2 gap-4 overflow-x-auto scrollbar-thin"
              >
                <style dangerouslySetInnerHTML={{__html: `
                  .scrollbar-thin::-webkit-scrollbar {
                    height: 5px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-track {
                    background: #f1f5f9;
                  }
                  .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                  }
                `}} />
                <button
                  onClick={() => setRatesTab("surcharges")}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                    ratesTab === "surcharges"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Specific Area Surcharges (%)
                </button>
                <button
                  onClick={() => setRatesTab("materials")}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                    ratesTab === "materials"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Basic Material Rates (excl. GST)
                </button>
                <button
                  onClick={() => setRatesTab("general")}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                    ratesTab === "general"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  General Allowances &amp; Formulas [EDITABLE]
                </button>
                <button
                  onClick={() => setRatesTab("reference")}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                    ratesTab === "reference"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  General Notes Reference Sheet [READ-ONLY]
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1">
                
                {/* ── TAB A: SURCHARGES ── */}
                {ratesTab === "surcharges" && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                      <span className="text-xl">ℹ️</span>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        These percentages reflect district-wide regional allowances applied over the baseline Schedule of Rates (SSR) for completed items. You can modify the surcharge percentages to reflect your local district requirements.
                      </p>
                    </div>

                    <div className="border border-white/60 rounded-2xl overflow-hidden shadow-sm bg-white/60 backdrop-blur-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider">
                            <th className="p-3.5 w-16 text-center">Ref</th>
                            <th className="p-3.5">Specific Regional Area Name</th>
                            <th className="p-3.5 w-44 text-right">Percentage Increase (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {finalAreaRateIncreases.map(item => (
                            <tr key={item.key} className="hover:bg-slate-50 transition">
                              <td className="p-3 text-center font-bold text-slate-400">{item.key.toUpperCase()}</td>
                              <td className="p-3 text-slate-800 font-semibold">{item.name}</td>
                              <td className="p-3 text-right">
                                <div className="inline-flex items-center gap-1 bg-white/60 shadow-sm border border-slate-200 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={item.percentage}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value);
                                      updateAreaRateIncrease(item.key, isNaN(val) ? 0 : val);
                                    }}
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
                                    className="w-16 text-right focus:outline-none font-bold text-slate-900"
                                  />
                                  <span className="text-slate-400 font-bold">%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── TAB B: BASIC MATERIAL RATES ── */}
                {ratesTab === "materials" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3 flex-1">
                        <span className="text-xl">ℹ️</span>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                          These baseline rates exclude GST and represent average district parameters considered when drafting state SSR completed items. Customize them to fit local district supply metrics.
                        </p>
                      </div>
                      
                      {/* Search Bar */}
                      <div className="w-full sm:w-72 shrink-0 relative">
                        <input
                          type="text"
                          placeholder="Search materials (e.g. Bitumen, Steel)..."
                          value={materialSearch}
                          onChange={e => setMaterialSearch(e.target.value)}
                          className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white/60 font-medium"
                        />
                        {materialSearch && (
                          <button 
                            onClick={() => setMaterialSearch("")}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 font-bold text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="border border-white/60 rounded-2xl overflow-hidden shadow-sm bg-white/60 backdrop-blur-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider">
                            <th className="p-3.5 w-16 text-center">Sr. No.</th>
                            <th className="p-3.5">Material Name</th>
                            <th className="p-3.5">Standard Designation / Metric Unit</th>
                            <th className="p-3.5 w-44 text-right">Basic Rate (Excl. GST)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredMaterialRates.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="p-8 text-center text-slate-400 italic">
                                No material rates found matching &quot;{materialSearch}&quot;.
                              </td>
                            </tr>
                          ) : (
                            filteredMaterialRates.map(item => (
                              <tr key={item.srNo} className="hover:bg-slate-50 transition">
                                <td className="p-3 text-center text-slate-400 font-bold">{item.srNo}</td>
                                <td className="p-3 text-slate-800 font-bold">{item.name}</td>
                                <td className="p-3 text-slate-500 font-medium">{item.unit}</td>
                                <td className="p-3 text-right">
                                  <div className="inline-flex items-center gap-1 bg-white/60 shadow-sm border border-slate-200 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition">
                                    <span className="text-slate-400 font-bold">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={item.rate}
                                      onChange={e => {
                                        const val = parseFloat(e.target.value);
                                        updateBasicMaterialRate(item.srNo, isNaN(val) ? 0 : val);
                                      }}
                                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
                                      className="w-24 text-right focus:outline-none font-bold text-slate-900"
                                    />
                                    <span className="text-slate-400 text-[10px] font-bold">/-</span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── TAB C: GENERAL ALLOWANCES & FORMULAS (EDITABLE) ── */}
                {ratesTab === "general" && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                      <span className="text-xl">⚙️</span>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        Customize standard baseline parameters and multipliers. These parameters act as baseline parameters across all estimates and rate abstracts.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Box 1: Floor Lift Hikes */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-sm border-b pb-2">
                          <span>🏢</span> Floor Lift Allowances (%)
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">1st Floor Lift Hike:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.01" min="0" value={finalGeneralAllowances.floorFirst} onChange={e => updateGeneralAllowance("floorFirst", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">2nd Floor Lift Hike:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.01" min="0" value={finalGeneralAllowances.floorSecond} onChange={e => updateGeneralAllowance("floorSecond", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">3rd Floor Lift Hike:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.01" min="0" value={finalGeneralAllowances.floorThird} onChange={e => updateGeneralAllowance("floorThird", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">4th Floor Lift Hike:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.01" min="0" value={finalGeneralAllowances.floorFourth} onChange={e => updateGeneralAllowance("floorFourth", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Box 2: Excavation & Foul Conditions */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-amber-700 font-bold text-sm border-b pb-2">
                          <span>⛏️</span> Excavation &amp; Foul Allowances (%)
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">Excavation Depth 3.0m - 4.5m Surcharge:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.1" min="0" value={finalGeneralAllowances.excavation30to45} onChange={e => updateGeneralAllowance("excavation30to45", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">Excavation Depth 4.5m - 6.0m Surcharge:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.1" min="0" value={finalGeneralAllowances.excavation45to60} onChange={e => updateGeneralAllowance("excavation45to60", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t pt-2 mt-2">
                            <label className="text-xs font-semibold text-slate-600">Foul Condition: Excavation Surcharge:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.1" min="0" value={finalGeneralAllowances.foulExcavation} onChange={e => updateGeneralAllowance("foulExcavation", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">Foul Condition: Other Items Surcharge:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.1" min="0" value={finalGeneralAllowances.foulOther} onChange={e => updateGeneralAllowance("foulOther", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Box 3: SCADA & Curing Compounds */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-rose-700 font-bold text-sm border-b pb-2">
                          <span>⚙️</span> SCADA &amp; Curing Allowances
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">SCADA Deduction: Concrete Items:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <span className="text-slate-400 font-bold text-xs">₹</span>
                              <input type="number" min="0" value={finalGeneralAllowances.scadaConcrete} onChange={e => updateGeneralAllowance("scadaConcrete", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 text-[10px] font-bold">/-</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">SCADA Deduction: Bituminous (BT) Items:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <span className="text-slate-400 font-bold text-xs">₹</span>
                              <input type="number" min="0" value={finalGeneralAllowances.scadaBT} onChange={e => updateGeneralAllowance("scadaBT", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 text-[10px] font-bold">/-</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t pt-2 mt-2">
                            <label className="text-xs font-semibold text-slate-600">Modified Curing Compound Hike:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.1" min="0" value={finalGeneralAllowances.curingCompound} onChange={e => updateGeneralAllowance("curingCompound", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Box 4: Royalty Base Breakdown */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm border-b pb-2">
                          <span>💎</span> Royalty Base Parameters (per Cum)
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">Base Mineral Royalty Rate:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <span className="text-slate-400 font-bold text-xs">₹</span>
                              <input type="number" step="0.01" min="0" value={finalGeneralAllowances.royaltyBase} onChange={e => updateGeneralAllowance("royaltyBase", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-20 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 text-[10px] font-bold">/-</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">Royalty Surcharge Rate:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.1" min="0" value={finalGeneralAllowances.royaltySurcharge} onChange={e => updateGeneralAllowance("royaltySurcharge", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">District Mineral Fund (DMF) Surcharge:</label>
                            <div className="flex items-center gap-1 bg-slate-50 border rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border-transparent transition">
                              <input type="number" step="0.1" min="0" value={finalGeneralAllowances.royaltyDMF} onChange={e => updateGeneralAllowance("royaltyDMF", parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }} className="w-16 text-right focus:outline-none font-bold text-slate-900 text-xs" />
                              <span className="text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* ── TAB C: GENERAL NOTES REFERENCE SHEET ── */}
                {ratesTab === "reference" && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
                      <span className="text-xl">📚</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Official baseline engineering coefficients and surcharges from the Nashik PWD State Schedule of Rates (SSR) 2022-2023. These rules are integrated into estimate summaries and PDF generation.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Box 1: Floor Lift Surcharges */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                          <span>🏢</span> Floor Lift Allowances (Completed Items)
                        </div>
                        <p className="text-[11px] text-slate-400">Hike applied over completed item rate per floor:</p>
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <tbody className="divide-y divide-slate-100 bg-slate-50/50 font-semibold">
                              <tr><td className="p-2 text-slate-600">Ground Floor</td><td className="p-2 text-right text-slate-400">Nil (Base Rate)</td></tr>
                              <tr><td className="p-2 text-slate-600">First Floor</td><td className="p-2 text-right text-blue-600">+1.00%</td></tr>
                              <tr><td className="p-2 text-slate-600">Second Floor</td><td className="p-2 text-right text-blue-600">+2.00%</td></tr>
                              <tr><td className="p-2 text-slate-600">Third Floor</td><td className="p-2 text-right text-blue-600">+3.00%</td></tr>
                              <tr><td className="p-2 text-slate-600">Fourth Floor</td><td className="p-2 text-right text-blue-600">+4.00%</td></tr>
                              <tr className="bg-blue-50/30"><td className="p-2 text-slate-500 font-bold text-[10px]" colSpan="2">Above 4th Floor: Rate decided by Superintending Engineer (SE)</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Box 2: Deep Excavation Lift */}
                      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                          <span>⛏️</span> Deep Excavation Surcharges
                        </div>
                        <p className="text-[11px] text-slate-400">Lift allowance applied for building excavation depth:</p>
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <tbody className="divide-y divide-slate-100 bg-slate-50/50 font-semibold">
                              <tr><td className="p-2 text-slate-600">Up to 3.00 metres depth</td><td className="p-2 text-right text-slate-400">Nil (Base Rate)</td></tr>
                              <tr><td className="p-2 text-slate-600">3.00m to 4.50m depth</td><td className="p-2 text-right text-amber-600">+20.00%</td></tr>
                              <tr><td className="p-2 text-slate-600">4.50m to 6.00m depth</td><td className="p-2 text-right text-amber-600">+30.00%</td></tr>
                              <tr className="bg-amber-50/30"><td className="p-2 text-slate-500 font-bold text-[10px]" colSpan="2">Beyond 6.00m depth: Surcharge decided by territorial SE Circle</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Box 3: Foul & Water Conditions */}
                      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                          <span>🌊</span> Work in Severe / Foul Conditions
                        </div>
                        <p className="text-[11px] text-slate-400">Hike over scheduled rate for foul/wet ground levels:</p>
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <tbody className="divide-y divide-slate-100 bg-slate-50/50 font-semibold">
                              <tr><td className="p-2 text-slate-600">Excavation Items (Foul condition)</td><td className="p-2 text-right text-emerald-600">+25.00%</td></tr>
                              <tr><td className="p-2 text-slate-600">Other Items up to Ground/Bed level</td><td className="p-2 text-right text-emerald-600">+5.00%</td></tr>
                              <tr className="bg-emerald-50/30"><td className="p-2 text-slate-500 font-bold text-[10px]" colSpan="2">Requires certification from territorial Executive Engineer (EE)</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Box 4: SCADA & Curing Compounds */}
                      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                          <span>⚙️</span> SCADA &amp; Curing Deductions/Hikes
                        </div>
                        <p className="text-[11px] text-slate-400">SCADA non-adoption rate reductions or compound curing hikes:</p>
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <tbody className="divide-y divide-slate-100 bg-slate-50/50 font-semibold">
                              <tr><td className="p-2 text-slate-600">Deduct SCADA: Concrete items</td><td className="p-2 text-right text-rose-600">- ₹126.00 / cum</td></tr>
                              <tr><td className="p-2 text-slate-600">Deduct SCADA: Bituminous (BT) items</td><td className="p-2 text-right text-rose-600">- ₹63.00 / cum</td></tr>
                              <tr><td className="p-2 text-slate-600">Hike Curing Compound (Modified RCC/PQC)</td><td className="p-2 text-right text-rose-500">+5.00%</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Box 5: Royalty Baselines */}
                      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm space-y-3 md:col-span-2">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                          <span>💎</span> Royalty baseline charges (Nashik Circle PWD SSR)
                        </div>
                        <p className="text-[11px] text-slate-400">Reimbursable baseline rates applied over minor mineral volumes:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border border-slate-100 rounded-xl overflow-hidden">
                            <div className="bg-slate-100 p-2 text-[11px] font-bold text-slate-700 text-center">Sand Royalty: ₹237.37 / cum</div>
                            <table className="w-full text-left text-[10px] border-collapse bg-white font-semibold">
                              <tbody className="divide-y divide-slate-100 p-2">
                                <tr><td className="p-1.5 text-slate-500">Base PWD Royalty Rate</td><td className="p-1.5 text-right text-slate-700">₹211.95 / cum</td></tr>
                                <tr><td className="p-1.5 text-slate-500">Add Surcharge (2%)</td><td className="p-1.5 text-right text-slate-700">₹4.23 / cum</td></tr>
                                <tr><td className="p-1.5 text-slate-500">Add District Mineral Fund (10%)</td><td className="p-1.5 text-right text-slate-700">₹21.19 / cum</td></tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="border border-slate-100 rounded-xl overflow-hidden">
                            <div className="bg-slate-100 p-2 text-[11px] font-bold text-slate-700 text-center">Other Minerals: ₹216.18 / cum</div>
                            <table className="w-full text-left text-[10px] border-collapse bg-white font-semibold">
                              <tbody className="divide-y divide-slate-100">
                                <tr><td className="p-2 text-slate-500">Base PWD Royalty Rate</td><td className="p-2 text-right text-slate-700">₹211.95 / cum</td></tr>
                                <tr><td className="p-2 text-slate-500">Add Surcharge (2%)</td><td className="p-2 text-right text-slate-700">₹4.23 / cum</td></tr>
                                <tr className="bg-rose-50/50"><td className="p-2 text-rose-600 font-bold text-[9px]" colSpan="2">Crushed metal aggregates are finished products and exempt from Royalty.</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="bg-slate-50/80 backdrop-blur-md p-4 border-t border-slate-200 flex items-center justify-between">
                {ratesTab !== "reference" ? (
                  <button
                    onClick={async () => {
                      if (ratesTab === "surcharges") {
                        if (await triggerConfirm("Are you sure you want to reset ALL Specific Area Surcharges to their official PWD SSR baseline defaults? This will not affect other sections.")) {
                          resetAreaRateIncreases();
                        }
                      } else if (ratesTab === "materials") {
                        if (await triggerConfirm("Are you sure you want to reset ALL Basic Material Rates to their official PWD SSR baseline defaults? This will not affect other sections.")) {
                          resetBasicMaterialRates();
                        }
                      } else if (ratesTab === "general") {
                        if (await triggerConfirm("Are you sure you want to reset ALL General Allowances & Royalty baseline parameters to PWD SSR defaults? This will not affect other sections.")) {
                          resetGeneralAllowances();
                        }
                      }
                    }}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer flex items-center gap-1.5 border border-red-200 animate-in fade-in duration-200"
                  >
                    {ratesTab === "surcharges" && "🔄 Reset Surcharges to SSR Default"}
                    {ratesTab === "materials" && "🔄 Reset Material Rates to SSR Default"}
                    {ratesTab === "general" && "🔄 Reset General Allowances to SSR Default"}
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setRatesSaveSuccess(true);
                      setTimeout(() => setRatesSaveSuccess(false), 2000);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    {ratesSaveSuccess ? "✓ Changes Saved!" : "💾 Save Changes"}
                  </button>
                  <button
                    onClick={() => setRatesModalOpen(false)}
                    className="px-6 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition cursor-pointer"
                  >
                    Save &amp; Close Sheet
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ── MODAL 4: ESTIMATE DETAILS PROFILES WORKSPACE ── */}
        {/* ========================================================================= */}
        {detailsModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl w-full max-w-4xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden flex flex-col my-4 max-h-[90vh] animate-in fade-in zoom-in duration-200">
              
              {/* Header */}
              <div className="bg-slate-950 text-white p-6 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">📋</div>
                  <div>
                    <h2 className="text-xl font-bold">Estimate Details Profiles Hub</h2>
                    <p className="text-xs text-slate-400">Manage autofill profile templates for new estimate details</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDetailsModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-300 font-bold hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-xl">ℹ️</span>
                  <p className="text-xs text-purple-800 leading-relaxed">
                    These templates allow you to pre-fill standard administrative parameters (District, Taluka, Engineer Names, and Divisions) instantly when creating new estimates. Any blank fields in a profile will be imported as blank.
                  </p>
                </div>

                {activeProfileIdToEdit !== null ? (
                  /* Form View for Adding / Editing Profile */
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between border-b pb-3 mb-4">
                      <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                        {activeProfileIdToEdit === "new" ? "➕ Create New Details Profile" : "✏️ Edit Details Profile"}
                      </h3>
                      <button
                        onClick={() => setActiveProfileIdToEdit(null)}
                        className="text-xs font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                      >
                        ← Back to Profiles List
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      {/* Profile Name */}
                      <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Profile Name (Template Label) *</label>
                        <input
                          type="text"
                          placeholder="e.g. Igatpuri Roads Standard Template..."
                          value={formProfileName}
                          onChange={(e) => setFormProfileName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Estimate Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estimate Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Igatpuri Road Repair Work"
                          value={formEstimateName}
                          onChange={(e) => setFormEstimateName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Name of Work */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Name of Work</label>
                        <input
                          type="text"
                          placeholder="e.g. Metalling and Tarring of Road"
                          value={formNameOfWork}
                          onChange={(e) => setFormNameOfWork(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Yojana / Fund */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Yojana / Fund</label>
                        <input
                          type="text"
                          placeholder="e.g. DPDC Scheme 2024-25"
                          value={formYojana}
                          onChange={(e) => setFormYojana(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Area Type Surcharge Selector */}
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estimate Area Type &amp; Tribal %</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setFormIsTribal(false); setFormTribalPercent(""); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              !formIsTribal ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Non-Tribal
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormIsTribal(true)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              formIsTribal ? "bg-orange-500 border-orange-500 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Tribal
                          </button>
                          {formIsTribal && (
                            <div className="flex-1 relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Tribal %"
                                value={formTribalPercent}
                                onChange={(e) => setFormTribalPercent(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                                className="w-full border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                              />
                              <span className="absolute right-3 top-2 text-xs font-bold text-orange-500">%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Est. Amount */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Est. Amount (₹)</label>
                        <input
                          type="number"
                          placeholder="Estimated cost"
                          value={formEstAmount}
                          onChange={(e) => setFormEstAmount(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Labour Insurance */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Labour Insurance (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 1.00"
                          value={formLabourInsurance}
                          onChange={(e) => setFormLabourInsurance(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Year */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Year</label>
                        <input
                          type="text"
                          placeholder="e.g. 2024-25"
                          value={formYear}
                          onChange={(e) => setFormYear(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Location Grid */}
                      <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">District</label>
                          <input
                            type="text"
                            placeholder="District"
                            value={formDist}
                            onChange={(e) => setFormDist(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                            className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Taluka</label>
                          <input
                            type="text"
                            placeholder="Taluka"
                            value={formTaluka}
                            onChange={(e) => setFormTaluka(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                            className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Village</label>
                          <input
                            type="text"
                            placeholder="Village"
                            value={formVillage}
                            onChange={(e) => setFormVillage(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                            className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                      </div>

                      {/* Head Division */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Head Division</label>
                        <input
                          type="text"
                          placeholder="e.g. Nashik Division"
                          value={formHeadDivision}
                          onChange={(e) => setFormHeadDivision(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Sub-Division */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sub-Division</label>
                        <input
                          type="text"
                          placeholder="e.g. Igatpuri Sub-Division"
                          value={formSubDivision}
                          onChange={(e) => setFormSubDivision(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Deputy Engineer */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Deputy Engineer</label>
                        <input
                          type="text"
                          placeholder="Name of Deputy Engineer"
                          value={formDeputyEngineer}
                          onChange={(e) => setFormDeputyEngineer(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Jr. Engineer */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Jr. Engineer</label>
                        <input
                          type="text"
                          placeholder="Name of Jr. Engineer"
                          value={formJrEngineer}
                          onChange={(e) => setFormJrEngineer(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      {/* Admin Approval No. */}
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Administrative Approval No.</label>
                        <input
                          type="text"
                          placeholder="e.g. AA/2024/XYZ/123"
                          value={formAdminApprovalNo}
                          onChange={(e) => setFormAdminApprovalNo(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveDetailsProfile()}
                          className="w-full border border-slate-200 bg-white/60 shadow-sm rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end border-t pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveProfileIdToEdit(null)}
                        className="px-5 py-2 text-slate-700 bg-slate-200 hover:bg-slate-300 font-bold rounded-xl text-xs active:scale-95 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDetailsProfile}
                        className="px-5 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 transition cursor-pointer"
                      >
                        💾 Save Profile Details
                      </button>
                    </div>
                  </div>
                ) : (
                  /* List View for Saved Profiles */
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saved Details Profiles ({projectDetailsProfiles.length}/50)</h3>
                      <button
                        onClick={handleStartCreateNew}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-md"
                      >
                        ➕ Create New Details Profile
                      </button>
                    </div>

                    {projectDetailsProfiles.length === 0 ? (
                      <div className="text-slate-400 italic text-sm py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                        No Details Profiles saved yet. You can save a profile directly from the &quot;New Estimate&quot; form page or click &quot;Create New Details Profile&quot; above.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                        {projectDetailsProfiles.map((p) => (
                          <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-purple-300 hover:shadow-md transition">
                            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-950">{p.profileName}</span>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleStartEdit(p)}
                                  className="text-xs px-3 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 font-bold transition cursor-pointer"
                                >
                                  ✏️ Edit details
                                </button>
                                <button
                                  onClick={async () => {
                                    if (await triggerConfirm(`Are you sure you want to delete "${p.profileName}"?`)) {
                                      deleteProjectDetailsProfile(p.id);
                                    }
                                  }}
                                  className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 font-bold transition cursor-pointer"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>

                            {/* Profile details grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-slate-600">
                              <div><strong className="text-slate-900 font-semibold">Estimate Name:</strong> {p.estimateName || <span className="text-slate-300 italic">blank</span>}</div>
                              <div><strong className="text-slate-900 font-semibold">Name of Work:</strong> {p.nameOfWork || <span className="text-slate-300 italic">blank</span>}</div>
                              <div><strong className="text-slate-900 font-semibold">Yojana / Fund:</strong> {p.yojana || <span className="text-slate-300 italic">blank</span>}</div>
                              <div><strong className="text-slate-900 font-semibold">Area Type:</strong> {p.isTribal ? `Tribal (${p.tribalPercent}%)` : "Non-Tribal"}</div>
                              <div><strong className="text-slate-900 font-semibold">Est. Amount:</strong> {p.estAmount ? `₹${p.estAmount}` : <span className="text-slate-300 italic">blank</span>}</div>
                              <div><strong className="text-slate-900 font-semibold">Labour Insurance:</strong> {p.labourInsurance ? `${p.labourInsurance}%` : <span className="text-slate-300 italic">blank</span>}</div>
                              <div><strong className="text-slate-900 font-semibold">Year:</strong> {p.year || <span className="text-slate-300 italic">blank</span>}</div>
                              <div><strong className="text-slate-900 font-semibold">Location:</strong> {p.dist || p.taluka || p.village ? `${p.dist || ""}/${p.taluka || ""}/${p.village || ""}` : <span className="text-slate-300 italic">blank</span>}</div>
                              <div><strong className="text-slate-900 font-semibold">Head Division:</strong> {p.headDivision || <span className="text-slate-300 italic">blank</span>}</div>
                              <div><strong className="text-slate-900 font-semibold">Sub-Division:</strong> {p.subDivision || <span className="text-slate-300 italic">blank</span>}</div>
                              <div><strong className="text-slate-900 font-semibold">Deputy Engineer:</strong> {p.deputyEngineer || <span className="text-slate-300 italic">blank</span>}</div>
                              <div><strong className="text-slate-900 font-semibold">Jr. Engineer:</strong> {p.jrEngineer || <span className="text-slate-300 italic">blank</span>}</div>
                              <div className="col-span-2 md:col-span-4"><strong className="text-slate-900 font-semibold">Administrative Approval No:</strong> {p.adminApprovalNo || <span className="text-slate-300 italic">blank</span>}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50/80 backdrop-blur-md p-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setDetailsModalOpen(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition cursor-pointer"
                >
                  Close Hub
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
      <AlertDialog dialog={dialog} />
    </div>
  );
}