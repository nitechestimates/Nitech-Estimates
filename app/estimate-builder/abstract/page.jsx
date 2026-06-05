"use client";
import React, { useState, useEffect, useRef } from "react";
import Tabs from "../components/Tabs";
import { useStore } from "@/lib/store";
import AlertDialog, { useAlertDialog } from '@/components/AlertDialog';

const formatMoney = (num) => (num || 0).toFixed(2);

export default function AbstractPage() {
  const raRows = useStore((state) => state.raRows);
  const raBottomRows = useStore((state) => state.raBottomRows);
  const measurementItems = useStore((state) => state.measurementItems);
  const labourInsurance = useStore((state) => state.labourInsurance);
  const { dialog, triggerAlert, triggerConfirm } = useAlertDialog();

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
        await triggerAlert("Failed to save changes.");
      }
    } catch (e) {
      console.error(e);
      setToastVisible(false);
      await triggerAlert("Network error — could not save.");
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
    <div className="p-4 bg-slate-50 min-h-screen text-black">
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

      <div className="max-w-5xl mx-auto bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)] mt-6">
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
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
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

        <div className="overflow-x-auto rounded-2xl shadow-sm border border-slate-200">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md text-slate-600 text-xs uppercase tracking-wider z-10 border-b border-slate-200">
              <tr className="text-center font-bold">
                <th className="p-3 w-[60px] border-b border-slate-200">Sr. No.</th>
                <th className="p-3 w-[380px] border-b border-slate-200">DESCRIPTION OF ITEM</th>
                <th className="p-3 w-[200px] border-b border-slate-200">SPECIFICATIONS</th>
                <th className="p-3 w-[80px] border-b border-slate-200">QTY</th>
                <th className="p-3 w-[80px] border-b border-slate-200">UNIT</th>
                <th className="p-3 w-[140px] border-b border-slate-200">RATE (Rs.)</th>
                <th className="p-3 w-[120px] border-b border-slate-200">AMOUNT (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {standardRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="border-b border-slate-100 p-3 text-center font-semibold text-slate-700">{row.srNo}</td>
                  <td className="border-b border-slate-100 p-3 text-left leading-relaxed">{row.description}</td>
                  <td className="border-b border-slate-100 p-3 text-left text-xs text-slate-500 italic">{row.specs}</td>
                  <td className="border-b border-slate-100 p-3 text-right font-medium">{row.qty.toFixed(3)}</td>
                  <td className="border-b border-slate-100 p-3 text-center text-slate-600 text-xs">{row.unit}</td>
                  
                  {/* Rate Column */}
                  <td className="border-b border-slate-100 p-3 text-right font-semibold text-slate-900">
                    {formatMoney(row.rate)}
                  </td>
                  
                  <td className="border-b border-slate-100 p-3 text-right font-bold text-slate-900">{formatMoney(row.amount)}</td>
                </tr>
              ))}

              {/* Standard Items subtotal */}
              <tr className="bg-slate-50 font-bold text-slate-800 border-b border-slate-200">
                <td colSpan="6" className="p-3 text-right uppercase tracking-wider text-[11px] text-slate-500">TOTAL (Cost of work proper):</td>
                <td className="p-3 text-right font-extrabold text-slate-900">{formatMoney(standardTotal)}</td>
              </tr>

              {/* Add For GST */}
              <tr className="bg-white hover:bg-slate-50 transition-colors text-slate-800 font-bold text-[13px] border-b border-slate-100">
                <td colSpan="3" className="p-3 text-right">Add For GST</td>
                <td className="p-3 text-center text-slate-500">18.00 %</td>
                <td colSpan="2" className="p-3"></td>
                <td className="p-3 text-right text-slate-900">{formatMoney(gstAmount)}</td>
              </tr>

              {/* Add Labour Insurance */}
              <tr className="bg-white hover:bg-slate-50 transition-colors text-slate-800 font-bold text-[13px] border-b border-slate-100">
                <td colSpan="3" className="p-3 text-right">Add Labour Insurance</td>
                <td className="p-3 text-center text-slate-500">{insuranceRate.toFixed(2)} %</td>
                <td colSpan="2" className="p-3"></td>
                <td className="p-3 text-right text-slate-900">{formatMoney(insuranceAmount)}</td>
              </tr>

              {/* Subtotal with taxes */}
              <tr className="bg-slate-50 font-bold text-slate-800 border-b border-slate-200">
                <td colSpan="6" className="p-3 text-right uppercase tracking-wider text-[11px] text-slate-500">TOTAL:</td>
                <td className="p-3 text-right font-extrabold text-slate-900">{formatMoney(subTotalWithTax)}</td>
              </tr>

              {/* Royalty & Lab charges rows */}
              {royaltyRows.map((row) => (
                <tr key={row.id} className="bg-white hover:bg-slate-50 font-semibold text-slate-800 transition-colors border-b border-slate-100">
                  <td className="p-3 text-center font-bold text-slate-700">{row.srNo}</td>
                  <td className="p-3 text-left">{row.description}</td>
                  <td className="p-3 text-left text-xs text-slate-500 italic">{row.specs}</td>
                  <td className="p-3 text-right">{row.qty.toFixed(3)}</td>
                  <td className="p-3 text-center text-slate-500 text-xs">{row.unit}</td>
                  
                  {/* Royalty Rate */}
                  <td className="p-3 text-right font-semibold text-slate-900">
                    {formatMoney(row.rate)}
                  </td>
                  
                  <td className="p-3 text-right font-bold text-slate-900">{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/80 border-t border-slate-200">
              <tr className="text-[14px]">
                <td colSpan="6" className="p-4 text-right uppercase tracking-wider font-black text-slate-700">TOTAL RS. (Grand Total):</td>
                <td className="p-4 text-right font-black text-slate-900 text-base">{formatMoney(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <AlertDialog dialog={dialog} />
    </div>
  );
}