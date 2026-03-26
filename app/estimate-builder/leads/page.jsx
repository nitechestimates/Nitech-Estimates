"use client";

import { useEffect, useState } from "react";
import Tabs from "../components/Tabs";

// Categories must EXACTLY match the keys in lib/leads.json
const categories = [
  "Concrete Blocks  (Form)",
  "Murum, Building Rubish, Earth",
  "Excavated Rock    soling stone",
  "Sand, (crush metal)  Stone below 40 mm, Normal Brick sider aggre. Timber",
  "Stone aggregate 40mm Normal size and above",
  "Cement, Lime, Stone Block, GI, CI, CC & AC Pipes /  Sheet& Plate,  Glass in packs, Distemper, AC Sheet, Fitting Iron Sheet",
  "Bricks           1000 nos      1cum=500 Bricks",
  "Tiles Half Round Tiles / Roofing Tiles / Manglore Tiles",
  "Steel        (MS, TMT, H.Y.S.D.) Structural Steel",
  "Flooring Tiles Ceramic/ Marbonate"
];

// Default settings
const defaultSettings = categories.reduce((acc, cat) => {
  acc[cat] = { distance: 0, leadCharge: 0, source: "Local" };
  return acc;
}, {});

// Helper: get lead charge for a given category and distance (interpolated)
function getLeadChargeFromTable(leadData, category, distance) {
  const data = leadData[category];
  if (!data) return 0;

  const distances = Object.keys(data)
    .map(Number)
    .filter(d => !isNaN(d))
    .sort((a, b) => a - b);

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

  const lowerVal = data[lower];
  const upperVal = data[upper];
  const ratio = (distance - lower) / (upper - lower);
  return lowerVal + ratio * (upperVal - lowerVal);
}

export default function LeadsPage() {
  const [leadData, setLeadData] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  // Load leads.json from API
  useEffect(() => {
    fetch("/api/leads-data")
      .then(res => res.json())
      .then(data => setLeadData(data))
      .catch(err => console.error("Failed to load leads data", err));
  }, []);

  // Load saved settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("leadSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...defaultSettings };
        for (const cat of categories) {
          if (parsed[cat]) {
            merged[cat] = {
              ...merged[cat],
              ...parsed[cat],
              leadCharge: parsed[cat].leadCharge ?? 0,
              distance: parsed[cat].distance ?? 0,
              source: parsed[cat].source ?? "Local"
            };
          }
        }
        setSettings(merged);
        console.log("Loaded leadSettings from localStorage", merged);
      } catch (e) {
        console.error("Error parsing leadSettings", e);
      }
    }
    setLoaded(true);
  }, []);

  // Save settings to localStorage when changed
  useEffect(() => {
    if (loaded) {
      localStorage.setItem("leadSettings", JSON.stringify(settings));
      console.log("Saved leadSettings to localStorage", settings);
    }
  }, [settings, loaded]);

  const handleDistanceChange = (category, distance) => {
    const dist = parseFloat(distance) || 0;
    let leadCharge = 0;
    if (leadData && dist > 0) {
      leadCharge = getLeadChargeFromTable(leadData, category, dist);
    }
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        distance: dist,
        leadCharge: leadCharge
      }
    }));
  };

  const handleSourceChange = (category, source) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        source
      }
    }));
  };

  if (!leadData || !loaded) return <div className="p-10 text-center">Loading leads data...</div>;

  return (
    <div className="p-4 bg-yellow-50 min-h-screen text-black">
      <Tabs />
      <h1 className="text-2xl font-bold mb-4">Lead Charges</h1>

      <div className="overflow-x-auto">
        <table className="w-full border bg-white">
          <thead className="bg-gray-200">
            <tr className="text-center">
              <th className="border p-2">Material Category</th>
              <th className="border p-2">Distance (km)</th>
              <th className="border p-2">Lead Charge (Rs./Unit)</th>
              <th className="border p-2">Source</th>
             </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category}>
                <td className="border p-2">{category}</td>
                <td className="border p-2">
                  <input
                    type="number"
                    step="0.1"
                    value={settings[category]?.distance || 0}
                    onChange={e => handleDistanceChange(category, e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  />
                </td>
                <td className="border p-2 text-center">
                  {(settings[category]?.leadCharge ?? 0).toFixed(2)}
                </td>
                <td className="border p-2">
                  <input
                    type="text"
                    value={settings[category]?.source || ""}
                    onChange={e => handleSourceChange(category, e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}