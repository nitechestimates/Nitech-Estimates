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

function NumericInput({ value, onChange, disabled = false }) {
  const [displayValue, setDisplayValue] = useState(
    value !== undefined && value !== null ? value.toString() : "0"
  );
  const inputRef = useRef(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      const formatted = (value || 0).toFixed(3);
      setDisplayValue(formatted);
    }
  }, [value]);

  const handleFocus = () => {
    setDisplayValue((value || 0).toString());
  };

  const handleChange = (e) => {
    let raw = e.target.value;
    raw = raw.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 3)
      raw = parts[0] + "." + parts[1].slice(0, 3);
    setDisplayValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num)) onChange(num);
    else if (raw === "") onChange(0);
  };

  const handleBlur = () => {
    let num = parseFloat(displayValue);
    if (isNaN(num)) num = 0;
    const formatted = num.toFixed(3);
    setDisplayValue(formatted);
    onChange(num);
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
      className={`text-center w-full border rounded px-1 py-0.5 ${disabled ? "bg-gray-100" : ""}`}
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
    updated[itemIndex].measurements.push({
      id: Date.now() + Math.random(),
      no: 0,
      l: 0,
      b: 0,
      h: 0,
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
    const unit = updated[itemIndex].unit?.toLowerCase() || "";
    if (unit.includes("cubic") || unit.includes("cu.m")) {
      meas.total = (meas.no || 0) * (meas.l || 0) * (meas.b || 0) * (meas.h || 0);
    } else if (unit.includes("square") || unit.includes("sq.m")) {
      meas.total = (meas.no || 0) * (meas.l || 0) * (meas.b || 0);
    } else if (unit.includes("running") || unit.includes("rm") || unit.includes("metre")) {
      meas.total = (meas.no || 0) * (meas.l || 0);
    } else if (unit.includes("number") || unit.includes("no")) {
      meas.total = (meas.no || 0);
    } else {
      meas.total = (meas.no || 0) * (meas.l || 0) * (meas.b || 0) * (meas.h || 0);
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

  const getActiveFields = (unit) => {
    const u = unit?.toLowerCase() || "";
    if (u.includes("cubic") || u.includes("cu.m")) return { l: true, b: true, h: true };
    if (u.includes("square") || u.includes("sq.m")) return { l: true, b: true, h: false };
    if (u.includes("running") || u.includes("rm") || u.includes("metre")) return { l: true, b: false, h: false };
    if (u.includes("number") || u.includes("no")) return { l: false, b: false, h: false };
    return { l: true, b: true, h: true };
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
        <table className="w-full border text-sm bg-white">
          <thead className="bg-gray-200">
            <tr className="text-center">
              <th className="border p-2">Sr. No.</th>
              <th className="border p-2 w-[400px]">DESCRIPTION OF ITEM</th>
              <th className="border p-2">No.</th>
              <th className="border p-2">L.</th>
              <th className="border p-2">B/W</th>
              <th className="border p-2">H/D.</th>
              <th className="border p-2">TOTAL</th>
              <th className="border p-2">UNIT</th>
              <th className="border p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, itemIdx) => {
              const active = getActiveFields(item.unit);
              return (
                <React.Fragment key={item.id}>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="border p-2 text-center font-semibold">{item.srNo}</td>
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
                    <td colSpan={5} className="border p-2 text-center text-sm text-gray-500">
                      Total Qty: {item.totalQty.toFixed(3)} {item.unit}
                    </td>
                    <td className="border p-2 text-center">{item.unit}</td>
                    <td className="border p-2 text-center">
                      <button onClick={() => addMeasurement(itemIdx)} className="text-green-600 hover:bg-green-100 rounded p-1">
                        + Add
                      </button>
                    </td>
                  </tr>

                  {item.measurements.map((meas, measIdx) => (
                    <tr key={meas.id} className="hover:bg-yellow-50">
                      <td className="border p-2 text-center"></td>
                      <td className="border p-2 text-left text-xs text-gray-500"></td>
                      <td className="border p-2">
                        <NumericInput value={meas.no} onChange={(val) => updateMeasurement(itemIdx, measIdx, "no", val)} />
                      </td>
                      <td className="border p-2">
                        <NumericInput value={meas.l} onChange={(val) => updateMeasurement(itemIdx, measIdx, "l", val)} disabled={!active.l} />
                      </td>
                      <td className="border p-2">
                        <NumericInput value={meas.b} onChange={(val) => updateMeasurement(itemIdx, measIdx, "b", val)} disabled={!active.b} />
                      </td>
                      <td className="border p-2">
                        <NumericInput value={meas.h} onChange={(val) => updateMeasurement(itemIdx, measIdx, "h", val)} disabled={!active.h} />
                      </td>
                      <td className="border p-2 text-center">{meas.total.toFixed(3)}</td>
                      <td className="border p-2 text-center">{item.unit}</td>
                      <td className="border p-2 text-center">
                        <button onClick={() => removeMeasurement(itemIdx, measIdx)} className="text-red-600 hover:bg-red-100 rounded p-1">
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
        <div className="mt-4 text-center text-gray-500">
          No items found. Please add items in Rate Analysis first.
        </div>
      )}
    </div>
  );
}