import { create } from 'zustand';

export type PaperSize = '58mm' | '80mm' | 'A4' | 'A5' | 'Custom';
export type TaxDisplay = 'exclusive' | 'inclusive' | 'none';

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
}

interface InvoiceSettingsState {
  settings: InvoiceSettings;
  updateSetting: <K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) => void;
  updateColumn: (columnKey: keyof InvoiceSettings['columns'], value: boolean) => void;
}

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
  footerMessage: 'Thank you for your business!',
  showSignature: true,
  showTerms: true,
  showCustomerInfo: true,
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
}));
