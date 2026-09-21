export interface SubUnit {
  id: string;
  parentUnitId: string;
  name: string;
  shortName: string;
  createdAt: string;
  status: 'Active' | 'Inactive';
}
