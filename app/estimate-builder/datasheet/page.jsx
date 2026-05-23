"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";

export default function DatasheetPage() {
  const yojanaList = useStore((state) => state.yojanaList);
  const addYojana = useStore((state) => state.addYojana);
  const removeYojana = useStore((state) => state.removeYojana);

  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    addYojana(newName);
    setNewName("");
  };

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-4">Data Sheet – Yojana/Fund</h1>
      <p className="text-gray-600 mb-4">
        Manage your commonly used yojana/fund names. They will appear as suggestions when creating a new estimate.
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Enter yojana/fund name"
          className="border border-gray-300 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Add
        </button>
      </div>

      {yojanaList.length === 0 ? (
        <div className="text-gray-500 italic">No yojana/fund names added yet.</div>
      ) : (
        <ul className="space-y-2">
          {yojanaList.map((item) => (
            <li
              key={item}
              className="flex justify-between items-center bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm"
            >
              <span>{item}</span>
              <button
                onClick={() => {
                  if (window.confirm(`Delete "${item}"?`)) removeYojana(item);
                }}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}