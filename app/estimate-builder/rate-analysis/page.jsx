"use client";
import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Tabs from "../components/Tabs";

// ========== Helper: map material name to category ==========
function getCategoryFromMaterial(materialName) {
  const normalized = materialName.toLowerCase().trim();
  const mapping = {
    "Concrete Blocks  (Form)": ["concrete block", "form", "hollow block"],
    "Murum, Building Rubish, Earth": ["murrum", "building rubbish", "earth"],
    "Excavated Rock    soling stone": ["excavated rock", "soling stone"],
    "Sand, (crush metal)  Stone below 40 mm, Normal Brick sider aggre. Timber": [
      "sand", "stone below 40", "brick", "aggregate", "timber", "cr. metal", "brick sider"
    ],
    "Stone aggregate 40mm Normal size and above": ["stone aggregate 40mm", "stone aggregate above"],
    "Cement, Lime, Stone Block, GI, CI, CC & AC Pipes /  Sheet& Plate,  Glass in packs, Distemper, AC Sheet, Fitting Iron Sheet": [
      "cement", "lime", "stone block", "pipe", "sheet", "plate", "glass", "distemper", "ac sheet", "fitting iron"
    ],
    "Bricks           1000 nos      1cum=500 Bricks": ["brick"],
    "Tiles Half Round Tiles / Roofing Tiles / Manglore Tiles": ["tile", "roofing", "half round", "manlore"],
    "Steel        (MS, TMT, H.Y.S.D.) Structural Steel": ["steel", "ms", "tmt", "hysd", "structural"],
    "Flooring Tiles Ceramic/ Marbonate": ["ceramic", "marble", "granite", "flooring tile"],
  };

  for (const [category, keywords] of Object.entries(mapping)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return category;
    }
  }
  return null;
}

// ========== Helper: Get default materials based on description ==========
function getDefaultMaterialsForDescription(description, leadSettings) {
  const defaultMaterials = [
    { id: Date.now().toString() + "-mat1", name: "", qty: 0, lead: 0 }
  ];

  if (!description) return defaultMaterials;

  // Quantities from your table (image)
  const gradeMappings = {
    5:   { cement: 0.140, sand: 0.460, metal: 0.920 },
    7.5: { cement: 0.180, sand: 0.480, metal: 0.960 },
    10:  { cement: 0.220, sand: 0.450, metal: 0.910 },
    15:  { cement: 0.280, sand: 0.440, metal: 0.880 },
    20:  { cement: 0.310, sand: 0.420, metal: 0.840 },
    25:  { cement: 0.390, sand: 0.380, metal: 0.760 },
    30:  { cement: 0.420, sand: 0.360, metal: 0.720 },
    35:  { cement: 0.480, sand: 0.340, metal: 0.680 },
    40:  { cement: 0.500, sand: 0.320, metal: 0.640 },
    45:  { cement: 0.550, sand: 0.300, metal: 0.600 },
    50:  { cement: 0.600, sand: 0.280, metal: 0.560 },
  };

  // Regex to capture any of these grades (with optional dash or space)
  const gradePattern = /M\s*[-]?\s*(\d+(?:\.\d+)?)/i;
  const match = description.match(gradePattern);
  if (match) {
    const gradeNum = parseFloat(match[1]);
    const data = gradeMappings[gradeNum];
    if (data) {
      const materials = [
        { name: "Cement", qty: data.cement },
        { name: "Sand", qty: data.sand },
        { name: "Stone Below 40 Mm (Cr. Metal)", qty: data.metal }   // ✅ corrected material name
      ];
      return materials.map((mat, index) => {
        const category = getCategoryFromMaterial(mat.name);
        const leadCharge = leadSettings[category]?.leadCharge || 0;
        return {
          id: Date.now().toString() + `-mat-${index}-${Math.random().toString(36).slice(2, 7)}`,
          name: mat.name,
          qty: mat.qty,
          lead: leadCharge
        };
      });
    }
  }

  return defaultMaterials;
}

// ========== Numeric Input ==========
function NumericInput({ value, onChange, disabled = false, placeholder = "" }) {
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
      placeholder={placeholder}
      className="text-center w-full border rounded px-1 py-0.5 h-[26px] disabled:bg-gray-100"
    />
  );
}

