// lib/store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const calculateRow = (row, isTribal) => {
  const netAfterDeduct = (row.basicRate || 0) - (row.deduct || 0);
  const totalLead = (row.materials || []).reduce((sum, m) => sum + ((m.qty || 0) * (m.lead || 0)), 0);
  const total = netAfterDeduct + totalLead;
  const tribalAmount = isTribal ? ((row.basicRate || 0) * 0.10) : 0;
  const netTotal = total + tribalAmount;
  return { ...row, netAfterDeduct, totalLead, total, tribal: tribalAmount, netTotal };
};

const getCategoryFromMaterial = (materialName) => {
  if (!materialName) return null;
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
    if (keywords.some(kw => normalized.includes(kw))) return category;
  }
  return null;
};

export const useStore = create(
  persist(
    (set, get) => ({
      // Lead Settings
      leadSettings: {},
      setLeadSettings: (settings) => set({ leadSettings: settings }),
      updateLeadSetting: (category, updates) => set((state) => ({
        leadSettings: {
          ...state.leadSettings,
          [category]: { ...state.leadSettings[category], ...updates }
        }
      })),

      // Rate Analysis Rows
      raRows: [],
      setRARows: (rows) => set({ raRows: rows }),
      raBottomRows: [],
      setRABottomRows: (rows) => set({ raBottomRows: rows }),

      // Estimate Meta
      currentEstimateId: null,
      nameOfWork: '',
      isTribal: false,
      setEstimateMeta: (meta) => set(meta),

      // Recalculate RA rows when lead settings change
      recalculateRARowsWithLeadSettings: () => {
        const state = get();
        const newSettings = state.leadSettings;
        const isTribal = state.isTribal;
        
        const updatedRows = state.raRows.map(row => {
          const updatedMaterials = (row.materials || []).map(mat => {
            if (mat.name) {
              const category = getCategoryFromMaterial(mat.name);
              if (category && newSettings[category]) {
                return { ...mat, lead: newSettings[category].leadCharge || 0 };
              }
            }
            return mat;
          });
          return calculateRow({ ...row, materials: updatedMaterials }, isTribal);
        });
        
        const updatedBottom = state.raBottomRows.map(row => {
          const updatedMaterials = (row.materials || []).map(mat => {
            if (mat.name) {
              const category = getCategoryFromMaterial(mat.name);
              if (category && newSettings[category]) {
                return { ...mat, lead: newSettings[category].leadCharge || 0 };
              }
            }
            return mat;
          });
          return calculateRow({ ...row, materials: updatedMaterials }, isTribal);
        });
        
        set({ raRows: updatedRows, raBottomRows: updatedBottom });
      },

      // Measurement Items
      measurementItems: [],
      setMeasurementItems: (items) => set({ measurementItems: items }),

      syncMeasurementFromRA: () => {
        const state = get();
        const allRaRows = [...state.raRows, ...state.raBottomRows];
        const existingMap = new Map();
        state.measurementItems.forEach(item => existingMap.set(item.id, item));
        
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
        set({ measurementItems: newItems });
      },

      // Abstract Custom Data
      abstractCustomData: {},
      setAbstractCustomData: (data) => set({ abstractCustomData: data }),
      updateAbstractCustomField: (id, field, value) => set((state) => ({
        abstractCustomData: {
          ...state.abstractCustomData,
          [id]: { ...state.abstractCustomData[id], [field]: value }
        }
      })),
    }),
    { name: 'nitech-estimates-storage' }
  )
);