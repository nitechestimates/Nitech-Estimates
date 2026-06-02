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
  // Track local edit text and an "editing" flag. While editing, show the
  // raw text the user is typing; otherwise derive a formatted display
  // directly from the value prop. No useEffect → no setState-in-effect.
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
      onChange("");
      return;
    }
    raw = raw.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 3) raw = parts[0] + "." + parts[1].slice(0, 3);
    setEditValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num)) onChange(num);
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

  const handleKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); inputRef.current.blur(); } };
  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`text-center w-full border rounded px-1 py-0.5 focus:bg-white transition-colors ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-transparent hover:bg-white"}`}
      placeholder="-"
    />
  );
}

export default function MeasurementPage() {
  const measurementItems = useStore((state) => state.measurementItems);
  const setMeasurementItems = useStore((state) => state.setMeasurementItems);
  const syncMeasurementFromRA = useStore((state) => state.syncMeasurementFromRA);
  const raRows = useStore((state) => state.raRows);
  const raBottomRows = useStore((state) => state.raBottomRows);
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

  // Initial bootstrap: pull items from RA on first mount, then flip the loading flag.
  // We intentionally fire only once on mount.
  useEffect(() => {
    Promise.resolve().then(() => {
      if (!Array.isArray(measurementItems) || (measurementItems.length === 0 && (raRows.length > 0 || raBottomRows.length > 0))) {
        syncMeasurementFromRA();
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync measurement items when RA rows change — use a ref to avoid infinite loop
  const prevRARef = useRef("");
  useEffect(() => {
    const raKey = JSON.stringify(
      [...raRows, ...raBottomRows].map(r => ({ id: r.id, desc: r.description, unit: r.unit }))
    );
    if (raKey !== prevRARef.current) {
      prevRARef.current = raKey;
      Promise.resolve().then(() => {
        syncMeasurementFromRA();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raRows, raBottomRows]);

  const recalcItemTotal = (item) => {
    const sum = (Array.isArray(item?.measurements) ? item.measurements : []).reduce((sum, m) => sum + (m?.total || 0), 0);
    if (item?.usePercent && item?.percentValue !== undefined) {
      return (sum * (parseFloat(item.percentValue) || 0)) / 100;
    }
    return sum;
  };

  const addMeasurement = useCallback((itemIndex) => {
    setMeasurementItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIndex] };
      const measurements = Array.isArray(item.measurements) ? item.measurements : [];
      item.measurements = [...measurements, { id: Date.now() + Math.random(), no: "", l: "", b: "", h: "", total: 0 }];
      item.totalQty = recalcItemTotal(item);
      updated[itemIndex] = item;
      return updated;
    });
  }, [setMeasurementItems]);

  const copyAboveMeasurement = useCallback((itemIndex, measIndex) => {
    setMeasurementItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIndex] };
      const measurements = Array.isArray(item.measurements) ? item.measurements : [];
      
      let sourceMeas = null;
      let targetIndex = measIndex + 1;
      
      if (measIndex === 0 && itemIndex > 0) {
        // Special case: copying from the previous item into the beginning of the current item
        const prevItem = updated[itemIndex - 1];
        const prevMeasurements = Array.isArray(prevItem?.measurements) ? prevItem.measurements : [];
        if (prevMeasurements.length > 0) {
          sourceMeas = prevMeasurements[prevMeasurements.length - 1];
          targetIndex = 0;
        } else {
          sourceMeas = measurements[0];
          targetIndex = 1;
        }
      } else {
        // Standard duplication of the current row
        sourceMeas = measurements[measIndex];
        targetIndex = measIndex + 1;
      }
      
      if (!sourceMeas) return prev;
      
      const newMeas = {
        id: Date.now() + Math.random(),
        description: sourceMeas.description || "",
        no: sourceMeas.no !== undefined && sourceMeas.no !== null ? sourceMeas.no : "",
        l: sourceMeas.l !== undefined && sourceMeas.l !== null ? sourceMeas.l : "",
        b: sourceMeas.b !== undefined && sourceMeas.b !== null ? sourceMeas.b : "",
        h: sourceMeas.h !== undefined && sourceMeas.h !== null ? sourceMeas.h : "",
        total: sourceMeas.total || 0
      };
      
      const newMeasurements = [...measurements];
      newMeasurements.splice(targetIndex, 0, newMeas);
      
      item.measurements = newMeasurements;
      item.totalQty = recalcItemTotal(item);
      updated[itemIndex] = item;
      return updated;
    });
  }, [setMeasurementItems]);

  const updateMeasurement = useCallback((itemIndex, measIndex, field, value) => {
    setMeasurementItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIndex] };
      const measurements = Array.isArray(item.measurements) ? item.measurements : [];
      if (!measurements[measIndex]) return prev;
      item.measurements = [...measurements];
      const meas = { ...item.measurements[measIndex], [field]: value };
      
      const getVal = (val) => (val === "" || val === null || val === undefined || isNaN(val)) ? null : parseFloat(val);
      const noVal = getVal(meas.no), lVal = getVal(meas.l), bVal = getVal(meas.b), hVal = getVal(meas.h);
      const factors = [noVal, lVal, bVal, hVal].filter(v => v !== null);
      meas.total = factors.length === 0 ? 0 : factors.reduce((acc, curr) => acc * curr, 1);
      
      item.measurements[measIndex] = meas;
      item.totalQty = recalcItemTotal(item);
      updated[itemIndex] = item;
      return updated;
    });
  }, [setMeasurementItems]);

  const removeMeasurement = useCallback((itemIndex, measIndex) => {
    if (!confirm("Delete this measurement?")) return;
    setMeasurementItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIndex] };
      const measurements = Array.isArray(item.measurements) ? item.measurements : [];
      item.measurements = [...measurements];
      item.measurements.splice(measIndex, 1);
      item.totalQty = recalcItemTotal(item);
      updated[itemIndex] = item;
      return updated;
    });
  }, [setMeasurementItems]);

  const updateDescription = useCallback((itemIndex, value) => {
    setMeasurementItems(prev => {
      const updated = [...prev];
      updated[itemIndex] = { ...updated[itemIndex], description: value };
      return updated;
    });
  }, [setMeasurementItems]);

  const updateItemPercent = useCallback((itemIndex, usePercent, percentValue) => {
    setMeasurementItems(prev => {
      const updated = [...prev];
      const item = { ...updated[itemIndex] };
      item.usePercent = usePercent;
      if (percentValue !== undefined) item.percentValue = percentValue;
      item.totalQty = recalcItemTotal(item);
      updated[itemIndex] = item;
      return updated;
    });
  }, [setMeasurementItems]);

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
              <th className="border p-2 w-[50px]">Sr. No.</th>
              <th className="border p-2 w-[350px]">DESCRIPTION OF ITEM</th>
              <th className="border p-2 w-[220px]">PARTICULARS (Measurement Name)</th>
              <th className="border p-2 w-[80px]">No.</th>
              <th className="border p-2 w-[100px]">L.</th>
              <th className="border p-2 w-[100px]">B/W</th>
              <th className="border p-2 w-[100px]">H/D.</th>
              <th className="border p-2 w-[120px]">TOTAL</th>
              <th className="border p-2 w-[80px]">UNIT</th>
              <th className="border p-2 w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(measurementItems) ? measurementItems : []).map((item, itemIdx) => (
              <MeasurementRow
                key={item?.id || itemIdx}
                item={item}
                itemIdx={itemIdx}
                addMeasurement={addMeasurement}
                copyAboveMeasurement={copyAboveMeasurement}
                updateMeasurement={updateMeasurement}
                removeMeasurement={removeMeasurement}
                updateDescription={updateDescription}
                updateItemPercent={updateItemPercent}
              />
            ))}
          </tbody>
        </table>
      </div>
      {(!Array.isArray(measurementItems) || measurementItems.length === 0) && <div className="mt-8 text-center text-gray-500 p-8 border-2 border-dashed border-gray-300 rounded-lg bg-white">No items found. Add items in Rate Analysis first — they will appear here automatically.</div>}
    </div>
  );
}

