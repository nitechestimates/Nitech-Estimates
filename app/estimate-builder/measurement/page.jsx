"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Tabs from "../components/Tabs";
import { useStore } from "@/lib/store";

function AutoTextarea({ value, onChange }) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [prevValue, setPrevValue] = useState(value);
  const ref = useRef(null);

  if (value !== prevValue) {
    setLocalValue(value ?? "");
    setPrevValue(value);
  }

  const adjustHeight = () => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  };

  useEffect(() => { adjustHeight(); }, [localValue]);

  const handleChange = (e) => { 
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return <textarea ref={ref} value={localValue} onChange={handleChange} onBlur={handleBlur} className="w-full resize-none overflow-hidden bg-transparent p-1 text-left" />;
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
      return;
    }
    raw = raw.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 3) raw = parts[0] + "." + parts[1].slice(0, 3);
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
      className={`text-center w-full border border-slate-200/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-2 py-1 transition-all ${disabled ? "bg-slate-100/50 text-slate-500 cursor-not-allowed" : "bg-slate-50/60 hover:bg-blue-50/80 hover:border-blue-300 focus:bg-white"}`}
      placeholder="-"
    />
  );
}

function LocalTextInput({ value, onChange, className = "", placeholder = "" }) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setLocalValue(value ?? "");
    setPrevValue(value);
  }

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
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
}

