import React from 'react';
import { ShareSaleModal } from '../../pos/components/ShareSaleModal';

export interface SharePurchaseModalProps {
  visible: boolean;
  purchase: any | null;
  onClose: () => void;
  onOpenFullPreview?: () => void;
}

export const SharePurchaseModal: React.FC<SharePurchaseModalProps> = ({
  visible,
  purchase,
  onClose,
  onOpenFullPreview,
}) => {
  return (
    <ShareSaleModal
      visible={visible}
      sale={
        purchase
          ? {
              ...purchase,
              docTitle: 'PURCHASE BILL',
              partyTitle: 'SUPPLIER DETAILS',
            }
          : null
      }
      onClose={onClose}
      onOpenFullPreview={onOpenFullPreview}
    />
  );
};
