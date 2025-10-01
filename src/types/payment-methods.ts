/**
 * Payment Method Types and Enums
 * Defines all supported payment methods for fee collection
 */

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  JAZZ_CASH = 'JAZZ_CASH',
  EASY_PAISA = 'EASY_PAISA',
  ON_CAMPUS_COUNTER = 'ON_CAMPUS_COUNTER',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  ONLINE_BANKING = 'ONLINE_BANKING',
  MOBILE_WALLET = 'MOBILE_WALLET',
}

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [PaymentMethod.JAZZ_CASH]: 'JazzCash',
  [PaymentMethod.EASY_PAISA]: 'EasyPaisa',
  [PaymentMethod.ON_CAMPUS_COUNTER]: 'On Campus Counter',
  [PaymentMethod.CREDIT_CARD]: 'Credit Card',
  [PaymentMethod.DEBIT_CARD]: 'Debit Card',
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CHEQUE]: 'Cheque',
  [PaymentMethod.ONLINE_BANKING]: 'Online Banking',
  [PaymentMethod.MOBILE_WALLET]: 'Mobile Wallet',
};

export const PaymentMethodDescriptions: Record<PaymentMethod, string> = {
  [PaymentMethod.BANK_TRANSFER]: 'Direct bank-to-bank transfer',
  [PaymentMethod.JAZZ_CASH]: 'JazzCash mobile wallet payment',
  [PaymentMethod.EASY_PAISA]: 'EasyPaisa mobile wallet payment',
  [PaymentMethod.ON_CAMPUS_COUNTER]: 'Payment at campus fee counter',
  [PaymentMethod.CREDIT_CARD]: 'Credit card payment',
  [PaymentMethod.DEBIT_CARD]: 'Debit card payment',
  [PaymentMethod.CASH]: 'Cash payment',
  [PaymentMethod.CHEQUE]: 'Bank cheque payment',
  [PaymentMethod.ONLINE_BANKING]: 'Online banking transfer',
  [PaymentMethod.MOBILE_WALLET]: 'Other mobile wallet services',
};

export const PaymentMethodIcons: Record<PaymentMethod, string> = {
  [PaymentMethod.BANK_TRANSFER]: '🏦',
  [PaymentMethod.JAZZ_CASH]: '📱',
  [PaymentMethod.EASY_PAISA]: '📱',
  [PaymentMethod.ON_CAMPUS_COUNTER]: '🏢',
  [PaymentMethod.CREDIT_CARD]: '💳',
  [PaymentMethod.DEBIT_CARD]: '💳',
  [PaymentMethod.CASH]: '💵',
  [PaymentMethod.CHEQUE]: '📄',
  [PaymentMethod.ONLINE_BANKING]: '💻',
  [PaymentMethod.MOBILE_WALLET]: '📲',
};

// Payment method categories for better organization
export enum PaymentMethodCategory {
  DIGITAL = 'DIGITAL',
  CARD = 'CARD',
  CASH = 'CASH',
  BANK = 'BANK',
}

export const PaymentMethodCategories: Record<PaymentMethod, PaymentMethodCategory> = {
  [PaymentMethod.BANK_TRANSFER]: PaymentMethodCategory.BANK,
  [PaymentMethod.JAZZ_CASH]: PaymentMethodCategory.DIGITAL,
  [PaymentMethod.EASY_PAISA]: PaymentMethodCategory.DIGITAL,
  [PaymentMethod.ON_CAMPUS_COUNTER]: PaymentMethodCategory.CASH,
  [PaymentMethod.CREDIT_CARD]: PaymentMethodCategory.CARD,
  [PaymentMethod.DEBIT_CARD]: PaymentMethodCategory.CARD,
  [PaymentMethod.CASH]: PaymentMethodCategory.CASH,
  [PaymentMethod.CHEQUE]: PaymentMethodCategory.BANK,
  [PaymentMethod.ONLINE_BANKING]: PaymentMethodCategory.BANK,
  [PaymentMethod.MOBILE_WALLET]: PaymentMethodCategory.DIGITAL,
};

// Helper functions
export const getPaymentMethodsByCategory = (category: PaymentMethodCategory): PaymentMethod[] => {
  return Object.entries(PaymentMethodCategories)
    .filter(([_, cat]) => cat === category)
    .map(([method, _]) => method as PaymentMethod);
};

export const getPaymentMethodOptions = () => {
  return Object.values(PaymentMethod).map(method => ({
    value: method,
    label: PaymentMethodLabels[method],
    description: PaymentMethodDescriptions[method],
    icon: PaymentMethodIcons[method],
    category: PaymentMethodCategories[method],
  }));
};

export const getPaymentMethodLabel = (method: string): string => {
  return PaymentMethodLabels[method as PaymentMethod] || method;
};

export const getPaymentMethodIcon = (method: string): string => {
  return PaymentMethodIcons[method as PaymentMethod] || '💳';
};

// Popular payment methods (for prioritized display)
export const PopularPaymentMethods: PaymentMethod[] = [
  PaymentMethod.ON_CAMPUS_COUNTER,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.JAZZ_CASH,
  PaymentMethod.EASY_PAISA,
  PaymentMethod.CREDIT_CARD,
];

// Default payment method
export const DEFAULT_PAYMENT_METHOD = PaymentMethod.ON_CAMPUS_COUNTER;
