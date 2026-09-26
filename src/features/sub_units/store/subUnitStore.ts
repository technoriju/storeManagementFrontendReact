import { create } from 'zustand';
import { SubUnit } from '../types';

interface SubUnitState {
  subUnits: SubUnit[];
  addSubUnit: (subUnit: SubUnit) => void;
}

export const useSubUnitStore = create<SubUnitState>((set) => ({
  subUnits: [
    { id: 1, parentUnitId: 1, name: 'Gram', createdAt: '24 Dec 2024', status: 'Active' },
    { id: 2, parentUnitId: 2, name: 'Milliliter', createdAt: '10 Dec 2024', status: 'Active' },
  ],
  addSubUnit: (subUnit) => set((state) => ({ subUnits: [subUnit, ...state.subUnits] })),
}));
