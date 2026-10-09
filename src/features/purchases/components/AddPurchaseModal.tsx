import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import {
  X,
  Plus,
  Calendar,
  Search,
  Trash2,
  PackageCheck,
  AlertCircle,
  Truck,
  Check,
} from 'lucide-react-native';
import { useSuppliers, useAddSupplier } from '../../suppliers/api/useSupplier';
import { useSupplierStore } from '../../suppliers/store/supplierStore';
import { Supplier } from '../../../types/models';
import { useProductStore } from '../../products/store/productStore';
import { useCreatePurchase, useUpdatePurchase } from '../api/usePurchases';
import { purchaseRepository } from '../../../core/repositories/PurchaseRepository';
import { useUnits } from '../../units/api/useUnit';
import { useSubUnits } from '../../sub_units/api/useSubUnit';
import { useBrands } from '../../brands/api/useBrand';
import { Product } from '../../products/types';

interface PurchaseItemRow {
  productId: number;
  productName: string;
  sku?: string;
  quantity: number | string;
  unitPrice: number | string;
  discount: number | string;
  gst: number | string;
  unit?: string;
  unitType?: 'base' | 'sub';
  baseUnitName?: string;
  subUnitName?: string;
  conversionRate?: number;
  basePrice?: number;
  subPrice?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  editPurchaseId?: number | string | null;
}

