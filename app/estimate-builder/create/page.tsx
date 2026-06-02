"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { ProjectDetailsProfile, StoreState } from "@/lib/store";

const inputCls = "w-full border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 text-sm";
const labelCls = "block text-sm font-semibold text-gray-700 mb-2";

export default function CreateEstimate() {
  const router = useRouter();
  const [estimateName, setEstimateName] = useState("");
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
  const [headDivision, setHeadDivision] = useState("");
  const [subDivision, setSubDivision] = useState("");
  const [deputyEngineer, setDeputyEngineer] = useState("");
  const [jrEngineer, setJrEngineer] = useState("");
  const [adminApprovalNo, setAdminApprovalNo] = useState("");
  const [customAlert, setCustomAlert] = useState<{ message: string; title: string } | null>(null);
  const [saveProfileName, setSaveProfileName] = useState("");

  const triggerAlert = (message: string, title: string = "Notification") => {
    setCustomAlert({ message, title });
  };

  const yojanaList = useStore((state: StoreState) => state.yojanaList);
  const addYojana = useStore((state: StoreState) => state.addYojana);
  const resetEstimate = useStore((state: StoreState) => state.resetEstimate);
  const projectDetailsProfiles: ProjectDetailsProfile[] = useStore((state: StoreState) => state.projectDetailsProfiles) ?? [];
  const addProjectDetailsProfile = useStore((state: StoreState) => state.addProjectDetailsProfile);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = yojanaList.filter((item: string) =>
    item.toLowerCase().includes(yojana.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTribalPercentChange = (val: string) => {
    setTribalPercent(val);
    if (val === "0" || val === "") setIsTribal(false);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      triggerAlert("Please enter a Name of Work before continuing.", "Missing Name of Work");
      return;
    }

    if (yojana.trim() && !yojanaList.includes(yojana.trim())) {
      addYojana(yojana.trim());
    }

    resetEstimate();

    const params = new URLSearchParams();
    if (estimateName.trim()) params.set("estimateName", estimateName.trim());
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
    if (headDivision.trim()) params.set("headDivision", headDivision.trim());
    if (subDivision.trim()) params.set("subDivision", subDivision.trim());
    if (deputyEngineer.trim()) params.set("deputyEngineer", deputyEngineer.trim());
    if (jrEngineer.trim()) params.set("jrEngineer", jrEngineer.trim());
    if (adminApprovalNo.trim()) params.set("adminApprovalNo", adminApprovalNo.trim());

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

        {/* Quick Import Autofill Profile */}
        {projectDetailsProfiles && projectDetailsProfiles.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">📂 Quick Autofill from Profile</label>
            <select
              onChange={(e) => {
                const profId = e.target.value;
                if (!profId) return;
                const p = projectDetailsProfiles.find(x => x.id === profId);
                if (p) {
                  setEstimateName(p.estimateName || "");
                  setName(p.nameOfWork || "");
                  setIsTribal(!!p.isTribal);
                  setTribalPercent(p.tribalPercent || "");
                  setYojana(p.yojana || "");
                  setEstAmount(p.estAmount || "");
                  setLabourInsurance(p.labourInsurance || "");
                  setYear(p.year || "");
                  setDist(p.dist || "");
                  setTaluka(p.taluka || "");
                  setVillage(p.village || "");
                  setHeadDivision(p.headDivision || "");
                  setSubDivision(p.subDivision || "");
                  setDeputyEngineer(p.deputyEngineer || "");
                  setJrEngineer(p.jrEngineer || "");
                  setAdminApprovalNo(p.adminApprovalNo || "");
                }
              }}
              className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-900"
            >
              <option value="">-- Choose a Profile to Autofill --</option>
              {projectDetailsProfiles.map((p: ProjectDetailsProfile) => (
                <option key={p.id} value={p.id}>{p.profileName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Estimate Name (display name for history) */}
        <div className="mb-4">
          <label className={labelCls}>
            Estimate Name <span className="text-gray-400 font-normal text-xs">(shown in history)</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Phase 1 – Bridge Estimate"
            value={estimateName}
            onChange={(e) => setEstimateName(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Name of Work */}
        <div className="mb-4">
          <label className={labelCls}>Name of Work</label>
          <input
            id="name-input"
            type="text"
            placeholder="e.g., Construction of Road Phase 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className={inputCls}
          />
        </div>

        {/* Yojana / Fund */}
        <div className="mb-5 relative" ref={dropdownRef}>
          <label className={labelCls}>Yojana / Fund</label>
          <input
            type="text"
            placeholder="Select or type new"
            value={yojana}
            onChange={(e) => { setYojana(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            className={inputCls}
          />
          {showDropdown && filteredSuggestions.length > 0 && (
            <ul className="absolute z-10 bg-white border border-gray-200 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredSuggestions.map((suggestion: string) => (
                <li
                  key={suggestion}
                  onClick={() => { setYojana(suggestion); setShowDropdown(false); }}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-left text-gray-800 text-sm"
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

        {/* Tribal / Non-Tribal */}
        <div className="mb-5">
          <label className={labelCls}>Estimate Area Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setIsTribal(false); setTribalPercent(""); }}
              className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                !isTribal ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {!isTribal && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </span>
              )}
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-sm font-semibold">Non-Tribal</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTribal(true)}
              className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                isTribal ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {isTribal && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </span>
              )}
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
              <span className="text-sm font-semibold">Tribal</span>
            </button>
          </div>

          <div className={`mt-3 overflow-hidden transition-all duration-300 ${isTribal ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tribal Percentage <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number" min="0" max="100"
                placeholder="Enter tribal %"
                value={tribalPercent}
                disabled={!isTribal}
                onChange={(e) => handleTribalPercentChange(e.target.value)}
                className="w-full border border-orange-300 bg-orange-50 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-900 pr-10 disabled:opacity-50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold text-sm">%</span>
            </div>
            <p className="text-xs text-orange-500 mt-1">Setting to 0 will auto-switch to Non-Tribal.</p>
          </div>
        </div>

        {/* Est. Amount */}
        <div className="mb-4">
          <label className={labelCls}>Est. Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
            <input type="number" min="0" placeholder="Estimated amount" value={estAmount}
              onChange={(e) => setEstAmount(e.target.value)}
              className="w-full border border-gray-300 pl-8 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 text-sm" />
          </div>
        </div>

        {/* Labour Insurance */}
        <div className="mb-4">
          <label className={labelCls}>Labour Insurance (%)</label>
          <div className="relative">
            <input type="number" min="0" max="100" step="0.01" placeholder="Labour insurance %" value={labourInsurance}
              onChange={(e) => setLabourInsurance(e.target.value)}
              className={`${inputCls} pr-10`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">%</span>
          </div>
        </div>

        {/* Year */}
        <div className="mb-4">
          <label className={labelCls}>Year</label>
          <input type="text" placeholder="e.g., 2024-25" value={year}
            onChange={(e) => setYear(e.target.value)} className={inputCls} />
        </div>

        {/* Dist / Taluka / Village */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Dist.</label>
            <input type="text" placeholder="District" value={dist} onChange={(e) => setDist(e.target.value)}
              className="w-full border border-gray-300 px-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 text-sm" />
          </div>
          <div>
            <label className={labelCls}>Taluka</label>
            <input type="text" placeholder="Taluka" value={taluka} onChange={(e) => setTaluka(e.target.value)}
              className="w-full border border-gray-300 px-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 text-sm" />
          </div>
          <div>
            <label className={labelCls}>Village</label>
            <input type="text" placeholder="Village" value={village} onChange={(e) => setVillage(e.target.value)}
              className="w-full border border-gray-300 px-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 text-sm" />
          </div>
        </div>

        {/* Head Division */}
        <div className="mb-4">
          <label className={labelCls}>Name of Head Division</label>
          <input type="text" placeholder="e.g., Nashik Division" value={headDivision}
            onChange={(e) => setHeadDivision(e.target.value)} className={inputCls} />
        </div>

        {/* Sub-Division */}
        <div className="mb-4">
          <label className={labelCls}>Name of Sub-Division</label>
          <input type="text" placeholder="e.g., Igatpuri Sub-Division" value={subDivision}
            onChange={(e) => setSubDivision(e.target.value)} className={inputCls} />
        </div>

        {/* Deputy Engineer */}
        <div className="mb-4">
          <label className={labelCls}>Name of Deputy Engineer</label>
          <input type="text" placeholder="Name of Deputy Engineer" value={deputyEngineer}
            onChange={(e) => setDeputyEngineer(e.target.value)} className={inputCls} />
        </div>

        {/* Jr. / Sectional Engineer */}
        <div className="mb-4">
          <label className={labelCls}>Name of Jr. / Sectional Engineer</label>
          <input type="text" placeholder="Name of Jr. / Sectional Engineer" value={jrEngineer}
            onChange={(e) => setJrEngineer(e.target.value)} className={inputCls} />
        </div>

        {/* Administrative Approval No. */}
        <div className="mb-8">
          <label className={labelCls}>Administrative Approval No.</label>
          <input type="text" placeholder="e.g., AA/2024/XYZ/123" value={adminApprovalNo}
            onChange={(e) => setAdminApprovalNo(e.target.value)} className={inputCls} />
        </div>

        {/* Save as Profile section */}
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">💾 Save current details as Profile</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Nashik Roads Template..."
              value={saveProfileName}
              onChange={(e) => setSaveProfileName(e.target.value)}
              className="flex-1 border border-slate-300 bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 font-medium"
            />
            <button
              type="button"
              onClick={() => {
                if (!saveProfileName.trim()) {
                  triggerAlert("Please enter a name for the profile.", "Profile Name Required");
                  return;
                }
                if (projectDetailsProfiles.length >= 50) {
                  triggerAlert("Maximum 50 details profiles allowed. Please delete some from the Hub.", "Limit Reached");
                  return;
                }
                addProjectDetailsProfile({
                  profileName: saveProfileName.trim(),
                  estimateName,
                  nameOfWork: name,
                  isTribal,
                  tribalPercent,
                  yojana,
                  estAmount,
                  labourInsurance,
                  year,
                  dist,
                  taluka,
                  village,
                  headDivision,
                  subDivision,
                  deputyEngineer,
                  jrEngineer,
                  adminApprovalNo
                });
                const nameSaved = saveProfileName.trim();
                setSaveProfileName("");
                triggerAlert(`Success! Profile "${nameSaved}" saved. You can quickly select it at the top of this page.`, "Success");
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs active:scale-95 transition cursor-pointer"
            >
              Save
            </button>
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

      {/* ── Custom non-blocking alert dialog ── */}
      {customAlert && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-200 animate-duration-150">
            <div className="flex items-center gap-2 text-slate-950 font-extrabold text-base mb-2 select-none">
              <span>{customAlert.title === "Success" ? "✅" : "⚠️"}</span> {customAlert.title}
            </div>
            <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-6 select-none">
              {customAlert.message}
            </p>
            <button
              onClick={() => {
                setCustomAlert(null);
                setTimeout(() => {
                  const el = document.getElementById("name-input");
                  if (el) el.focus();
                }, 100);
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}