export interface SubUnit {
  id: number;
  parentUnitId: number;
  name: string;
  createdAt: string;
  status: 'Active' | 'Inactive';
}