// ========== Auto-expand textarea with break-keep ==========
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
      className="w-full resize-none overflow-hidden bg-transparent p-1 text-left break-keep"
    />
  );
}

export default function RateAnalysisPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const loadId = searchParams.get("load");
  const nameFromURL = searchParams.get("name");

  const [rows, setRows] = useState([]);
  const [itemCode, setItemCode] = useState("");
  const [insertIndex, setInsertIndex] = useState(null);
  const [nameOfWork, setNameOfWork] = useState(nameFromURL || "");
  const [isLoaded, setIsLoaded] = useState(false);
  const [materialList, setMaterialList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [currentEstimateId, setCurrentEstimateId] = useState(null);
  const [leadSettings, setLeadSettings] = useState({});

  // Load lead settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("leadSettings");
    if (saved) {
      setLeadSettings(JSON.parse(saved));
    }
  }, []);

  // Load material list
  useEffect(() => {
    fetch("/api/material-list")
      .then(res => res.json())
      .then(data => setMaterialList(data))
      .catch(err => console.error("Failed to load material list", err));
  }, []);

  // Load RA data from localStorage (skip if loading from DB)
  useEffect(() => {
    if (loadId) {
      setIsLoaded(true);
      return;
    }

    const saved = localStorage.getItem("ra_rows");
    if (saved) setRows(JSON.parse(saved));
    setIsLoaded(true);
  }, [loadId]);

  // Save to localStorage when rows change
  useEffect(() => {
    if (isLoaded) localStorage.setItem("ra_rows", JSON.stringify(rows));
  }, [rows, isLoaded]);

  // Load estimate from database if loadId is present
  useEffect(() => {
    if (!loadId) return;

    fetch(`/api/estimate/${loadId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const loadedRows = data.data.rows.map((r, i) => ({
            ...r,
            srNo: i + 1,
          }));
          setRows(loadedRows);
          setNameOfWork(data.data.nameOfWork);
          setCurrentEstimateId(data.data._id);
          localStorage.setItem("ra_rows", JSON.stringify(loadedRows));
        }
      })
      .catch((err) => console.error("Load error:", err));
  }, [loadId]);

  // Update name if URL parameter changes
  useEffect(() => {
    if (nameFromURL) setNameOfWork(nameFromURL);
  }, [nameFromURL]);

  const calculateRow = (row) => {
    const netAfterDeduct = row.basicRate - row.deduct;
    const totalLead = row.materials.reduce((sum, m) => sum + (m.qty * m.lead), 0);
    const total = netAfterDeduct + totalLead;
    const netTotal = total + row.tribal;
    return { ...row, netAfterDeduct, totalLead, total, netTotal };
  };

  const addItem = async () => {
    if (!itemCode) return;

    try {
      const code = itemCode.trim();

      const res = await fetch(`/api/get-item?code=${code}`);
      const data = await res.json();

      if (!data || data.error) {
        alert("Item not found!");
        return;
      }

      const completedRate = parseFloat(data["Completed Rate for 2021-22 excluding GST In Rs."]) || 0;
      const description = data["Description of the item"] || "";

      // Auto-populate materials based on description and keywords (e.g., M-20)
      const autoMaterials = getDefaultMaterialsForDescription(description, leadSettings);

      const newRow = calculateRow({
        id: Date.now().toString(),
        srNo: 0,
        ssr: code,
        description: description,
        unit: data["Unit"] || "",
        basicRate: completedRate,
        specs: data["Additional Specification"] || "",
        deduct: 0,
        materials: autoMaterials,
        tribal: 0,
      });

      let updated = [...rows];

      if (insertIndex !== null) updated.splice(insertIndex, 0, newRow);
      else updated.push(newRow);

      setRows(updated.map((r, i) => ({ ...r, srNo: i + 1 })));

      setInsertIndex(null);
      setItemCode("");
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const updateRow = (i, field, value) => {
    const updated = [...rows];
    updated[i][field] = value;
    updated[i] = calculateRow(updated[i]);
    setRows(updated);
  };

  const updateMaterial = (rowIndex, matIndex, field, value) => {
    const updated = [...rows];
    const mat = updated[rowIndex].materials[matIndex];

    mat[field] = value;

    // When material name changes, update lead using the category's stored leadCharge
    if (field === "name") {
      const category = getCategoryFromMaterial(mat.name);
      const leadCharge = leadSettings[category]?.leadCharge || 0;
      mat.lead = leadCharge;
    }

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

  const removeMaterial = (rowIndex, matIndex) => {
    const updated = [...rows];
    updated[rowIndex].materials.splice(matIndex, 1);
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
    setRows(rows.filter((r) => r.id !== id).map((r, i) => ({ ...r, srNo: i + 1 })));
  };

  const refreshRow = async (i) => {
    if (!confirm("Revert to default SSR values? Your edits will be lost.")) return;

    const code = rows[i].ssr.trim();
    const res = await fetch(`/api/get-item?code=${code}`);
    const data = await res.json();

    if (!data || data.error) return;

    const completedRate = parseFloat(data["Completed Rate for 2021-22 excluding GST In Rs."]) || 0;
    const description = data["Description of the item"] || "";

    const autoMaterials = getDefaultMaterialsForDescription(description, leadSettings);

    const updated = [...rows];

    updated[i] = calculateRow({
      ...updated[i],
      description: description,
      unit: data["Unit"] || "",
      basicRate: completedRate,
      specs: data["Additional Specification"] || "",
      deduct: 0,
      materials: autoMaterials,
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

  const formatNumber = (num) => (num !== undefined && num !== null ? num.toFixed(3) : "0.000");

  const saveEstimate = async () => {
    if (!session) {
      alert("You must be logged in to save an estimate.");
      return;
    }

    if (!nameOfWork.trim()) {
      alert("Please enter a Name of Work.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/estimate/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameOfWork,
          rows,
          estimateId: currentEstimateId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.updated) {
          alert("Estimate updated!");
        } else {
          alert("Estimate saved!");
          if (data.id) setCurrentEstimateId(data.id);
        }
      } else {
        alert(data.error || "Failed to save.");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // ========== Refresh lead charges from localStorage ==========
  const refreshLeadCharges = () => {
    const saved = localStorage.getItem("leadSettings");
    if (!saved) {
      alert("No lead settings found. Please set distances in the Leads page first.");
      return;
    }
    const freshSettings = JSON.parse(saved);
    setLeadSettings(freshSettings); // update the state for future selections

    // Update all existing materials with the new lead charges
    const updatedRows = rows.map(row => {
      const updatedMaterials = row.materials.map(mat => {
        if (mat.name) {
          const category = getCategoryFromMaterial(mat.name);
          const newLeadCharge = freshSettings[category]?.leadCharge || 0;
          return { ...mat, lead: newLeadCharge };
        }
        return mat;
      });
      const updatedRow = { ...row, materials: updatedMaterials };
      return calculateRow(updatedRow);
    });

    setRows(updatedRows);
    alert("Lead charges refreshed from Leads page.");
  };

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      <Tabs />

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="font-bold">Name of Work: </span>
          <input
            value={nameOfWork}
            onChange={(e) => setNameOfWork(e.target.value)}
            className="border p-2 w-[400px] rounded"
            placeholder="Enter Name of Work"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshLeadCharges}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh Lead Charges
          </button>
          <button
            onClick={saveEstimate}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Estimate"}
          </button>
        </div>
      </div>

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
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="overflow-x-auto relative">
            <table className="w-full border text-xs bg-white relative" style={{ minWidth: "1400px" }}>
              <thead className="bg-gray-200">
                <tr className="text-center">
                  <th className="border p-2">☰</th>
                  <th className="border p-2">Sr</th>
                  <th className="border p-2">SSR</th>
                  <th className="border p-2 w-[350px]">Description</th>
                  <th className="border p-2">Unit</th>
                  <th className="border p-2">Basic Rate</th>
                  <th className="border p-2">Deduct</th>
                  <th className="border p-2">Net (5-6)</th>
                  <th className="border p-2 w-[120px]">Material</th>
                  <th className="border p-2 w-[80px]">Qty</th>
                  <th className="border p-2 w-[100px]">Lead (Rs.)</th>
                  <th className="border p-2">Total Lead</th>
                  <th className="border p-2">Total (7+11)</th>
                  <th className="border p-2">Tribal</th>
                  <th className="border p-2">Net Total</th>
                  <th className="border p-2 w-[200px]">Specs</th>
                  <th className="border p-2 sticky right-0 bg-gray-200 z-10 shadow-[-3px_0_5px_rgba(0,0,0,0.1)] w-[80px]">Actions</th>
                 </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td colSpan="17" className="border text-center">
                        <button
                          onClick={() => setInsertIndex(insertIndex === i ? null : i)}
                          className={`px-4 transition-all ${
                            insertIndex === i ? "bg-blue-500 text-white font-bold scale-110" : "text-blue-600"
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
                      materialList={materialList}
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
  materialList,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-yellow-50 group">
      <td {...attributes} {...listeners} className="border p-2 text-center cursor-grab">☰</td>
      <td className="border p-2 text-center">{row.srNo}</td>
      <td className="border p-2 text-center">{row.ssr}</td>
      <td className="border p-2">
        <AutoTextarea value={row.description} onChange={(e) => updateRow(index, "description", e.target.value)} />
      </td>
      <td className="border p-2">
        <input
          type="text"
          value={row.unit}
          onChange={(e) => updateRow(index, "unit", e.target.value)}
          className="w-full border-none focus:outline-none bg-transparent"
        />
      </td>
      <td className="border p-2">
        <NumericInput value={row.basicRate} onChange={(val) => updateRow(index, "basicRate", val)} />
      </td>
      <td className="border p-2">
        <NumericInput value={row.deduct} onChange={(val) => updateRow(index, "deduct", val)} />
      </td>
      <td className="border p-2 text-center">{formatNumber(row.netAfterDeduct)}</td>

      {/* Material selection */}
      <td className="border py-1 px-1 align-top">
        {row.materials.map((mat, matIdx) => (
          <div key={mat.id} className="flex items-center gap-1 leading-none mb-1">
            <select
              value={mat.name}
              onChange={(e) => updateMaterial(index, matIdx, "name", e.target.value)}
              className="w-full h-[26px] border text-xs px-1"
            >
              <option value="">Select material</option>
              {materialList.map(matName => (
                <option key={matName} value={matName}>{matName}</option>
              ))}
            </select>
            {matIdx === row.materials.length - 1 ? (
              <button
                onClick={() => addMaterial(index)}
                className="text-green-600 text-xs px-1 hover:scale-110 transition"
                title="Add material"
              >
                + Add
              </button>
            ) : (
              <button
                onClick={() => removeMaterial(index, matIdx)}
                className="text-red-600 text-xs px-1 hover:scale-110 transition"
                title="Remove material"
              >
                −
              </button>
            )}
          </div>
        ))}
      </td>

      {/* Quantity column */}
      <td className="border py-1 px-1 align-top">
        {row.materials.map((mat, matIdx) => (
          <div key={mat.id} className="mb-1">
            <NumericInput
              value={mat.qty}
              onChange={(val) => updateMaterial(index, matIdx, "qty", val)}
              placeholder="Qty"
            />
          </div>
        ))}
      </td>

      {/* Lead column */}
      <td className="border py-1 px-1 align-top">
        {row.materials.map((mat) => (
          <div key={mat.id} className="text-center h-[26px] flex items-center justify-center mb-1">
            {mat.lead.toFixed(2)}
          </div>
        ))}
      </td>

      <td className="border p-2 text-center">{formatNumber(row.totalLead)}</td>
      <td className="border p-2 text-center">{formatNumber(row.total)}</td>
      <td className="border p-2">
        <NumericInput value={row.tribal} onChange={(val) => updateRow(index, "tribal", val)} />
      </td>
      <td className="border p-2 text-center">{formatNumber(row.netTotal)}</td>
      <td className="border p-2">
        <AutoTextarea value={row.specs} onChange={(e) => updateRow(index, "specs", e.target.value)} />
      </td>
      <td className="border p-2 text-center sticky right-0 bg-white group-hover:bg-yellow-50 z-10 shadow-[-3px_0_5px_rgba(0,0,0,0.1)]">
        <div className="flex justify-center gap-3">
          <button
            onClick={() => refreshRow(index)}
            title="Refresh"
            className="transition-all duration-200 hover:scale-125 hover:rotate-180 active:scale-90"
          >
            🔄
          </button>
          <button
            onClick={() => deleteRow(row.id)}
            title="Delete"
            className="transition-all duration-200 hover:scale-125 hover:text-red-600 active:scale-90"
          >
            ❌
          </button>
        </div>
      </td>
    </tr>
  );
}