import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
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
  width = 1.4,
  height = 36,
  displayValue = false,
  fontSize = 11,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrSvgHtml, setQrSvgHtml] = useState<string>('');

  // Validate or adapt value according to symbology
  const sanitizeValue = (val: string, fmt: BarcodeSymbology): { sanitized: string; validFmt: string } => {
    const raw = String(val || '000000').trim();
    if (fmt === 'QR') {
      return { sanitized: raw || 'ITEM', validFmt: 'QR' };
    }
    if (fmt === 'EAN13') {
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 12) {
        return { sanitized: digits.slice(0, 13), validFmt: 'EAN13' };
      }
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
    const rawVal = value || '000000';
    setError(null);

    if (format === 'QR') {
      // Offline local pure vector QR generation
      QRCode.toString(
        rawVal,
        {
          type: 'svg',
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          width: Math.max(48, Math.round(height * 1.5)),
        },
        (err, svgString) => {
          if (err) {
            console.warn('QR code generation error:', err);
            setError('QR error');
          } else {
            setQrSvgHtml(svgString);
          }
        }
      );
      return;
    }

    // 1D Barcode rendering via JsBarcode
    if (Platform.OS !== 'web' && !svgRef.current) return;

    try {
      const { sanitized, validFmt } = sanitizeValue(rawVal, format);
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
    if (error) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>* QR ERROR *</Text>
        </View>
      );
    }

    return (
      <div
        className="barcode-qr-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: `${Math.round(height * 1.5)}px`,
          height: `${Math.round(height * 1.5)}px`,
          overflow: 'hidden',
        }}
        dangerouslySetInnerHTML={{ __html: qrSvgHtml }}
      />
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
