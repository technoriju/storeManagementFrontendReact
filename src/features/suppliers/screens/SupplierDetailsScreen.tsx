import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { Supplier } from '../../../types/models';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { UserCheck, Phone, Mail, MapPin, Edit, CreditCard, History, ArrowLeft } from 'lucide-react-native';

export const SupplierDetailsScreen = ({ route, navigation, supplierId, onNavigate }: any) => {
  const theme = useTheme();
  const { isMobile, isDesktop } = useResponsive();
  const id = supplierId ?? route?.params?.id;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadSupplier();
    }
  }, [id]);

  const loadSupplier = async () => {
    try {
      const data = await supplierRepository.getById(Number(id));
      setSupplier(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!supplier) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Supplier not found</Text>
      </View>
    );
  }

  const balance = Number(supplier.outstandingBalance || 0);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.contentContainer, isMobile && { padding: 12 }]}
    >
      <View style={[styles.wrapper, { maxWidth: isDesktop ? 860 : '100%' }]}>
        {/* Back Button */}
        <View style={styles.navBar}>
          <TouchableOpacity 
            style={[styles.backOutlineBtn, { borderColor: theme.colors.border }]} 
            onPress={() => onNavigate ? onNavigate('list') : navigation?.goBack?.()}
          >
            <ArrowLeft size={16} color={theme.colors.text} />
            <Text style={[styles.backOutlineText, { color: theme.colors.text }]}>Back to Suppliers</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Header Card */}
        <View style={[styles.card, isMobile && styles.cardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.headerRow, isMobile && { marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.avatar, isMobile && styles.avatarMobile, { backgroundColor: '#F5F3FF' }]}>
                <UserCheck size={isMobile ? 18 : 24} color="#7C3AED" />
              </View>
              <View>
                <Text style={[styles.title, isMobile && styles.titleMobile, { color: theme.colors.text }]}>{supplier.name}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 }}>
                  ID: #{supplier.id} • SU{String((String(supplier.id).charCodeAt(0) || 0) % 999).padStart(3, '0')}
                </Text>
              </View>
            </View>
            <SyncBadge status={supplier.syncStatus || 'synced'} />
          </View>

          {/* Balance Spotlight */}
          <View style={[
            styles.balanceSpotlight,
            isMobile && styles.balanceSpotlightMobile,
            {
              backgroundColor: balance > 0 ? '#FEF2F2' : '#ECFDF5',
              borderColor: balance > 0 ? '#FCA5A5' : '#A7F3D0',
            }
          ]}>
            <View>
              <Text style={[styles.balanceLabel, isMobile && { fontSize: 9.5 }]}>OUTSTANDING PAYABLE</Text>
              <Text style={[styles.balanceAmount, isMobile && styles.balanceAmountMobile, { color: balance > 0 ? '#EF4444' : '#10B981' }]}>
                ₹{balance.toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.balanceSub, isMobile && { fontSize: 11 }, { color: theme.colors.textSecondary }]}>
              {balance > 0 ? 'Payment Due' : 'All Clear'}
            </Text>
          </View>

          {/* Info Details */}
          <View style={[styles.infoGrid, isMobile && { flexDirection: 'column', gap: 8 }]}>
            <View style={[styles.infoRow, isMobile && { gap: 6 }]}>
              <Phone size={14} color={theme.colors.textSecondary} />
              <View style={{ flex: 1, flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between' }}>
                <Text style={styles.infoKey}>Phone</Text>
                <Text style={[styles.infoVal, isMobile && { fontSize: 12 }, { color: theme.colors.text }]}>{supplier.phone || 'N/A'}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, isMobile && { gap: 6 }]}>
              <Mail size={14} color={theme.colors.textSecondary} />
              <View style={{ flex: 1, flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between' }}>
                <Text style={styles.infoKey}>Email</Text>
                <Text style={[styles.infoVal, isMobile && { fontSize: 12 }, { color: theme.colors.text }]}>{supplier.email || 'N/A'}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, isMobile && { gap: 6 }]}>
              <MapPin size={14} color={theme.colors.textSecondary} />
              <View style={{ flex: 1, flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between' }}>
                <Text style={styles.infoKey}>Address</Text>
                <Text style={[styles.infoVal, isMobile && { fontSize: 12 }, { color: theme.colors.text }]} numberOfLines={1}>{supplier.address || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons Toolbar */}
        <View style={[styles.actionsBar, isMobile && { flexDirection: 'row', gap: 8 }]}>
          <TouchableOpacity 
            style={[styles.actionBtn, isMobile && styles.actionBtnMobile, { backgroundColor: '#F97316' }]} 
            onPress={() => onNavigate ? onNavigate('form', supplier.id) : navigation?.navigate('SupplierForm', { id: supplier.id })}
          >
            <Edit size={14} color="white" />
            <Text style={[styles.actionBtnText, isMobile && styles.actionBtnTextMobile]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, isMobile && styles.actionBtnMobile, { backgroundColor: '#10B981' }]} 
            onPress={() => onNavigate ? onNavigate('payment_form', supplier.id, { entityType: 'supplier', paymentType: 'give' }) : navigation?.navigate('PaymentForm', { supplierId: supplier.id })}
          >
            <CreditCard size={14} color="white" />
            <Text style={[styles.actionBtnText, isMobile && styles.actionBtnTextMobile]}>Pay</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, isMobile && styles.actionBtnMobile, { backgroundColor: '#2563EB' }]} 
            onPress={() => onNavigate ? onNavigate('payment_history', supplier.id, { entityType: 'supplier' }) : navigation?.navigate('PaymentHistory', { supplierId: supplier.id })}
          >
            <History size={14} color="white" />
            <Text style={[styles.actionBtnText, isMobile && styles.actionBtnTextMobile]}>History</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 20, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  wrapper: { width: '100%' },
  navBar: { marginBottom: 16, flexDirection: 'row' },
  backOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    gap: 6,
  },
  backOutlineText: { fontSize: 13, fontWeight: '600' },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  cardMobile: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  title: { fontSize: 18, fontWeight: '700' },
  titleMobile: { fontSize: 15 },
  balanceSpotlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  balanceSpotlightMobile: {
    padding: 10,
    marginBottom: 12,
  },
  balanceLabel: { fontSize: 10.5, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
  balanceAmount: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  balanceAmountMobile: { fontSize: 16 },
  balanceSub: { fontSize: 12, fontWeight: '500' },
  infoGrid: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoKey: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  infoVal: { fontSize: 13, fontWeight: '500' },
  actionsBar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
    minWidth: 140,
  },
  actionBtnMobile: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  actionBtnTextMobile: { fontSize: 12 },
});


