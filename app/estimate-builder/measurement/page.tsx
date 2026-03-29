"use client";
import React, { useState, useEffect, useRef } from "react";
import Tabs from "../components/Tabs";

function AutoTextarea({ value, onChange }) {
  const ref = useRef(null);
  const adjustHeight = () => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  };
  useEffect(() => {
    adjustHeight();
  }, [value]);
  const handleChange = (e) => {
    onChange(e);
    adjustHeight();
  };
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      className="w-full resize-none overflow-hidden bg-transparent p-1 text-left"
    />
  );
}

// NumericInput supporting blank ("") values
function NumericInput({ value, onChange, disabled = false }) {
  const [displayValue, setDisplayValue] = useState(
    value !== undefined && value !== null && value !== "" ? Number(value).toFixed(3) : ""
  );
  const inputRef = useRef(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      if (value === "" || value === null || value === undefined) {
        setDisplayValue("");
      } else {
        setDisplayValue(Number(value).toFixed(3));
      }
    }
  }, [value]);

  const handleFocus = () => {
    if (value === "" || value === null || value === undefined) {
      setDisplayValue("");
    } else {
      setDisplayValue(Number(value).toString());
    }
  };

  const handleChange = (e) => {
    let raw = e.target.value;
    if (raw === "") {
      setDisplayValue("");
      onChange("");
      return;
    }
    raw = raw.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 3)
      raw = parts[0] + "." + parts[1].slice(0, 3);
    setDisplayValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num)) onChange(num);
  };

  const handleBlur = () => {
    if (displayValue === "") {
      onChange("");
    } else {
      let num = parseFloat(displayValue);
      if (isNaN(num)) {
        setDisplayValue("");
        onChange("");
      } else {
        setDisplayValue(num.toFixed(3));
        onChange(num);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current.blur();
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
      disabled={disabled}
      className={`text-center w-full border rounded px-1 py-0.5 focus:bg-white transition-colors ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-transparent hover:bg-white"}`}
      placeholder="-"
    />
  );
}

export default function MeasurementPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const saved = localStorage.getItem("measurement_items");
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      syncFromRA();
    }
    setLoading(false);
  };

  const syncFromRA = () => {
    const raRowsStr = localStorage.getItem("ra_rows");
    const raBottomRowsStr = localStorage.getItem("ra_bottom_rows");

    let parsedRA = [];
    if (raRowsStr) parsedRA = JSON.parse(raRowsStr);

    let parsedBottomRA = [];
    if (raBottomRowsStr) parsedBottomRA = JSON.parse(raBottomRowsStr);

    const allRaRows = [...parsedRA, ...parsedBottomRA];

    if (allRaRows.length === 0) {
      setItems([]);
      localStorage.setItem("measurement_items", JSON.stringify([]));
      return;
    }

    const existingMap = new Map();
    items.forEach((item) => existingMap.set(item.id, item));

    const newItems = [];
    for (const raItem of allRaRows) {
      const existing = existingMap.get(raItem.id);
      if (existing) {
        newItems.push({
          ...existing,
          description: raItem.description,
          unit: raItem.unit,
          srNo: newItems.length + 1,
        });
      } else {
        newItems.push({
          id: raItem.id,
          srNo: newItems.length + 1,
          description: raItem.description,
          unit: raItem.unit,
          measurements: [],
          totalQty: 0,
        });
      }
    }
    
    setItems(newItems);
    localStorage.setItem("measurement_items", JSON.stringify(newItems));
  };

  const addMeasurement = (itemIndex) => {
    const updated = [...items];
    updated[itemIndex].measurements.push({
      id: Date.now() + Math.random(),
      no: "",
      l: "",
      b: "",
      h: "",
      total: 0,
    });
    updated[itemIndex].totalQty = recalcItemTotal(updated[itemIndex]);
    setItems(updated);
    localStorage.setItem("measurement_items", JSON.stringify(updated));
  };

  const updateMeasurement = (itemIndex, measIndex, field, value) => {
    const updated = [...items];
    const meas = updated[itemIndex].measurements[measIndex];
    meas[field] = value;
    
    const getVal = (val) => (val === "" || val === null || val === undefined || isNaN(val)) ? null : parseFloat(val);

    const noVal = getVal(meas.no);
    const lVal = getVal(meas.l);
    const bVal = getVal(meas.b);
    const hVal = getVal(meas.h);

    const factors = [noVal, lVal, bVal, hVal].filter(v => v !== null);

    if (factors.length === 0) {
      meas.total = 0;
    } else {
      meas.total = factors.reduce((acc, curr) => acc * curr, 1);
    }
    
    updated[itemIndex].totalQty = recalcItemTotal(updated[itemIndex]);
    setItems(updated);
    localStorage.setItem("measurement_items", JSON.stringify(updated));
  };

  const removeMeasurement = (itemIndex, measIndex) => {
    if (!confirm("Delete this measurement?")) return;
    const updated = [...items];
    updated[itemIndex].measurements.splice(measIndex, 1);
    updated[itemIndex].totalQty = recalcItemTotal(updated[itemIndex]);
    setItems(updated);
    localStorage.setItem("measurement_items", JSON.stringify(updated));
  };

  const recalcItemTotal = (item) => {
    return item.measurements.reduce((sum, m) => sum + (m.total || 0), 0);
  };

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      <Tabs />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Measurement Sheet</h1>
        <button onClick={syncFromRA} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-md transition-all active:scale-95">
          Sync from RA
        </button>
      </div>

      <div className="overflow-x-auto rounded border shadow-sm">
        <table className="w-full border text-sm bg-white">
          <thead className="bg-gray-200 border-b-2 border-gray-300">
            <tr className="text-center font-bold text-gray-700">
              <th className="border p-2 w-[50px]">Sr. No.</th>
              <th className="border p-2 w-[400px]">DESCRIPTION OF ITEM</th>
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
            {items.map((item, itemIdx) => {
              const measCount = item.measurements.length;
              // rowSpan = 1 for each measurement + 1 for the Total row. Minimum 2.
              const rowSpan = measCount > 0 ? measCount + 1 : 2;

              return (
                <React.Fragment key={item.id}>
                  {/* === FIRST ROW OF THE ITEM === */}
                  <tr className="bg-white border-t-4 border-gray-400 group">
                    {/* SR NO (Spans all measurements + total row) */}
                    <td className="border p-2 text-center font-bold text-gray-700 align-top bg-gray-50/50" rowSpan={rowSpan}>
                      <div className="mt-2">{item.srNo}</div>
                    </td>

                    {/* DESCRIPTION (Spans all measurements + total row) */}
                    <td className="border p-2 align-top bg-gray-50/20" rowSpan={rowSpan}>
                      <AutoTextarea
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[itemIdx].description = e.target.value;
                          setItems(updated);
                          localStorage.setItem("measurement_items", JSON.stringify(updated));
                        }}
                      />
                      <div className="mt-4 mb-2 flex justify-start">
                        <button 
                          onClick={() => addMeasurement(itemIdx)} 
                          className="text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 rounded px-3 py-1 text-xs font-bold transition-colors shadow-sm"
                        >
                          + Add Meas
                        </button>
                      </div>
                    </td>

                    {/* FIRST MEASUREMENT (Or placeholder if empty) */}
                    {measCount > 0 ? (
                      <>
                        <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={item.measurements[0].no} onChange={(val) => updateMeasurement(itemIdx, 0, "no", val)} /></td>
                        <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={item.measurements[0].l} onChange={(val) => updateMeasurement(itemIdx, 0, "l", val)} /></td>
                        <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={item.measurements[0].b} onChange={(val) => updateMeasurement(itemIdx, 0, "b", val)} /></td>
                        <td className="border p-1 bg-white hover:bg-yellow-50"><NumericInput value={item.measurements[0].h} onChange={(val) => updateMeasurement(itemIdx, 0, "h", val)} /></td>
                        <td className="border p-2 text-center font-bold text-blue-900 bg-gray-50/50">
                          {item.measurements[0].total === 0 ? "-" : item.measurements[0].total.toFixed(3)}
                        </td>
                        <td className="border p-2 text-center font-semibold text-gray-500 whitespace-pre-line align-top bg-gray-50/50" rowSpan={rowSpan}>
                          <div className="mt-2">{item.unit}</div>
                        </td>
                        <td className="border p-2 text-center bg-white">
                          <button onClick={() => removeMeasurement(itemIdx, 0)} className="text-red-400 hover:text-red-600 hover:scale-125 transition-all" title="Delete">❌</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border p-4 text-center text-gray-400 italic bg-gray-50" colSpan={5}>
                          Click "+ Add Meas" to enter measurements
                        </td>
                        <td className="border p-2 text-center font-semibold text-gray-500 whitespace-pre-line align-top bg-gray-50/50" rowSpan={rowSpan}>
                          <div className="mt-2">{item.unit}</div>
                        </td>
                        <td className="border p-2 bg-gray-50"></td>
                      </>
                    )}
                  </tr>

                  {/* === SUBSEQUENT MEASUREMENTS === */}
                  {measCount > 1 && item.measurements.slice(1).map((meas, mIdx) => {
                    const measIdx = mIdx + 1;
                    return (
                      <tr key={meas.id} className="bg-white hover:bg-yellow-50 transition-colors">
                        <td className="border p-1 bg-white"><NumericInput value={meas.no} onChange={(val) => updateMeasurement(itemIdx, measIdx, "no", val)} /></td>
                        <td className="border p-1 bg-white"><NumericInput value={meas.l} onChange={(val) => updateMeasurement(itemIdx, measIdx, "l", val)} /></td>
                        <td className="border p-1 bg-white"><NumericInput value={meas.b} onChange={(val) => updateMeasurement(itemIdx, measIdx, "b", val)} /></td>
                        <td className="border p-1 bg-white"><NumericInput value={meas.h} onChange={(val) => updateMeasurement(itemIdx, measIdx, "h", val)} /></td>
                        <td className="border p-2 text-center font-bold text-blue-900 bg-gray-50/50">
                          {meas.total === 0 ? "-" : meas.total.toFixed(3)}
                        </td>
                        <td className="border p-2 text-center bg-white">
                          <button onClick={() => removeMeasurement(itemIdx, measIdx)} className="text-red-400 hover:text-red-600 hover:scale-125 transition-all" title="Delete">❌</button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* === TOTAL ROW === */}
                  <tr className="bg-blue-50/60">
                    <td colSpan={4} className="border p-2 text-right font-bold text-gray-700 uppercase pr-4 text-xs tracking-wider">
                      Total Qty:
                    </td>
                    <td className="border p-2 text-center font-extrabold text-blue-900 text-[15px]">
                      {item.totalQty === 0 ? "-" : item.totalQty.toFixed(3)}
                    </td>
                    <td className="border p-2"></td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="mt-8 text-center text-gray-500 p-8 border-2 border-dashed border-gray-300 rounded-lg bg-white">
          No items found. Please add items in Rate Analysis first, then click "Sync from RA".
        </div>
      )}
    </div>
  );
}