import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import {
  Share2,
  Mail,
  MessageCircle,
  X,
  Copy,
  Check,
  Send,
  Phone,
  User,
  FileText,
} from 'lucide-react-native';
import { useInvoiceSettingsStore } from '../../settings/store/invoiceSettings.store';

export function buildSaleShareText(sale: any, businessProfile?: any): string {
  if (!sale) return '';
  const bName = businessProfile?.businessName || 'Store';
  const bPhone = businessProfile?.phone ? ` | 📞 ${businessProfile.phone}` : '';
  const ref = sale.reference || sale.invoiceNumber || `INV-${sale.id || ''}`;
  const date = sale.date || (sale.createdAt ? String(sale.createdAt).split('T')[0] : new Date().toISOString().split('T')[0]);
  const customerName = sale.customerName || 'Walk-in Customer';
  const customerPhone = sale.customerPhone || '';

  let itemsText = '';
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    itemsText = sale.items
      .map((it: any, idx: number) => {
        const pName = it.productName || `Item #${idx + 1}`;
        const qty = Number(it.quantity) || 1;
        const price = Number(it.unitPrice || it.price || 0);
        const total = Number(it.total || qty * price);
        const unit = it.unit ? ` ${it.unit}` : '';
        return `• ${pName} - ${qty}${unit} @ ₹${price.toFixed(2)} = ₹${total.toFixed(2)}`;
      })
      .join('\n');
  }

  const subtotal = Number(sale.subtotal || sale.grandTotal || sale.total || 0);
  const tax = Number(sale.orderTax || sale.gst || 0);
  const discount = Number(sale.discount || 0);
  const grandTotal = Number(sale.grandTotal || sale.total || 0);
  const paid = Number(sale.paid !== undefined ? sale.paid : grandTotal);
  const due = Number(sale.due !== undefined ? sale.due : Math.max(0, grandTotal - paid));

  const parts = [
    `🧾 *SALES INVOICE*`,
    `🏪 *${bName}*${bPhone}`,
    `--------------------------------`,
    `Invoice: *${ref}*`,
    `Date: ${date}`,
    `Customer: *${customerName}*${customerPhone ? ` (${customerPhone})` : ''}`,
    itemsText ? `\n🛒 *Items:*\n${itemsText}` : '',
    `--------------------------------`,
    `Subtotal: ₹${subtotal.toFixed(2)}`,
    tax > 0 ? `Tax/GST: ₹${tax.toFixed(2)}` : '',
    discount > 0 ? `Discount: ₹${discount.toFixed(2)}` : '',
    `*Grand Total: ₹${grandTotal.toFixed(2)}*`,
    `Paid: ₹${paid.toFixed(2)}`,
    due > 0 ? `*Due Balance: ₹${due.toFixed(2)}*` : `Due: ₹0.00`,
    `Payment Status: *${sale.paymentStatus || (due === 0 ? 'Paid' : 'Unpaid')}*`,
    `--------------------------------`,
    `Thank you for your business!`,
  ];

  return parts.filter(Boolean).join('\n');
}

interface ShareSaleModalProps {
  visible: boolean;
  sale: any | null;
  onClose: () => void;
}

