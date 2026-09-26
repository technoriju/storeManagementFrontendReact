export interface SubCategory {
  id: number;
  image?: string;
  subCategory: string;
  category: string;
  categoryCode: string;
  description: string;
  status: 'Active' | 'Inactive';
}

