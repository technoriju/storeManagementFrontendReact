export interface SubUnit {
  id: number;
  parentUnitId: number;
  name: string;
  shortName: string;
  createdAt: string;
  status: 'Active' | 'Inactive';
}

