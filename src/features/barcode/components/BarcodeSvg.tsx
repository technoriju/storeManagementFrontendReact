import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import JsBarcode from 'jsbarcode';
import { BarcodeSymbology } from '../types';

interface BarcodeSvgProps {
  value: string;
  format?: BarcodeSymbology;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  format = 'CODE128',
  width = 1.5,
  height = 36,
  displayValue = false,
  fontSize = 11,
}) => {
  const svgRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate or adapt value according to symbology
  const sanitizeValue = (val: string, fmt: BarcodeSymbology): { sanitized: string; validFmt: string } => {
    const raw = String(val || '000000').trim();
    if (fmt === 'QR') {
      return { sanitized: raw, validFmt: 'QR' };
    }
    if (fmt === 'EAN13') {
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 12) {
        return { sanitized: digits.slice(0, 13), validFmt: 'EAN13' };
      }
      // If not 12-13 digits, fallback to CODE128 so it won't crash
      return { sanitized: raw, validFmt: 'CODE128' };
    }
    if (fmt === 'UPC') {
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 11) {
        return { sanitized: digits.slice(0, 12), validFmt: 'UPC' };
      }
      return { sanitized: raw, validFmt: 'CODE128' };
    }
    if (fmt === 'CODE39') {
      const validCode39 = raw.toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, '');
      return { sanitized: validCode39 || '0000', validFmt: 'CODE39' };
    }
    return { sanitized: raw || '000000', validFmt: 'CODE128' };
  };

  useEffect(() => {
    if (Platform.OS !== 'web' && !svgRef.current) return;
    
    try {
      setError(null);
      const { sanitized, validFmt } = sanitizeValue(value, format);

      if (validFmt === 'QR') {
        // QR is rendered separately
        return;
      }

      if (svgRef.current) {
        JsBarcode(svgRef.current, sanitized, {
          format: validFmt,
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          margin: 0,
          background: 'transparent',
          lineColor: '#000000',
        });
      }
    } catch (err: any) {
      console.warn('JsBarcode render error:', err);
      setError(err?.message || 'Invalid barcode');
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (format === 'QR') {
    // Standard high-contrast QR display using URL encoded QR API or SVG blocks
    const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=${height * 2}x${height * 2}&data=${encodeURIComponent(
      value || '000000'
    )}`;
    return (
      <View style={styles.container}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUri}
          alt="QR Code"
          style={{ width: height * 1.6, height: height * 1.6, objectFit: 'contain' }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>* {value || 'INVALID'} *</Text>
        </View>
      ) : (
        <svg ref={svgRef} style={{ maxWidth: '100%', height: height }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    overflow: 'hidden',
  },
  errorBox: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#333333',
  },
});
