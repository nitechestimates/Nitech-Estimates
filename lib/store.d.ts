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

export type StoreState = {
  yojanaList: string[];
  addYojana: (item: string) => void;
  removeYojana: (name: string) => void;
  resetEstimate: () => void;
  projectDetailsProfiles: ProjectDetailsProfile[];
  addProjectDetailsProfile: (profile: ProjectDetailsProfile) => void;
  deleteProjectDetailsProfile: (id: string) => void;
  updateProjectDetailsProfile: (id: string, updates: Partial<ProjectDetailsProfile>) => void;
  raRows: Record<string, unknown>[];
  raBottomRows: Record<string, unknown>[];
  measurementItems: Record<string, unknown>[];
  setRARows: (rows: Record<string, unknown>[]) => void;
  setRABottomRows: (rows: Record<string, unknown>[]) => void;
  setMeasurementItems: (items: Record<string, unknown>[]) => void;
  setEstimateMeta: (meta: Partial<Record<string, unknown>>) => void;
  syncMeasurementFromRA: () => void;
  [key: string]: unknown;
};

export declare const useStore: UseBoundStore<StoreApi<StoreState>>;
