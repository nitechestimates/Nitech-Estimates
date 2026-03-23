"use client";
import React, { useState, useRef, useEffect } from "react";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

// Numeric Input
function NumericInput({ value, onChange }) {
  const [displayValue, setDisplayValue] = useState(() =>
    value !== undefined && value !== null ? value.toFixed(2) : "0.00"
  );
  const inputRef = useRef(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDisplayValue(
        value !== undefined && value !== null ? value.toFixed(2) : "0.00"
      );
    }
  }, [value]);

  const handleFocus = () => {
    const raw = value !== undefined && value !== null ? value.toString() : "";
    setDisplayValue(raw);
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num)) onChange(num);
    else onChange(0);
  };

  const handleBlur = () => {
    let num = parseFloat(displayValue);
    if (isNaN(num)) num = 0;
    const formatted = num.toFixed(2);
    setDisplayValue(formatted);
    onChange(parseFloat(formatted));
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className="text-center w-full"
    />
  );
}

// Auto-expand textarea
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
      className="w-full resize-none overflow-hidden bg-transparent p-1 text-center"
    />
  );
}

export default function RateAnalysisPage() {
  const [rows, setRows] = useState([]);
  const [itemCode, setItemCode] = useState("");
  const [insertIndex, setInsertIndex] = useState(null);
  const [nameOfWork, setNameOfWork] = useState("");
  const [isLoaded, setIsLoaded] = useState(false); // ✅ flag to prevent initial overwrite

  // ✅ LOAD from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("ra_rows");
    if (saved) {
      setRows(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  // ✅ SAVE to localStorage – only after data is loaded
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("ra_rows", JSON.stringify(rows));
    }
  }, [rows, isLoaded]);

  const addItem = async () => {
    if (!itemCode) return;

    const res = await fetch(`/api/get-item?code=${itemCode}`);
    const data = await res.json();

    const completedRate =
      parseFloat(
        data["Completed Rate for 2021-22 excluding GST In Rs."]
      ) || 0;

    const newRow = calculateRow({
      id: Date.now().toString(),
      srNo: 0,
      ssr: itemCode,
      description: data["Description of the item"] || "",
      unit: data["Unit"] || "",
      basicRate: completedRate,
      specs: data["Additional Specification"] || "",
      deduct: 0,
      materials: [
        {
          id: Date.now().toString() + "-mat1",
          name: "",
          qty: 0,
          lead: 0,
        },
      ],
      tribal: 0,
    });

    let updated = [...rows];

    if (insertIndex !== null) updated.splice(insertIndex, 0, newRow);
    else updated.push(newRow);

    setRows(updated.map((r, i) => ({ ...r, srNo: i + 1 })));
    setInsertIndex(null);
    setItemCode("");
  };

  const calculateRow = (row) => {
    const netAfterDeduct = row.basicRate - row.deduct;
    const totalLead = row.materials.reduce(
      (sum, m) => sum + (m.qty * m.lead),
      0
    );
    const total = netAfterDeduct + totalLead;
    const netTotal = total + row.tribal;

    return { ...row, netAfterDeduct, totalLead, total, netTotal };
  };

  const updateRow = (i, field, value) => {
    const updated = [...rows];
    updated[i][field] = value;
    updated[i] = calculateRow(updated[i]);
    setRows(updated);
  };

  const updateMaterial = (rowIndex, materialIndex, field, value) => {
    const updated = [...rows];
    updated[rowIndex].materials[materialIndex][field] = value;
    updated[rowIndex] = calculateRow(updated[rowIndex]);
    setRows(updated);
  };

  const addMaterial = (rowIndex) => {
    const updated = [...rows];
    updated[rowIndex].materials.push({
      id: Date.now().toString() + "-mat" + Math.random(),
      name: "",
      qty: 0,
      lead: 0,
    });
    setRows(updated);
  };

  const removeMaterial = (rowIndex, materialIndex) => {
    const updated = [...rows];
    updated[rowIndex].materials.splice(materialIndex, 1);
    if (updated[rowIndex].materials.length === 0) {
      updated[rowIndex].materials.push({
        id: Date.now().toString() + "-mat-empty",
        name: "",
        qty: 0,
        lead: 0,
      });
    }
    updated[rowIndex] = calculateRow(updated[rowIndex]);
    setRows(updated);
  };

  const deleteRow = (id) => {
    setRows(
      rows.filter((r) => r.id !== id).map((r, i) => ({ ...r, srNo: i + 1 }))
    );
  };

  const refreshRow = async (i) => {
    if (!confirm("Revert to default SSR values? Your edits will be lost."))
      return;

    const code = rows[i].ssr;
    const res = await fetch(`/api/get-item?code=${code}`);
    const data = await res.json();

    const completedRate =
      parseFloat(
        data["Completed Rate for 2021-22 excluding GST In Rs."]
      ) || 0;

    const updated = [...rows];
    updated[i] = calculateRow({
      ...updated[i],
      description: data["Description of the item"],
      unit: data["Unit"],
      basicRate: completedRate,
      specs: data["Additional Specification"],
      deduct: 0,
      materials: [
        {
          id: Date.now().toString() + "-mat1",
          name: "",
          qty: 0,
          lead: 0,
        },
      ],
      tribal: 0,
    });

    setRows(updated);
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);

    const newRows = arrayMove(rows, oldIndex, newIndex);
    setRows(newRows.map((r, i) => ({ ...r, srNo: i + 1 })));
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0.00";
    return num.toFixed(2);
  };

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      {/* Name of Work */}
      <div className="mb-4">
        <span className="font-bold">Name of Work: </span>
        <input
          value={nameOfWork}
          onChange={(e) => setNameOfWork(e.target.value)}
          className="border p-1 w-[400px]"
        />
      </div>

      {/* Add Item */}
      <div className="flex gap-2 mb-4">
        <input
          value={itemCode}
          onChange={(e) => setItemCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          className="border p-2"
          placeholder="SSR Item No"
        />
        <button onClick={addItem} className="bg-black text-white px-4">
          Add Item
        </button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={rows.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="overflow-x-auto">
            <table className="w-full border text-xs bg-white" style={{ minWidth: '1200px' }}>
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 text-center">☰</th>
                  <th className="border p-2 text-center">Sr</th>
                  <th className="border p-2 text-center">SSR</th>
                  <th className="border p-2 text-center w-[420px]">Description</th>
                  <th className="border p-2 text-center">Unit</th>
                  <th className="border p-2 text-center">Basic Rate</th>
                  <th className="border p-2 text-center">Deduct</th>
                  <th className="border p-2 text-center">Net (5-6)</th>
                  <th className="border p-2 text-center">Type of material required</th>
                  <th className="border p-2 text-center">Qty</th>
                  <th className="border p-2 text-center">Net lead charges</th>
                  <th className="border p-2 text-center">Total lead charges</th>
                  <th className="border p-2 text-center">Total (7+11)</th>
                  <th className="border p-2 text-center">Tribal</th>
                  <th className="border p-2 text-center">Net Total</th>
                  <th className="border p-2 text-center">Specs</th>
                  <th className="border text-center">🔄</th>
                  <th className="border text-center">❌</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <React.Fragment key={row.id}>
                    {/* Insert row */}
                    <tr>
                      <td colSpan={18} className="border text-center">
                        <button
                          onClick={() =>
                            setInsertIndex(insertIndex === i ? null : i)
                          }
                          className={`px-4 transition-all duration-200 ${
                            insertIndex === i
                              ? "bg-blue-500 text-white font-bold scale-110"
                              : "text-blue-600 hover:scale-105"
                          }`}
                        >
                          ➕ Insert Here
                        </button>
                      </td>
                    </tr>

                    <SortableRow
                      row={row}
                      index={i}
                      updateRow={updateRow}
                      updateMaterial={updateMaterial}
                      addMaterial={addMaterial}
                      removeMaterial={removeMaterial}
                      deleteRow={deleteRow}
                      refreshRow={refreshRow}
                      formatNumber={formatNumber}
                    />
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Sortable Row with multi-material support
function SortableRow({
  row,
  index,
  updateRow,
  updateMaterial,
  addMaterial,
  removeMaterial,
  deleteRow,
  refreshRow,
  formatNumber,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-yellow-50">
      {/* Drag handle */}
      <td
        {...attributes}
        {...listeners}
        className="border p-2 cursor-grab active:cursor-grabbing hover:bg-gray-100 transition-colors text-center"
      >
        ☰
      </td>

      <td className="border p-2 text-center">{row.srNo}</td>
      <td className="border p-2 text-center">{row.ssr}</td>

      {/* Description */}
      <td className="border p-2">
        <AutoTextarea
          value={row.description}
          onChange={(e) => updateRow(index, "description", e.target.value)}
        />
      </td>

      {/* Unit */}
      <td className="border p-2">
        <AutoTextarea
          value={row.unit}
          onChange={(e) => updateRow(index, "unit", e.target.value)}
        />
      </td>

      {/* Basic Rate */}
      <td className="border p-2">
        <NumericInput
          value={row.basicRate}
          onChange={(val) => updateRow(index, "basicRate", val)}
        />
      </td>

      {/* Deduct */}
      <td className="border p-2">
        <NumericInput
          value={row.deduct}
          onChange={(val) => updateRow(index, "deduct", val)}
        />
      </td>

      {/* Net (5-6) */}
      <td className="border p-2 text-center">{formatNumber(row.netAfterDeduct)}</td>

      {/* Material rows */}
      <td className="border p-2" colSpan={3}>
        <div className="space-y-2">
          {row.materials.map((mat, matIdx) => (
            <div key={mat.id} className="flex gap-1 items-center border-b pb-1">
              <input
                type="text"
                placeholder="Material"
                value={mat.name}
                onChange={(e) =>
                  updateMaterial(index, matIdx, "name", e.target.value)
                }
                className="w-28 p-1 border text-center"
              />
              <NumericInput
                value={mat.qty}
                onChange={(val) => updateMaterial(index, matIdx, "qty", val)}
              />
              <NumericInput
                value={mat.lead}
                onChange={(val) => updateMaterial(index, matIdx, "lead", val)}
              />
              <button
                onClick={() => removeMaterial(index, matIdx)}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => addMaterial(index)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            + Add material
          </button>
        </div>
      </td>

      {/* Total Lead (sum of materials) */}
      <td className="border p-2 text-center">{formatNumber(row.totalLead)}</td>

      {/* Total (net + totalLead) */}
      <td className="border p-2 text-center">{formatNumber(row.total)}</td>

      {/* Tribal */}
      <td className="border p-2">
        <NumericInput
          value={row.tribal}
          onChange={(val) => updateRow(index, "tribal", val)}
        />
      </td>

      {/* Net Total */}
      <td className="border p-2 text-center">{formatNumber(row.netTotal)}</td>

      {/* Specs */}
      <td className="border p-2">
        <AutoTextarea
          value={row.specs}
          onChange={(e) => updateRow(index, "specs", e.target.value)}
        />
      </td>

      {/* Refresh */}
      <td className="border p-2 text-center">
        <button
          onClick={() => refreshRow(index)}
          className="hover:bg-gray-200 rounded p-1 transition-colors"
        >
          🔄
        </button>
      </td>

      {/* Delete */}
      <td className="border p-2 text-center">
        <button
          onClick={() => deleteRow(row.id)}
          className="hover:bg-red-100 rounded p-1 transition-colors"
        >
          ❌
        </button>
      </td>
    </tr>
  );
}