const MeasurementRow = React.memo(function MeasurementRow({ item, itemIdx, addMeasurement, copyAboveMeasurement, updateMeasurement, removeMeasurement, updateDescription, updateItemPercent }) {
  const measurements = Array.isArray(item?.measurements) ? item.measurements : [];
  const measCount = measurements.length;
  const rowSpan = measCount > 0 ? measCount + 1 : 2;
  const rawSum = measurements.reduce((sum, m) => sum + (m?.total || 0), 0);

  return (
    <React.Fragment>
      <tr className="bg-white border-t-4 border-gray-400 group">
        <td className="border p-2 text-center font-bold text-gray-700 align-top bg-gray-50/50" rowSpan={rowSpan}><div className="mt-2">{item?.srNo}</div></td>
        <td className="border p-2 align-top bg-gray-50/20" rowSpan={rowSpan}>
          <AutoTextarea value={item?.description || ""} onChange={(e) => updateDescription(itemIdx, e.target.value)} />
          <div className="mt-4 mb-2 flex justify-start"><button onClick={() => addMeasurement(itemIdx)} className="text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 rounded px-3 py-1 text-xs font-bold transition-colors shadow-sm">+ Add Meas</button></div>
        </td>
        {measCount > 0 ? (
          <>
            <td className="border p-1 bg-white hover:bg-yellow-50">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copyAboveMeasurement(itemIdx, 0)}
                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-all shrink-0 font-extrabold text-xs"
                  title={itemIdx > 0 ? "Copy measurements from last row of item above" : "Duplicate this row below"}
                >
                  ↓
                </button>
                <input
                  type="text"
                  value={measurements[0]?.description || ""}
                  onChange={(e) => updateMeasurement(itemIdx, 0, "description", e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
                  className="w-full bg-transparent px-2 py-1 text-left border rounded text-xs focus:bg-white focus:ring-1 focus:ring-blue-400 focus:outline-none transition-colors text-black"
                  placeholder="e.g. below soling"
                />
              </div>
            </td>
            <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={measurements[0]?.no} onChange={(val) => updateMeasurement(itemIdx, 0, "no", val)} /></td>
            <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={measurements[0]?.l} onChange={(val) => updateMeasurement(itemIdx, 0, "l", val)} /></td>
            <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={measurements[0]?.b} onChange={(val) => updateMeasurement(itemIdx, 0, "b", val)} /></td>
            <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={measurements[0]?.h} onChange={(val) => updateMeasurement(itemIdx, 0, "h", val)} /></td>
            <td className="border p-2 text-center font-bold text-blue-900 bg-gray-50/50">{measurements[0]?.total === 0 || !measurements[0]?.total ? "-" : Number(measurements[0].total).toFixed(3)}</td>
            <td className="border p-2 text-center font-semibold text-gray-500 whitespace-pre-line align-top bg-gray-50/50" rowSpan={rowSpan}><div className="mt-2">{item?.unit}</div></td>
            <td className="border p-2 text-center bg-white"><button onClick={() => removeMeasurement(itemIdx, 0)} className="text-red-400 hover:text-red-600 hover:scale-125 transition-all" title="Delete">❌</button></td>
          </>
        ) : (
          <>
            <td className="border p-4 text-center text-gray-400 italic bg-gray-50" colSpan={6}>Click &ldquo;+ Add Meas&rdquo; to enter measurements</td>
            <td className="border p-2 text-center font-semibold text-gray-500 whitespace-pre-line align-top bg-gray-50/50" rowSpan={rowSpan}><div className="mt-2">{item?.unit}</div></td>
            <td className="border p-2 bg-gray-50"></td>
          </>
        )}
      </tr>
      {measCount > 1 && measurements.slice(1).map((meas, mIdx) => {
        const measIdx = mIdx + 1;
        return (
          <tr key={meas?.id || measIdx} className="bg-white hover:bg-yellow-50 transition-colors">
            <td className="border p-1 bg-white">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copyAboveMeasurement(itemIdx, measIdx)}
                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-all shrink-0 font-extrabold text-xs"
                  title="Copy measurements from row above"
                >
                  ↓
                </button>
                <input
                  type="text"
                  value={meas?.description || ""}
                  onChange={(e) => updateMeasurement(itemIdx, measIdx, "description", e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
                  className="w-full bg-transparent px-2 py-1 text-left border rounded text-xs focus:bg-white focus:ring-1 focus:ring-blue-400 focus:outline-none transition-colors text-black"
                  placeholder="e.g. left side"
                />
              </div>
            </td>
            <td className="border p-1 bg-white"><NumericInput value={meas?.no} onChange={(val) => updateMeasurement(itemIdx, measIdx, "no", val)} /></td>
            <td className="border p-1 bg-white"><NumericInput value={meas?.l} onChange={(val) => updateMeasurement(itemIdx, measIdx, "l", val)} /></td>
            <td className="border p-1 bg-white"><NumericInput value={meas?.b} onChange={(val) => updateMeasurement(itemIdx, measIdx, "b", val)} /></td>
            <td className="border p-1 bg-white"><NumericInput value={meas?.h} onChange={(val) => updateMeasurement(itemIdx, measIdx, "h", val)} /></td>
            <td className="border p-2 text-center font-bold text-blue-900 bg-gray-50/50">{meas?.total === 0 || !meas?.total ? "-" : Number(meas.total).toFixed(3)}</td>
            <td className="border p-2 text-center bg-white"><button onClick={() => removeMeasurement(itemIdx, measIdx)} className="text-red-400 hover:text-red-600 hover:scale-125 transition-all" title="Delete">❌</button></td>
          </tr>
        );
      })}
      <tr className="bg-blue-50/60">
        <td colSpan={5} className="border p-2 font-bold text-gray-700 text-xs align-middle">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={item?.usePercent || false}
                  onChange={(e) => updateItemPercent(itemIdx, e.target.checked, item?.percentValue || 100)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-gray-600 text-[11px] font-semibold">Apply % of Total</span>
              </label>

              {item?.usePercent && (
                <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-150">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={item?.percentValue !== undefined ? item.percentValue : 100}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                      updateItemPercent(itemIdx, true, val);
                    }}
                    onBlur={() => {
                      if (item?.percentValue === "" || item?.percentValue === undefined || isNaN(item?.percentValue)) {
                        updateItemPercent(itemIdx, true, 100);
                      }
                    }}
                    className="w-12 border border-gray-300 rounded px-1.5 py-0.5 text-center text-xs font-bold focus:ring-1 focus:ring-blue-400 focus:outline-none bg-white text-black"
                  />
                  <span className="text-gray-600 font-bold text-xs">%</span>
                  <span className="text-gray-400 text-[10px] italic font-normal">
                    (i.e. {rawSum.toFixed(3)} × {item.percentValue || 100}%)
                  </span>
                </div>
              )}
            </div>

            <span className="uppercase text-xs tracking-wider font-bold">Total Qty:</span>
          </div>
        </td>
        <td className="border p-2 text-center font-extrabold text-blue-900 text-[15px] align-middle">
          {item?.totalQty === 0 || !item?.totalQty ? "-" : Number(item.totalQty).toFixed(3)}
        </td>
        <td className="border p-2"></td>
      </tr>
    </React.Fragment>
  );
});