export const AddPurchaseModal: React.FC<Props> = ({ visible, onClose, editPurchaseId }) => {
  const theme = useTheme();
  const { isMobile, windowHeight } = useResponsive();

  // Suppliers & Products
  const { data: suppliers = [] } = useSuppliers();
  const { products, fetchProducts } = useProductStore();
  const { data: unitList = [] } = useUnits();
  const { data: subUnitList = [] } = useSubUnits();
  const { data: brandsList = [] } = useBrands();
  const createPurchaseMutation = useCreatePurchase();
  const updatePurchaseMutation = useUpdatePurchase();
  const addSupplierMutation = useAddSupplier();

  // Form State
  const [supplierId, setSupplierId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>(() => `PO-${Math.floor(100000 + Math.random() * 900000)}`);
  const [status, setStatus] = useState<'Received' | 'Pending' | 'Ordered'>('Received');
  const [orderTax, setOrderTax] = useState<string>('0');
  const [orderDiscount, setOrderDiscount] = useState<string>('0');
  const [shipping, setShipping] = useState<string>('0');
  const [description, setDescription] = useState<string>('');

  // Quick Add Supplier State
  const [showAddSupplierModal, setShowAddSupplierModal] = useState<boolean>(false);
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [supplierModalError, setSupplierModalError] = useState<string | null>(null);
  const [isSavingSupplier, setIsSavingSupplier] = useState<boolean>(false);
  const [localAddedSuppliers, setLocalAddedSuppliers] = useState<Supplier[]>([]);

  // Supplier Previous Balance / Advance in Purchase State
  const [showPreviousBalance, setShowPreviousBalance] = useState<boolean>(false);
  const [balanceType, setBalanceType] = useState<'due' | 'advance'>('due');
  const [previousBalanceAmount, setPreviousBalanceAmount] = useState<string>('0');
  const [supplierRawBalance, setSupplierRawBalance] = useState<number>(0);
  const [unpaidPurchasesCount, setUnpaidPurchasesCount] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Payment Status & Paid Amount State
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [amountReceived, setAmountReceived] = useState<string>('');

  // Product Search & Items Table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [items, setItems] = useState<PurchaseItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (products.length === 0) {
        fetchProducts().catch(() => {});
      }
      setErrorMessage(null);
      setShowAddSupplierModal(false);
      setNewSupplierName('');
      setSupplierModalError(null);

      if (editPurchaseId) {
        const numericId = Number(editPurchaseId);
        (async () => {
          try {
            let existingPurchase: any = null;
            let existingItems: any[] = [];
            if (/^\d+$/.test(String(editPurchaseId)) && numericId > 0 && numericId < 1000000000000) {
              try {
                existingPurchase = await purchaseRepository.fetchByIdFromApi(numericId);
                if (existingPurchase?.items && existingPurchase.items.length > 0) {
                  existingItems = existingPurchase.items;
                }
              } catch (e) {
                console.warn('API fetch for edit purchase fallback:', e);
              }
            }
            if (!existingPurchase) {
              existingPurchase = await purchaseRepository.getById(numericId);
            }
            if (!existingItems || existingItems.length === 0) {
              existingItems = await purchaseRepository.getItemsForPurchase(numericId);
            }

            if (existingPurchase) {
              setSupplierId(existingPurchase.supplierId ? String(existingPurchase.supplierId) : '');
              setDate(existingPurchase.date ? existingPurchase.date.split('T')[0] : new Date().toISOString().split('T')[0]);
              setReference(existingPurchase.reference || existingPurchase.invoiceNumber || `PO-${numericId}`);
              setStatus((existingPurchase.status as any) || 'Received');
              setOrderTax(String(existingPurchase.orderTax || 0));
              setOrderDiscount(String(existingPurchase.discount || 0));
              setShipping(String(existingPurchase.shipping || 0));
              setDescription(existingPurchase.notes || '');

              const paidNum = Number(existingPurchase.paid || 0);
              const totalNum = Number(existingPurchase.total || 0);
              setPaymentStatus((existingPurchase.paymentStatus as any) || (paidNum >= totalNum && totalNum > 0 ? 'Paid' : paidNum > 0 ? 'Partial' : 'Unpaid'));
              setAmountReceived(paidNum > 0 ? String(paidNum) : '');

              const prevDueVal = Number(existingPurchase.previousDue || 0);
              const advVal = Number(existingPurchase.advancePayment || 0);
              if (existingPurchase.showPreviousBalance && prevDueVal > 0) {
                setShowPreviousBalance(true);
                setBalanceType('due');
                setPreviousBalanceAmount(String(prevDueVal));
              } else if (existingPurchase.showPreviousBalance && advVal > 0) {
                setShowPreviousBalance(true);
                setBalanceType('advance');
                setPreviousBalanceAmount(String(advVal));
              }

              if (existingItems && existingItems.length > 0) {
                const mappedItems: PurchaseItemRow[] = existingItems.map((item: any) => {
                  const prod = products.find((p) => p.id === Number(item.productId));
                  const cRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : (prod?.conversionRate ? Number(prod.conversionRate) : 1);

                  return {
                    productId: Number(item.productId),
                    productName: item.productName || prod?.name || `Product #${item.productId}`,
                    sku: item.sku || prod?.sku,
                    quantity: Number(item.quantity || 1),
                    unitPrice: Number(item.unitPrice || 0),
                    discount: Number(item.discount || 0),
                    gst: Number(item.gst || 0),
                    unit: item.unit || (item.unitType === 'sub' ? (item.subUnitName || 'Pcs') : (item.baseUnitName || 'Box')),
                    unitType: item.unitType ? (item.unitType as any) : 'base',
                    baseUnitName: item.baseUnitName || 'Box',
                    subUnitName: item.subUnitName || 'Pcs',
                    conversionRate: cRate,
                    basePrice: item.unitType === 'base' ? Number(item.unitPrice) : Number((item.unitPrice * cRate).toFixed(2)),
                    subPrice: item.unitType === 'sub' ? Number(item.unitPrice) : (cRate > 0 ? Number((item.unitPrice / cRate).toFixed(2)) : Number(item.unitPrice)),
                  };
                });
                setItems(mappedItems);
              } else {
                setItems([]);
              }
            }
          } catch (err) {
            console.warn('Error loading purchase for editing:', err);
          }
        })();
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setReference(`PO-${Math.floor(100000 + Math.random() * 900000)}`);
        setItems([]);
        setSupplierId('');
        setOrderTax('0');
        setOrderDiscount('0');
        setShipping('0');
        setDescription('');
        setPaymentStatus('Paid');
        setAmountReceived('');
        setShowPreviousBalance(false);
        setPreviousBalanceAmount('0');
        setSupplierRawBalance(0);
        setUnpaidPurchasesCount(0);
      }
    }
  }, [visible, editPurchaseId, products.length, fetchProducts]);

  // Quick Add Supplier Handler
  const handleQuickAddSupplier = async () => {
    const trimmed = newSupplierName.trim();
    if (!trimmed) {
      setSupplierModalError('Please enter supplier name.');
      return;
    }

    try {
      setIsSavingSupplier(true);
      setSupplierModalError(null);

      // 1. If supplier already exists in list, select immediately
      const existing = allSuppliers.find(
        (s) => s.name?.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        setSupplierId(String(existing.id));
        setNewSupplierName('');
        setShowAddSupplierModal(false);
        return;
      }

      const created = await addSupplierMutation.mutateAsync({
        name: trimmed,
      });

      if (created && created.id) {
        setLocalAddedSuppliers((prev) => {
          const filtered = prev.filter(
            (p) =>
              String(p.id) !== String(created.id) &&
              p.name?.trim().toLowerCase() !== created.name?.trim().toLowerCase()
          );
          return [...filtered, created];
        });
        try {
          useSupplierStore.getState().addSupplier(created);
        } catch (_) {}

        setSupplierId(String(created.id));
      }
      setNewSupplierName('');
      setShowAddSupplierModal(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to add supplier.';
      setSupplierModalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSavingSupplier(false);
    }
  };

  // Merged Supplier Options
  const allSuppliers = useMemo(() => {
    const list = [...suppliers];
    for (const s of localAddedSuppliers) {
      if (
        !list.some(
          (existing) =>
            String(existing.id) === String(s.id) ||
            existing.name?.trim().toLowerCase() === s.name?.trim().toLowerCase()
        )
      ) {
        list.push(s);
      }
    }
    return list;
  }, [suppliers, localAddedSuppliers]);

  // Keep supplierId in sync if a temp negative supplier ID resolves to positive server ID in suppliers
  useEffect(() => {
    if (!supplierId) return;
    const num = Number(supplierId);
    if (num < 0) {
      const local = localAddedSuppliers.find((l) => String(l.id) === supplierId);
      if (local && local.name) {
        const matched = suppliers.find(
          (s) =>
            s.name?.trim().toLowerCase() === local.name.trim().toLowerCase() &&
            Number(s.id) > 0
        );
        if (matched) {
          setSupplierId(String(matched.id));
        }
      }
    }
  }, [suppliers, supplierId, localAddedSuppliers]);

  const supplierOptions = useMemo(() => {
    return allSuppliers.map((s) => ({
      label: s.name,
      value: String(s.id),
    }));
  }, [allSuppliers]);

  const selectedSupplier = useMemo(() => {
    return allSuppliers.find((s) => String(s.id) === String(supplierId));
  }, [allSuppliers, supplierId]);

  useEffect(() => {
    // Immediately clear previous balance states so new supplier doesn't show old supplier's dues
    setShowPreviousBalance(false);
    setPreviousBalanceAmount('0');
    setSupplierRawBalance(0);
    setUnpaidPurchasesCount(0);

    if (!supplierId || !selectedSupplier) {
      setIsLoadingBalance(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingBalance(true);

    purchaseRepository
      .getSupplierPreviousBalance(
        selectedSupplier.id,
        selectedSupplier.name,
        editPurchaseId ? Number(editPurchaseId) : undefined
      )
      .then((res) => {
        if (!isCurrent) return;
        setUnpaidPurchasesCount(res.unpaidCount || 0);
        if (res.totalDue > 0) {
          setSupplierRawBalance(res.totalDue);
          setBalanceType('due');
          setPreviousBalanceAmount(String(res.totalDue));
          setShowPreviousBalance(true);
        } else if (res.advance > 0) {
          setSupplierRawBalance(-res.advance);
          setBalanceType('advance');
          setPreviousBalanceAmount(String(res.advance));
          setShowPreviousBalance(true);
        } else {
          setSupplierRawBalance(0);
          setBalanceType('due');
          setPreviousBalanceAmount('0');
          setShowPreviousBalance(false);
        }
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.warn('Failed to fetch supplier purchase dues:', err);
        setSupplierRawBalance(0);
        setBalanceType('due');
        setPreviousBalanceAmount('0');
        setShowPreviousBalance(false);
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingBalance(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [supplierId, selectedSupplier?.id, editPurchaseId]);

  const statusOptions = [
    { label: 'Received', value: 'Received' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Ordered', value: 'Ordered' },
  ];

  const paymentStatusOptions = [
    { label: 'Paid (Cash / Full)', value: 'Paid' },
    { label: 'Unpaid (Due / Udhar)', value: 'Unpaid' },
    { label: 'Partial (Partial Due)', value: 'Partial' },
  ];

  const brandsMap = useMemo(() => {
    const map: Record<string, string> = {};
    brandsList.forEach((b: any) => {
      if (b && b.id && b.name) map[String(b.id)] = b.name;
    });
    return map;
  }, [brandsList]);

  const getBrandName = (p: Product) => {
    return p.brandName || p.brand?.name || (p.brandId ? brandsMap[String(p.brandId)] : undefined) || 'N/A';
  };

  // Filtered products for live search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchName = p.name?.toLowerCase().includes(query);
      const matchSku = p.sku?.toLowerCase().includes(query);
      const matchBarcode = p.barcode?.toLowerCase().includes(query);
      const bName = p.brandName || p.brand?.name || (p.brandId ? brandsMap[String(p.brandId)] : '') || '';
      const matchBrand = bName.toLowerCase().includes(query);
      return matchName || matchSku || matchBarcode || matchBrand;
    }).slice(0, 10);
  }, [searchQuery, products, brandsMap]);

  // Add Product to Table
  const handleAddProduct = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      const curr = parseFloat(String(updated[existingIndex].quantity)) || 0;
      updated[existingIndex].quantity = Number((curr + 1).toFixed(4));
      setItems(updated);
    } else {
      const basePrice = product.purchasePrice || product.cost || product.price || 0;
      const cRate = product.conversionRate && Number(product.conversionRate) > 0 ? Number(product.conversionRate) : 1;
      const subPrice = cRate > 0 ? Number((basePrice / cRate).toFixed(2)) : basePrice;

      const baseUnit = unitList.find((u: any) => String(u.id) === String(product.unitId || product.baseUnitId) || String(u.backendId) === String(product.unitId || product.baseUnitId));
      const subUnit = subUnitList.find((s: any) => String(s.id) === String(product.subUnitId || product.subunitId) || String(s.backendId) === String(product.subUnitId || product.subunitId));

      const baseUnitName = baseUnit?.name || baseUnit?.shortName || 'Box';
      const subUnitName = subUnit?.name || 'Pcs';

      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice: basePrice,
          basePrice,
          subPrice,
          discount: 0,
          gst: product.gst || 0,
          unit: baseUnitName,
          unitType: 'base',
          baseUnitName,
          subUnitName,
          conversionRate: cRate,
        },
      ]);
    }
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleToggleUnit = (index: number) => {
    const item = items[index];
    const nextType: 'base' | 'sub' = item.unitType === 'base' ? 'sub' : 'base';
    const nextUnit = nextType === 'base' ? (item.baseUnitName || 'Box') : (item.subUnitName || 'Pcs');
    const nextPrice = nextType === 'base' ? (item.basePrice || Number(item.unitPrice)) : (item.subPrice || Number(((parseFloat(String(item.unitPrice)) || 0) / (item.conversionRate || 1)).toFixed(2)));
    const updated = [...items];
    updated[index] = {
      ...item,
      unitType: nextType,
      unit: nextUnit,
      unitPrice: nextPrice,
    };
    setItems(updated);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof PurchaseItemRow, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculated Line Items
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const parsedQty = parseFloat(String(item.quantity));
      const effectiveQty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 0;
      const unitPriceNum = parseFloat(String(item.unitPrice)) || 0;
      const discountNum = parseFloat(String(item.discount)) || 0;
      const gstNum = parseFloat(String(item.gst)) || 0;
      const rawSubtotal = effectiveQty * unitPriceNum;
      const netSubtotal = Math.max(0, rawSubtotal - discountNum);
      const taxAmount = netSubtotal * (gstNum / 100);
      const total = netSubtotal + taxAmount;
      const unitCost = effectiveQty > 0 ? total / effectiveQty : 0;
      return {
        ...item,
        quantity: item.quantity,
        taxAmount,
        unitCost,
        total,
      };
    });
  }, [items]);

  // Calculated Order Totals
  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const parsedQty = parseFloat(String(item.quantity));
      const effectiveQty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 0;
      const unitPriceNum = parseFloat(String(item.unitPrice)) || 0;
      return sum + effectiveQty * unitPriceNum;
    }, 0);
  }, [items]);

  const itemsDiscount = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(String(item.discount)) || 0), 0);
  }, [items]);

  const itemsTax = useMemo(() => {
    return calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
  }, [calculatedItems]);

  const orderTaxNum = parseFloat(orderTax) || 0;
  const orderDiscountNum = parseFloat(orderDiscount) || 0;
  const shippingNum = parseFloat(shipping) || 0;

  const totalDiscount = itemsDiscount + orderDiscountNum;
  const grandTotal = Math.max(
    0,
    itemsSubtotal - totalDiscount + itemsTax + orderTaxNum + shippingNum
  );

  // Submit Handler
  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!supplierId) {
      setErrorMessage('Please select a supplier.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one product to the purchase.');
      return;
    }

    try {
      const parsedBalanceAmt = Math.abs(parseFloat(previousBalanceAmount) || 0);
      const prevDueVal = showPreviousBalance && balanceType === 'due' ? parsedBalanceAmt : 0;
      const advPaymentVal = showPreviousBalance && balanceType === 'advance' ? parsedBalanceAmt : 0;

      let finalPaid = grandTotal;
      let finalDue = 0;
      let effectivePaymentStatus: 'Paid' | 'Unpaid' | 'Partial' = paymentStatus;

      if (paymentStatus === 'Paid') {
        finalPaid = grandTotal;
        finalDue = 0;
      } else if (paymentStatus === 'Unpaid') {
        finalPaid = 0;
        finalDue = grandTotal;
      } else if (paymentStatus === 'Partial') {
        const parsed = parseFloat(amountReceived);
        finalPaid = !isNaN(parsed) && parsed > 0 ? Math.min(grandTotal, parsed) : 0;
        finalDue = Math.max(0, grandTotal - finalPaid);
        if (finalPaid >= grandTotal) effectivePaymentStatus = 'Paid';
        else if (finalPaid === 0) effectivePaymentStatus = 'Unpaid';
      } else {
        finalPaid = status === 'Received' ? grandTotal : 0;
        finalDue = status === 'Received' ? 0 : grandTotal;
        effectivePaymentStatus = status === 'Received' ? 'Paid' : 'Unpaid';
      }

      let effectiveSupplierId = Number(supplierId);
      const suppName = selectedSupplier?.name;
      if (effectiveSupplierId < 0 && suppName) {
        const positiveMatch = suppliers.find(
          (s) =>
            s.name?.trim().toLowerCase() === suppName.trim().toLowerCase() &&
            Number(s.id) > 0
        );
        if (positiveMatch) {
          effectiveSupplierId = Number(positiveMatch.id);
        }
      }

      const purchasePayload = {
        invoiceNumber: reference || `PO-${Date.now().toString().slice(-6)}`,
        reference: reference || `PO-${Date.now().toString().slice(-6)}`,
        supplierId: effectiveSupplierId,
        supplierName: suppName || 'Unknown Supplier',
        date: date || new Date().toISOString().split('T')[0],
        subtotal: itemsSubtotal,
        discount: totalDiscount,
        orderTax: orderTaxNum,
        shipping: shippingNum,
        gst: itemsTax,
        total: grandTotal,
        paid: finalPaid,
        due: finalDue,
        status,
        paymentStatus: effectivePaymentStatus,
        notes: description || undefined,
        previousDue: prevDueVal,
        advancePayment: advPaymentVal,
        showPreviousBalance: Boolean(showPreviousBalance && (prevDueVal > 0 || advPaymentVal > 0)),
      };

      const itemsPayload = calculatedItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: parseFloat(String(item.quantity)) > 0 ? parseFloat(String(item.quantity)) : 1,
        unitPrice: parseFloat(String(item.unitPrice)) || 0,
        discount: parseFloat(String(item.discount)) || 0,
        gst: parseFloat(String(item.gst)) || 0,
        taxAmount: item.taxAmount,
        unitCost: item.unitCost,
        unit: item.unit,
        unitType: item.unitType,
        conversionRate: item.conversionRate,
        total: item.total,
      }));

      if (editPurchaseId) {
        await updatePurchaseMutation.mutateAsync({
          id: Number(editPurchaseId),
          purchase: purchasePayload,
          items: itemsPayload,
        });
      } else {
        await createPurchaseMutation.mutateAsync({
          purchase: purchasePayload,
          items: itemsPayload,
        });
      }

      // Reset & Close
      setItems([]);
      setSupplierId('');
      setSearchQuery('');
      setDescription('');
      setShowPreviousBalance(false);
      setPreviousBalanceAmount('0');
      setSupplierRawBalance(0);
      setUnpaidPurchasesCount(0);
      setPaymentStatus('Paid');
      setAmountReceived('');
      onClose();
      Alert.alert('Success', editPurchaseId ? 'Purchase updated successfully!' : 'Purchase created successfully!');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save purchase.');
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)', padding: isMobile ? 8 : 16 }]}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              width: isMobile ? '98%' : '85%',
              maxWidth: 1050,
              maxHeight: isMobile ? Math.floor((windowHeight || 800) * 0.95) : Math.min(Math.floor((windowHeight || 800) * 0.90), 850),
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PackageCheck size={20} color="#F97316" />
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
                {editPurchaseId ? 'Edit Purchase' : 'Add Purchase'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <View style={{ padding: isMobile ? 12 : 20, gap: isMobile ? 12 : 16 }}>
              {/* Error banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Row 1: Supplier, Date, Reference */}
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                {/* Supplier */}
                <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <AppSelect
                      label="Supplier Name *"
                      placeholder={allSuppliers.length === 0 ? 'No suppliers available' : 'Select Supplier'}
                      options={supplierOptions}
                      value={supplierId}
                      onSelect={(val) => setSupplierId(String(val))}
                      searchable
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.plusBtn, { marginTop: 24 }]}
                    onPress={() => {
                      setNewSupplierName('');
                      setSupplierModalError(null);
                      setShowAddSupplierModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Plus size={18} color="white" />
                  </TouchableOpacity>
                </View>

                {/* Date */}
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Date *"
                    placeholder="YYYY-MM-DD"
                    value={date}
                    onChangeText={setDate}
                    style={{ paddingRight: 36 }}
                  />
                  <View style={styles.inputIcon}>
                    <Calendar size={18} color={theme.colors.textSecondary} />
                  </View>
                </View>

                {/* Reference */}
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Reference / Invoice #"
                    placeholder="e.g. PO-001"
                    value={reference}
                    onChangeText={setReference}
                  />
                </View>
              </View>

              {/* Supplier Previous Due / Advance Purchase Option */}
              {selectedSupplier && (
                <View
                  style={[
                    styles.balanceCard,
                    {
                      borderColor: showPreviousBalance
                        ? (balanceType === 'due' ? '#FCA5A5' : '#86EFAC')
                        : theme.colors.border,
                      backgroundColor: showPreviousBalance
                        ? (balanceType === 'due' ? '#FFF5F5' : '#F0FDF4')
                        : '#F8FAFC',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 240 }}>
                      <View
                        style={[
                          styles.balanceIndicatorDot,
                          {
                            backgroundColor: supplierRawBalance > 0
                              ? '#DC2626'
                              : supplierRawBalance < 0
                              ? '#16A34A'
                              : '#64748B',
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>
                          {selectedSupplier.name} Balance:{' '}
                          <Text
                            style={{
                              color: supplierRawBalance > 0
                                ? '#DC2626'
                                : supplierRawBalance < 0
                                ? '#16A34A'
                                : '#64748B',
                            }}
                          >
                            {supplierRawBalance > 0
                              ? `₹${supplierRawBalance.toFixed(2)} Due`
                              : supplierRawBalance < 0
                              ? `₹${Math.abs(supplierRawBalance).toFixed(2)} Advance`
                              : '₹0.00 (Cleared)'}
                          </Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 }}>
                          {isLoadingBalance
                            ? 'Fetching previous purchase dues...'
                            : supplierRawBalance > 0
                            ? unpaidPurchasesCount > 0
                              ? `Fetched ₹${supplierRawBalance.toFixed(2)} due from ${unpaidPurchasesCount} previous purchase bill(s)`
                              : 'Supplier has outstanding due from prior transactions'
                            : supplierRawBalance < 0
                            ? 'Supplier has excess advance credit available'
                            : 'No prior balance recorded for this supplier'}
                        </Text>
                      </View>
                    </View>

                    {/* Toggle: Show on invoice / bill or not */}
                    <TouchableOpacity
                      style={[
                        styles.invoiceOptionToggle,
                        showPreviousBalance && styles.invoiceOptionToggleActive,
                      ]}
                      onPress={() => setShowPreviousBalance(!showPreviousBalance)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkboxBox, showPreviousBalance && styles.checkboxBoxActive]}>
                        {showPreviousBalance && <Check size={12} color="#FFFFFF" />}
                      </View>
                      <Text style={[styles.invoiceOptionToggleText, showPreviousBalance && { color: '#2563EB', fontWeight: '700' }]}>
                        Show on Bill
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Config details when toggled ON */}
                  {showPreviousBalance && (
                    <View style={[styles.balanceConfigRow, { borderTopColor: theme.colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          {/* Due vs Advance Selector */}
                          <View style={styles.miniSegmentGroup}>
                            <TouchableOpacity
                              style={[styles.miniSegmentBtn, balanceType === 'due' && styles.miniSegmentBtnRedActive]}
                              onPress={() => setBalanceType('due')}
                            >
                              <Text style={[styles.miniSegmentText, balanceType === 'due' && styles.miniSegmentTextActive]}>
                                Previous Due
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.miniSegmentBtn, balanceType === 'advance' && styles.miniSegmentBtnGreenActive]}
                              onPress={() => setBalanceType('advance')}
                            >
                              <Text style={[styles.miniSegmentText, balanceType === 'advance' && styles.miniSegmentTextActive]}>
                                Advance Payment
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Editable Amount */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }}>Amount:</Text>
                            <View style={[styles.miniAmountInputContainer, { borderColor: theme.colors.border }]}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>₹</Text>
                              <TextInput
                                style={[styles.miniAmountInput, { color: theme.colors.text }]}
                                keyboardType="decimal-pad"
                                value={previousBalanceAmount}
                                onChangeText={(v) => {
                                  const clean = v.replace(/[^0-9.]/g, '');
                                  const parts = clean.split('.');
                                  setPreviousBalanceAmount(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean);
                                }}
                                placeholder="0.00"
                              />
                            </View>
                          </View>
                        </View>

                        {/* Live calculation preview */}
                        <View
                          style={[
                            styles.livePreviewBadge,
                            { backgroundColor: balanceType === 'due' ? '#FEE2E2' : '#DCFCE7' },
                          ]}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: balanceType === 'due' ? '#991B1B' : '#166534' }}>
                            {balanceType === 'due'
                              ? `Current Bill ₹${grandTotal.toFixed(2)} + Prev Due ₹${(parseFloat(previousBalanceAmount) || 0).toFixed(2)} = Total ₹${(grandTotal + (parseFloat(previousBalanceAmount) || 0)).toFixed(2)}`
                              : `Current Bill ₹${grandTotal.toFixed(2)} - Advance ₹${(parseFloat(previousBalanceAmount) || 0).toFixed(2)} = Net ₹${Math.max(0, grandTotal - (parseFloat(previousBalanceAmount) || 0)).toFixed(2)}`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Row 2: Live Product Search */}
              <View style={{ zIndex: 100, elevation: Platform.OS === 'android' ? 5 : undefined }}>
                <Text style={{ color: theme.colors.text, marginBottom: 6, fontWeight: '500' }}>
                  Search & Add Product *
                </Text>
                <View
                  style={[
                    styles.searchBar,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                >
                  <Search size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search by product name, SKU or barcode..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={(q) => {
                      setSearchQuery(q);
                      setIsSearching(true);
                    }}
                    onFocus={() => setIsSearching(true)}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <X size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Product Search Results Dropdown */}
                {isSearching && filteredProducts.length > 0 && (
                  <View
                    style={[
                      styles.searchResultsDropdown,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <ScrollView
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                      style={{ maxHeight: 260 }}
                      showsVerticalScrollIndicator={true}
                    >
                      {filteredProducts.map((p) => {
                        const cost = p.purchasePrice || p.cost || p.price || 0;
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.searchResultItem,
                              { borderBottomColor: theme.colors.border },
                            ]}
                            onPress={() => handleAddProduct(p)}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
                                {p.name}
                              </Text>
                              <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                                Brand: {getBrandName(p)} | Stock: {p.stockQuantity ?? 0} | Tax: {p.gst || 0}% | SKU: {p.sku || 'N/A'}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                              <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 13 }}>
                                ₹{Number(cost).toFixed(2)}
                              </Text>
                              <Text style={{ color: '#10B981', fontSize: 11 }}>+ Add Item</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                {isSearching && searchQuery.trim().length > 0 && filteredProducts.length === 0 && (
                  <View
                    style={[
                      styles.searchResultsDropdown,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        padding: 12,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', fontSize: 12 }}>
                      No matching products found.
                    </Text>
                  </View>
                )}
              </View>

              {/* Table Area: Added Products List */}
              <View
                style={[
                  styles.tableContainer,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ minWidth: 990 }}>
                    {/* Table Header */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.th, { width: 170 }]}>Product</Text>
                      <Text style={[styles.th, { width: 110 }]}>Unit</Text>
                      <Text style={[styles.th, { width: 70 }]}>Qty</Text>
                      <Text style={[styles.th, { width: 110 }]}>Price (₹)</Text>
                      <Text style={[styles.th, { width: 90 }]}>Discount (₹)</Text>
                      <Text style={[styles.th, { width: 80 }]}>Tax (%)</Text>
                      <Text style={[styles.th, { width: 100 }]}>Tax Amt (₹)</Text>
                      <Text style={[styles.th, { width: 100 }]}>Unit Cost (₹)</Text>
                      <Text style={[styles.th, { width: 100 }]}>Total Cost (₹)</Text>
                      <Text style={[styles.th, { width: 50, textAlign: 'center' }]}>Act</Text>
                    </View>

                    {/* Table Rows */}
                    {calculatedItems.length === 0 ? (
                      <View style={styles.emptyTable}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                          No products added yet. Use the search bar above to add products.
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        style={{ maxHeight: isMobile ? 240 : 300 }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {calculatedItems.map((item, index) => (
                        <View
                          key={`${item.productId}-${index}`}
                          style={[
                            styles.tableRow,
                            { borderBottomColor: theme.colors.border },
                          ]}
                        >
                          {/* Product Name */}
                          <View style={{ width: 170, paddingRight: 8 }}>
                            <Text
                              style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}
                              numberOfLines={1}
                            >
                              {item.productName}
                            </Text>
                            {item.sku && (
                              <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                                {item.sku}
                              </Text>
                            )}
                          </View>

                          {/* Unit Selector Toggle */}
                          <View style={{ width: 110, paddingRight: 6, justifyContent: 'center' }}>
                            <TouchableOpacity
                              style={{
                                backgroundColor: item.unitType === 'sub' ? '#3B82F6' : '#F97316',
                                paddingHorizontal: 6,
                                paddingVertical: 4,
                                borderRadius: 4,
                                alignItems: 'center',
                              }}
                              onPress={() => handleToggleUnit(index)}
                            >
                              <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                                {item.unit || item.baseUnitName || 'Unit'} ⇄
                              </Text>
                              {item.conversionRate && item.conversionRate > 1 ? (
                                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9 }}>
                                  1 {item.baseUnitName || 'Box'} = {item.conversionRate} {item.subUnitName || 'Pcs'}
                                </Text>
                              ) : null}
                            </TouchableOpacity>
                          </View>

                          {/* Qty */}
                          <View style={{ width: 70, paddingRight: 6 }}>
                            <TextInput
                              style={[
                                styles.cellInput,
                                {
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.surface,
                                },
                              ]}
                              keyboardType="decimal-pad"
                              selectTextOnFocus
                              value={item.quantity === 0 || item.quantity === '' ? '' : String(item.quantity)}
                              placeholder="1"
                              placeholderTextColor={theme.colors.textSecondary}
                              onChangeText={(v) => {
                                const clean = v.replace(/[^0-9.]/g, '');
                                const parts = clean.split('.');
                                const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
                                handleUpdateItem(index, 'quantity', sanitized);
                              }}
                              onBlur={() => {
                                const parsed = parseFloat(String(item.quantity));
                                if (isNaN(parsed) || parsed <= 0) {
                                  handleUpdateItem(index, 'quantity', 1);
                                } else {
                                  handleUpdateItem(index, 'quantity', parsed);
                                }
                              }}
                            />
                          </View>

                          {/* Purchase Price */}
                          <View style={{ width: 110, paddingRight: 6 }}>
                            <TextInput
                              style={[
                                styles.cellInput,
                                {
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.surface,
                                },
                              ]}
                              keyboardType="decimal-pad"
                              selectTextOnFocus
                              value={item.unitPrice === 0 || item.unitPrice === '' ? '' : String(item.unitPrice)}
                              placeholder="0.00"
                              placeholderTextColor={theme.colors.textSecondary}
                              onChangeText={(v) => {
                                const clean = v.replace(/[^0-9.]/g, '');
                                const parts = clean.split('.');
                                const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
                                handleUpdateItem(index, 'unitPrice', sanitized);
                              }}
                              onBlur={() => {
                                const parsed = parseFloat(String(item.unitPrice));
                                handleUpdateItem(index, 'unitPrice', isNaN(parsed) ? 0 : parsed);
                              }}
                            />
                          </View>

                          {/* Discount */}
                          <View style={{ width: 90, paddingRight: 6 }}>
                            <TextInput
                              style={[
                                styles.cellInput,
                                {
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.surface,
                                },
                              ]}
                              keyboardType="decimal-pad"
                              selectTextOnFocus
                              value={item.discount === 0 || item.discount === '' ? '' : String(item.discount)}
                              placeholder="0.00"
                              placeholderTextColor={theme.colors.textSecondary}
                              onChangeText={(v) => {
                                const clean = v.replace(/[^0-9.]/g, '');
                                const parts = clean.split('.');
                                const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
                                handleUpdateItem(index, 'discount', sanitized);
                              }}
                              onBlur={() => {
                                const parsed = parseFloat(String(item.discount));
                                handleUpdateItem(index, 'discount', isNaN(parsed) ? 0 : parsed);
                              }}
                            />
                          </View>

                          {/* Tax % */}
                          <View style={{ width: 80, paddingRight: 6 }}>
                            <TextInput
                              style={[
                                styles.cellInput,
                                {
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.surface,
                                },
                              ]}
                              keyboardType="decimal-pad"
                              selectTextOnFocus
                              value={item.gst === 0 || item.gst === '' ? '' : String(item.gst)}
                              placeholder="0"
                              placeholderTextColor={theme.colors.textSecondary}
                              onChangeText={(v) => {
                                const clean = v.replace(/[^0-9.]/g, '');
                                const parts = clean.split('.');
                                const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
                                handleUpdateItem(index, 'gst', sanitized);
                              }}
                              onBlur={() => {
                                const parsed = parseFloat(String(item.gst));
                                handleUpdateItem(index, 'gst', isNaN(parsed) ? 0 : parsed);
                              }}
                            />
                          </View>

                          {/* Tax Amount (Calculated) */}
                          <View style={{ width: 100, justifyContent: 'center' }}>
                            <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                              ₹{item.taxAmount.toFixed(2)}
                            </Text>
                          </View>

                          {/* Unit Cost (Calculated) */}
                          <View style={{ width: 100, justifyContent: 'center' }}>
                            <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                              ₹{item.unitCost.toFixed(2)}
                            </Text>
                          </View>

                          {/* Total Cost (Calculated) */}
                          <View style={{ width: 100, justifyContent: 'center' }}>
                            <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 13 }}>
                              ₹{item.total.toFixed(2)}
                            </Text>
                          </View>

                          {/* Action Delete */}
                          <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                              <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </ScrollView>
              </View>

              {/* Row 3: Order Tax, Discount, Shipping, Status, Payment Status */}
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Order Tax (₹)"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={orderTax}
                    onChangeText={(v: string) => {
                      const clean = v.replace(/[^0-9.]/g, '');
                      const parts = clean.split('.');
                      setOrderTax(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Order Discount (₹)"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={orderDiscount}
                    onChangeText={(v: string) => {
                      const clean = v.replace(/[^0-9.]/g, '');
                      const parts = clean.split('.');
                      setOrderDiscount(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Shipping (₹)"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={shipping}
                    onChangeText={(v: string) => {
                      const clean = v.replace(/[^0-9.]/g, '');
                      const parts = clean.split('.');
                      setShipping(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppSelect
                    label="Status *"
                    placeholder="Select Status"
                    options={statusOptions}
                    value={status}
                    onSelect={(val) => {
                      setStatus(val);
                      if (val === 'Pending') setPaymentStatus('Unpaid');
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppSelect
                    label="Payment Status *"
                    placeholder="Select Payment"
                    options={paymentStatusOptions}
                    value={paymentStatus}
                    onSelect={(val) => setPaymentStatus(val as any)}
                  />
                </View>
                {paymentStatus === 'Partial' && (
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Amount Paid (₹) *"
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={amountReceived}
                      onChangeText={(v: string) => {
                        const clean = v.replace(/[^0-9.]/g, '');
                        const parts = clean.split('.');
                        setAmountReceived(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean);
                      }}
                    />
                  </View>
                )}
              </View>

              {/* Bottom Section: Notes & Live Grand Total Summary */}
              <View style={[styles.summarySection, isMobile && { flexDirection: 'column' }]}>
                {/* Notes */}
                <View style={{ flex: 1.5 }}>
                  <Text style={{ color: theme.colors.text, marginBottom: 8, fontWeight: '500' }}>
                    Notes / Description
                  </Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      {
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                        backgroundColor: theme.colors.background,
                      },
                    ]}
                    placeholder="Add purchase notes..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Calculation Summary Card */}
                <View
                  style={[
                    styles.summaryCard,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                >
                  <View style={styles.summaryLine}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Items Subtotal</Text>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                      ₹{itemsSubtotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Total Discount</Text>
                    <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13 }}>
                      -₹{totalDiscount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Tax (Items + Order)</Text>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                      +₹{(itemsTax + orderTaxNum).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Shipping</Text>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                      +₹{shippingNum.toFixed(2)}
                    </Text>
                  </View>
                  {showPreviousBalance && (
                    <View style={styles.summaryLine}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                        {balanceType === 'due' ? 'Previous Due' : 'Advance Payment'}
                      </Text>
                      <Text
                        style={{
                          color: balanceType === 'due' ? '#DC2626' : '#16A34A',
                          fontWeight: '600',
                          fontSize: 13,
                        }}
                      >
                        {balanceType === 'due' ? '+' : '-'}₹{(parseFloat(previousBalanceAmount) || 0).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.summaryLine,
                      {
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border,
                        paddingTop: 8,
                        marginTop: 4,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>
                      {showPreviousBalance
                        ? balanceType === 'due'
                          ? 'Net Payable (with Prev Due)'
                          : 'Net Payable (after Advance)'
                        : 'Grand Total'}
                    </Text>
                    <Text style={{ color: '#F97316', fontWeight: '800', fontSize: 17 }}>
                      ₹{
                        (
                          showPreviousBalance
                            ? balanceType === 'due'
                              ? grandTotal + (parseFloat(previousBalanceAmount) || 0)
                              : Math.max(0, grandTotal - (parseFloat(previousBalanceAmount) || 0))
                            : grandTotal
                        ).toFixed(2)
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border, padding: isMobile ? 12 : 16 }]}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ backgroundColor: '#0F172A', minWidth: isMobile ? 90 : 100 }}
              textStyle={{ color: 'white' }}
            />
            <AppButton
              title={
                createPurchaseMutation.isPending || updatePurchaseMutation.isPending
                  ? 'Saving...'
                  : editPurchaseId
                  ? 'Update Purchase'
                  : 'Submit Purchase'
              }
              onPress={handleSubmit}
              disabled={createPurchaseMutation.isPending || updatePurchaseMutation.isPending}
              style={{ backgroundColor: '#F97316', borderWidth: 0, minWidth: isMobile ? 120 : 140 }}
            />
          </View>
        </View>
      </View>
    </Modal>

    {/* Quick Add Supplier Modal */}
    <Modal
      visible={showAddSupplierModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isSavingSupplier) {
          setShowAddSupplierModal(false);
          setNewSupplierName('');
          setSupplierModalError(null);
        }
      }}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View
          style={[
            styles.quickSupplierModal,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              width: isMobile ? '92%' : 440,
            },
          ]}
        >
          {/* Modal Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Truck size={18} color="#F97316" />
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>
                Add Supplier
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowAddSupplierModal(false);
                setNewSupplierName('');
                setSupplierModalError(null);
              }}
              style={styles.closeBtn}
              disabled={isSavingSupplier}
            >
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <View style={{ padding: 20, gap: 16 }}>
            {supplierModalError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={14} color="#DC2626" />
                <Text style={[styles.errorText, { fontSize: 12 }]}>{supplierModalError}</Text>
              </View>
            )}

            <View>
              <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                Supplier Name *
              </Text>
              <TextInput
                style={[
                  styles.supplierInput,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                placeholder="Enter supplier name"
                placeholderTextColor={theme.colors.textSecondary}
                value={newSupplierName}
                onChangeText={(val) => {
                  setNewSupplierName(val);
                  if (supplierModalError) setSupplierModalError(null);
                }}
                autoFocus
              />
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                ]}
                onPress={() => {
                  setShowAddSupplierModal(false);
                  setNewSupplierName('');
                  setSupplierModalError(null);
                }}
                disabled={isSavingSupplier}
              >
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  { backgroundColor: '#F97316' },
                  isSavingSupplier && { opacity: 0.7 },
                ]}
                onPress={handleQuickAddSupplier}
                disabled={isSavingSupplier}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>
                  {isSavingSupplier ? 'Saving...' : 'Add Supplier'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { overflow: 'hidden', flexDirection: 'column' },
  modalBody: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexShrink: 0,
  },
  closeBtn: {
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', gap: 14 },
  plusBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIcon: { position: 'absolute', right: 12, top: 35 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, height: 40, fontSize: 14 },
  searchResultsDropdown: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 6,
    zIndex: 9999,
    maxHeight: 260,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 52,
    borderBottomWidth: 1,
  },
  tableContainer: { borderRadius: 8, overflow: 'hidden' },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
  },
  th: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  emptyTable: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  cellInput: {
    borderWidth: 1,
    borderRadius: 4,
    height: 32,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  summarySection: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  notesInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    height: 90,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 6,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
    flexShrink: 0,
  },
  balanceCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  balanceIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  invoiceOptionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  invoiceOptionToggleActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  invoiceOptionToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  balanceConfigRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  miniSegmentGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    padding: 2,
  },
  miniSegmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  miniSegmentBtnRedActive: {
    backgroundColor: '#DC2626',
  },
  miniSegmentBtnGreenActive: {
    backgroundColor: '#16A34A',
  },
  miniSegmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  miniSegmentTextActive: {
    color: '#FFFFFF',
  },
  miniAmountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 32,
    backgroundColor: '#FFFFFF',
  },
  miniAmountInput: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 60,
    height: 30,
    padding: 0,
    marginLeft: 2,
  },
  livePreviewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickSupplierModal: {
    overflow: 'hidden',
  },
  supplierInput: {
    borderWidth: 1,
    borderRadius: 6,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
