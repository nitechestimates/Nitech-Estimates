"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Helper for formatting currency
const formatMoney = (num) => (num || 0).toFixed(2);

export default function BillingDashboard() {
  const params = useParams();
  const router = useRouter();
  const estimateId = params.id;

  // React state for billing and estimate
  const [billing, setBilling] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("front"); // "front", "certs", "excess"
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("success");
  
  // Custom dialogs
  const [alertInfo, setAlertInfo] = useState(null);

  // Fetch billing and estimate records on mount
  useEffect(() => {
    if (!estimateId) return;

    setLoading(true);
    const fetchData = async () => {
      try {
        // Fetch original estimate
        const estRes = await fetch(`/api/estimate/${estimateId}`);
        if (!estRes.ok) throw new Error("Failed to load estimate");
        const estData = await estRes.json();
        setEstimate(estData.data);

        // Fetch billing
        const billRes = await fetch(`/api/billing/${estimateId}`);
        if (!billRes.ok) throw new Error("Failed to load billing");
        const billData = await billRes.json();
        setBilling(billData.data);
      } catch (err) {
        console.error(err);
        setAlertInfo({ title: "Error", message: "Failed to load billing details. Redirecting..." });
        setTimeout(() => router.push("/estimate-builder/history"), 3000);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [estimateId, router]);

  // Handler for deep manual save
  const handleSave = async (showToast = true) => {
    if (!billing) return;
    setSaving(true);
    if (showToast) {
      setToastType("saving");
      setToastVisible(true);
    }
    try {
      const response = await fetch(`/api/billing/${estimateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          measurementItems: billing.measurementItems,
          abstractCustomData: billing.abstractCustomData,
          extraBillingData: billing.extraBillingData,
        }),
      });

      if (response.ok) {
        if (showToast) {
          setToastType("success");
          setTimeout(() => setToastVisible(false), 2000);
        }
      } else {
        alert("Failed to save changes.");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Network error — could not save.");
    } finally {
      setSaving(false);
    }
  };

  // Trigger PDF Generation download
  const handleDownloadPDF = async () => {
    if (!billing || !estimate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/billing/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingData: billing,
          estimateData: estimate,
        }),
      });

      if (!res.ok) throw new Error("PDF generation failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bill_${(billing.extraBillingData?.nameOfWork || estimate.nameOfWork || "Work").replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF.");
    } finally {
      setSaving(false);
    }
  };

  // Recalculates total quantities on measurement updates
  const recalcItemTotal = (item) => {
    const sum = (Array.isArray(item?.measurements) ? item.measurements : []).reduce((sum, m) => sum + (m?.total || 0), 0);
    if (item?.usePercent && item?.percentValue !== undefined) {
      return (sum * (parseFloat(item.percentValue) || 0)) / 100;
    }
    return sum;
  };

  // Measurement Sheet operations
  const updateMeasurementField = (itemIdx, measIdx, field, value) => {
    if (!billing) return;
    const updatedItems = [...billing.measurementItems];
    const item = { ...updatedItems[itemIdx] };
    const measurements = [...(item.measurements || [])];
    
    measurements[measIdx] = { ...measurements[measIdx], [field]: value };
    
    // Recalculate row factors multiplication
    const getVal = (val) => (val === "" || val === null || val === undefined || isNaN(val)) ? null : parseFloat(val);
    const noVal = getVal(measurements[measIdx].no), lVal = getVal(measurements[measIdx].l), bVal = getVal(measurements[measIdx].b), hVal = getVal(measurements[measIdx].h);
    const factors = [noVal, lVal, bVal, hVal].filter(v => v !== null);
    measurements[measIdx].total = factors.length === 0 ? 0 : factors.reduce((acc, curr) => acc * curr, 1);
    
    item.measurements = measurements;
    item.totalQty = recalcItemTotal(item);
    updatedItems[itemIdx] = item;
    
    setBilling({ ...billing, measurementItems: updatedItems });
  };

  const addMeasurementRow = (itemIdx) => {
    if (!billing) return;
    const updatedItems = [...billing.measurementItems];
    const item = { ...updatedItems[itemIdx] };
    item.measurements = [...(item.measurements || []), { id: Date.now() + Math.random(), no: "", l: "", b: "", h: "", total: 0 }];
    item.totalQty = recalcItemTotal(item);
    updatedItems[itemIdx] = item;
    setBilling({ ...billing, measurementItems: updatedItems });
  };

  const duplicateMeasurementRow = (itemIdx, measIdx) => {
    if (!billing) return;
    const updatedItems = [...billing.measurementItems];
    const item = { ...updatedItems[itemIdx] };
    const measurements = [...(item.measurements || [])];
    const source = measurements[measIdx];
    if (!source) return;

    const newRow = {
      id: Date.now() + Math.random(),
      description: source.description || "",
      no: source.no,
      l: source.l,
      b: source.b,
      h: source.h,
      total: source.total || 0,
    };
    
    measurements.splice(measIdx + 1, 0, newRow);
    item.measurements = measurements;
    item.totalQty = recalcItemTotal(item);
    updatedItems[itemIdx] = item;
    setBilling({ ...billing, measurementItems: updatedItems });
  };

  const removeMeasurementRow = (itemIdx, measIdx) => {
    if (!billing || !confirm("Delete this measurement row?")) return;
    const updatedItems = [...billing.measurementItems];
    const item = { ...updatedItems[itemIdx] };
    const measurements = [...(item.measurements || [])];
    measurements.splice(measIdx, 1);
    item.measurements = measurements;
    item.totalQty = recalcItemTotal(item);
    updatedItems[itemIdx] = item;
    setBilling({ ...billing, measurementItems: updatedItems });
  };

  const updateItemPercentFlag = (itemIdx, usePercent, val) => {
    if (!billing) return;
    const updatedItems = [...billing.measurementItems];
    const item = { ...updatedItems[itemIdx] };
    item.usePercent = usePercent;
    if (val !== undefined) item.percentValue = val;
    item.totalQty = recalcItemTotal(item);
    updatedItems[itemIdx] = item;
    setBilling({ ...billing, measurementItems: updatedItems });
  };

  const updateItemDescription = (itemIdx, val) => {
    if (!billing) return;
    const updatedItems = [...billing.measurementItems];
    updatedItems[itemIdx] = { ...updatedItems[itemIdx], description: val };
    setBilling({ ...billing, measurementItems: updatedItems });
  };

  // Reset & Clear Operations
  const handleResetRow = (itemIdx) => {
    if (!billing || !confirm("Reset this item to the estimate's original measurements?")) return;
    const itemId = billing.measurementItems[itemIdx].id;
    const original = (billing.originalMeasurementItems || []).find(x => x.id === itemId);
    if (!original) {
      alert("No original measurement data found for this item.");
      return;
    }
    const updatedItems = [...billing.measurementItems];
    updatedItems[itemIdx] = JSON.parse(JSON.stringify(original));
    setBilling({ ...billing, measurementItems: updatedItems });
  };

  const handleResetAllRows = () => {
    if (!billing || !confirm("WARNING: This will reset ALL billing measurements back to the original estimate's values. Are you sure?")) return;
    const restored = JSON.parse(JSON.stringify(billing.originalMeasurementItems || []));
    setBilling({ ...billing, measurementItems: restored });
  };

  const handleClearAllRows = () => {
    if (!billing || !confirm("WARNING: This will clear all measurements and make them blank (Dashes). Are you sure?")) return;
    const cleared = billing.measurementItems.map(item => ({
      ...item,
      measurements: [],
      totalQty: 0,
      usePercent: false,
    }));
    setBilling({ ...billing, measurementItems: cleared });
  };

  // Extra Billing form updates
  const updateExtraField = (field, value) => {
    if (!billing) return;
    setBilling({
      ...billing,
      extraBillingData: {
        ...(billing.extraBillingData || {}),
        [field]: value,
      },
    });
  };

  // Abstract Custom Rates / Reduced Rates updates
  const updateBillingRate = (itemId, val) => {
    if (!billing) return;
    const currentCustom = { ...(billing.abstractCustomData || {}) };
    currentCustom[itemId] = {
      ...(currentCustom[itemId] || {}),
      rate: val,
    };
    setBilling({ ...billing, abstractCustomData: currentCustom });
  };

  const updateReducedRateCheckbox = (itemId, val) => {
    if (!billing) return;
    const currentCustom = { ...(billing.abstractCustomData || {}) };
    currentCustom[itemId] = {
      ...(currentCustom[itemId] || {}),
      useReducedRate: val,
    };
    setBilling({ ...billing, abstractCustomData: currentCustom });
  };

  const updateReducedRateValue = (itemId, val) => {
    if (!billing) return;
    const currentCustom = { ...(billing.abstractCustomData || {}) };
    currentCustom[itemId] = {
      ...(currentCustom[itemId] || {}),
      reducedRate: val,
    };
    setBilling({ ...billing, abstractCustomData: currentCustom });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-800">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="font-extrabold tracking-tight">Loading Billing Session...</span>
      </div>
    );
  }

  if (!billing || !estimate) return null;

  // Process and compute totals
  const extra = billing.extraBillingData || {};
  const msMap = new Map((billing.measurementItems || []).map(x => [x.id, x]));
  const msOrigMap = new Map((billing.originalMeasurementItems || []).map(x => [x.id, x]));
  const abstractCustom = billing.abstractCustomData || {};

  const billingAbstractRows = (estimate.rows || []).map((raItem, idx) => {
    const msItem = msMap.get(raItem.id);
    const executedQty = msItem?.totalQty || 0;
    
    const custom = abstractCustom[raItem.id] || {};
    const useReducedRate = custom.useReducedRate || false;
    const reducedRateVal = custom.reducedRate !== undefined && custom.reducedRate !== "" ? parseFloat(custom.reducedRate) : null;
    
    const baseEstimateRate = raItem.netTotal || raItem.netAfterDeduct || 0;
    const customBillingRate = custom.rate !== undefined && custom.rate !== "" ? parseFloat(custom.rate) : baseEstimateRate;
    
    const activeRate = useReducedRate && reducedRateVal !== null ? reducedRateVal : customBillingRate;
    const executedAmount = executedQty * activeRate;

    // Tender comparison details
    const origMs = msOrigMap.get(raItem.id);
    const tenderQty = origMs?.totalQty || 0;
    const tenderRate = baseEstimateRate;
    const tenderAmount = tenderQty * tenderRate;

    return {
      id: raItem.id,
      srNo: idx + 1,
      description: raItem.description,
      specs: raItem.specs || "",
      unit: raItem.unit,
      isRoyalty: raItem.isRoyalty,
      // Tender
      tenderQty,
      tenderRate,
      tenderAmount,
      // Executed
      executedQty,
      executedRate: activeRate,
      executedAmount,
      useReducedRate,
      reducedRate: custom.reducedRate !== undefined ? custom.reducedRate : "",
      baseRate: custom.rate !== undefined ? custom.rate : "",
      baseCalculatedRate: baseEstimateRate,
    };
  });

  const standardRows = billingAbstractRows.filter(r => !r.isRoyalty);
  const royaltyRows = billingAbstractRows.filter(r => r.isRoyalty);

  // Executed totals
  const executedStandardTotal = standardRows.reduce((sum, r) => sum + r.executedAmount, 0);
  const gstAmount = (executedStandardTotal * 18) / 100;
  
  let insuranceRate = 0.5;
  if (estimate.labourInsurance && !isNaN(parseFloat(estimate.labourInsurance))) {
    insuranceRate = parseFloat(estimate.labourInsurance);
  } else {
    insuranceRate = executedStandardTotal > 2500000 ? 1.0 : 0.5;
  }
  const insuranceAmount = (executedStandardTotal * insuranceRate) / 100;
  const executedSubtotal = executedStandardTotal + gstAmount + insuranceAmount;
  const executedRoyaltyTotal = royaltyRows.reduce((sum, r) => sum + r.executedAmount, 0);
  const executedGrandTotal = executedSubtotal + executedRoyaltyTotal;

  // Tender totals
  const tenderStandardTotal = standardRows.reduce((sum, r) => sum + r.tenderAmount, 0);
  const tenderGst = (tenderStandardTotal * 18) / 100;
  const tenderInsurance = (tenderStandardTotal * insuranceRate) / 100;
  const tenderSubtotal = tenderStandardTotal + tenderGst + tenderInsurance;
  const tenderRoyaltyTotal = royaltyRows.reduce((sum, r) => sum + r.tenderAmount, 0);
  const tenderGrandTotal = tenderSubtotal + tenderRoyaltyTotal;

  return (
    <div className="p-4 bg-slate-50 min-h-screen text-slate-900 animate-fade-in-up">
      {/* Toast Alert */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <div className="bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          {toastType === "saving" ? (
            <>
              <svg className="animate-spin h-4 w-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>Saving billing changes...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              <span>Saved successfully</span>
            </>
          )}
        </div>
      </div>

      {/* Header Panel */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 text-xs font-black uppercase px-2.5 py-1 rounded-md border border-blue-200">
              Billing Mode
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {extra.nameOfWork || estimate.nameOfWork}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Isolated Billing Editor — changes do not affect original estimate.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.push(`/estimate-builder/abstract`)}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            ← Back to Estimate Builder
          </button>
          <button
            onClick={() => router.push(`/estimate-builder/billing/${estimateId}/mb`)}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer"
          >
            📒 Measurement Book (MB)
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            Save Bill Changes
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            🖨️ Generate Billing PDF
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto border-b border-slate-300 mb-6 pb-2">
        {[
          { key: "front", label: "📄 Bill Front (Form 58A)" },
          { key: "certs", label: "📋 Certificates & Memo" },
          { key: "excess", label: "📊 Excess & Saving" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              handleSave(false); // Silent save on tab change
            }}
            className={`px-4 py-2 text-sm font-extrabold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === t.key
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Dynamic Tab Panels */}
        
        {/* TAB 1: FRONT PAGE FORM */}
        {activeTab === "front" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-fade-in-up">
            <h2 className="text-lg font-black text-slate-800 border-b pb-2 mb-4">Z.P. Form No. 58 (A) Cover details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Agency Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Agency / Contractor Name</label>
                <input
                  type="text"
                  value={extra.agencyName || ""}
                  onChange={(e) => updateExtraField("agencyName", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Agency Name"
                />
              </div>

              {/* Agreement Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Agreement Reference No</label>
                <input
                  type="text"
                  value={extra.agreementRef || ""}
                  onChange={(e) => updateExtraField("agreementRef", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. No. Z.P.N./W.D./B.&.C./3/2025"
                />
              </div>

              {/* Serial No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Serial No of this Bill</label>
                <input
                  type="text"
                  value={extra.serialNo || ""}
                  onChange={(e) => updateExtraField("serialNo", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. II ND Final Bill"
                />
              </div>

              {/* Bill Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Bill Date</label>
                <input
                  type="text"
                  value={extra.date || ""}
                  onChange={(e) => updateExtraField("date", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Commencement Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Commence Date</label>
                <input
                  type="text"
                  value={extra.commenceDate || ""}
                  onChange={(e) => updateExtraField("commenceDate", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Due Date for Completion</label>
                <input
                  type="text"
                  value={extra.dueDate || ""}
                  onChange={(e) => updateExtraField("dueDate", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Actual Completion */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Actual Date of Completion</label>
                <input
                  type="text"
                  value={extra.completionDate || ""}
                  onChange={(e) => updateExtraField("completionDate", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {/* Extensions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Extensions Granted</label>
                <input
                  type="text"
                  value={extra.extensions || ""}
                  onChange={(e) => updateExtraField("extensions", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 3 Months / NIL"
                />
              </div>

              {/* Deduct Previous Bill */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Deduct Previous Bill Amount (₹)</label>
                <input
                  type="number"
                  value={extra.deductPreviousBill || ""}
                  onChange={(e) => updateExtraField("deductPreviousBill", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>

            <h3 className="text-sm font-black text-slate-800 border-b pb-2 mt-8 mb-4">Security Deposit Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">SD as per Agreement</label>
                <input
                  type="text"
                  value={extra.sdAsPerAgreement || ""}
                  onChange={(e) => updateExtraField("sdAsPerAgreement", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">SD Previously recovered</label>
                <input
                  type="text"
                  value={extra.sdPreviouslyRecovered || ""}
                  onChange={(e) => updateExtraField("sdPreviouslyRecovered", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">SD to be recovered from this bill</label>
                <input
                  type="text"
                  value={extra.sdToBeRecovered || ""}
                  onChange={(e) => updateExtraField("sdToBeRecovered", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">SD Balance to recover</label>
                <input
                  type="text"
                  value={extra.sdBalanceToRecover || ""}
                  onChange={(e) => updateExtraField("sdBalanceToRecover", e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50/50 px-4 py-2.5 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB: CERTIFICATES */}
        {activeTab === "certs" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-fade-in-up flex flex-col gap-8">
            {/* Form 65 Completion Cert */}
            <div className="border border-slate-200 p-6 rounded-2xl bg-slate-50/50">
              <h3 className="text-base font-black text-slate-800 mb-4 border-b pb-2">FORM NO. 65 Completion Certificate</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Sectional Engineer Name (Z.P. Form 65)</label>
                  <input
                    type="text"
                    value={extra.sectionalEngineerName || ""}
                    onChange={(e) => updateExtraField("sectionalEngineerName", e.target.value)}
                    className="w-full border border-slate-300 bg-white px-4 py-2.5 rounded-xl text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Deputy Engineer Name (Z.P. Form 65)</label>
                  <input
                    type="text"
                    value={extra.deputyEngineerName || ""}
                    onChange={(e) => updateExtraField("deputyEngineerName", e.target.value)}
                    className="w-full border border-slate-300 bg-white px-4 py-2.5 rounded-xl text-slate-900 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Photo frame attachment */}
            <div className="border border-slate-200 p-6 rounded-2xl bg-slate-50/50">
              <h3 className="text-base font-black text-slate-800 mb-4 border-b pb-2">Work Photo Settings</h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Work Photo URL or Base64 String</label>
                <input
                  type="text"
                  value={extra.workPhoto || ""}
                  onChange={(e) => updateExtraField("workPhoto", e.target.value)}
                  className="w-full border border-slate-300 bg-white px-4 py-2.5 rounded-xl text-slate-900 font-mono text-xs mb-4"
                  placeholder="Paste URL or Base64 data:image/png;base64,... here"
                />
                {extra.workPhoto && (
                  <div className="w-64 h-48 border rounded-lg overflow-hidden flex items-center justify-center bg-white shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={extra.workPhoto} className="max-w-full max-height-full object-contain" alt="Work Photo Preview" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: EXCESS & SAVING STATEMENT */}
        {activeTab === "excess" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-fade-in-up">
            <div className="border-b pb-4 mb-4">
              <h2 className="text-lg font-black text-slate-800">Excess & Saving Statement</h2>
              <p className="text-xs text-slate-500">Live dynamic comparison of original Tender (Estimate) vs. Executed (Billing).</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs bg-white">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 text-center font-bold">
                  <tr>
                    <th className="border p-2" rowSpan={2}>Item No</th>
                    <th className="border p-2" rowSpan={2}>Description</th>
                    <th className="border p-2" colSpan={3}>TENDER (Estimate original)</th>
                    <th className="border p-2" colSpan={3}>EXECUTED (Billing current)</th>
                    <th className="border p-2" rowSpan={2}>Excess / Saving Amount (₹)</th>
                    <th className="border p-2" rowSpan={2}>Remarks</th>
                  </tr>
                  <tr>
                    <th className="border p-1.5">Qty</th>
                    <th className="border p-1.5">Rate</th>
                    <th className="border p-1.5">Amount</th>
                    <th className="border p-1.5">Qty</th>
                    <th className="border p-1.5">Rate</th>
                    <th className="border p-1.5">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {billingAbstractRows.map((row) => {
                    const diff = row.executedAmount - row.tenderAmount;
                    const color = diff < 0 ? "text-green-700 bg-green-50/30" : diff > 0 ? "text-red-700 bg-red-50/30" : "text-slate-800";
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="border p-2 text-center font-bold text-slate-700">{row.srNo}</td>
                        <td className="border p-2 text-left leading-relaxed">{row.description}</td>
                        <td className="border p-2 text-right">{row.tenderQty.toFixed(3)}</td>
                        <td className="border p-2 text-right">₹{row.tenderRate.toFixed(2)}</td>
                        <td className="border p-2 text-right font-semibold">₹{row.tenderAmount.toFixed(2)}</td>
                        <td className="border p-2 text-right font-semibold">{row.executedQty.toFixed(3)}</td>
                        <td className="border p-2 text-right">₹{row.executedRate.toFixed(2)}</td>
                        <td className="border p-2 text-right font-black">₹{row.executedAmount.toFixed(2)}</td>
                        <td className={`border p-2 text-right font-black ${color}`}>
                          {diff === 0 ? "₹0.00" : (diff > 0 ? "+ " : "- ") + "₹" + Math.abs(diff).toFixed(2)}
                        </td>
                        <td className={`border p-2 text-center font-extrabold uppercase tracking-wider text-[9px] ${color}`}>
                          {diff === 0 ? "No Change" : diff < 0 ? "Saving" : "Excess"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={2} className="border p-3 text-right">GRAND TOTAL VALUE COMPARISON:</td>
                    <td colSpan={2}></td>
                    <td className="border p-3 text-right font-black text-blue-300">₹{tenderGrandTotal.toFixed(2)}</td>
                    <td colSpan={2}></td>
                    <td className="border p-3 text-right font-black text-emerald-300 font-mono">₹{executedGrandTotal.toFixed(2)}</td>
                    <td className={`border p-3 text-right font-black text-sm ${executedGrandTotal - tenderGrandTotal < 0 ? "text-green-400" : "text-red-400"}`}>
                      {(executedGrandTotal - tenderGrandTotal < 0 ? "- " : "+ ") + "₹" + Math.abs(executedGrandTotal - tenderGrandTotal).toFixed(2)}
                    </td>
                    <td className="border p-3 text-center uppercase font-black text-[10px]">
                      {executedGrandTotal - tenderGrandTotal < 0 ? "Net Saving" : "Net Excess"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Custom alert modal */}
      {alertInfo && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2 text-slate-950 font-extrabold text-base mb-2">
              ⚠️ {alertInfo.title}
            </div>
            <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-6">
              {alertInfo.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