function LocalPercentInput({ value, onChange, onBlur, tabIndex }) {
  const [localVal, setLocalVal] = useState(value ?? 100);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setLocalVal(value ?? 100);
    setPrevValue(value);
  }

  return (
    <input
      type="number"
      min="0"
      max="100"
      step="1"
      value={localVal}
      tabIndex={tabIndex}
      onChange={(e) => setLocalVal(e.target.value === "" ? "" : parseFloat(e.target.value))}
      onBlur={() => {
        if (localVal === "" || isNaN(localVal)) {
          onChange(100);
          if (onBlur) onBlur(100);
        } else {
          onChange(localVal);
          if (onBlur) onBlur(localVal);
        }
      }}
      className="w-12 border border-slate-200 rounded-xl px-1.5 py-1 text-center text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white/80 text-black shadow-sm transition-all"
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

  if (loading) return <div className="p-4 bg-slate-50/50 min-h-screen text-black"><Tabs /><div className="flex justify-center items-center h-64">Loading...</div></div>;

  return (
    <div className="p-4 bg-slate-50/50 min-h-screen text-black">
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
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          Save
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white/60 backdrop-blur-xl">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50/90 text-slate-600 text-xs uppercase tracking-wider sticky top-0 z-10 border border-slate-200">
            <tr className="text-center font-bold">
              <th className="border border-slate-200 p-3 w-[50px]">Sr. No.</th>
              <th className="border border-slate-200 p-3 w-[350px]">DESCRIPTION OF ITEM</th>
              <th className="border border-slate-200 p-3 w-[220px]">PARTICULARS (Measurement Name)</th>
              <th className="border border-slate-200 p-3 w-[80px]">No.</th>
              <th className="border border-slate-200 p-3 w-[100px]">L.</th>
              <th className="border border-slate-200 p-3 w-[100px]">B/W</th>
              <th className="border border-slate-200 p-3 w-[100px]">H/D.</th>
              <th className="border border-slate-200 p-3 w-[120px]">TOTAL</th>
              <th className="border border-slate-200 p-3 w-[80px]">UNIT</th>
              <th className="border border-slate-200 p-3 w-[60px]"></th>
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
      <tr className="bg-white/40 border border-slate-200 group hover:bg-blue-50/60 transition-colors">
        <td className="border border-slate-200 p-3 text-center font-medium text-slate-700 align-top" rowSpan={rowSpan}><div className="mt-2">{item?.srNo}</div></td>
        <td className="border border-slate-200 p-3 align-top" rowSpan={rowSpan}>
          <AutoTextarea value={item?.description || ""} onChange={(val) => updateDescription(itemIdx, val)} />
          <div className="mt-4 mb-2 flex justify-start"><button onClick={() => addMeasurement(itemIdx)} tabIndex={-1} className="text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors shadow-sm">+ Add Meas</button></div>
        </td>
        {measCount > 0 ? (
          <>
            <td className="border border-slate-200 p-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copyAboveMeasurement(itemIdx, 0)}
                  tabIndex={-1}
                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all shrink-0 font-extrabold text-xs"
                  title={itemIdx > 0 ? "Copy measurements from last row of item above" : "Duplicate this row below"}
                >
                  ↓
                </button>
                <LocalTextInput
                  value={measurements[0]?.description || ""}
                  onChange={(val) => updateMeasurement(itemIdx, 0, "description", val)}
                  className="w-full bg-slate-50/60 px-3 py-1.5 text-left border border-slate-200/50 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-black hover:border-blue-300 hover:bg-blue-50/80"
                  placeholder="e.g. below soling"
                />
              </div>
            </td>
            <td className="border border-slate-200 p-2"><NumericInput value={measurements[0]?.no} onChange={(val) => updateMeasurement(itemIdx, 0, "no", val)} /></td>
            <td className="border border-slate-200 p-2"><NumericInput value={measurements[0]?.l} onChange={(val) => updateMeasurement(itemIdx, 0, "l", val)} /></td>
            <td className="border border-slate-200 p-2"><NumericInput value={measurements[0]?.b} onChange={(val) => updateMeasurement(itemIdx, 0, "b", val)} /></td>
            <td className="border border-slate-200 p-2"><NumericInput value={measurements[0]?.h} onChange={(val) => updateMeasurement(itemIdx, 0, "h", val)} /></td>
            <td className="border border-slate-200 p-3 text-center font-medium text-slate-800">{measurements[0]?.total === 0 || !measurements[0]?.total ? "-" : Number(measurements[0].total).toFixed(3)}</td>
            <td className="border border-slate-200 p-3 text-center font-medium text-slate-500 whitespace-pre-line align-middle" rowSpan={measCount}>{item?.unit}</td>
            <td className="border border-slate-200 p-3 text-center"><button onClick={() => removeMeasurement(itemIdx, 0)} tabIndex={-1} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all" title="Delete">❌</button></td>
          </>
        ) : (
          <>
            <td className="border border-slate-200 p-4 text-center text-slate-400 italic" colSpan={6}>Click &ldquo;+ Add Meas&rdquo; to enter measurements</td>
            <td className="border border-slate-200 p-3 text-center font-medium text-slate-500 whitespace-pre-line align-middle">{item?.unit}</td>
            <td className="border border-slate-200 p-3"></td>
          </>
        )}
      </tr>
      {measCount > 1 && measurements.slice(1).map((meas, mIdx) => {
        const measIdx = mIdx + 1;
        return (
          <tr key={meas?.id || measIdx} className="bg-white/40 border border-slate-200 hover:bg-blue-50/60 transition-colors">
            <td className="border border-slate-200 p-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copyAboveMeasurement(itemIdx, measIdx)}
                  tabIndex={-1}
                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all shrink-0 font-extrabold text-xs"
                  title="Copy measurements from row above"
                >
                  ↓
                </button>
                <LocalTextInput
                  value={meas?.description || ""}
                  onChange={(val) => updateMeasurement(itemIdx, measIdx, "description", val)}
                  className="w-full bg-slate-50/60 px-3 py-1.5 text-left border border-slate-200/50 rounded-xl text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-black hover:border-blue-300 hover:bg-blue-50/80"
                  placeholder="e.g. left side"
                />
              </div>
            </td>
            <td className="border border-slate-200 p-2"><NumericInput value={meas?.no} onChange={(val) => updateMeasurement(itemIdx, measIdx, "no", val)} /></td>
            <td className="border border-slate-200 p-2"><NumericInput value={meas?.l} onChange={(val) => updateMeasurement(itemIdx, measIdx, "l", val)} /></td>
            <td className="border border-slate-200 p-2"><NumericInput value={meas?.b} onChange={(val) => updateMeasurement(itemIdx, measIdx, "b", val)} /></td>
            <td className="border border-slate-200 p-2"><NumericInput value={meas?.h} onChange={(val) => updateMeasurement(itemIdx, measIdx, "h", val)} /></td>
            <td className="border border-slate-200 p-3 text-center font-medium text-slate-800">{meas?.total === 0 || !meas?.total ? "-" : Number(meas.total).toFixed(3)}</td>
            <td className="border border-slate-200 p-3 text-center"><button onClick={() => removeMeasurement(itemIdx, measIdx)} tabIndex={-1} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all" title="Delete">❌</button></td>
          </tr>
        );
      })}
      <tr className="bg-slate-50/80 border-t-2 border-slate-300">
        <td colSpan={5} className="border border-slate-200 p-3 font-medium text-slate-700 text-xs align-middle">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={item?.usePercent || false}
                  tabIndex={-1}
                  onChange={(e) => updateItemPercent(itemIdx, e.target.checked, item?.percentValue || 100)}
                  className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer transition-colors"
                />
                <span className="text-slate-600 text-xs font-semibold">Apply % of Total</span>
              </label>

              {item?.usePercent && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-150">
                  <LocalPercentInput
                    value={item?.percentValue !== undefined ? item.percentValue : 100}
                    tabIndex={-1}
                    onChange={(val) => {
                      updateItemPercent(itemIdx, true, val);
                    }}
                    onBlur={(val) => {
                      if (val === "" || val === undefined || isNaN(val)) {
                        updateItemPercent(itemIdx, true, 100);
                      }
                    }}
                  />
                  <span className="text-slate-600 font-bold text-xs">%</span>
                  <span className="text-slate-400 text-[11px] italic font-normal">
                    (i.e. {rawSum.toFixed(3)} × {item.percentValue || 100}%)
                  </span>
                </div>
              )}
            </div>

            <span className="uppercase text-xs tracking-wider font-bold text-slate-500">Total Qty:</span>
          </div>
        </td>
        <td className="border border-slate-200 p-3 text-center align-middle">
          {item?.usePercent && (
            <div className="text-[14px] text-amber-600 font-medium leading-none mb-1" title="Raw sum before %">
              {rawSum.toFixed(3)}
            </div>
          )}
          <div className="font-bold text-slate-800 text-[16px]">
            {item?.totalQty === 0 || !item?.totalQty ? "-" : Number(item.totalQty).toFixed(3)}
          </div>
        </td>
        <td className="border border-slate-200 p-3 text-center font-medium text-slate-700 align-middle">
          {item?.unit}
        </td>
        <td className="border border-slate-200 p-3"></td>
      </tr>
    </React.Fragment>
  );
});