export const ShareSaleModal: React.FC<ShareSaleModalProps> = ({
  visible,
  sale,
  onClose,
}) => {
  const theme = useTheme();
  const invoiceSettings = useInvoiceSettingsStore((state) => state.settings);
  const businessProfile = invoiceSettings?.businessProfile;

  const [customPhone, setCustomPhone] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync initial phone and email from sale when opened
  React.useEffect(() => {
    if (sale) {
      setCustomPhone(sale.customerPhone || '');
      setCustomEmail((sale as any).customerEmail || '');
      setCopied(false);
    }
  }, [sale]);

  const shareText = useMemo(() => {
    return buildSaleShareText(sale, businessProfile);
  }, [sale, businessProfile]);

  const refNumber = sale?.reference || sale?.invoiceNumber || `INV-${sale?.id || ''}`;
  const customerName = sale?.customerName || 'Walk-in Customer';
  const totalAmount = Number(sale?.grandTotal || sale?.total || 0).toFixed(2);

  // 1. WhatsApp Handler
  const handleWhatsApp = async () => {
    const rawPhone = customPhone.trim() || sale?.customerPhone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    // Formatted link
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`
      : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    try {
      if (Platform.OS === 'web') {
        window.open(waUrl, '_blank');
        return;
      }

      // Mobile app protocol attempt
      const appUrl = cleanPhone
        ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(shareText)}`
        : `whatsapp://send?text=${encodeURIComponent(shareText)}`;

      const supported = await Linking.canOpenURL(appUrl);
      if (supported) {
        await Linking.openURL(appUrl);
        return;
      }

      // Fallback to web link
      await Linking.openURL(waUrl);
    } catch (e) {
      // Fallback to system share
      Share.share({
        title: `Invoice ${refNumber}`,
        message: shareText,
      }).catch(() => {});
    }
  };

  // 2. Email Handler
  const handleEmail = async () => {
    const targetEmail = customEmail.trim() || (sale as any)?.customerEmail || '';
    const subject = `Sales Invoice ${refNumber} - ${businessProfile?.businessName || 'Store'}`;
    const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText)}`;

    try {
      if (Platform.OS === 'web') {
        window.location.href = mailtoUrl;
        return;
      }
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
      } else {
        await Share.share({
          title: subject,
          message: `${subject}\n\n${shareText}`,
        });
      }
    } catch (e) {
      Share.share({
        title: subject,
        message: `${subject}\n\n${shareText}`,
      }).catch(() => {});
    }
  };

  // 3. System Share Handler (Any installed app: WhatsApp, Gmail, Telegram, Bluetooth, etc.)
  const handleSystemShare = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: `Invoice ${refNumber}`,
          text: shareText,
        });
      } else {
        await Share.share({
          title: `Invoice ${refNumber}`,
          message: shareText,
        });
      }
    } catch (e) {
      // User cancelled
    }
  };

  // 4. Copy to Clipboard
  const handleCopy = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      Share.share({
        title: `Invoice ${refNumber}`,
        message: shareText,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!visible || !sale) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
                <Share2 size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.colors.text }]}>Share Invoice</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  {refNumber} • ₹{totalAmount}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Customer Summary Card */}
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.summaryRow}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Customer</Text>
                <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                  {customerName}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Total Amount</Text>
                <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 14 }}>
                  ₹{totalAmount}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Status</Text>
                <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 12 }}>
                  {sale.paymentStatus || 'Completed'}
                </Text>
              </View>
            </View>

            {/* Quick Share Options Buttons */}
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              SHARE OPTIONS
            </Text>

            <View style={styles.actionsGrid}>
              {/* WhatsApp Button */}
              <Pressable
                style={[styles.shareActionBtn, { backgroundColor: '#25D366' }]}
                onPress={handleWhatsApp}
              >
                <MessageCircle size={20} color="white" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareBtnTitle}>WhatsApp</Text>
                  <Text style={styles.shareBtnSub}>
                    {customPhone.trim() ? `Send to ${customPhone}` : 'Share with contact'}
                  </Text>
                </View>
                <Send size={16} color="white" />
              </Pressable>

              {/* Email Button */}
              <Pressable
                style={[styles.shareActionBtn, { backgroundColor: '#EA4335' }]}
                onPress={handleEmail}
              >
                <Mail size={20} color="white" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareBtnTitle}>Email</Text>
                  <Text style={styles.shareBtnSub}>
                    {customEmail.trim() ? `To ${customEmail}` : 'Send invoice via email'}
                  </Text>
                </View>
                <Send size={16} color="white" />
              </Pressable>

              {/* Native System Share (Other Apps) */}
              <Pressable
                style={[styles.shareActionBtn, { backgroundColor: '#3B82F6' }]}
                onPress={handleSystemShare}
              >
                <Share2 size={20} color="white" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareBtnTitle}>Other Apps / System</Text>
                  <Text style={styles.shareBtnSub}>Share via Bluetooth, SMS, Telegram etc.</Text>
                </View>
                <Send size={16} color="white" />
              </Pressable>
            </View>

            {/* Recipient Details Inputs */}
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 14 }]}>
              RECIPIENT CONTACT (OPTIONAL)
            </Text>

            <View style={{ gap: 8 }}>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                ]}
              >
                <Phone size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  value={customPhone}
                  onChangeText={setCustomPhone}
                  placeholder="WhatsApp phone (e.g. 9876543210)"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                  style={[styles.input, { color: theme.colors.text }]}
                />
              </View>

              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                ]}
              >
                <Mail size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  value={customEmail}
                  onChangeText={setCustomEmail}
                  placeholder="Customer email (e.g. client@example.com)"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { color: theme.colors.text }]}
                />
              </View>
            </View>

            {/* Message Preview Box */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                MESSAGE PREVIEW
              </Text>
              <Pressable
                onPress={handleCopy}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6 }}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} color={theme.colors.primary} />}
                <Text style={{ fontSize: 11, color: copied ? '#10B981' : theme.colors.primary, fontWeight: '600' }}>
                  {copied ? 'Copied!' : 'Copy Text'}
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.previewBox,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.previewText,
                  { color: theme.colors.textSecondary },
                ]}
                numberOfLines={10}
              >
                {shareText}
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <Pressable
              style={[styles.copyBtn, { borderColor: theme.colors.border }]}
              onPress={handleCopy}
            >
              {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} color={theme.colors.text} />}
              <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                {copied ? 'Copied to Clipboard' : 'Copy Invoice Text'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.closeBottomBtn, { backgroundColor: theme.colors.border }]}
              onPress={onClose}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  actionsGrid: {
    gap: 10,
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 12,
  },
  shareBtnTitle: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  shareBtnSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  previewText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeBottomBtn: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
