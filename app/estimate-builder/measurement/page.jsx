"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Tabs from "../components/Tabs";
import { useStore } from "@/lib/store";

function AutoTextarea({ value, onChange }) {
  const ref = useRef(null);
  const adjustHeight = () => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  };
  useEffect(() => { adjustHeight(); }, [value]);
  const handleChange = (e) => { onChange(e); adjustHeight(); };
  return <textarea ref={ref} value={value} onChange={handleChange} className="w-full resize-none overflow-hidden bg-transparent p-1 text-left" />;
}

function NumericInput({ value, onChange, disabled = false }) {
  const [displayValue, setDisplayValue] = useState(value !== undefined && value !== null && value !== "" ? Number(value).toFixed(3) : "");
  const inputRef = useRef(null);
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      if (value === "" || value === null || value === undefined) setDisplayValue("");
      else setDisplayValue(Number(value).toFixed(3));
    }
  }, [value]);
  const handleFocus = () => { if (value === "" || value === null || value === undefined) setDisplayValue(""); else setDisplayValue(Number(value).toString()); };
  const handleChange = (e) => {
    let raw = e.target.value;
    if (raw === "") { setDisplayValue(""); onChange(""); return; }
    raw = raw.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 3) raw = parts[0] + "." + parts[1].slice(0, 3);
    setDisplayValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num)) onChange(num);
  };
  const handleBlur = () => {
    if (displayValue === "") { onChange(""); return; }
    let num = parseFloat(displayValue);
    if (isNaN(num)) { setDisplayValue(""); onChange(""); }
    else { setDisplayValue(num.toFixed(3)); onChange(num); }
  };
  const handleKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); inputRef.current.blur(); } };
  return <input ref={inputRef} type="text" value={displayValue} onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown} disabled={disabled} className={`text-center w-full border rounded px-1 py-0.5 focus:bg-white transition-colors ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-transparent hover:bg-white"}`} placeholder="-" />;
}

