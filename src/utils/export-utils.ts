/**
 * Export utilities for generating Excel and CSV files
 * Uses the same approach as enrollment export - HTML table for Excel, CSV for CSV
 */

export interface ExportColumn {
  key: string;
  label: string;
  width?: number;
  format?: 'currency' | 'percentage' | 'date' | 'number' | 'text';
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: any[];
  format: 'excel' | 'csv';
}

/**
 * Format cell value based on column format
 */
function formatCellValue(value: any, format?: string): any {
  if (value === null || value === undefined) return '';
  
  switch (format) {
    case 'currency':
      return typeof value === 'number' ? `Rs. ${value.toLocaleString()}` : value;
    case 'percentage':
      return typeof value === 'number' ? `${value.toFixed(1)}%` : value;
    case 'date':
      return value instanceof Date ? value.toLocaleDateString() : value;
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : value;
    default:
      return value;
  }
}

/**
 * Export data to Excel file (using HTML table approach like enrollment export)
 */
export function exportToExcel(options: ExportOptions): void {
  const { filename, columns, data } = options;

  // Generate Excel content as HTML table
  let excelContent = '<table>';

  // Add headers
  excelContent += '<tr>';
  columns.forEach(col => {
    excelContent += `<th>${col.label}</th>`;
  });
  excelContent += '</tr>';

  // Add data rows
  data.forEach(item => {
    excelContent += '<tr>';
    columns.forEach(col => {
      const value = formatCellValue(item[col.key], col.format);
      excelContent += `<td>${value}</td>`;
    });
    excelContent += '</tr>';
  });

  excelContent += '</table>';

  // Create and download file
  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV file
 */
export function exportToCSV(options: ExportOptions): void {
  const { filename, columns, data } = options;

  // Prepare CSV content
  const headers = columns.map(col => col.label).join(',');
  const rows = data.map(item => 
    columns.map(col => {
      const value = formatCellValue(item[col.key], col.format);
      // Escape commas and quotes in CSV
      return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    }).join(',')
  );

  const csvContent = [headers, ...rows].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Main export function that handles both Excel and CSV
 */
export function exportData(options: ExportOptions): void {
  if (options.format === 'excel') {
    exportToExcel(options);
  } else if (options.format === 'csv') {
    exportToCSV(options);
  } else {
    throw new Error('Unsupported export format');
  }
}

/**
 * Predefined column configurations for common reports
 */
export const REPORT_COLUMNS = {
  feeCollection: [
    { key: 'studentName', label: 'Student Name', width: 20 },
    { key: 'enrollmentNumber', label: 'Enrollment Number', width: 15 },
    { key: 'className', label: 'Class', width: 15 },
    { key: 'feeStructure', label: 'Fee Structure', width: 20 },
    { key: 'totalAmount', label: 'Total Amount', width: 15, format: 'currency' as const },
    { key: 'paidAmount', label: 'Paid Amount', width: 15, format: 'currency' as const },
    { key: 'pendingAmount', label: 'Pending Amount', width: 15, format: 'currency' as const },
    { key: 'status', label: 'Status', width: 12 },
    { key: 'dueDate', label: 'Due Date', width: 12, format: 'date' as const },
  ],
  
  paymentMethods: [
    { key: 'paymentMethod', label: 'Payment Method', width: 20 },
    { key: 'transactionCount', label: 'Transactions', width: 15, format: 'number' as const },
    { key: 'totalAmount', label: 'Total Amount', width: 15, format: 'currency' as const },
    { key: 'percentage', label: 'Percentage', width: 12, format: 'percentage' as const },
  ],

  campusReport: [
    { key: 'campusName', label: 'Campus Name', width: 25 },
    { key: 'studentCount', label: 'Students', width: 12, format: 'number' as const },
    { key: 'totalCollected', label: 'Total Collected', width: 18, format: 'currency' as const },
    { key: 'totalPending', label: 'Total Pending', width: 18, format: 'currency' as const },
    { key: 'collectionRate', label: 'Collection Rate', width: 15, format: 'percentage' as const },
  ],

  programReport: [
    { key: 'programName', label: 'Program Name', width: 25 },
    { key: 'programType', label: 'Program Type', width: 15 },
    { key: 'studentCount', label: 'Students', width: 12, format: 'number' as const },
    { key: 'totalCollected', label: 'Total Collected', width: 18, format: 'currency' as const },
    { key: 'totalPending', label: 'Total Pending', width: 18, format: 'currency' as const },
    { key: 'collectionRate', label: 'Collection Rate', width: 15, format: 'percentage' as const },
  ],

  overdueAnalysis: [
    { key: 'studentName', label: 'Student Name', width: 20 },
    { key: 'enrollmentNumber', label: 'Enrollment Number', width: 15 },
    { key: 'className', label: 'Class', width: 15 },
    { key: 'overdueAmount', label: 'Overdue Amount', width: 15, format: 'currency' as const },
    { key: 'daysPastDue', label: 'Days Past Due', width: 15, format: 'number' as const },
    { key: 'dueDate', label: 'Due Date', width: 12, format: 'date' as const },
    { key: 'contactInfo', label: 'Contact Info', width: 20 },
  ],
};
