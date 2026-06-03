"use client";
import React, { useState, useEffect, useRef } from "react";
import Tabs from "../components/Tabs";
import { useStore } from "@/lib/store";

const formatMoney = (num) => (num || 0).toFixed(2);

export default function AbstractPage() {
  const raRows = useStore((state) => state.raRows);
  const raBottomRows = useStore((state) => state.raBottomRows);
  const measurementItems = useStore((state) => state.measurementItems);
  const labourInsurance = useStore((state) => state.labourInsurance);

  const allRaRows = [...raRows, ...raBottomRows];
  const msMap = new Map((Array.isArray(measurementItems) ? measurementItems : []).map(item => [item.id, item]));

  const abstractRows = allRaRows.map((raItem, idx) => {
    const msItem = msMap.get(raItem.id);
    const totalQty = msItem?.totalQty || 0;
    
    const rate = raItem.netTotal || raItem.netAfterDeduct || 0;
    const amount = totalQty * rate;
    
    return {
      id: raItem.id,
      srNo: idx + 1,
      description: raItem.description,
      specs: raItem.specs || "",
      qty: totalQty,
      unit: raItem.unit,
      rate,
      amount,
      isRoyalty: raItem.isRoyalty
    };
  });

  const standardRows = abstractRows.filter(r => !r.isRoyalty);
  const royaltyRows = abstractRows.filter(r => r.isRoyalty);

  const standardTotal = standardRows.reduce((sum, r) => sum + r.amount, 0);
  const gstAmount = (standardTotal * 18) / 100;
  const insuranceRate = labourInsurance && !isNaN(parseFloat(labourInsurance))
    ? parseFloat(labourInsurance)
    : (standardTotal > 2500000 ? 1.0 : 0.5);
  const insuranceAmount = (standardTotal * insuranceRate) / 100;
  const subTotalWithTax = standardTotal + gstAmount + insuranceAmount;
  const royaltyTotal = royaltyRows.reduce((sum, r) => sum + r.amount, 0);
  const grandTotal = subTotalWithTax + royaltyTotal;

  // Manual & Auto Saving State
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState("success");
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (type = "success") => {
    setToastType(type);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (type === "success") {
      toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    showToast("saving");
    try {
      const s = useStore.getState();
      const response = await fetch("/api/estimate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateName: s.estimateName,
          nameOfWork: s.nameOfWork,
          isTribal: s.isTribal,
          tribalPercent: s.tribalPercent,
          yojana: s.yojana,
          estAmount: s.estAmount,
          labourInsurance: s.labourInsurance,
          year: s.year,
          dist: s.dist,
          taluka: s.taluka,
          village: s.village,
          headDivision: s.headDivision,
          subDivision: s.subDivision,
          deputyEngineer: s.deputyEngineer,
          jrEngineer: s.jrEngineer,
          adminApprovalNo: s.adminApprovalNo,
          rows: [...s.raRows, ...s.raBottomRows],
          measurementItems: s.measurementItems,
          estimateId: s.currentEstimateId,
          leadSettings: s.leadSettings,
          leadOrder: s.leadOrder,
          abstractCustomData: s.abstractCustomData,
        }),
      });
      if (response.ok) {
        setLastSavedTime(new Date());
        showToast("success");
      } else {
        console.error("Failed to save abstract changes");
        setToastVisible(false);
        alert("Failed to save changes.");
      }
    } catch (e) {
      console.error(e);
      setToastVisible(false);
      alert("Network error — could not save.");
    } finally {
      setSaving(false);
    }
  };

  // Auto-save every 60 seconds
  useEffect(() => {
    const id = setInterval(() => {
      const s = useStore.getState();
      if (!s.nameOfWork || !s.nameOfWork.trim()) return;
      fetch("/api/estimate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateName: s.estimateName,
          nameOfWork: s.nameOfWork,
          isTribal: s.isTribal,
          tribalPercent: s.tribalPercent,
          yojana: s.yojana,
          estAmount: s.estAmount,
          labourInsurance: s.labourInsurance,
          year: s.year,
          dist: s.dist,
          taluka: s.taluka,
          village: s.village,
          headDivision: s.headDivision,
          subDivision: s.subDivision,
          deputyEngineer: s.deputyEngineer,
          jrEngineer: s.jrEngineer,
          adminApprovalNo: s.adminApprovalNo,
          rows: [...s.raRows, ...s.raBottomRows],
          measurementItems: s.measurementItems,
          estimateId: s.currentEstimateId,
          leadSettings: s.leadSettings,
          leadOrder: s.leadOrder,
          abstractCustomData: s.abstractCustomData,
        }),
      }).then(res => {
        if (res.ok) setLastSavedTime(new Date());
      }).catch(err => console.error("Autosave failed", err));
    }, 60000);
    return () => clearInterval(id);
  }, []);



  if (allRaRows.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 min-h-screen text-black">
        <Tabs />
        <div className="text-center text-gray-500 mt-20">No items in Rate Analysis. Add items first.</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      <Tabs />
      
      {/* Save Toast */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <div className="bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          {toastType === "success" ? (
            <>
              <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              <span>Saved successfully</span>
            </>
          ) : (
            <>
              <svg className="animate-spin h-4 w-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>Saving...</span>
            </>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-xl p-6 mt-6">
        <div className="mb-6 flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Abstract of Estimate</h1>
            <p className="text-xs text-gray-500 font-medium">Nashik Circle Z.P. standard recapitulation sheet</p>
          </div>
          <div className="flex items-center gap-3">
            {lastSavedTime && (
              <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md border shadow-sm">
                Saved at {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm transition-all"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Save Estimate
                </>
              )}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-150 border-b border-gray-250">
              <tr className="text-center font-bold text-gray-700 bg-gray-100">
                <th className="border p-2.5 w-[60px]">Sr. No.</th>
                <th className="border p-2.5 w-[380px]">DESCRIPTION OF ITEM</th>
                <th className="border p-2.5 w-[200px]">SPECIFICATIONS</th>
                <th className="border p-2.5 w-[80px]">QTY</th>
                <th className="border p-2.5 w-[80px]">UNIT</th>
                <th className="border p-2.5 w-[140px]">RATE (Rs.)</th>
                <th className="border p-2.5 w-[120px]">AMOUNT (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {standardRows.map((row) => (
                <tr key={row.id} className="hover:bg-yellow-50/30 transition-colors">
                  <td className="border p-2.5 text-center font-semibold text-gray-700">{row.srNo}</td>
                  <td className="border p-2.5 text-left leading-relaxed">{row.description}</td>
                  <td className="border p-2.5 text-left text-xs text-gray-500 italic">{row.specs}</td>
                  <td className="border p-2.5 text-right font-medium">{row.qty.toFixed(3)}</td>
                  <td className="border p-2.5 text-center text-gray-600 text-xs">{row.unit}</td>
                  
                  {/* Rate Column */}
                  <td className="border p-2.5 text-right font-semibold text-gray-900">
                    {formatMoney(row.rate)}
                  </td>
                  
                  <td className="border p-2.5 text-right font-bold text-gray-900">{formatMoney(row.amount)}</td>
                </tr>
              ))}

              {/* Standard Items subtotal */}
              <tr className="bg-gray-50/80 font-bold text-gray-800 border-t-2 border-gray-300">
                <td colSpan="6" className="border p-2.5 text-right uppercase tracking-wider text-[11px] text-gray-500">TOTAL (Cost of work proper):</td>
                <td className="border p-2.5 text-right font-extrabold text-gray-900">{formatMoney(standardTotal)}</td>
              </tr>

              {/* Add For GST */}
              <tr className="bg-blue-50/5 text-blue-950 font-bold text-[13px]">
                <td colSpan="3" className="border p-2.5 text-right">Add For GST</td>
                <td className="border p-2.5 text-center bg-gray-50/20">18.00 %</td>
                <td colSpan="2" className="border"></td>
                <td className="border p-2.5 text-right text-blue-900">{formatMoney(gstAmount)}</td>
              </tr>

              {/* Add Labour Insurance */}
              <tr className="bg-blue-50/5 text-blue-950 font-bold text-[13px]">
                <td colSpan="3" className="border p-2.5 text-right">Add Labour Insurance</td>
                <td className="border p-2.5 text-center bg-gray-50/20">{insuranceRate.toFixed(2)} %</td>
                <td colSpan="2" className="border"></td>
                <td className="border p-2.5 text-right text-blue-900">{formatMoney(insuranceAmount)}</td>
              </tr>

              {/* Subtotal with taxes */}
              <tr className="bg-gray-100/70 font-bold text-gray-800 border-t border-b border-gray-300">
                <td colSpan="6" className="border p-2.5 text-right uppercase tracking-wider text-[11px] text-gray-500">TOTAL:</td>
                <td className="border p-2.5 text-right font-extrabold text-gray-900">{formatMoney(subTotalWithTax)}</td>
              </tr>

              {/* Royalty & Lab charges rows */}
              {royaltyRows.map((row) => (
                <tr key={row.id} className="bg-blue-50/10 hover:bg-yellow-50/20 font-semibold text-blue-950 transition-colors">
                  <td className="border p-2.5 text-center font-bold text-blue-900">{row.srNo}</td>
                  <td className="border p-2.5 text-left">{row.description}</td>
                  <td className="border p-2.5 text-left text-xs text-gray-400 italic">{row.specs}</td>
                  <td className="border p-2.5 text-right">{row.qty.toFixed(3)}</td>
                  <td className="border p-2.5 text-center text-gray-500 text-xs">{row.unit}</td>
                  
                  {/* Royalty Rate */}
                  <td className="border p-2.5 text-right font-semibold text-blue-950">
                    {formatMoney(row.rate)}
                  </td>
                  
                  <td className="border p-2.5 text-right font-bold text-blue-950">{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-150 border-t-2 border-gray-300">
              <tr className="bg-gray-100 text-[14px]">
                <td colSpan="6" className="border p-3 text-right uppercase tracking-wider font-black text-gray-800">TOTAL RS. (Grand Total):</td>
                <td className="border p-3 text-right font-black text-blue-950 bg-blue-50/30 text-base">{formatMoney(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}