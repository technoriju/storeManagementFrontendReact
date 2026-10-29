export type BarcodeSymbology = 'CODE128' | 'EAN13' | 'CODE39' | 'UPC' | 'QR';

export type PaperPresetId =
  | 'thermal_50x25'
  | 'thermal_38x25'
  | 'thermal_50x30'
  | 'sheet_a4_24'
  | 'sheet_a4_30'
  | 'sheet_a4_40'
  | 'sheet_a4_65'
  | 'custom';

export interface PaperPreset {
  id: PaperPresetId;
  name: string;
  type: 'thermal' | 'sheet';
  widthMm: number;
  heightMm: number;
  columns: number;
  rows?: number;
  marginTopMm: number;
  marginLeftMm: number;
  gapMm: number;
  description: string;
}

export interface BarcodePrintItem {
  productId: number | string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  mrp?: number;
  categoryName?: string;
  brandName?: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
  packedDate?: string;
}

export interface BarcodeLabelConfig {
  presetId: PaperPresetId;
  symbology: BarcodeSymbology;
  storeName: string;
  showStoreName: boolean;
  showProductName: boolean;
  showSku: boolean;
  showBarcodeValue: boolean;
  showPrice: boolean;
  showMrp: boolean;
  showDate: boolean;
  dateType: 'packed' | 'expiry' | 'today';
  currency: string;
  // Custom layout overrides
  customWidthMm: number;
  customHeightMm: number;
  customColumns: number;
  customGapMm: number;
  fontSize: 'small' | 'medium' | 'large';
  barcodeHeight: number; // in pixels
}

export const PAPER_PRESETS: Record<PaperPresetId, PaperPreset> = {
  thermal_50x25: {
    id: 'thermal_50x25',
    name: 'Thermal 50mm × 25mm (2" × 1")',
    type: 'thermal',
    widthMm: 50,
    heightMm: 25,
    columns: 1,
    marginTopMm: 0,
    marginLeftMm: 0,
    gapMm: 2,
    description: 'Most popular single-roll retail barcode printer size (Zebra, TSC, TVS)',
  },
  thermal_38x25: {
    id: 'thermal_38x25',
    name: 'Thermal 38mm × 25mm (1.5" × 1")',
    type: 'thermal',
    widthMm: 38,
    heightMm: 25,
    columns: 1,
    marginTopMm: 0,
    marginLeftMm: 0,
    gapMm: 2,
    description: 'Compact roll size for small items & jewelry tags',
  },
  thermal_50x30: {
    id: 'thermal_50x30',
    name: 'Thermal 50mm × 30mm',
    type: 'thermal',
    widthMm: 50,
    heightMm: 30,
    columns: 1,
    marginTopMm: 0,
    marginLeftMm: 0,
    gapMm: 2,
    description: 'Extra vertical height for multi-line product names & MRP',
  },
  sheet_a4_24: {
    id: 'sheet_a4_24',
    name: 'A4 Sheet — 24 Labels (3 × 8)',
    type: 'sheet',
    widthMm: 70,
    heightMm: 37,
    columns: 3,
    rows: 8,
    marginTopMm: 0,
    marginLeftMm: 0,
    gapMm: 0,
    description: 'Standard laser/inkjet sticker sheets (Avery 7160 compatible)',
  },
  sheet_a4_30: {
    id: 'sheet_a4_30',
    name: 'A4 Sheet — 30 Labels (3 × 10)',
    type: 'sheet',
    widthMm: 70,
    heightMm: 29.7,
    columns: 3,
    rows: 10,
    marginTopMm: 0,
    marginLeftMm: 0,
    gapMm: 0,
    description: 'Standard laser/inkjet sticker sheets (Avery 7159 compatible)',
  },
  sheet_a4_40: {
    id: 'sheet_a4_40',
    name: 'A4 Sheet — 40 Labels (4 × 10)',
    type: 'sheet',
    widthMm: 52.5,
    heightMm: 29.7,
    columns: 4,
    rows: 10,
    marginTopMm: 0,
    marginLeftMm: 0,
    gapMm: 0,
    description: 'Compact density 4-column sticker sheet',
  },
  sheet_a4_65: {
    id: 'sheet_a4_65',
    name: 'A4 Sheet — 65 Labels (5 × 13)',
    type: 'sheet',
    widthMm: 38.1,
    heightMm: 21.2,
    columns: 5,
    rows: 13,
    marginTopMm: 10.7,
    marginLeftMm: 4.7,
    gapMm: 0,
    description: 'High-density mini labels (Avery 7651 compatible)',
  },
  custom: {
    id: 'custom',
    name: 'Custom Size',
    type: 'thermal',
    widthMm: 50,
    heightMm: 25,
    columns: 1,
    marginTopMm: 0,
    marginLeftMm: 0,
    gapMm: 2,
    description: 'User-specified dimensions and column count',
  },
};

export const DEFAULT_LABEL_CONFIG: BarcodeLabelConfig = {
  presetId: 'thermal_50x25',
  symbology: 'CODE128',
  storeName: 'STORE POS',
  showStoreName: true,
  showProductName: true,
  showSku: true,
  showBarcodeValue: true,
  showPrice: true,
  showMrp: true,
  showDate: false,
  dateType: 'today',
  currency: '₹',
  customWidthMm: 50,
  customHeightMm: 25,
  customColumns: 1,
  customGapMm: 2,
  fontSize: 'medium',
  barcodeHeight: 32,
};
