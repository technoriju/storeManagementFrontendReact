import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PaperSize = '80mm' | '140x210mm' | 'halfA4Landscape' | '58mm' | 'A4' | 'A5' | 'Custom';
export type DefaultPreviewType = 'receipt' | '140x210mm' | 'halfA4Landscape' | 'invoice';
export type TaxDisplay = 'exclusive' | 'inclusive' | 'none';

import { settingRepository } from '../../../core/repositories/SettingRepository';

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
  defaultPreviewType: DefaultPreviewType;
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
  printColorMode: 'bw' | 'color';
  businessProfile: BusinessProfile;
}

interface InvoiceSettingsState {
  settings: InvoiceSettings;
  updateSetting: <K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) => void;
  updateColumn: (columnKey: keyof InvoiceSettings['columns'], value: boolean) => void;
  updateBusinessProfile: (updates: Partial<BusinessProfile>) => void;
  setDefaultPreviewType: (type: DefaultPreviewType) => void;
}

const defaultBusinessProfile: BusinessProfile = {
  businessName: 'Tarama Enterprise',
  tagline: 'Wholesale & Retail Distributors',
  address: 'Hanidhara Mansatala(Saoraberia) Joypur, Howrah, West Bengal - 711401',
  phone: '+91 9732513820 / 8617633023',
  email: 'taramaenterprise41@gmail.com',
  gstin: '19BOBPP9698M1ZR',
  pan: 'AABCM1234F',
  state: 'West Bengal',
  stateCode: '19',
  bankName: 'HDFC Bank',
  accountNumber: '50200012345678',
  ifscCode: 'HDFC0001234',
  branch: 'Market Yard Branch',
  upiId: '8617633023@okbizaxis',
};

const defaultSettings: InvoiceSettings = {
  defaultPreviewType: '140x210mm',
  paperSize: '140x210mm',
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
  printColorMode: 'bw',
  businessProfile: defaultBusinessProfile,
};

export const useInvoiceSettingsStore = create<InvoiceSettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSetting: (key, value) =>
        set((state) => {
          const newSettings: InvoiceSettings = {
            ...state.settings,
            [key]: value,
          };
          if (key === 'paperSize') {
            const paperVal = value as PaperSize;
            if (paperVal === '140x210mm') {
              newSettings.defaultPreviewType = '140x210mm';
            } else if (paperVal === 'halfA4Landscape' || paperVal === 'A4' || paperVal === 'A5') {
              newSettings.defaultPreviewType = 'halfA4Landscape';
            } else if (paperVal === '80mm' || paperVal === '58mm') {
              newSettings.defaultPreviewType = 'receipt';
            }
            settingRepository.set('paper_size', String(value)).catch(console.error);
            settingRepository.set('default_invoice_template', String(newSettings.defaultPreviewType)).catch(console.error);
          } else if (key === 'defaultPreviewType') {
            const typeVal = value as DefaultPreviewType;
            if (typeVal === '140x210mm') {
              newSettings.paperSize = '140x210mm';
            } else if (typeVal === 'halfA4Landscape' || typeVal === 'invoice') {
              newSettings.paperSize = 'halfA4Landscape';
            } else {
              newSettings.paperSize = '80mm';
            }
            settingRepository.set('default_invoice_template', String(typeVal)).catch(console.error);
            settingRepository.set('paper_size', String(newSettings.paperSize)).catch(console.error);
          } else if (key === 'printColorMode') {
            settingRepository.set('print_color_mode', String(value)).catch(console.error);
          }
          return { settings: newSettings };
        }),
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
      setDefaultPreviewType: (type: DefaultPreviewType) => {
        let paperSize: PaperSize = '80mm';
        if (type === '140x210mm') {
          paperSize = '140x210mm';
        } else if (type === 'halfA4Landscape' || type === 'invoice') {
          paperSize = 'halfA4Landscape';
        }

        // Persist to local SQLite DB settings table
        settingRepository.set('default_invoice_template', type).catch(console.error);
        settingRepository.set('paper_size', paperSize).catch(console.error);

        set((state) => ({
          settings: {
            ...state.settings,
            defaultPreviewType: type,
            paperSize,
          },
        }));
      },
    }),
    {
      name: 'billing_invoice_settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const initSettingsFromDb = async () => {
  try {
    const defaultTemplateRow = await settingRepository.get('default_invoice_template');
    const paperSizeRow = await settingRepository.get('paper_size');
    const printColorModeRow = await settingRepository.get('print_color_mode');

    if (defaultTemplateRow?.value) {
      useInvoiceSettingsStore.getState().setDefaultPreviewType(defaultTemplateRow.value as any);
    }
    if (paperSizeRow?.value) {
      useInvoiceSettingsStore.getState().updateSetting('paperSize', paperSizeRow.value as any);
    }
    if (printColorModeRow?.value) {
      useInvoiceSettingsStore.getState().updateSetting('printColorMode', printColorModeRow.value as any);
    }
  } catch (err) {
    console.error('Failed to load invoice settings from local SQLite DB:', err);
  }
};
