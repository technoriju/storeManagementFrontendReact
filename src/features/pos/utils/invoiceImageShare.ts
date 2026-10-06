import { Platform, Share as RNShare } from 'react-native';

export interface CaptureInvoiceResult {
  uri: string;
  blob?: Blob;
  fileName: string;
}

export interface ShareInvoiceImageOptions {
  targetRef: any;
  invoiceNumber: string;
  businessName?: string;
  total?: number;
  customerPhone?: string;
}

function cleanInvoiceNumber(invNum: string): string {
  return String(invNum || '0000').replace(/[^a-zA-Z0-9-_]/g, '_');
}

/**
 * Captures the invoice preview view as a high-resolution PNG image.
 * Uses html2canvas on Web, and react-native-view-shot on Android/iOS.
 */
export async function captureInvoiceToImage(
  targetRef: any,
  invoiceNumber: string
): Promise<CaptureInvoiceResult> {
  const fileName = `Invoice-${cleanInvoiceNumber(invoiceNumber)}.png`;

  if (Platform.OS === 'web') {
    let element: any = null;

    if (targetRef?.current) {
      element = targetRef.current?._nativeNode || targetRef.current;
    }

    if (!element && typeof document !== 'undefined') {
      element = document.getElementById('invoice-paper-sheet');
    }

    if (!element) {
      throw new Error('Invoice view element could not be located for image conversion.');
    }

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
      scale: 2, // 2x resolution for sharp text and barcode/QR
      backgroundColor: '#FFFFFF',
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    return {
      uri: dataUrl,
      blob: blob || undefined,
      fileName,
    };
  }

  // React Native Native (Android / iOS)
  const { captureRef } = await import('react-native-view-shot');
  const uri = await captureRef(targetRef, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });

  try {
    const RNFS = (await import('react-native-fs')).default;
    const destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    const sourcePath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
    await RNFS.copyFile(sourcePath, destPath);
    const finalUri = Platform.OS === 'android' ? `file://${destPath}` : destPath;
    return { uri: finalUri, fileName };
  } catch {
    return { uri, fileName };
  }
}

/**
 * Converts invoice to image and opens the native/system share dialog with the image attached.
 */
export async function shareInvoiceImage(
  options: ShareInvoiceImageOptions
): Promise<{ success: boolean; method: string; cancelled?: boolean }> {
  const result = await captureInvoiceToImage(options.targetRef, options.invoiceNumber);

  if (Platform.OS === 'web') {
    const nav = typeof globalThis !== 'undefined' ? (globalThis as any).navigator : null;

    // Check if Web Share API supports file sharing
    if (nav?.canShare && result.blob) {
      try {
        const file = new File([result.blob], result.fileName, { type: 'image/png' });
        if (nav.canShare({ files: [file] })) {
          await nav.share({
            files: [file],
            title: `Invoice ${options.invoiceNumber}`,
            text: `Invoice #${options.invoiceNumber} from ${options.businessName || 'Store'}`,
          });
          return { success: true, method: 'web-share' };
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { success: false, cancelled: true, method: 'web-share' };
        }
      }
    }

    // Web Fallback: download PNG file & copy to clipboard
    downloadDataUri(result.uri, result.fileName);

    if (result.blob && nav?.clipboard && (globalThis as any).ClipboardItem) {
      try {
        await nav.clipboard.write([
          new (globalThis as any).ClipboardItem({ 'image/png': result.blob }),
        ]);
      } catch {
        // clipboard write optional
      }
    }

    return { success: true, method: 'download' };
  }

  // Mobile Native (Android / iOS)
  try {
    const RNShareModule = (await import('react-native-share')).default;
    await RNShareModule.open({
      title: `Invoice ${options.invoiceNumber}`,
      url: result.uri,
      type: 'image/png',
      subject: `Invoice #${options.invoiceNumber}`,
      message: `Invoice #${options.invoiceNumber} from ${options.businessName || 'Store'}`,
    });
    return { success: true, method: 'rn-share' };
  } catch (err: any) {
    if (err?.message?.includes('User did not share') || err?.message?.includes('CANCELLED') || err?.message?.includes('dismissed')) {
      return { success: false, cancelled: true, method: 'rn-share' };
    }

    await RNShare.share({
      title: `Invoice ${options.invoiceNumber}`,
      url: result.uri,
      message: `Invoice #${options.invoiceNumber} for ₹${Number(options.total || 0).toFixed(2)} from ${options.businessName || 'Store'}`,
    });
    return { success: true, method: 'rn-share-fallback' };
  }
}

/**
 * Converts invoice to image and targets WhatsApp sharing.
 */
export async function shareInvoiceImageToWhatsApp(
  options: ShareInvoiceImageOptions
): Promise<{ success: boolean; method: string }> {
  const cleanPhone = (options.customerPhone || '').replace(/[^0-9]/g, '');

  if (Platform.OS === 'web') {
    const result = await captureInvoiceToImage(options.targetRef, options.invoiceNumber);

    // Download invoice image
    downloadDataUri(result.uri, result.fileName);

    // Also copy to clipboard if supported
    if (result.blob && navigator.clipboard && (globalThis as any).ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new (globalThis as any).ClipboardItem({ 'image/png': result.blob }),
        ]);
      } catch {
        // Optional
      }
    }

    const msg = `🧾 *Invoice #${options.invoiceNumber}*\nStore: *${options.businessName || 'Store'}*\nTotal: *₹${Number(options.total || 0).toFixed(2)}*\n\n(Invoice image generated & downloaded. Please attach to this chat.)`;
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    return { success: true, method: 'web-whatsapp' };
  }

  // Native Mobile
  try {
    const result = await captureInvoiceToImage(options.targetRef, options.invoiceNumber);
    const RNShareModule: any = (await import('react-native-share')).default;
    await RNShareModule.shareSingle({
      social: RNShareModule.Social.WHATSAPP,
      url: result.uri,
      type: 'image/png',
      whatsAppNumber: cleanPhone || undefined,
      message: `Invoice #${options.invoiceNumber} from ${options.businessName || 'Store'}`,
    });
    return { success: true, method: 'whatsapp-direct' };
  } catch {
    // If WhatsApp direct not available, fallback to general image share
    return await shareInvoiceImage(options);
  }
}

/**
 * Downloads the invoice image directly to user storage.
 */
export async function downloadInvoiceImage(
  targetRef: any,
  invoiceNumber: string
): Promise<{ success: boolean; fileName: string; uri: string }> {
  const result = await captureInvoiceToImage(targetRef, invoiceNumber);

  if (Platform.OS === 'web') {
    downloadDataUri(result.uri, result.fileName);
    return { success: true, fileName: result.fileName, uri: result.uri };
  }

  // Mobile: trigger native share with save option or copy to Downloads
  try {
    const RNShareModule = (await import('react-native-share')).default;
    await RNShareModule.open({
      title: `Save ${result.fileName}`,
      url: result.uri,
      type: 'image/png',
      saveToFiles: true,
    });
  } catch {
    // cancelled or done
  }
  return { success: true, fileName: result.fileName, uri: result.uri };
}

function downloadDataUri(uri: string, fileName: string) {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = uri;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
