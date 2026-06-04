"use client";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

// ──────────────────────────────────────────────────────────────────
// NumericInput — identical focus-fix pattern used in estimate MS page
// Avoids the Electron alt-tab double-click issue by tracking a local
// "editing" state and never relying on useEffect-driven setState.
// ──────────────────────────────────────────────────────────────────
function NumericInput({ value, onChange, placeholder = "-", className = "" }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef(null);

  const formatted =
    value === "" || value === null || value === undefined
      ? ""
      : Number(value).toFixed(3);
  const displayValue = editing ? editValue : formatted;

  const handleFocus = () => {
    setEditing(true);
    setEditValue(
      value === "" || value === null || value === undefined
        ? ""
        : Number(value).toString()
    );
  };

  const handleChange = (e) => {
    let raw = e.target.value;
    if (raw === "") {
      setEditValue("");
      return;
    }
    raw = raw.replace(/[^0-9.\-]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 3)
      raw = parts[0] + "." + parts[1].slice(0, 3);
    setEditValue(raw);
  };

  const handleBlur = () => {
    setEditing(false);
    if (editValue === "") {
      onChange("");
      return;
    }
    const num = parseFloat(editValue);
    if (isNaN(num)) onChange("");
    else onChange(num);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
}

function LocalTextInput({ value, onChange, className = "", placeholder = "", type = "text", step }) {
  const [localValue, setLocalValue] = useState(value ?? "");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.blur();
    }
  };

  return (
    <input
      type={type}
      step={step}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
}

function LocalTextarea({ value, onChange, className = "", rows }) {
  const [localValue, setLocalValue] = useState(value ?? "");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <textarea
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className={className}
      rows={rows}
    />
  );
}

function LocalPercentInput({ value, onChange, onBlur }) {
  const [localVal, setLocalVal] = useState(value ?? 100);
  useEffect(() => {
    setLocalVal(value ?? 100);
  }, [value]);
  return (
    <input
      type="number"
      min="0"
      max="100"
      step="1"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value === "" ? "" : parseFloat(e.target.value))}
      onBlur={() => {
        if (localVal === "" || isNaN(localVal)) {
          onChange(100);
          onBlur && onBlur(100);
        } else {
          onChange(localVal);
          onBlur && onBlur(localVal);
        }
      }}
      className="w-12 border border-slate-300 rounded text-center px-1 py-0.5 text-xs bg-white text-black"
    />
  );
}

// Helper
const formatMoney = (num) => (num || 0).toFixed(2);