export default function MeasurementPage() {
  const measurementItems = useStore((state) => state.measurementItems);
  const setMeasurementItems = useStore((state) => state.setMeasurementItems);
  const syncMeasurementFromRA = useStore((state) => state.syncMeasurementFromRA);
  const raRows = useStore((state) => state.raRows);
  const raBottomRows = useStore((state) => state.raBottomRows);
  const currentEstimateId = useStore((state) => state.currentEstimateId);
  const [loading, setLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback(() => {
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }, []);

  // Manual save — stores locally (picked up next time RA saves to MongoDB)
  const handleSave = useCallback(() => {
    // Measurement data lives in Zustand/localStorage; full persist happens via RA save.
    showToast();
  }, [showToast]);

  // Auto-save every 60 s
  useEffect(() => {
    const id = setInterval(handleSave, 60000);
    return () => clearInterval(id);
  }, [handleSave]);

  useEffect(() => {
    if (measurementItems.length === 0 && (raRows.length > 0 || raBottomRows.length > 0)) {
      syncMeasurementFromRA();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    syncMeasurementFromRA();
  }, [raRows, raBottomRows, syncMeasurementFromRA]);

  const addMeasurement = (itemIndex) => {
    const updated = [...measurementItems];
    updated[itemIndex].measurements.push({ id: Date.now() + Math.random(), no: "", l: "", b: "", h: "", total: 0 });
    updated[itemIndex].totalQty = recalcItemTotal(updated[itemIndex]);
    setMeasurementItems(updated);
  };

  const updateMeasurement = (itemIndex, measIndex, field, value) => {
    const updated = [...measurementItems];
    const meas = updated[itemIndex].measurements[measIndex];
    meas[field] = value;
    const getVal = (val) => (val === "" || val === null || val === undefined || isNaN(val)) ? null : parseFloat(val);
    const noVal = getVal(meas.no), lVal = getVal(meas.l), bVal = getVal(meas.b), hVal = getVal(meas.h);
    const factors = [noVal, lVal, bVal, hVal].filter(v => v !== null);
    meas.total = factors.length === 0 ? 0 : factors.reduce((acc, curr) => acc * curr, 1);
    updated[itemIndex].totalQty = recalcItemTotal(updated[itemIndex]);
    setMeasurementItems(updated);
  };

  const removeMeasurement = (itemIndex, measIndex) => {
    if (!confirm("Delete this measurement?")) return;
    const updated = [...measurementItems];
    updated[itemIndex].measurements.splice(measIndex, 1);
    updated[itemIndex].totalQty = recalcItemTotal(updated[itemIndex]);
    setMeasurementItems(updated);
  };

  const recalcItemTotal = (item) => item.measurements.reduce((sum, m) => sum + (m.total || 0), 0);

  if (loading) return <div className="p-4 bg-yellow-50 min-h-screen text-black"><Tabs /><div className="flex justify-center items-center h-64">Loading...</div></div>;

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      <Tabs />
      {/* Save Toast */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <div className="bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          Saved
        </div>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Measurement Sheet</h1><p className="text-sm text-gray-500">Automatically syncs with Rate Analysis</p></div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          Save
        </button>
      </div>
      <div className="overflow-x-auto rounded border shadow-sm">
        <table className="w-full border text-sm bg-white">
          <thead className="bg-gray-200 border-b-2 border-gray-300">
            <tr className="text-center font-bold text-gray-700">
              <th className="border p-2 w-[50px]">Sr. No.</th><th className="border p-2 w-[400px]">DESCRIPTION OF ITEM</th><th className="border p-2 w-[80px]">No.</th><th className="border p-2 w-[100px]">L.</th><th className="border p-2 w-[100px]">B/W</th><th className="border p-2 w-[100px]">H/D.</th><th className="border p-2 w-[120px]">TOTAL</th><th className="border p-2 w-[80px]">UNIT</th><th className="border p-2 w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {measurementItems.map((item, itemIdx) => {
              const measCount = item.measurements.length;
              const rowSpan = measCount > 0 ? measCount + 1 : 2;
              return (
                <React.Fragment key={item.id}>
                  <tr className="bg-white border-t-4 border-gray-400 group">
                    <td className="border p-2 text-center font-bold text-gray-700 align-top bg-gray-50/50" rowSpan={rowSpan}><div className="mt-2">{item.srNo}</div></td>
                    <td className="border p-2 align-top bg-gray-50/20" rowSpan={rowSpan}>
                      <AutoTextarea value={item.description} onChange={(e) => { const updated = [...measurementItems]; updated[itemIdx].description = e.target.value; setMeasurementItems(updated); }} />
                      <div className="mt-4 mb-2 flex justify-start"><button onClick={() => addMeasurement(itemIdx)} className="text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 rounded px-3 py-1 text-xs font-bold transition-colors shadow-sm">+ Add Meas</button></div>
                    </td>
                    {measCount > 0 ? (
                      <>
                        <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={item.measurements[0].no} onChange={(val) => updateMeasurement(itemIdx, 0, "no", val)} /></td>
                        <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={item.measurements[0].l} onChange={(val) => updateMeasurement(itemIdx, 0, "l", val)} /></td>
                        <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={item.measurements[0].b} onChange={(val) => updateMeasurement(itemIdx, 0, "b", val)} /></td>
                        <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={item.measurements[0].h} onChange={(val) => updateMeasurement(itemIdx, 0, "h", val)} /></td>
                        <td className="border p-2 text-center font-bold text-blue-900 bg-gray-50/50">{item.measurements[0].total === 0 ? "-" : item.measurements[0].total.toFixed(3)}</td>
                        <td className="border p-2 text-center font-semibold text-gray-500 whitespace-pre-line align-top bg-gray-50/50" rowSpan={rowSpan}><div className="mt-2">{item.unit}</div></td>
                        <td className="border p-2 text-center bg-white"><button onClick={() => removeMeasurement(itemIdx, 0)} className="text-red-400 hover:text-red-600 hover:scale-125 transition-all" title="Delete">❌</button></td>
                      </>
                    ) : (
                      <>
                        <td className="border p-4 text-center text-gray-400 italic bg-gray-50" colSpan={5}>Click "+ Add Meas" to enter measurements</td>
                        <td className="border p-2 text-center font-semibold text-gray-500 whitespace-pre-line align-top bg-gray-50/50" rowSpan={rowSpan}><div className="mt-2">{item.unit}</div></td>
                        <td className="border p-2 bg-gray-50"></td>
                      </>
                    )}
                  </tr>
                  {measCount > 1 && item.measurements.slice(1).map((meas, mIdx) => {
                    const measIdx = mIdx + 1;
                    return (
                      <tr key={meas.id} className="bg-white hover:bg-yellow-50 transition-colors">
                        <td className="border p-1 bg-white"><NumericInput value={meas.no} onChange={(val) => updateMeasurement(itemIdx, measIdx, "no", val)} /></td>
                        <td className="border p-1 bg-white"><NumericInput value={meas.l} onChange={(val) => updateMeasurement(itemIdx, measIdx, "l", val)} /></td>
                        <td className="border p-1 bg-white"><NumericInput value={meas.b} onChange={(val) => updateMeasurement(itemIdx, measIdx, "b", val)} /></td>
                        <td className="border p-1 bg-white"><NumericInput value={meas.h} onChange={(val) => updateMeasurement(itemIdx, measIdx, "h", val)} /></td>
                        <td className="border p-2 text-center font-bold text-blue-900 bg-gray-50/50">{meas.total === 0 ? "-" : meas.total.toFixed(3)}</td>
                        <td className="border p-2 text-center bg-white"><button onClick={() => removeMeasurement(itemIdx, measIdx)} className="text-red-400 hover:text-red-600 hover:scale-125 transition-all" title="Delete">❌</button></td>
                      </tr>
                    );
                  })}
                  <tr className="bg-blue-50/60">
                    <td colSpan={4} className="border p-2 text-right font-bold text-gray-700 uppercase pr-4 text-xs tracking-wider">Total Qty:</td>
                    <td className="border p-2 text-center font-extrabold text-blue-900 text-[15px]">{item.totalQty === 0 ? "-" : item.totalQty.toFixed(3)}</td>
                    <td className="border p-2"></td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {measurementItems.length === 0 && <div className="mt-8 text-center text-gray-500 p-8 border-2 border-dashed border-gray-300 rounded-lg bg-white">No items found. Add items in Rate Analysis first — they will appear here automatically.</div>}
    </div>
  );
}