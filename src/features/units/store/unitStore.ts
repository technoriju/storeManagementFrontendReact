import { create } from 'zustand';
import { Unit } from '../types';

interface UnitState {
  units: Unit[];
  addUnit: (unit: Unit) => void;
}

export const useUnitStore = create<UnitState>((set) => ({
  units: [
    { id: '1', name: 'Kilogram', shortName: 'kg', createdAt: '24 Dec 2024', status: 'Active' },
    { id: '2', name: 'Liter', shortName: 'L', createdAt: '10 Dec 2024', status: 'Active' },
    { id: '3', name: 'Dozen', shortName: 'dz', createdAt: '27 Nov 2024', status: 'Active' },
    { id: '4', name: 'Pieces', shortName: 'pcs', createdAt: '18 Nov 2024', status: 'Active' },
    { id: '5', name: 'Box', shortName: 'bx', createdAt: '06 Nov 2024', status: 'Active' },
  ],
  addUnit: (unit) => set((state) => ({ units: [unit, ...state.units] })),
}));
