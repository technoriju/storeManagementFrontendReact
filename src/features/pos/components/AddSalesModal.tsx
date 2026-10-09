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
  Minus,
  Calendar,
  Search,
  Trash2,
  ShoppingCart,
  AlertCircle,
  User,
  Check,
} from 'lucide-react-native';
import { useCustomers, useAddCustomer } from '../../customers/api/useCustomer';
import { useCustomerStore } from '../../customers/store/customerStore';
import { Customer } from '../../../types/models';
import { saleRepository } from '../../../core/repositories/SaleRepository';
import { useSuppliers } from '../../suppliers/api/useSupplier';
import { useProductStore } from '../../products/store/productStore';
import { useCreateSale, useUpdateSale } from '../api/useSales';
import { useUnits } from '../../units/api/useUnit';
import { useSubUnits } from '../../sub_units/api/useSubUnit';
import { useBrands } from '../../brands/api/useBrand';
import { Product } from '../../products/types';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from './ReceiptPrintPreviewModal';
import { PriceType, getProductPriceByType } from '../utils/priceUtils';

interface SaleItemRow {
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
  subUnit?: string;
  brand?: string;
  brandName?: string;
  conversionRate?: number;
  basePrice?: number;
  subPrice?: number;
  baseCost?: number;
  subCost?: number;
  unitCost?: number;
  wholesalePrice?: number;
  retailPrice?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  editSaleId?: number | string | null;
}

