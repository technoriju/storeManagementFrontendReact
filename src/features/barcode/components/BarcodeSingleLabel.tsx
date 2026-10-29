import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarcodePrintItem, BarcodeLabelConfig } from '../types';
import { BarcodeSvg } from './BarcodeSvg';

interface BarcodeSingleLabelProps {
  item: BarcodePrintItem;
  config: BarcodeLabelConfig;
  widthMm?: number;
  heightMm?: number;
  scale?: number;
}

export const BarcodeSingleLabel: React.FC<BarcodeSingleLabelProps> = ({
  item,
  config,
  widthMm = 50,
  heightMm = 25,
  scale = 1,
}) => {
  const barcodeValue = item.barcode || item.sku || '000000';

  // Compute scale-based font sizes
  const fontSizeFactor = config.fontSize === 'small' ? 0.85 : config.fontSize === 'large' ? 1.15 : 1.0;
  const storeFontSize = Math.max(8, Math.round(9 * fontSizeFactor * scale));
  const productFontSize = Math.max(9, Math.round(10 * fontSizeFactor * scale));
  const priceFontSize = Math.max(10, Math.round(12 * fontSizeFactor * scale));
  const codeFontSize = Math.max(8, Math.round(9 * fontSizeFactor * scale));
  const subFontSize = Math.max(7, Math.round(8 * fontSizeFactor * scale));

  const barcodeHeight = Math.max(18, Math.round(config.barcodeHeight * (heightMm / 30) * scale));

  const displayDate = () => {
    if (!config.showDate) return null;
    if (config.dateType === 'expiry' && item.expiryDate) {
      return `Exp: ${item.expiryDate}`;
    }
    if (config.dateType === 'packed' && item.packedDate) {
      return `Mfg: ${item.packedDate}`;
    }
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
    return `Date: ${today}`;
  };

  return (
    <div
      className="barcode-single-label"
      style={{
        width: `${widthMm * 3.78 * scale}px`,
        height: `${heightMm * 3.78 * scale}px`,
        maxHeight: `${heightMm * 3.78 * scale}px`,
        boxSizing: 'border-box',
        padding: `${Math.round(2 * scale)}px ${Math.round(3 * scale)}px`,
        backgroundColor: '#FFFFFF',
        color: '#000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        border: '1px solid #DDDDDD',
        borderRadius: '2px',
        userSelect: 'none',
        lineHeight: 1.15,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Header: Store Name */}
      {config.showStoreName && config.storeName ? (
        <div
          style={{
            fontSize: `${storeFontSize}px`,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            width: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {config.storeName}
        </div>
      ) : null}

      {/* Product Name */}
      {config.showProductName && (
        <div
          style={{
            fontSize: `${productFontSize}px`,
            fontWeight: 600,
            width: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: '1px',
          }}
          title={item.name}
        >
          {item.name}
        </div>
      )}

      {/* Barcode Graphic */}
      <div style={{ margin: '1px 0', maxWidth: '100%', display: 'flex', justifyContent: 'center' }}>
        <BarcodeSvg
          value={barcodeValue}
          format={config.symbology}
          width={scale * 1.3}
          height={barcodeHeight}
          displayValue={false}
        />
      </div>

      {/* Human Readable Code */}
      {config.showBarcodeValue && (
        <div
          style={{
            fontSize: `${codeFontSize}px`,
            fontFamily: 'monospace',
            letterSpacing: '1px',
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          {barcodeValue}
        </div>
      )}

      {/* Price & Date Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: `${Math.round(4 * scale)}px`,
          width: '100%',
          flexWrap: 'nowrap',
          marginTop: '1px',
        }}
      >
        {config.showPrice && (
          <span style={{ fontSize: `${priceFontSize}px`, fontWeight: 800 }}>
            {config.currency} {Number(item.price || 0).toFixed(2)}
          </span>
        )}

        {config.showMrp && item.mrp && item.mrp > item.price ? (
          <span
            style={{
              fontSize: `${subFontSize}px`,
              textDecoration: 'line-through',
              color: '#555555',
            }}
          >
            MRP: {config.currency} {Number(item.mrp).toFixed(2)}
          </span>
        ) : null}

        {displayDate() && (
          <span
            style={{
              fontSize: `${subFontSize}px`,
              color: '#444444',
            }}
          >
            {displayDate()}
          </span>
        )}
      </div>
    </div>
  );
};
