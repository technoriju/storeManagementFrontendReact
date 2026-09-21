export interface SubCategory {
  id: string;
  image?: string;
  subCategory: string;
  category: string;
  categoryCode: string;
  description: string;
  status: 'Active' | 'Inactive';
}