export const AddSalesModal: React.FC<Props> = ({ visible, onClose, editSaleId }) => {
  const theme = useTheme();
  const { isMobile, windowHeight } = useResponsive();

  // Queries & Mutations
  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();
  const { products, fetchProducts } = useProductStore();
  const { data: unitList = [] } = useUnits();
  const { data: subUnitList = [] } = useSubUnits();
  const { data: brandsList = [] } = useBrands();
  const createSaleMutation = useCreateSale();
  const updateSaleMutation = useUpdateSale();
  const addCustomerMutation = useAddCustomer();

  // Form State
  const [customerId, setCustomerId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>(() => `SL-${Math.floor(100000 + Math.random() * 900000)}`);
  const [status, setStatus] = useState<'Completed' | 'Pending' | 'Ordered'>('Completed');
  const [orderTax, setOrderTax] = useState<string>('0');
  const [orderDiscount, setOrderDiscount] = useState<string>('0');
  const [shipping, setShipping] = useState<string>('0');
  const [biller, setBiller] = useState<string>('Admin');
  const [notes, setNotes] = useState<string>('');
  const [priceType, setPriceType] = useState<PriceType>('wholesale');

  // Quick Add Customer State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [customerModalError, setCustomerModalError] = useState<string | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState<boolean>(false);
  const [localAddedCustomers, setLocalAddedCustomers] = useState<Customer[]>([]);

  // Customer Previous Balance / Advance in Invoice State
  const [showPreviousBalance, setShowPreviousBalance] = useState<boolean>(false);
  const [balanceType, setBalanceType] = useState<'due' | 'advance'>('due');
  const [previousBalanceAmount, setPreviousBalanceAmount] = useState<string>('0');
  const [customerRawBalance, setCustomerRawBalance] = useState<number>(0);
  const [unpaidInvoicesCount, setUnpaidInvoicesCount] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);

  // Payment Status & Received Amount State
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [amountReceived, setAmountReceived] = useState<string>('');

  // Product Search & Items Table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [items, setItems] = useState<SaleItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [printData, setPrintData] = useState<ReceiptPrintData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      fetchProducts().catch(() => {});
      setSearchQuery('');
      setIsSearching(false);
      setErrorMessage(null);
      setPriceType('wholesale');
      setShowAddCustomerModal(false);
      setNewCustomerName('');
      setCustomerModalError(null);

      if (editSaleId) {
        const numericId = Number(editSaleId);
        (async () => {
          try {
            let existingSale: any = null;
            let existingItems: any[] = [];
            if (/^\d+$/.test(String(editSaleId)) && numericId > 0 && numericId < 1000000000000) {
              try {
                existingSale = await saleRepository.fetchByIdFromApi(numericId);
                if (existingSale?.items && existingSale.items.length > 0) {
                  existingItems = existingSale.items;
                }
              } catch (e) {
                console.warn('API fetch for edit sale fallback:', e);
              }
            }
            if (!existingSale) {
              existingSale = await saleRepository.getById(numericId);
            }
            if (!existingItems || existingItems.length === 0) {
              existingItems = await saleRepository.getItemsForSale(numericId);
            }
            if ((!existingItems || existingItems.length === 0) && existingSale?.items && existingSale.items.length > 0) {
              existingItems = existingSale.items;
            }

            if (existingSale) {
              setCustomerId(existingSale.customerId ? String(existingSale.customerId) : '');
              setSupplierId(existingSale.supplierId ? String(existingSale.supplierId) : '');
              setDate(existingSale.date ? existingSale.date.split('T')[0] : new Date().toISOString().split('T')[0]);
              setReference(existingSale.reference || existingSale.invoiceNumber || `SL-${numericId}`);
              setStatus((existingSale.status as any) || 'Completed');
              setOrderTax(String(existingSale.orderTax || 0));
              setOrderDiscount(String(existingSale.discount || 0));
              setShipping(String(existingSale.shipping || 0));
              setBiller(existingSale.biller || 'Admin');
              setNotes(existingSale.notes || '');
              const paidNum = Number(existingSale.paid || 0);
              const totalNum = Number(existingSale.total || 0);
              setPaymentStatus((existingSale.paymentStatus as any) || (paidNum >= totalNum && totalNum > 0 ? 'Paid' : paidNum > 0 ? 'Partial' : 'Unpaid'));
              setAmountReceived(paidNum > 0 ? String(paidNum) : '');

              const prevDueVal = Number(existingSale.previousDue || 0);
              const advVal = Number(existingSale.advancePayment || 0);
              if (existingSale.showPreviousBalance && prevDueVal > 0) {
                setShowPreviousBalance(true);
                setBalanceType('due');
                setPreviousBalanceAmount(String(prevDueVal));
              } else if (existingSale.showPreviousBalance && advVal > 0) {
                setShowPreviousBalance(true);
                setBalanceType('advance');
                setPreviousBalanceAmount(String(advVal));
              }

              if (existingItems && existingItems.length > 0) {
                const latestProds = useProductStore.getState().products;
                const mappedItems: SaleItemRow[] = existingItems.map((item: any) => {
                  const prod = latestProds.find((p) => p.id === Number(item.productId)) || products.find((p) => p.id === Number(item.productId));
                  const wholesaleP = prod ? getProductPriceByType(prod, 'wholesale') : Number(item.unitPrice || 0);
                  const retailP = prod ? getProductPriceByType(prod, 'retail') : Number(item.unitPrice || 0);
                  const cRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : (prod?.conversionRate ? Number(prod.conversionRate) : 1);
                  const brandRaw = item.brandName || item.brand || (prod ? getBrandName(prod) : undefined);
                  const brandName = brandRaw && brandRaw !== 'N/A' ? brandRaw : undefined;
                  const resolvedSubUnitName = item.subUnitName || item.subUnit || (prod as any)?.subUnitName || prod?.subUnit?.name || undefined;

                  return {
                    productId: Number(item.productId),
                    productName: item.productName || prod?.name || `Product #${item.productId}`,
                    sku: item.sku || prod?.sku,
                    brand: brandName,
                    brandName: brandName,
                    subUnit: resolvedSubUnitName,
                    subUnitName: resolvedSubUnitName || 'Pcs',
                    quantity: Number(item.quantity || 1),
                    unitPrice: Number(item.unitPrice || 0),
                    discount: Number(item.discount || 0),
                    gst: Number(item.gst || item.taxRate || item.tax || 0),
                    unit: item.unit || (item.unitType === 'sub' ? (resolvedSubUnitName || 'Pcs') : (item.baseUnitName || 'Box')),
                    unitType: item.unitType ? (item.unitType as any) : 'base',
                    baseUnitName: item.baseUnitName || 'Box',
                    conversionRate: cRate,
                    basePrice: item.unitType === 'base' ? Number(item.unitPrice) : Number((item.unitPrice * cRate).toFixed(2)),
                    subPrice: item.unitType === 'sub' ? Number(item.unitPrice) : (cRate > 0 ? Number((item.unitPrice / cRate).toFixed(2)) : Number(item.unitPrice)),
                    wholesalePrice: wholesaleP,
                    retailPrice: retailP,
                    unitCost: Number(item.unitCost || 0),
                  };
                });
                setItems(mappedItems);
              } else {
                setItems([]);
              }
            }
          } catch (err) {
            console.warn('Error loading sale for editing:', err);
          }
        })();
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setReference(`SL-${Math.floor(100000 + Math.random() * 900000)}`);
        setItems([]);
        setCustomerId('');
        setSupplierId('');
        setOrderTax('0');
        setOrderDiscount('0');
        setShipping('0');
        setNotes('');
        setPaymentStatus('Paid');
        setAmountReceived('');
        setShowPreviousBalance(false);
        setPreviousBalanceAmount('0');
        setCustomerRawBalance(0);
        setUnpaidInvoicesCount(0);
      }
    }
  }, [visible, editSaleId, fetchProducts]);

  // Handle Wholesale vs Retail Price Type Switching
  const handlePriceTypeChange = (newType: PriceType) => {
    if (newType === priceType) return;
    setPriceType(newType);

    setItems((prevItems) =>
      prevItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const wholesaleP = prod ? getProductPriceByType(prod, 'wholesale') : (item.wholesalePrice || item.basePrice || 0);
        const retailP = prod ? getProductPriceByType(prod, 'retail') : (item.retailPrice || item.basePrice || 0);
        const newBasePrice = newType === 'wholesale' ? wholesaleP : retailP;
        const cRate = item.conversionRate && item.conversionRate > 0 ? item.conversionRate : 1;
        const newSubPrice = cRate > 0 ? Number((newBasePrice / cRate).toFixed(2)) : newBasePrice;
        const newUnitPrice = item.unitType === 'sub' ? newSubPrice : newBasePrice;

        return {
          ...item,
          wholesalePrice: wholesaleP,
          retailPrice: retailP,
          basePrice: newBasePrice,
          subPrice: newSubPrice,
          unitPrice: newUnitPrice,
        };
      })
    );
  };

  // Quick Add Customer Handler
  const handleQuickAddCustomer = async () => {
    const trimmed = newCustomerName.trim();
    if (!trimmed) {
      setCustomerModalError('Please enter customer name.');
      return;
    }

    try {
      setIsSavingCustomer(true);
      setCustomerModalError(null);

      // 1. If customer already exists in list, select immediately
      const existing = allCustomers.find(
        (c) => c.name?.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        setCustomerId(String(existing.id));
        setNewCustomerName('');
        setShowAddCustomerModal(false);
        return;
      }

      const created = await addCustomerMutation.mutateAsync({
        name: trimmed,
      });

      if (created && created.id) {
        setLocalAddedCustomers((prev) => {
          const filtered = prev.filter(
            (p) =>
              String(p.id) !== String(created.id) &&
              p.name?.trim().toLowerCase() !== created.name?.trim().toLowerCase()
          );
          return [...filtered, created];
        });
        try {
          useCustomerStore.getState().addCustomer(created);
        } catch (_) {}

        setCustomerId(String(created.id));
      }
      setNewCustomerName('');
      setShowAddCustomerModal(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to add customer.';
      setCustomerModalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Merged Customer Options
  const allCustomers = useMemo(() => {
    const list = [...customers];
    for (const c of localAddedCustomers) {
      if (
        !list.some(
          (existing) =>
            String(existing.id) === String(c.id) ||
            existing.name?.trim().toLowerCase() === c.name?.trim().toLowerCase()
        )
      ) {
        list.push(c);
      }
    }
    return list;
  }, [customers, localAddedCustomers]);

  // Keep customerId in sync if a temp negative customer ID resolves to positive server ID in customers
  useEffect(() => {
    if (!customerId) return;
    const num = Number(customerId);
    if (num < 0) {
      const local = localAddedCustomers.find((l) => String(l.id) === customerId);
      if (local && local.name) {
        const matched = customers.find(
          (c) =>
            c.name?.trim().toLowerCase() === local.name.trim().toLowerCase() &&
            Number(c.id) > 0
        );
        if (matched) {
          setCustomerId(String(matched.id));
        }
      }
    }
  }, [customers, customerId, localAddedCustomers]);

  const customerOptions = useMemo(() => {
    return allCustomers.map((c) => ({
      label: c.name,
      value: String(c.id),
    }));
  }, [allCustomers]);

  const supplierOptions = useMemo(() => {
    return suppliers.map((s) => ({
      label: s.name,
      value: String(s.id),
    }));
  }, [suppliers]);

  const selectedCustomer = useMemo(() => {
    return allCustomers.find((c) => String(c.id) === String(customerId));
  }, [allCustomers, customerId]);

  useEffect(() => {
    // Immediately clear previous balance states so new customer doesn't show old customer's dues
    setShowPreviousBalance(false);
    setPreviousBalanceAmount('0');
    setCustomerRawBalance(0);
    setUnpaidInvoicesCount(0);

    if (!customerId || !selectedCustomer) {
      setIsLoadingBalance(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingBalance(true);

    saleRepository
      .getCustomerPreviousBalance(
        selectedCustomer.id,
        selectedCustomer.name,
        editSaleId ? Number(editSaleId) : undefined
      )
      .then((res) => {
        if (!isCurrent) return;
        setUnpaidInvoicesCount(res.unpaidCount || 0);
        if (res.totalDue > 0) {
          setCustomerRawBalance(res.totalDue);
          setBalanceType('due');
          setPreviousBalanceAmount(String(res.totalDue));
          setShowPreviousBalance(true);
        } else if (res.advance > 0) {
          setCustomerRawBalance(-res.advance);
          setBalanceType('advance');
          setPreviousBalanceAmount(String(res.advance));
          setShowPreviousBalance(true);
        } else {
          setCustomerRawBalance(0);
          setBalanceType('due');
          setPreviousBalanceAmount('0');
          setShowPreviousBalance(false);
        }
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.warn('Failed to fetch customer invoice dues:', err);
        setCustomerRawBalance(0);
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
  }, [customerId, selectedCustomer?.id, editSaleId]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(supplierId));
  }, [suppliers, supplierId]);

  const statusOptions = [
    { label: 'Completed', value: 'Completed' },
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

  // Filtered Products for Live Search
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
      const wholesaleP = getProductPriceByType(product, 'wholesale');
      const retailP = getProductPriceByType(product, 'retail');
      const basePrice = priceType === 'wholesale' ? wholesaleP : retailP;
      const baseCost = product.cost || product.purchasePrice || 0;
      const cRate = product.conversionRate && Number(product.conversionRate) > 0 ? Number(product.conversionRate) : 1;

      const baseUnit = unitList.find((u: any) => String(u.id) === String(product.unitId || product.baseUnitId) || String(u.backendId) === String(product.unitId || product.baseUnitId));
      const subUnit = subUnitList.find((s: any) => 
        (product.subUnitId && (String(s.id) === String(product.subUnitId) || String(s.backendId) === String(product.subUnitId))) ||
        (product.subunitId && (String(s.id) === String(product.subunitId) || String(s.backendId) === String(product.subunitId)))
      );

      const baseUnitName = baseUnit?.name || baseUnit?.shortName || (product as any).baseUnitName || 'Box';
      const resolvedSubUnitName = subUnit?.name || (product as any).subUnitName || product.subUnit?.name || undefined;
      const subUnitName = resolvedSubUnitName || 'Pcs';

      // Default for sales: base unit unless explicitly chosen
      const initialType: 'base' | 'sub' = 'base';
      const initialUnit = baseUnitName;

      const subPrice = cRate > 0 ? Number((basePrice / cRate).toFixed(2)) : basePrice;
      const subCost = cRate > 0 ? Number((baseCost / cRate).toFixed(4)) : baseCost;

      const initialPrice = basePrice;
      const initialCost = baseCost;
      const brandRaw = getBrandName(product);
      const brandName = brandRaw && brandRaw !== 'N/A' ? brandRaw : undefined;

      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          brand: brandName,
          brandName: brandName,
          subUnit: resolvedSubUnitName,
          subUnitName: resolvedSubUnitName || 'Pcs',
          quantity: 1,
          unitPrice: initialPrice,
          basePrice,
          subPrice,
          baseCost,
          subCost,
          unitCost: initialCost,
          discount: 0,
          gst: product.gst || 0,
          unit: initialUnit,
          unitType: initialType,
          baseUnitName,
          conversionRate: cRate,
          wholesalePrice: wholesaleP,
          retailPrice: retailP,
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
    const nextCost = nextType === 'base' ? (item.baseCost || 0) : (item.subCost || Number(((item.baseCost || 0) / (item.conversionRate || 1)).toFixed(4)));

    const updated = [...items];
    updated[index] = {
      ...item,
      unitType: nextType,
      unit: nextUnit,
      unitPrice: nextPrice,
      unitCost: nextCost,
    };
    setItems(updated);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof SaleItemRow, value: any) => {
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
      return {
        ...item,
        quantity: item.quantity,
        taxAmount,
        total,
      };
    });
  }, [items]);

  // Order Totals Calculations
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
    if (isSubmitting || createSaleMutation.isPending) return;
    setErrorMessage(null);
    if (!customerId) {
      setErrorMessage('Please select a customer.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one product to the sale.');
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
        finalPaid = status === 'Completed' ? grandTotal : 0;
        finalDue = status === 'Completed' ? 0 : grandTotal;
        effectivePaymentStatus = status === 'Completed' ? 'Paid' : 'Unpaid';
      }

      let effectiveCustomerId = Number(customerId);
      const custName = selectedCustomer?.name;
      if (effectiveCustomerId < 0 && custName) {
        const positiveMatch = customers.find(
          (c) =>
            c.name?.trim().toLowerCase() === custName.trim().toLowerCase() &&
            Number(c.id) > 0
        );
        if (positiveMatch) {
          effectiveCustomerId = Number(positiveMatch.id);
        }
      }

      const salePayload = {
        invoiceNumber: reference || `SL-${Date.now().toString().slice(-6)}`,
        reference: reference || `SL-${Date.now().toString().slice(-6)}`,
        customerId: effectiveCustomerId,
        customerName: custName || 'Walk-in Customer',
        supplierId: supplierId ? Number(supplierId) : undefined,
        supplierName: selectedSupplier?.name || undefined,
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
        biller: biller || 'Admin',
        notes: notes || undefined,
        previousDue: prevDueVal,
        advancePayment: advPaymentVal,
        showPreviousBalance: Boolean(showPreviousBalance && (prevDueVal > 0 || advPaymentVal > 0)),
      };

      const itemsPayload = calculatedItems.map((item) => {
        const prod = products.find((p) => p.id === Number(item.productId));
        const brand = item.brandName || item.brand || (prod ? getBrandName(prod) : undefined);
        const validBrand = brand && brand !== 'N/A' ? brand : undefined;
        const validSubUnit = item.subUnitName || item.subUnit || (prod as any)?.subUnitName || prod?.subUnit?.name || undefined;

        return {
          productId: item.productId,
          productName: item.productName,
          brand: validBrand,
          brandName: validBrand,
          subUnit: validSubUnit,
          subUnitName: validSubUnit,
          quantity: parseFloat(String(item.quantity)) > 0 ? parseFloat(String(item.quantity)) : 1,
          unitPrice: parseFloat(String(item.unitPrice)) || 0,
          discount: parseFloat(String(item.discount)) || 0,
          gst: parseFloat(String(item.gst)) || 0,
          taxAmount: item.taxAmount,
          unitCost: item.unitCost,
          total: item.total,
          unit: item.unit,
          unitType: item.unitType,
          conversionRate: item.conversionRate,
        };
      });

      if (editSaleId) {
        await updateSaleMutation.mutateAsync({
          id: Number(editSaleId),
          sale: salePayload,
          items: itemsPayload,
        });
      } else {
        await createSaleMutation.mutateAsync({
          sale: salePayload,
          items: itemsPayload,
        });
      }

      const customerObj =
        allCustomers.find((c) => String(c.id) === String(effectiveCustomerId)) ||
        allCustomers.find((c) => String(c.id) === customerId) ||
        selectedCustomer;

      const receiptData: ReceiptPrintData = {
        invoiceNumber: reference,
        reference,
        date,
        customerName: customerObj?.name || 'Walk-in Customer',
        customerPhone: customerObj?.phone || '',
        customerAddress: customerObj?.address || '',
        customerGstin: customerObj?.gstin || '',
        customerType: priceType, // 'wholesale' | 'retail' based on user selection
        biller,
        subtotal: itemsSubtotal,
        discount: totalDiscount,
        gst: itemsTax + orderTaxNum,
        shipping: shippingNum,
        total: grandTotal,
        paid: finalPaid,
        due: finalDue,
        paymentMethod: 'Cash',
        previousDue: prevDueVal,
        advancePayment: advPaymentVal,
        showPreviousBalance: Boolean(showPreviousBalance && (prevDueVal > 0 || advPaymentVal > 0)),
        notes: notes ? `${notes} [${priceType === 'wholesale' ? 'Wholesale' : 'Retail'}]` : `[${priceType === 'wholesale' ? 'Wholesale' : 'Retail'}]`,
        items: calculatedItems.map((item) => {
          const prod = products.find((p) => p.id === Number(item.productId));
          const brand = item.brandName || item.brand || (prod ? getBrandName(prod) : undefined);
          const validBrand = brand && brand !== 'N/A' ? brand : undefined;
          const validSubUnit = item.subUnitName || item.subUnit || (prod as any)?.subUnitName || prod?.subUnit?.name || undefined;

          return {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            brand: validBrand,
            brandName: validBrand,
            subUnit: validSubUnit,
            subUnitName: validSubUnit,
            unitType: item.unitType,
            baseUnitName: item.baseUnitName,
            conversionRate: item.conversionRate,
            quantity: parseFloat(String(item.quantity)) > 0 ? parseFloat(String(item.quantity)) : 1,
            unitPrice: parseFloat(String(item.unitPrice)) || 0,
            discount: parseFloat(String(item.discount)) || 0,
            gst: parseFloat(String(item.gst)) || 0,
            taxAmount: item.taxAmount,
            total: item.total,
            unit: item.unit,
          };
        }),
      };

      // Reset & Close
      setItems([]);
      setCustomerId('');
      setSupplierId('');
      setSearchQuery('');
      setNotes('');
      setShowPreviousBalance(false);
      setPreviousBalanceAmount('0');
      setCustomerRawBalance(0);
      setUnpaidInvoicesCount(0);
      setPaymentStatus('Paid');
      setAmountReceived('');
      onClose();

      setPrintData(receiptData);
      setShowPrintModal(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save sale.');
    } finally {
      setIsSubmitting(false);
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
              <ShoppingCart size={20} color="#F97316" />
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
                {editSaleId ? 'Edit Sales' : 'Add Sales'}
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

              {/* Row 1: Customer Name, Date, Supplier */}
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                {/* Customer */}
                <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <AppSelect
                      label="Customer Name *"
                      placeholder={allCustomers.length === 0 ? 'No customers available' : 'Select Customer'}
                      options={customerOptions}
                      value={customerId}
                      onSelect={(val) => setCustomerId(String(val))}
                      searchable
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.plusBtn, { marginTop: 24 }]}
                    onPress={() => {
                      setNewCustomerName('');
                      setCustomerModalError(null);
                      setShowAddCustomerModal(true);
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

                {/* Supplier */}
                <View style={{ flex: 1 }}>
                  <AppSelect
                    label="Supplier (Optional)"
                    placeholder="Select Supplier"
                    options={supplierOptions}
                    value={supplierId}
                    onSelect={(val) => setSupplierId(String(val))}
                    searchable
                  />
                </View>
              </View>

              {/* Customer Previous Due / Advance Invoice Option */}
              {selectedCustomer && (
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
                            backgroundColor: customerRawBalance > 0
                              ? '#DC2626'
                              : customerRawBalance < 0
                              ? '#16A34A'
                              : '#64748B',
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>
                          {selectedCustomer.name} Balance:{' '}
                          <Text
                            style={{
                              color: customerRawBalance > 0
                                ? '#DC2626'
                                : customerRawBalance < 0
                                ? '#16A34A'
                                : '#64748B',
                            }}
                          >
                            {customerRawBalance > 0
                              ? `₹${customerRawBalance.toFixed(2)} Due`
                              : customerRawBalance < 0
                              ? `₹${Math.abs(customerRawBalance).toFixed(2)} Advance`
                              : '₹0.00 (Cleared)'}
                          </Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 }}>
                          {isLoadingBalance
                            ? 'Fetching previous invoice dues...'
                            : customerRawBalance > 0
                            ? unpaidInvoicesCount > 0
                              ? `Fetched ₹${customerRawBalance.toFixed(2)} due from ${unpaidInvoicesCount} previous invoice(s)`
                              : 'Customer has outstanding due from prior transactions'
                            : customerRawBalance < 0
                            ? 'Customer has excess advance credit available'
                            : 'No prior balance recorded for this customer'}
                        </Text>
                      </View>
                    </View>

                    {/* Toggle: Show on invoice or not */}
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
                        Show on Invoice
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

              {/* Pricing Mode Toggle (Wholesale vs Retailer) */}
              <View style={[styles.tierRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <View>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>
                      Pricing Mode *
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                      By default, wholesale price is applied. Toggle anytime to switch.
                    </Text>
                  </View>
                  <View style={styles.tierButtonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.tierButton,
                        priceType === 'wholesale' && styles.tierButtonActiveWholesale,
                      ]}
                      onPress={() => handlePriceTypeChange('wholesale')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.tierButtonText,
                          priceType === 'wholesale' && styles.tierButtonTextActive,
                        ]}
                      >
                        Wholesale (Default)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.tierButton,
                        priceType === 'retail' && styles.tierButtonActiveRetail,
                      ]}
                      onPress={() => handlePriceTypeChange('retail')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.tierButtonText,
                          priceType === 'retail' && styles.tierButtonTextActive,
                        ]}
                      >
                        Retailer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Row 2: Live Product Search */}
              <View
                style={{
                  zIndex: isSearching && (filteredProducts.length > 0 || searchQuery.trim().length > 0) ? 9999 : 100,
                  elevation: Platform.OS === 'android' ? (isSearching ? 50 : 5) : undefined,
                }}
              >
                <Text style={{ color: theme.colors.text, marginBottom: 6, fontWeight: '500' }}>
                  Search & Add Product * ({priceType === 'wholesale' ? 'Wholesale Price' : 'Retailer Price'})
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
                    placeholder={`Search by product name, SKU or barcode (${priceType} price)...`}
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

                {/* Search Results Dropdown */}
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
                      keyboardShouldPersistTaps="always"
                      style={{ maxHeight: 260 }}
                      showsVerticalScrollIndicator={true}
                    >
                      {filteredProducts.map((p) => {
                        const activePrice = getProductPriceByType(p, priceType);
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
                                ₹{Number(activePrice).toFixed(2)}
                              </Text>
                              <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>
                                {priceType === 'wholesale' ? 'Wholesale Price' : 'Retailer Price'}
                              </Text>
                              <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '600', marginTop: 2 }}>+ Add Item</Text>
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
                  <View style={{ minWidth: 880 }}>
                    {/* Table Header */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.th, { width: 170 }]}>Product</Text>
                      <Text style={[styles.th, { width: 120 }]}>Unit</Text>
                      <Text style={[styles.th, { width: 85 }]}>Qty</Text>
                      <Text style={[styles.th, { width: 105 }]}>{priceType === 'wholesale' ? 'Wholesale (₹)' : 'Retailer (₹)'}</Text>
                      <Text style={[styles.th, { width: 85 }]}>Discount (₹)</Text>
                      <Text style={[styles.th, { width: 75 }]}>Tax (%)</Text>
                      <Text style={[styles.th, { width: 85 }]}>Tax Amt (₹)</Text>
                      <Text style={[styles.th, { width: 95 }]}>Total (₹)</Text>
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
                          {/* Product */}
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
                          <View style={{ width: 120, paddingRight: 6, justifyContent: 'center' }}>
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
                          <View style={{ width: 85, paddingRight: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <TouchableOpacity
                              style={[
                                styles.qtyStepperBtn,
                                {
                                  borderColor: theme.colors.border,
                                  backgroundColor: theme.colors.background,
                                },
                              ]}
                              onPress={() => {
                                const current = parseFloat(String(item.quantity)) || 1;
                                const next = Math.max(0.001, Number((current - 1).toFixed(4)));
                                handleUpdateItem(index, 'quantity', next);
                              }}
                              activeOpacity={0.7}
                            >
                              <Minus size={11} color={theme.colors.text} />
                            </TouchableOpacity>

                            <TextInput
                              style={[
                                styles.cellInput,
                                styles.qtyInput,
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

                            <TouchableOpacity
                              style={[
                                styles.qtyStepperBtn,
                                {
                                  borderColor: theme.colors.border,
                                  backgroundColor: theme.colors.background,
                                },
                              ]}
                              onPress={() => {
                                const current = parseFloat(String(item.quantity)) || 0;
                                const next = Number((current + 1).toFixed(4));
                                handleUpdateItem(index, 'quantity', next);
                              }}
                              activeOpacity={0.7}
                            >
                              <Plus size={11} color={theme.colors.text} />
                            </TouchableOpacity>
                          </View>

                          {/* Sale Price */}
                          <View style={{ width: 105, paddingRight: 6 }}>
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
                          <View style={{ width: 85, paddingRight: 6 }}>
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
                          <View style={{ width: 75, paddingRight: 6 }}>
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

                          {/* Tax Amount */}
                          <View style={{ width: 85, justifyContent: 'center' }}>
                            <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                              ₹{item.taxAmount.toFixed(2)}
                            </Text>
                          </View>

                          {/* Total */}
                          <View style={{ width: 95, justifyContent: 'center' }}>
                            <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 13 }}>
                              ₹{item.total.toFixed(2)}
                            </Text>
                          </View>

                          {/* Delete Action */}
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

              {/* Row 3: Order Tax, Discount, Shipping, Status */}
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
                {/* Notes & Reference */}
                <View style={{ flex: 1.5, gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <AppInput
                        label="Reference / Invoice #"
                        placeholder="e.g. SL-001"
                        value={reference}
                        onChangeText={setReference}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppInput
                        label="Biller / Cashier"
                        placeholder="Admin"
                        value={biller}
                        onChangeText={setBiller}
                      />
                    </View>
                  </View>
                  <Text style={{ color: theme.colors.text, marginBottom: 4, fontWeight: '500' }}>
                    Sale Notes
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
                    placeholder="Add sale notes..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={notes}
                    onChangeText={setNotes}
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
                      Grand Total
                    </Text>
                    <Text style={{ color: '#F97316', fontWeight: '800', fontSize: 17 }}>
                      ₹{grandTotal.toFixed(2)}
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
                isSubmitting || createSaleMutation.isPending || updateSaleMutation.isPending
                  ? 'Saving...'
                  : editSaleId
                  ? 'Update Sale'
                  : 'Submit Sale'
              }
              onPress={handleSubmit}
              disabled={isSubmitting || createSaleMutation.isPending || updateSaleMutation.isPending}
              style={{ backgroundColor: '#F97316', borderWidth: 0, minWidth: isMobile ? 120 : 140 }}
            />
          </View>
        </View>
      </View>
    </Modal>

    {/* Quick Add Customer Modal */}
    <Modal
      visible={showAddCustomerModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isSavingCustomer) {
          setShowAddCustomerModal(false);
          setNewCustomerName('');
          setCustomerModalError(null);
        }
      }}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View
          style={[
            styles.quickCustomerModal,
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
              <User size={18} color="#F97316" />
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>
                Add Customer
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowAddCustomerModal(false);
                setNewCustomerName('');
                setCustomerModalError(null);
              }}
              style={styles.closeBtn}
              disabled={isSavingCustomer}
            >
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <View style={{ padding: 20, gap: 16 }}>
            {customerModalError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={14} color="#DC2626" />
                <Text style={[styles.errorText, { fontSize: 12 }]}>{customerModalError}</Text>
              </View>
            )}

            <View>
              <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                Customer Name *
              </Text>
              <TextInput
                style={[
                  styles.customerInput,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                placeholder="Enter customer name"
                placeholderTextColor={theme.colors.textSecondary}
                value={newCustomerName}
                onChangeText={(val) => {
                  setNewCustomerName(val);
                  if (customerModalError) setCustomerModalError(null);
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
                  setShowAddCustomerModal(false);
                  setNewCustomerName('');
                  setCustomerModalError(null);
                }}
                disabled={isSavingCustomer}
              >
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  { backgroundColor: '#F97316' },
                  isSavingCustomer && { opacity: 0.7 },
                ]}
                onPress={handleQuickAddCustomer}
                disabled={isSavingCustomer}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>
                  {isSavingCustomer ? 'Saving...' : 'Add Customer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>

    <ReceiptPrintPreviewModal
      visible={showPrintModal}
      data={printData}
      onClose={() => {
        setShowPrintModal(false);
        setPrintData(null);
      }}
    />
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
  tierRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  tierButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  tierButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  tierButtonActiveWholesale: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tierButtonActiveRetail: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tierButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tierButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
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
    height: 30,
    paddingHorizontal: 6,
    fontSize: 12,
    minWidth: 0,
  },
  summarySection: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  notesInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    height: 70,
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
  qtyStepperBtn: {
    width: 20,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: 32,
    minWidth: 0,
    maxWidth: 34,
    height: 28,
    textAlign: 'center',
    paddingHorizontal: 1,
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 2,
  },
  quickCustomerModal: {
    overflow: 'hidden',
  },
  customerInput: {
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
});
