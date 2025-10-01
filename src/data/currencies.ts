/**
 * Currency data for Middle East, Asia, and Southeast Asia
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  country: string;
  region: string;
}

export const CURRENCIES: Currency[] = [
  // Middle East
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', country: 'United Arab Emirates', region: 'Middle East' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', country: 'Saudi Arabia', region: 'Middle East' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', country: 'Qatar', region: 'Middle East' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', country: 'Kuwait', region: 'Middle East' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', country: 'Bahrain', region: 'Middle East' },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼', country: 'Oman', region: 'Middle East' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا', country: 'Jordan', region: 'Middle East' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', country: 'Lebanon', region: 'Middle East' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', country: 'Israel', region: 'Middle East' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', country: 'Iran', region: 'Middle East' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', country: 'Iraq', region: 'Middle East' },
  { code: 'SYP', name: 'Syrian Pound', symbol: '£', country: 'Syria', region: 'Middle East' },
  { code: 'YER', name: 'Yemeni Rial', symbol: '﷼', country: 'Yemen', region: 'Middle East' },

  // South Asia
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', country: 'Pakistan', region: 'South Asia' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', country: 'India', region: 'South Asia' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', country: 'Bangladesh', region: 'South Asia' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨', country: 'Sri Lanka', region: 'South Asia' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', country: 'Nepal', region: 'South Asia' },
  { code: 'BTN', name: 'Bhutanese Ngultrum', symbol: 'Nu.', country: 'Bhutan', region: 'South Asia' },
  { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: '.ރ', country: 'Maldives', region: 'South Asia' },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', country: 'Afghanistan', region: 'South Asia' },

  // East Asia
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China', region: 'East Asia' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan', region: 'East Asia' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', country: 'South Korea', region: 'East Asia' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', country: 'Taiwan', region: 'East Asia' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', country: 'Hong Kong', region: 'East Asia' },
  { code: 'MOP', name: 'Macanese Pataca', symbol: 'MOP$', country: 'Macau', region: 'East Asia' },
  { code: 'MNT', name: 'Mongolian Tugrik', symbol: '₮', country: 'Mongolia', region: 'East Asia' },
  { code: 'KPW', name: 'North Korean Won', symbol: '₩', country: 'North Korea', region: 'East Asia' },

  // Southeast Asia
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', country: 'Singapore', region: 'Southeast Asia' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', country: 'Malaysia', region: 'Southeast Asia' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', country: 'Thailand', region: 'Southeast Asia' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', country: 'Indonesia', region: 'Southeast Asia' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', country: 'Philippines', region: 'Southeast Asia' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', country: 'Vietnam', region: 'Southeast Asia' },
  { code: 'LAK', name: 'Lao Kip', symbol: '₭', country: 'Laos', region: 'Southeast Asia' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', country: 'Cambodia', region: 'Southeast Asia' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'Ks', country: 'Myanmar', region: 'Southeast Asia' },
  { code: 'BND', name: 'Brunei Dollar', symbol: 'B$', country: 'Brunei', region: 'Southeast Asia' },
  { code: 'TLS', name: 'East Timor Centavo', symbol: '$', country: 'East Timor', region: 'Southeast Asia' },

  // Central Asia
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', country: 'Kazakhstan', region: 'Central Asia' },
  { code: 'UZS', name: 'Uzbekistani Som', symbol: 'лв', country: 'Uzbekistan', region: 'Central Asia' },
  { code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'лв', country: 'Kyrgyzstan', region: 'Central Asia' },
  { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'SM', country: 'Tajikistan', region: 'Central Asia' },
  { code: 'TMT', name: 'Turkmenistani Manat', symbol: 'T', country: 'Turkmenistan', region: 'Central Asia' },

  // Other Asian currencies
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼', country: 'Azerbaijan', region: 'Western Asia' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾', country: 'Georgia', region: 'Western Asia' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏', country: 'Armenia', region: 'Western Asia' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', country: 'Turkey', region: 'Western Asia' },
  { code: 'CYP', name: 'Cypriot Pound', symbol: '£', country: 'Cyprus', region: 'Western Asia' },

  // Common international currencies for reference
  { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States', region: 'North America' },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'European Union', region: 'Europe' },
  { code: 'GBP', name: 'British Pound', symbol: '£', country: 'United Kingdom', region: 'Europe' },
];

export const CURRENCY_REGIONS = {
  'Middle East': CURRENCIES.filter(c => c.region === 'Middle East'),
  'South Asia': CURRENCIES.filter(c => c.region === 'South Asia'),
  'East Asia': CURRENCIES.filter(c => c.region === 'East Asia'),
  'Southeast Asia': CURRENCIES.filter(c => c.region === 'Southeast Asia'),
  'Central Asia': CURRENCIES.filter(c => c.region === 'Central Asia'),
  'Western Asia': CURRENCIES.filter(c => c.region === 'Western Asia'),
  'North America': CURRENCIES.filter(c => c.region === 'North America'),
  'Europe': CURRENCIES.filter(c => c.region === 'Europe')
};

export const DEFAULT_CURRENCY: Currency = {
  code: 'PKR',
  name: 'Pakistani Rupee',
  symbol: '₨',
  country: 'Pakistan',
  region: 'South Asia'
};

/**
 * Get currency by code
 */
export function getCurrencyByCode(code: string): Currency | undefined {
  return CURRENCIES.find(currency => currency.code === code);
}

/**
 * Get all region names
 */
export function getAllRegions(): string[] {
  return Object.keys(CURRENCY_REGIONS);
}

/**
 * Get currencies by region
 */
export function getCurrenciesByRegion(region: string): Currency[] {
  return CURRENCY_REGIONS[region] || [];
}

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number, currency: Currency, locale: string = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.code,
      currencyDisplay: 'symbol'
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency.symbol}${amount.toLocaleString(locale)}`;
  }
}
