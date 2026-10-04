import { create } from 'zustand';

export type PaperSize = '80mm' | 'halfA4Landscape' | '58mm' | 'A4' | 'A5' | 'Custom';
export type TaxDisplay = 'exclusive' | 'inclusive' | 'none';

export interface BusinessProfile {
  businessName: string;
  tagline?: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  pan?: string;
  state?: string;
  stateCode?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  upiId?: string;
}

export interface InvoiceSettings {
  paperSize: PaperSize;
  showLogo: boolean;
  showBusinessName: boolean;
  showAddress: boolean;
  showGstin: boolean;
  showInvoiceNumber: boolean;
  columns: {
    item: boolean;
    rate: boolean;
    qty: boolean;
    amount: boolean;
  };
  taxDisplay: TaxDisplay;
  footerMessage: string;
  showSignature: boolean;
  showTerms: boolean;
  showCustomerInfo: boolean;
  showBankDetails: boolean;
  showQrCode: boolean;
  businessProfile: BusinessProfile;
}

interface InvoiceSettingsState {
  settings: InvoiceSettings;
  updateSetting: <K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) => void;
  updateColumn: (columnKey: keyof InvoiceSettings['columns'], value: boolean) => void;
  updateBusinessProfile: (updates: Partial<BusinessProfile>) => void;
}

const defaultBusinessProfile: BusinessProfile = {
  businessName: 'MAHA TRADING CO.',
  tagline: 'Wholesale & Retail Distributors',
  address: 'Shop No. 12, Market Yard, Station Road, Mumbai - 400001',
  phone: '+91 98200 12345 / 022-23456789',
  email: 'sales@mahatrading.com',
  gstin: '27AABCM1234F1Z8',
  pan: 'AABCM1234F',
  state: 'Maharashtra',
  stateCode: '27',
  bankName: 'HDFC Bank',
  accountNumber: '50200012345678',
  ifscCode: 'HDFC0001234',
  branch: 'Market Yard Branch',
  upiId: 'mahatrading@hdfcbank',
};

const defaultSettings: InvoiceSettings = {
  paperSize: '80mm',
  showLogo: true,
  showBusinessName: true,
  showAddress: true,
  showGstin: true,
  showInvoiceNumber: true,
  columns: {
    item: true,
    rate: true,
    qty: true,
    amount: true,
  },
  taxDisplay: 'exclusive',
  footerMessage: 'Thank you for your business! Visit Again.',
  showSignature: true,
  showTerms: true,
  showCustomerInfo: true,
  showBankDetails: true,
  showQrCode: true,
  businessProfile: defaultBusinessProfile,
};

export const useInvoiceSettingsStore = create<InvoiceSettingsState>((set) => ({
  settings: defaultSettings,
  updateSetting: (key, value) =>
    set((state) => ({
      settings: {
        ...state.settings,
        [key]: value,
      },
    })),
  updateColumn: (columnKey, value) =>
    set((state) => ({
      settings: {
        ...state.settings,
        columns: {
          ...state.settings.columns,
          [columnKey]: value,
        },
      },
    })),
  updateBusinessProfile: (updates) =>
    set((state) => ({
      settings: {
        ...state.settings,
        businessProfile: {
          ...state.settings.businessProfile,
          ...updates,
        },
      },
    })),
}));
