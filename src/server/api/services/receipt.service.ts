import { PrismaClient } from '@prisma/client';
import { SettingsService } from './settings.service';
import { formatCurrency } from '@/data/currencies';

export interface ReceiptData {
  transactionId: string;
  studentName: string;
  studentEmail: string;
  enrollmentNumber: string;
  feeStructureName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  transactionReference?: string;
  dueDate?: Date;
  institutionName: string;
  campusName: string;
}

export class ReceiptService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate receipt for a fee transaction
   */
  async generateReceipt(transactionId: string): Promise<string> {
    // Get transaction details
    const transaction = await this.prisma.feeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        enrollmentFee: {
          include: {
            enrollment: {
              include: {
                student: {
                  include: {
                    user: true
                  }
                },
                class: {
                  include: {
                    campus: {
                      include: {
                        institution: true
                      }
                    }
                  }
                }
              }
            },
            feeStructure: true
          }
        }
      }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Get receipt settings
    const settingsService = new SettingsService(this.prisma);
    const feeSettings = await settingsService.getFeeSettings();

    if (!feeSettings.receiptSettings.enabled) {
      throw new Error('Receipt generation is disabled');
    }

    // Prepare receipt data
    const receiptData: ReceiptData = {
      transactionId: transaction.id,
      studentName: transaction.enrollmentFee.enrollment.student.user.name || 'Student',
      studentEmail: transaction.enrollmentFee.enrollment.student.user.email || '',
      enrollmentNumber: transaction.enrollmentFee.enrollment.student.enrollmentNumber || '',
      feeStructureName: transaction.enrollmentFee.feeStructure.name,
      amount: transaction.amount,
      paymentMethod: transaction.method,
      paymentDate: transaction.date,
      transactionReference: transaction.reference || undefined,
      dueDate: transaction.enrollmentFee.dueDate || undefined,
      institutionName: transaction.enrollmentFee.enrollment.class.campus.institution.name,
      campusName: transaction.enrollmentFee.enrollment.class.campus.name,
    };

    // Generate receipt HTML based on template
    const receiptHtml = await this.generateReceiptHtml(receiptData, feeSettings);

    // Store receipt URL (in a real implementation, you'd save the HTML/PDF to storage)
    const receiptUrl = `/receipts/${transactionId}.html`;
    
    // Update transaction with receipt URL
    await this.prisma.feeTransaction.update({
      where: { id: transactionId },
      data: { receiptUrl }
    });

    return receiptHtml;
  }

  /**
   * Generate receipt HTML based on template and settings
   */
  private async generateReceiptHtml(data: ReceiptData, settings: any): Promise<string> {
    const currency = settings.currency;
    const receiptSettings = settings.receiptSettings;

    const formattedAmount = formatCurrency(data.amount, currency);
    const receiptNumber = `RCP-${data.transactionId.slice(-8).toUpperCase()}`;

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fee Payment Receipt - ${receiptNumber}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .receipt-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .receipt-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .receipt-title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .receipt-number {
            font-size: 16px;
            opacity: 0.9;
        }
        .receipt-body {
            padding: 30px;
        }
        .info-section {
            margin-bottom: 25px;
        }
        .info-title {
            font-size: 18px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 5px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        .info-label {
            font-weight: 600;
            color: #64748b;
        }
        .info-value {
            font-weight: 500;
            color: #1e293b;
        }
        .amount-section {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
        }
        .amount-value {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
            text-align: center;
        }
        .receipt-footer {
            background: #f8fafc;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer-text {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .qr-code, .barcode {
            margin: 15px 0;
        }
        @media print {
            body {
                background-color: white;
                padding: 0;
            }
            .receipt-container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="receipt-header">
            <div class="receipt-title">Fee Payment Receipt</div>
            <div class="receipt-number">Receipt #${receiptNumber}</div>
        </div>
        
        <div class="receipt-body">
            <div class="info-section">
                <div class="info-title">Institution Information</div>
                <div class="info-row">
                    <span class="info-label">Institution:</span>
                    <span class="info-value">${data.institutionName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Campus:</span>
                    <span class="info-value">${data.campusName}</span>
                </div>
            </div>

            <div class="info-section">
                <div class="info-title">Student Information</div>
                <div class="info-row">
                    <span class="info-label">Student Name:</span>
                    <span class="info-value">${data.studentName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Enrollment Number:</span>
                    <span class="info-value">${data.enrollmentNumber}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${data.studentEmail}</span>
                </div>
            </div>

            <div class="info-section">
                <div class="info-title">Payment Details</div>
                <div class="info-row">
                    <span class="info-label">Fee Structure:</span>
                    <span class="info-value">${data.feeStructureName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Payment Method:</span>
                    <span class="info-value">${data.paymentMethod.replace('_', ' ')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Payment Date:</span>
                    <span class="info-value">${data.paymentDate.toLocaleDateString()}</span>
                </div>
                ${data.transactionReference ? `
                <div class="info-row">
                    <span class="info-label">Transaction Reference:</span>
                    <span class="info-value">${data.transactionReference}</span>
                </div>
                ` : ''}
                ${data.dueDate ? `
                <div class="info-row">
                    <span class="info-label">Due Date:</span>
                    <span class="info-value">${data.dueDate.toLocaleDateString()}</span>
                </div>
                ` : ''}
            </div>

            <div class="amount-section">
                <div style="text-align: center; margin-bottom: 10px; color: #64748b; font-weight: 600;">
                    Amount Paid
                </div>
                <div class="amount-value">${formattedAmount}</div>
            </div>
        </div>

        <div class="receipt-footer">
            ${receiptSettings.includeQRCode ? `
            <div class="qr-code">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">QR Code for Verification</div>
                <div style="width: 100px; height: 100px; background: #f1f5f9; margin: 0 auto; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0;">
                    QR Code
                </div>
            </div>
            ` : ''}
            
            ${receiptSettings.includeBarcode ? `
            <div class="barcode">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Barcode</div>
                <div style="width: 200px; height: 40px; background: #f1f5f9; margin: 0 auto; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; font-family: monospace;">
                    |||| ||| |||| |||
                </div>
            </div>
            ` : ''}
            
            <div class="footer-text">
                ${receiptSettings.footerText}
            </div>
            <div class="footer-text">
                Generated on ${new Date().toLocaleString()}
            </div>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Get receipt by transaction ID
   */
  async getReceipt(transactionId: string): Promise<string | null> {
    const transaction = await this.prisma.feeTransaction.findUnique({
      where: { id: transactionId },
      select: { receiptUrl: true }
    });

    if (!transaction?.receiptUrl) {
      return null;
    }

    // In a real implementation, you'd fetch the receipt from storage
    // For now, regenerate it
    return this.generateReceipt(transactionId);
  }
}
