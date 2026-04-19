"use client";

import { useEffect, useState } from "react";
import Tabs from "../components/Tabs";
import { useStore } from "@/lib/store";

const categories = [
  "Concrete Blocks  (Form)", "Murum, Building Rubish, Earth", "Excavated Rock    soling stone",
  "Sand, (crush metal)  Stone below 40 mm, Normal Brick sider aggre. Timber",
  "Stone aggregate 40mm Normal size and above",
  "Cement, Lime, Stone Block, GI, CI, CC & AC Pipes /  Sheet& Plate,  Glass in packs, Distemper, AC Sheet, Fitting Iron Sheet",
  "Bricks           1000 nos      1cum=500 Bricks",
  "Tiles Half Round Tiles / Roofing Tiles / Manglore Tiles",
  "Steel        (MS, TMT, H.Y.S.D.) Structural Steel", "Flooring Tiles Ceramic/ Marbonate"
];

const defaultSettings = categories.reduce((acc, cat) => { acc[cat] = { distance: 0, leadCharge: 0, source: "Local" }; return acc; }, {});

function getLeadChargeFromTable(leadData, category, distance) {
  const data = leadData[category];
  if (!data) return 0;
  const distances = Object.keys(data).map(Number).filter(d => !isNaN(d)).sort((a, b) => a - b);
  if (distances.length === 0) return 0;
  if (data[distance] !== undefined) return data[distance];

  let lower = null, upper = null;
  for (const d of distances) {
    if (d <= distance) lower = d;
    if (d >= distance && upper === null) upper = d;
  }
  if (lower === null) return data[upper];
  if (upper === null) return data[lower];
  if (lower === upper) return data[lower];

  const lowerVal = data[lower]; const upperVal = data[upper];
  return lowerVal + ((distance - lower) / (upper - lower)) * (upperVal - lowerVal);
}

export default function LeadsPage() {
  const [leadData, setLeadData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  
  const leadSettings = useStore((state) => state.leadSettings);
  const setLeadSettings = useStore((state) => state.setLeadSettings);
  const updateLeadSetting = useStore((state) => state.updateLeadSetting);
  const recalculateRARows = useStore((state) => state.recalculateRARowsWithLeadSettings);

  useEffect(() => {
    fetch("/api/leads-data").then(res => res.json()).then(data => setLeadData(data)).catch(err => console.error(err));
  }, []);

  // Initialize settings if empty
  useEffect(() => {
    if (Object.keys(leadSettings).length === 0) {
      setLeadSettings(defaultSettings);
    }
    setLoaded(true);
  }, []);

  const handleDistanceChange = (category, distance) => {
    const dist = parseFloat(distance) || 0;
    let leadCharge = 0;
    if (leadData && dist > 0) leadCharge = getLeadChargeFromTable(leadData, category, dist);
    updateLeadSetting(category, { distance: dist, leadCharge });
    // Trigger recalculation in RA
    setTimeout(() => recalculateRARows(), 0);
  };

  const handleSourceChange = (category, source) => {
    updateLeadSetting(category, { source });
  };

  if (!leadData || !loaded) return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading lead matrices...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 w-full text-gray-900 animate-fade-in font-sans">
      <div className="w-full px-2 md:px-6 py-6 mx-auto">
        <Tabs />
        
        <div className="mb-8 animate-fade-in-up w-full">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Lead Charges Configuration</h1>
          <p className="text-gray-500 mt-1">Set transportation distances to automatically calculate material lead rates.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-fade-in-up w-full" style={{animationDelay: "0.1s"}}>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left whitespace-nowrap md:whitespace-normal">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 w-[40%]">Material Category</th>
                  <th className="px-6 py-4 text-center w-[20%]">Distance (km)</th>
                  <th className="px-6 py-4 text-center w-[20%]">Lead Charge (Rs./Unit)</th>
                  <th className="px-6 py-4 w-[20%]">Material Source / Query</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 w-full">
                {categories.map((category, idx) => (
                  <tr key={category} className="hover:bg-blue-50/30 transition-colors animate-row-enter" style={{animationDelay: `${idx * 0.05}s`}}>
                    <td className="px-6 py-4 font-medium text-gray-700">{category}</td>
                    <td className="px-6 py-4">
                      <div className="relative max-w-[150px] mx-auto">
                        <input
                          type="number" step="0.1" min="0" value={leadSettings[category]?.distance || 0}
                          onChange={e => handleDistanceChange(category, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center font-semibold text-gray-900 pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium pointer-events-none">km</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-4 py-1.5 rounded-lg w-28 shadow-sm">
                        ₹{(leadSettings[category]?.leadCharge ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text" placeholder="e.g. Local Quarry" value={leadSettings[category]?.source || ""}
                        onChange={e => handleSourceChange(category, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}