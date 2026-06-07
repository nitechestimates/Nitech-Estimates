import { UseBoundStore, StoreApi } from "zustand";

export type ProjectDetailsProfile = {
  id?: string;
  profileName?: string;
  estimateName?: string;
  nameOfWork?: string;
  isTribal?: boolean;
  tribalPercent?: string;
  yojana?: string;
  estAmount?: string;
  labourInsurance?: string;
  year?: string;
  dist?: string;
  taluka?: string;
  village?: string;
  headDivision?: string;
  subDivision?: string;
  deputyEngineer?: string;
  jrEngineer?: string;
  adminApprovalNo?: string;
};

export type MaterialItem = {
  name?: string;
  qty?: number;
  lead?: number;
};

export type EstimateRow = {
  id: string;
  srNo?: number;
  description?: string;
  specs?: string;
  qty?: number;
  unit?: string;
  basicRate?: number;
  deduct?: number;
  rate?: number;
  amount?: number;
  isRoyalty?: boolean;
  materials?: MaterialItem[];
  netAfterDeduct?: number;
  totalLead?: number;
  total?: number;
  tribal?: number;
  netTotal?: number;
  useReducedRate?: boolean;
  reducedRate?: number | null;
  [key: string]: unknown;
};

export type MeasurementSubItem = {
  id: string | number;
  description?: string;
  no?: string;
  l?: string;
  b?: string;
  h?: string;
  total?: number;
};

export type MeasurementItem = {
  id: string;
  srNo?: number;
  description?: string;
  unit?: string;
  totalQty?: number;
  usePercent?: boolean;
  percentValue?: number;
  measurements?: MeasurementSubItem[];
  [key: string]: unknown;
};

export type StoreState = {
  yojanaList: string[];
  addYojana: (item: string) => void;
  removeYojana: (name: string) => void;
  resetEstimate: () => void;
  projectDetailsProfiles: ProjectDetailsProfile[];
  addProjectDetailsProfile: (profile: ProjectDetailsProfile) => void;
  deleteProjectDetailsProfile: (id: string) => void;
  updateProjectDetailsProfile: (id: string, updates: Partial<ProjectDetailsProfile>) => void;
  raRows: EstimateRow[];
  raBottomRows: EstimateRow[];
  measurementItems: MeasurementItem[];
  setRARows: (rows: EstimateRow[]) => void;
  setRABottomRows: (rows: EstimateRow[]) => void;
  setMeasurementItems: (items: MeasurementItem[]) => void;
  setEstimateMeta: (meta: Partial<Record<string, unknown>>) => void;
  syncMeasurementFromRA: () => void;
  saveLeadsProfile: (category: string, id: string) => Promise<void>;
  [key: string]: unknown;
};

export declare const useStore: UseBoundStore<StoreApi<StoreState>>;
