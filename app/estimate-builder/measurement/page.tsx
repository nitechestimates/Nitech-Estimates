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
    const raRows = localStorage.getItem("ra_rows");
    if (!raRows) {
      setItems([]);
      localStorage.setItem("measurement_items", JSON.stringify([]));
      return;
    }
    const parsedRA = JSON.parse(raRows);
    const existingMap = new Map();
    items.forEach((item) => existingMap.set(item.id, item));

    const newItems = [];
    for (const raItem of parsedRA) {
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
    // Start with completely blank ("") values
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
    
    // Helper to extract a clean number, treating blanks as null
    const getVal = (val) => (val === "" || val === null || val === undefined || isNaN(val)) ? null : parseFloat(val);

    const noVal = getVal(meas.no);
    const lVal = getVal(meas.l);
    const bVal = getVal(meas.b);
    const hVal = getVal(meas.h);

    // Filter out the nulls (blanks)
    const factors = [noVal, lVal, bVal, hVal].filter(v => v !== null);

    // If everything is blank, total is 0. Otherwise, multiply all the entered numbers together.
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
        <button onClick={syncFromRA} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Sync from RA
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border text-sm bg-white shadow-sm">
          <thead className="bg-gray-200">
            <tr className="text-center">
              <th className="border p-2">Sr. No.</th>
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
              return (
                <React.Fragment key={item.id}>
                  {/* Main Item Row */}
                  <tr className="bg-gray-50 border-t-4 border-gray-300">
                    <td className="border p-2 text-center font-bold text-gray-700">{item.srNo}</td>
                    <td className="border p-2">
                      <AutoTextarea
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[itemIdx].description = e.target.value;
                          setItems(updated);
                          localStorage.setItem("measurement_items", JSON.stringify(updated));
                        }}
                      />
                    </td>
                    <td colSpan={5} className="border p-2 text-center font-semibold text-blue-800">
                      Total Qty: {item.totalQty.toFixed(3)} {item.unit}
                    </td>
                    <td className="border p-2 text-center font-semibold">{item.unit}</td>
                    <td className="border p-2 text-center">
                      <button 
                        onClick={() => addMeasurement(itemIdx)} 
                        className="text-white bg-green-500 hover:bg-green-600 rounded px-2 py-1 text-xs font-bold transition-colors shadow-sm"
                      >
                        + Add
                      </button>
                    </td>
                  </tr>

                  {/* Measurement Sub-Rows */}
                  {item.measurements.map((meas, measIdx) => (
                    <tr key={meas.id} className="hover:bg-yellow-100 transition-colors">
                      <td className="border p-2 text-center bg-gray-50"></td>
                      <td className="border p-2 text-left text-xs text-gray-400 bg-gray-50">
                        <span className="ml-4 italic">Measurement {measIdx + 1}</span>
                      </td>
                      <td className="border p-1 bg-white">
                        <NumericInput value={meas.no} onChange={(val) => updateMeasurement(itemIdx, measIdx, "no", val)} />
                      </td>
                      <td className="border p-1 bg-white">
                        <NumericInput value={meas.l} onChange={(val) => updateMeasurement(itemIdx, measIdx, "l", val)} />
                      </td>
                      <td className="border p-1 bg-white">
                        <NumericInput value={meas.b} onChange={(val) => updateMeasurement(itemIdx, measIdx, "b", val)} />
                      </td>
                      <td className="border p-1 bg-white">
                        <NumericInput value={meas.h} onChange={(val) => updateMeasurement(itemIdx, measIdx, "h", val)} />
                      </td>
                      <td className="border p-2 text-center font-bold text-blue-900 bg-gray-50">
                        {meas.total === 0 ? "-" : meas.total.toFixed(3)}
                      </td>
                      <td className="border p-2 text-center text-gray-500 bg-gray-50">{item.unit}</td>
                      <td className="border p-2 text-center bg-gray-50">
                        <button 
                          onClick={() => removeMeasurement(itemIdx, measIdx)} 
                          className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded p-1 transition-colors"
                          title="Delete Measurement"
                        >
                          ❌
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="mt-8 text-center text-gray-500 p-8 border-2 border-dashed border-gray-300 rounded-lg">
          No items found. Please add items in Rate Analysis first, then click "Sync from RA".
        </div>
      )}
    </div>
  );
}