export default function MeasurementBook() {
  const params = useParams();
  const router = useRouter();
  const estimateId = params.id;

  const [billing, setBilling] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("measurements"); // "measurements" | "abstract"
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("success");

  // ── Data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!estimateId) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        const [estRes, billRes] = await Promise.all([
          fetch(`/api/estimate/${estimateId}`),
          fetch(`/api/billing/${estimateId}`),
        ]);
        if (!estRes.ok) throw new Error("Failed to load estimate");
        if (!billRes.ok) throw new Error("Failed to load billing");
        const estData = await estRes.json();
        const billData = await billRes.json();
        setEstimate(estData.data);
        setBilling(billData.data);
      } catch (err) {
        console.error(err);
        router.push(`/estimate-builder/billing/${estimateId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [estimateId, router]);

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = async (showToast = true) => {
    if (!billing) return;
    setSaving(true);
    if (showToast) {
      setToastType("saving");
      setToastVisible(true);
    }
    try {
      const res = await fetch(`/api/billing/${estimateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          measurementItems: billing.measurementItems,
          abstractCustomData: billing.abstractCustomData,
          extraBillingData: billing.extraBillingData,
        }),
      });
      if (res.ok) {
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

  // ── Measurement helpers ───────────────────────────────────────────
  const recalcItemTotal = (item) => {
    const sum = (Array.isArray(item?.measurements) ? item.measurements : []).reduce(
      (s, m) => s + (m?.total || 0),
      0
    );
    if (item?.usePercent && item?.percentValue !== undefined) {
      return (sum * (parseFloat(item.percentValue) || 0)) / 100;
    }
    return sum;
  };

  const updateMeasurementField = (itemIdx, measIdx, field, value) => {
    if (!billing) return;
    const updatedItems = [...billing.measurementItems];
    const item = { ...updatedItems[itemIdx] };
    const measurements = [...(item.measurements || [])];

    measurements[measIdx] = { ...measurements[measIdx], [field]: value };

    const getVal = (v) =>
      v === "" || v === null || v === undefined || isNaN(v) ? null : parseFloat(v);
    const { no, l, b, h } = measurements[measIdx];
    const factors = [getVal(no), getVal(l), getVal(b), getVal(h)].filter((v) => v !== null);
    measurements[measIdx].total =
      factors.length === 0 ? 0 : factors.reduce((acc, cur) => acc * cur, 1);

    item.measurements = measurements;
    item.totalQty = recalcItemTotal(item);
    updatedItems[itemIdx] = item;
    setBilling({ ...billing, measurementItems: updatedItems });
  };

  const addMeasurementRow = (itemIdx) => {
    if (!billing) return;
    const updatedItems = [...billing.measurementItems];
    const item = { ...updatedItems[itemIdx] };
    item.measurements = [
      ...(item.measurements || []),
      { id: Date.now() + Math.random(), no: "", l: "", b: "", h: "", total: 0 },
    ];
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
    measurements.splice(measIdx + 1, 0, {
      id: Date.now() + Math.random(),
      description: source.description || "",
      no: source.no,
      l: source.l,
      b: source.b,
      h: source.h,
      total: source.total || 0,
    });
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

  const handleResetRow = (itemIdx) => {
    if (!billing || !confirm("Reset this item to the estimate's original measurements?")) return;
    const itemId = billing.measurementItems[itemIdx].id;
    const original = (billing.originalMeasurementItems || []).find((x) => x.id === itemId);
    if (!original) {
      alert("No original measurement data found for this item.");
      return;
    }
    const updatedItems = [...billing.measurementItems];
    updatedItems[itemIdx] = structuredClone(original);
    setBilling({ ...billing, measurementItems: updatedItems });
  };

  const handleResetAllRows = () => {
    if (
      !billing ||
      !confirm(
        "WARNING: This will reset ALL billing measurements back to the original estimate's values. Are you sure?"
      )
    )
      return;
    setBilling({ ...billing, measurementItems: structuredClone(billing.originalMeasurementItems || []) });
  };

  const handleClearAllRows = () => {
    if (
      !billing ||
      !confirm("WARNING: This will clear all measurements and make them blank (Dashes). Are you sure?")
    )
      return;
    const cleared = billing.measurementItems.map((item) => ({
      ...item,
      measurements: [],
      totalQty: 0,
      usePercent: false,
    }));
    setBilling({ ...billing, measurementItems: cleared });
  };

  // ── Abstract helpers ──────────────────────────────────────────────
  const updateBillingRate = (itemId, val) => {
    if (!billing) return;
    const currentCustom = { ...(billing.abstractCustomData || {}) };
    currentCustom[itemId] = { ...(currentCustom[itemId] || {}), rate: val };
    setBilling({ ...billing, abstractCustomData: currentCustom });
  };

  const updateReducedRateCheckbox = (itemId, val) => {
    if (!billing) return;
    const currentCustom = { ...(billing.abstractCustomData || {}) };
    currentCustom[itemId] = { ...(currentCustom[itemId] || {}), useReducedRate: val };
    setBilling({ ...billing, abstractCustomData: currentCustom });
  };

  const updateReducedRateValue = (itemId, val) => {
    if (!billing) return;
    const currentCustom = { ...(billing.abstractCustomData || {}) };
    currentCustom[itemId] = { ...(currentCustom[itemId] || {}), reducedRate: val };
    setBilling({ ...billing, abstractCustomData: currentCustom });
  };

  // ── Loading / guard ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-800">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="font-extrabold tracking-tight">Loading Measurement Book...</span>
      </div>
    );
  }

  if (!billing || !estimate) return null;

  // ── Compute abstract rows ─────────────────────────────────────────
  const msMap = new Map((billing.measurementItems || []).map((x) => [x.id, x]));
  const msOrigMap = new Map((billing.originalMeasurementItems || []).map((x) => [x.id, x]));
  const abstractCustom = billing.abstractCustomData || {};

  const billingAbstractRows = (estimate.rows || []).map((raItem, idx) => {
    const msItem = msMap.get(raItem.id);
    const executedQty = msItem?.totalQty || 0;
    const custom = abstractCustom[raItem.id] || {};
    const useReducedRate = custom.useReducedRate || false;
    const reducedRateVal =
      custom.reducedRate !== undefined && custom.reducedRate !== ""
        ? parseFloat(custom.reducedRate)
        : null;
    const baseEstimateRate = raItem.netTotal || raItem.netAfterDeduct || 0;
    const customBillingRate =
      custom.rate !== undefined && custom.rate !== "" ? parseFloat(custom.rate) : baseEstimateRate;
    const activeRate =
      useReducedRate && reducedRateVal !== null ? reducedRateVal : customBillingRate;
    const executedAmount = executedQty * activeRate;

    const origMs = msOrigMap.get(raItem.id);
    const tenderQty = origMs?.totalQty || 0;
    const tenderRate = baseEstimateRate;
    const tenderAmount = tenderQty * tenderRate;

    return {
      id: raItem.id,
      srNo: idx + 1,
      description: raItem.description,
      unit: raItem.unit,
      isRoyalty: raItem.isRoyalty,
      tenderQty,
      tenderRate,
      tenderAmount,
      executedQty,
      executedRate: activeRate,
      executedAmount,
      useReducedRate,
      reducedRate: custom.reducedRate !== undefined ? custom.reducedRate : "",
      baseRate: custom.rate !== undefined ? custom.rate : "",
      baseCalculatedRate: baseEstimateRate,
    };
  });

  const standardRows = billingAbstractRows.filter((r) => !r.isRoyalty);
  const royaltyRows = billingAbstractRows.filter((r) => r.isRoyalty);

  const executedStandardTotal = standardRows.reduce((s, r) => s + r.executedAmount, 0);
  const gstAmount = (executedStandardTotal * 18) / 100;
  let insuranceRate = 0.5;
  if (estimate.labourInsurance && !isNaN(parseFloat(estimate.labourInsurance))) {
    insuranceRate = parseFloat(estimate.labourInsurance);
  } else {
    insuranceRate = executedStandardTotal > 2500000 ? 1.0 : 0.5;
  }
  const insuranceAmount = (executedStandardTotal * insuranceRate) / 100;
  const executedSubtotal = executedStandardTotal + gstAmount + insuranceAmount;
  const executedRoyaltyTotal = royaltyRows.reduce((s, r) => s + r.executedAmount, 0);
  const executedGrandTotal = executedSubtotal + executedRoyaltyTotal;

  const extra = billing.extraBillingData || {};

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="p-4 bg-slate-50 min-h-screen text-slate-900 animate-fade-in-up">
      {/* Toast */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
          toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          {toastType === "saving" ? (
            <>
              <svg className="animate-spin h-4 w-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Saving MB changes...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Saved successfully</span>
            </>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 text-xs font-black uppercase px-2.5 py-1 rounded-md border border-indigo-200">
              📒 Measurement Book
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {extra.nameOfWork || estimate.nameOfWork}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            MB — Billing measurements and abstract. Changes here do not affect the original estimate.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/estimate-builder/billing/${estimateId}`)}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            ← Back to Billing
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            Save MB Changes
          </button>
        </div>
      </div>

      {/* Sub-nav Tabs */}
      <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto border-b border-slate-300 mb-6 pb-2">
        {[
          { key: "measurements", label: "📐 MB Measurements" },
          { key: "abstract", label: "📋 MB Abstract" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              handleSave(false);
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
        {/* ── TAB 1: MEASUREMENTS ───────────────────────────────────── */}
        {activeTab === "measurements" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-fade-in-up">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-800">Billing Measurement Sheet</h2>
                <p className="text-xs text-slate-500">Edit billing measurements (quantities) here.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetAllRows}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl transition active:scale-95 cursor-pointer"
                >
                  Reset All to Original Estimate
                </button>
                <button
                  onClick={handleClearAllRows}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold text-xs rounded-xl transition active:scale-95 cursor-pointer"
                >
                  Clear All measurements (Dashes)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
              <table className="w-full text-sm bg-white">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <tr className="text-center font-bold">
                    <th className="border p-2.5 w-[50px]">Sr. No.</th>
                    <th className="border p-2.5 w-[320px]">DESCRIPTION OF ITEM</th>
                    <th className="border p-2.5 w-[200px]">PARTICULARS</th>
                    <th className="border p-2.5 w-[70px]">No.</th>
                    <th className="border p-2.5 w-[90px]">L.</th>
                    <th className="border p-2.5 w-[90px]">B/W</th>
                    <th className="border p-2.5 w-[90px]">H/D.</th>
                    <th className="border p-2.5 w-[110px]">TOTAL</th>
                    <th className="border p-2.5 w-[70px]">UNIT</th>
                    <th className="border p-2.5 w-[120px]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(billing.measurementItems || []).map((item, itemIdx) => {
                    const measurements = item.measurements || [];
                    const rowSpan = measurements.length > 0 ? measurements.length + 1 : 2;
                    const rawSum = measurements.reduce((s, m) => s + (m.total || 0), 0);

                    return (
                      <React.Fragment key={item.id}>
                        {/* Main Item Row */}
                        <tr className="bg-slate-50/50 border-t-2 border-slate-200">
                          <td className="border p-2 text-center font-bold text-slate-700 align-top" rowSpan={rowSpan}>
                            {itemIdx + 1}
                          </td>
                          <td className="border p-2.5 align-top font-semibold text-slate-800 leading-relaxed" rowSpan={rowSpan}>
                            <LocalTextarea
                              value={item.description || ""}
                              onChange={(val) => updateItemDescription(itemIdx, val)}
                              className="w-full resize-none overflow-hidden bg-transparent border-none p-1 focus:ring-0 focus:outline-none text-black"
                              rows={3}
                            />
                            <div className="mt-4 flex gap-2">
                              <button
                                onClick={() => addMeasurementRow(itemIdx)}
                                className="text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-sm"
                              >
                                + Add Meas
                              </button>
                              <button
                                onClick={() => handleResetRow(itemIdx)}
                                className="text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-sm"
                              >
                                Reset to Original
                              </button>
                            </div>
                          </td>

                          {measurements.length > 0 ? (
                            <>
                              <td className="border p-1 bg-white">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => duplicateMeasurementRow(itemIdx, 0)}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition font-extrabold text-xs"
                                    title="Duplicate row below"
                                  >
                                    ↓
                                  </button>
                                  <LocalTextInput
                                    value={measurements[0].description || ""}
                                    onChange={(val) =>
                                      updateMeasurementField(itemIdx, 0, "description", val)
                                    }
                                    className="w-full bg-transparent px-1.5 py-0.5 text-xs border border-transparent hover:border-slate-300 rounded focus:outline-none focus:border-blue-400"
                                    placeholder="Particulars"
                                  />
                                </div>
                              </td>
                              <td className="border p-1 bg-white">
                                <NumericInput
                                  value={measurements[0].no}
                                  onChange={(v) => updateMeasurementField(itemIdx, 0, "no", v)}
                                />
                              </td>
                              <td className="border p-1 bg-white">
                                <NumericInput
                                  value={measurements[0].l}
                                  onChange={(v) => updateMeasurementField(itemIdx, 0, "l", v)}
                                />
                              </td>
                              <td className="border p-1 bg-white">
                                <NumericInput
                                  value={measurements[0].b}
                                  onChange={(v) => updateMeasurementField(itemIdx, 0, "b", v)}
                                />
                              </td>
                              <td className="border p-1 bg-white">
                                <NumericInput
                                  value={measurements[0].h}
                                  onChange={(v) => updateMeasurementField(itemIdx, 0, "h", v)}
                                />
                              </td>
                              <td className="border p-2 text-center font-bold text-blue-900 bg-slate-50/50">
                                {measurements[0].total ? measurements[0].total.toFixed(3) : "-"}
                              </td>
                              <td className="border p-2 text-center font-semibold text-slate-500 align-bottom bg-slate-50/50" rowSpan={rowSpan}>
                                <div className="mb-2">{item.unit}</div>
                              </td>
                              <td className="border p-2 text-center bg-white">
                                <button
                                  onClick={() => removeMeasurementRow(itemIdx, 0)}
                                  className="text-red-400 hover:text-red-600 transition text-xs"
                                >
                                  ❌ Delete
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="border p-4 text-center text-slate-400 italic bg-slate-50" colSpan={6}>
                                Click &ldquo;+ Add Meas&rdquo; to add billing quantities
                              </td>
                              <td className="border p-2 text-center font-semibold text-slate-500 align-bottom bg-slate-50/50" rowSpan={rowSpan}>
                                <div className="mb-2">{item.unit}</div>
                              </td>
                              <td className="border p-2 bg-slate-50"></td>
                            </>
                          )}
                        </tr>

                        {/* Extra measurement rows */}
                        {measurements.slice(1).map((meas, measIdx) => {
                          const actualIdx = measIdx + 1;
                          return (
                            <tr key={meas.id || actualIdx} className="bg-white hover:bg-slate-50">
                              <td className="border p-1 bg-white">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => duplicateMeasurementRow(itemIdx, actualIdx)}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition font-extrabold text-xs"
                                    title="Duplicate row below"
                                  >
                                    ↓
                                  </button>
                                  <LocalTextInput
                                    value={meas.description || ""}
                                    onChange={(val) =>
                                      updateMeasurementField(itemIdx, actualIdx, "description", val)
                                    }
                                    className="w-full bg-transparent px-1.5 py-0.5 text-xs border border-transparent hover:border-slate-300 rounded focus:outline-none focus:border-blue-400"
                                    placeholder="Particulars"
                                  />
                                </div>
                              </td>
                              <td className="border p-1 bg-white">
                                <NumericInput
                                  value={meas.no}
                                  onChange={(v) => updateMeasurementField(itemIdx, actualIdx, "no", v)}
                                />
                              </td>
                              <td className="border p-1 bg-white">
                                <NumericInput
                                  value={meas.l}
                                  onChange={(v) => updateMeasurementField(itemIdx, actualIdx, "l", v)}
                                />
                              </td>
                              <td className="border p-1 bg-white">
                                <NumericInput
                                  value={meas.b}
                                  onChange={(v) => updateMeasurementField(itemIdx, actualIdx, "b", v)}
                                />
                              </td>
                              <td className="border p-1 bg-white">
                                <NumericInput
                                  value={meas.h}
                                  onChange={(v) => updateMeasurementField(itemIdx, actualIdx, "h", v)}
                                />
                              </td>
                              <td className="border p-2 text-center font-bold text-blue-900 bg-slate-50/50">
                                {meas.total ? meas.total.toFixed(3) : "-"}
                              </td>
                              <td className="border p-2 text-center bg-white">
                                <button
                                  onClick={() => removeMeasurementRow(itemIdx, actualIdx)}
                                  className="text-red-400 hover:text-red-600 transition text-xs"
                                >
                                  ❌ Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Percentage and total row */}
                        <tr className="bg-blue-50/50 font-bold">
                          <td colSpan={5} className="border p-2.5 text-xs text-slate-700">
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.usePercent || false}
                                  onChange={(e) => updateItemPercentFlag(itemIdx, e.target.checked)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                <span>Apply % of total</span>
                              </label>
                              {item.usePercent && (
                                <div className="flex items-center gap-1 animate-in fade-in">
                                  <LocalPercentInput
                                    value={item.percentValue !== undefined ? item.percentValue : 100}
                                    onChange={(val) =>
                                      updateItemPercentFlag(itemIdx, true, val)
                                    }
                                  />
                                  <span>
                                    % (i.e. {rawSum.toFixed(3)} × {item.percentValue || 100}%)
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="border p-2 text-right text-xs uppercase tracking-wide">Total Qty:</td>
                          <td className="border p-2 text-center font-black text-blue-950 text-sm bg-blue-100/50">
                            {item.usePercent && (
                              <div className="text-[11px] text-slate-400 font-normal leading-none mb-1" title="Raw sum before %">
                                {rawSum.toFixed(3)}
                              </div>
                            )}
                            {item.totalQty ? item.totalQty.toFixed(3) : "-"}
                          </td>
                          <td className="border p-2"></td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: ABSTRACT ───────────────────────────────────────── */}
        {activeTab === "abstract" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-fade-in-up">
            <h2 className="text-lg font-black text-slate-800 border-b pb-2 mb-4">
              Billing Recapitulation Sheet
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm bg-white">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <tr className="text-center font-bold">
                    <th className="border p-2.5 w-[50px]">Sr. No.</th>
                    <th className="border p-2.5 w-[360px]">DESCRIPTION OF ITEM</th>
                    <th className="border p-2.5 w-[70px]">QTY</th>
                    <th className="border p-2.5 w-[70px]">UNIT</th>
                    <th className="border p-2.5 w-[160px]">BILLING RATE (₹)</th>
                    <th className="border p-2.5 w-[140px]">REDUCED RATE</th>
                    <th className="border p-2.5 w-[120px]">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {standardRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="border p-2.5 text-center font-bold text-slate-700">{row.srNo}</td>
                      <td className="border p-2.5 text-left leading-relaxed">{row.description}</td>
                      <td className="border p-2.5 text-right font-semibold text-slate-800">
                        {row.executedQty.toFixed(3)}
                      </td>
                      <td className="border p-2.5 text-center text-slate-500 text-xs">{row.unit}</td>

                      {/* Billing Rate */}
                      <td className="border p-2.5">
                        <div className="flex flex-col gap-1 items-end">
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Tender: ₹{row.baseCalculatedRate.toFixed(2)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 font-bold">₹</span>
                            <LocalTextInput
                              type="number"
                              step="any"
                              value={row.baseRate}
                              onChange={(val) => updateBillingRate(row.id, val)}
                              placeholder={row.baseCalculatedRate.toFixed(2)}
                              className="w-24 text-right font-bold text-xs border border-slate-300 rounded px-1.5 py-0.5 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Reduced Rate */}
                      <td className="border p-2.5">
                        <div className="flex flex-col gap-1.5 items-center justify-center">
                          <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] font-extrabold text-blue-600 uppercase tracking-wide">
                            <input
                              type="checkbox"
                              checked={row.useReducedRate}
                              onChange={(e) => updateReducedRateCheckbox(row.id, e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                            />
                            <span>Reduced</span>
                          </label>
                          {row.useReducedRate && (
                            <LocalTextInput
                              type="number"
                              step="any"
                              value={row.reducedRate}
                              onChange={(val) => updateReducedRateValue(row.id, val)}
                              placeholder={parseFloat(row.baseRate || row.baseCalculatedRate).toFixed(2)}
                              className="w-20 text-right font-bold text-[10px] border border-blue-300 bg-blue-50/30 rounded px-1 py-0.5 focus:outline-none"
                            />
                          )}
                        </div>
                      </td>

                      <td className="border p-2.5 text-right font-black text-slate-900">
                        {formatMoney(row.executedAmount)}
                      </td>
                    </tr>
                  ))}

                  {/* Cost of work proper */}
                  <tr className="bg-slate-100/50 font-bold border-t-2 border-slate-300">
                    <td colSpan="6" className="border p-2.5 text-right text-xs uppercase tracking-wider text-slate-500">
                      TOTAL (Cost of work proper):
                    </td>
                    <td className="border p-2.5 text-right font-black text-slate-900">
                      {formatMoney(executedStandardTotal)}
                    </td>
                  </tr>

                  {/* GST */}
                  <tr>
                    <td colSpan="3" className="border p-2 text-right font-semibold text-slate-700">
                      Add For GST
                    </td>
                    <td className="border p-2 text-center bg-slate-50/20 font-extrabold text-xs">18.00 %</td>
                    <td colSpan="2" className="border"></td>
                    <td className="border p-2.5 text-right font-bold text-slate-800">{formatMoney(gstAmount)}</td>
                  </tr>

                  {/* Labour Insurance */}
                  <tr>
                    <td colSpan="3" className="border p-2 text-right font-semibold text-slate-700">
                      Add Labour Insurance
                    </td>
                    <td className="border p-2 text-center bg-slate-50/20 font-extrabold text-xs">
                      {insuranceRate.toFixed(2)} %
                    </td>
                    <td colSpan="2" className="border"></td>
                    <td className="border p-2.5 text-right font-bold text-slate-800">
                      {formatMoney(insuranceAmount)}
                    </td>
                  </tr>

                  <tr className="bg-slate-100 font-bold border-t border-b border-slate-200">
                    <td colSpan="6" className="border p-2.5 text-right text-xs uppercase tracking-wider text-slate-500">
                      SUBTOTAL:
                    </td>
                    <td className="border p-2.5 text-right font-black text-slate-900">
                      {formatMoney(executedSubtotal)}
                    </td>
                  </tr>

                  {/* Royalty */}
                  {royaltyRows.map((row) => (
                    <tr key={row.id} className="bg-blue-50/25 hover:bg-slate-50/50">
                      <td className="border p-2.5 text-center font-bold text-blue-900">{row.srNo}</td>
                      <td className="border p-2.5 text-left font-semibold text-blue-950">{row.description}</td>
                      <td className="border p-2.5 text-right font-bold text-blue-900">
                        {row.executedQty.toFixed(3)}
                      </td>
                      <td className="border p-2.5 text-center text-slate-500 text-xs">{row.unit}</td>
                      <td className="border p-2.5 text-right">
                        <div className="flex flex-col gap-1 items-end">
                          <span className="text-[10px] text-slate-400">
                            Tender: ₹{row.baseCalculatedRate.toFixed(2)}
                          </span>
                           <LocalTextInput
                            type="number"
                            step="any"
                            value={row.baseRate}
                            onChange={(val) => updateBillingRate(row.id, val)}
                            placeholder={row.baseCalculatedRate.toFixed(2)}
                            className="w-20 text-right font-bold text-xs border border-slate-300 rounded px-1 py-0.5 focus:outline-none"
                          />
                        </div>
                      </td>
                      <td className="border p-2"></td>
                      <td className="border p-2.5 text-right font-black text-blue-950">
                        {formatMoney(row.executedAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-300">
                    <td colSpan="6" className="border p-3 text-right uppercase tracking-wider text-xs">
                      TOTAL RS. (Grand Total Value of Work):
                    </td>
                    <td className="border p-3 text-right font-black text-emerald-400 text-base">
                      {formatMoney(executedGrandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
