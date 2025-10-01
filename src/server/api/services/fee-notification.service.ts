import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client';
import { SettingsService } from './settings.service';
import { formatCurrency } from '@/data/currencies';

export interface NotificationData {
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  priority: NotificationPriority;
  actionUrl?: string;
  metadata?: any;
}

export class FeeNotificationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Send due date reminder notifications
   */
  async sendDueDateReminders(): Promise<void> {
    const settingsService = new SettingsService(this.prisma);
    const feeSettings = await settingsService.getFeeSettings();

    if (!feeSettings.notificationSettings.enabled || !feeSettings.notificationSettings.dueDateReminders.enabled) {
      return;
    }

    const reminderDays = feeSettings.notificationSettings.dueDateReminders.daysBefore;

    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(23, 59, 59, 999); // End of day

      const dueFees = await this.prisma.enrollmentFee.findMany({
        where: {
          dueDate: {
            gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
            lt: targetDate
          },
          paymentStatus: { in: ['PENDING', 'PARTIAL'] }
        },
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
                  campus: true
                }
              }
            }
          },
          feeStructure: true
        }
      });

      for (const fee of dueFees) {
        const student = fee.enrollment.student;
        const pendingAmount = fee.finalAmount; // Use finalAmount as the pending amount
        const formattedAmount = formatCurrency(pendingAmount, feeSettings.currency);

        await this.createNotification({
          userId: student.user.id, // Use user.id instead of student.id
          title: `Fee Due in ${days} day${days > 1 ? 's' : ''}`,
          content: `Your ${fee.feeStructure.name} fee of ${formattedAmount} is due on ${fee.dueDate?.toLocaleDateString() || 'N/A'}. Please make your payment to avoid late fees.`,
          type: 'REMINDER', // Use valid enum value
          priority: days <= 3 ? 'HIGH' : 'MEDIUM',
          actionUrl: `/student/fees/${fee.id}`,
          metadata: {
            feeId: fee.id,
            amount: pendingAmount,
            dueDate: fee.dueDate,
            daysUntilDue: days
          }
        });
      }
    }
  }

  /**
   * Send overdue notifications
   */
  async sendOverdueNotifications(): Promise<void> {
    const settingsService = new SettingsService(this.prisma);
    const feeSettings = await settingsService.getFeeSettings();

    if (!feeSettings.notificationSettings.enabled || !feeSettings.notificationSettings.overdueNotifications.enabled) {
      return;
    }

    const escalationDays = feeSettings.notificationSettings.overdueNotifications.escalationDays;
    const today = new Date();

    for (const days of escalationDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);

      const overdueFees = await this.prisma.enrollmentFee.findMany({
        where: {
          dueDate: {
            gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
            lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
          },
          paymentStatus: { in: ['PENDING', 'PARTIAL'] }
        },
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
                  campus: true
                }
              }
            }
          },
          feeStructure: true
        }
      });

      for (const fee of overdueFees) {
        const student = fee.enrollment.student;
        const pendingAmount = fee.finalAmount; // Use finalAmount
        const formattedAmount = formatCurrency(pendingAmount, feeSettings.currency);

        // Calculate late fee if applicable
        let lateFeeAmount = 0;
        if (feeSettings.dueDateSettings.lateFeesEnabled) {
          if (feeSettings.dueDateSettings.lateFeeType === 'PERCENTAGE') {
            lateFeeAmount = (pendingAmount * feeSettings.dueDateSettings.lateFeeAmount) / 100;
          } else {
            lateFeeAmount = feeSettings.dueDateSettings.lateFeeAmount;
          }
        }

        const totalAmount = pendingAmount + lateFeeAmount;
        const formattedTotal = formatCurrency(totalAmount, feeSettings.currency);

        await this.createNotification({
          userId: student.user.id, // Use user.id
          title: `Fee Overdue - ${days} days`,
          content: `Your ${fee.feeStructure.name} fee of ${formattedAmount} is ${days} days overdue. ${lateFeeAmount > 0 ? `Late fee of ${formatCurrency(lateFeeAmount, feeSettings.currency)} has been applied. Total amount due: ${formattedTotal}.` : ''} Please make your payment immediately.`,
          type: 'ALERT', // Use valid enum value
          priority: days >= 30 ? 'HIGH' : 'HIGH', // URGENT is not valid, use HIGH
          actionUrl: `/student/fees/${fee.id}`,
          metadata: {
            feeId: fee.id,
            originalAmount: pendingAmount,
            lateFeeAmount,
            totalAmount,
            daysOverdue: days,
            dueDate: fee.dueDate
          }
        });
      }
    }
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmation(transactionId: string): Promise<void> {
    const settingsService = new SettingsService(this.prisma);
    const feeSettings = await settingsService.getFeeSettings();

    if (!feeSettings.notificationSettings.enabled || !feeSettings.notificationSettings.paymentConfirmations.enabled) {
      return;
    }

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
                }
              }
            },
            feeStructure: true
          }
        }
      }
    });

    if (!transaction) {
      return;
    }

    const student = transaction.enrollmentFee.enrollment.student;
    const formattedAmount = formatCurrency(transaction.amount, feeSettings.currency);
    const remainingAmount = transaction.enrollmentFee.finalAmount - transaction.amount; // Calculate remaining
    const formattedRemaining = formatCurrency(remainingAmount, feeSettings.currency);

    await this.createNotification({
      userId: student.user.id, // Use user.id
      title: 'Payment Confirmation',
      content: `Your payment of ${formattedAmount} for ${transaction.enrollmentFee.feeStructure.name} has been successfully processed. ${remainingAmount > 0 ? `Remaining balance: ${formattedRemaining}.` : 'Your fee is now fully paid.'}`,
      type: 'UPDATE', // Use valid enum value
      priority: 'MEDIUM',
      actionUrl: `/student/fees/${transaction.enrollmentFee.id}`,
      metadata: {
        transactionId: transaction.id,
        feeId: transaction.enrollmentFee.id,
        paidAmount: transaction.amount,
        remainingAmount,
        paymentMethod: transaction.method, // Use correct field name
        paymentDate: transaction.date // Use correct field name
      }
    });

    // Send email notification if enabled
    if (feeSettings.notificationSettings.paymentConfirmations.sendEmail) {
      await this.sendEmailNotification(student.user.email || '', 'Payment Confirmation', `
        Dear ${student.user.name || 'Student'},

        Your payment of ${formattedAmount} for ${transaction.enrollmentFee.feeStructure.name} has been successfully processed.

        Payment Details:
        - Amount: ${formattedAmount}
        - Payment Method: ${transaction.method.replace('_', ' ')}
        - Date: ${transaction.date.toLocaleDateString()}
        - Transaction Reference: ${transaction.reference || 'N/A'}

        ${remainingAmount > 0 ? `Remaining Balance: ${formattedRemaining}` : 'Your fee is now fully paid.'}

        Thank you for your payment.

        Best regards,
        Fee Management System
      `);
    }

    // Send SMS notification if enabled
    if (feeSettings.notificationSettings.paymentConfirmations.sendSMS && student.user.phoneNumber) {
      await this.sendSMSNotification(student.user.phoneNumber,
        `Payment confirmed: ${formattedAmount} for ${transaction.enrollmentFee.feeStructure.name}. ${remainingAmount > 0 ? `Balance: ${formattedRemaining}` : 'Fully paid.'}`
      );
    }
  }

  /**
   * Create a notification in the database
   */
  private async createNotification(data: NotificationData): Promise<void> {
    await this.prisma.notification.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type,
        priority: data.priority,
        userId: data.userId,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
        status: 'UNREAD'
      }
    });
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private async sendEmailNotification(email: string, subject: string, content: string): Promise<void> {
    // In a real implementation, you would integrate with an email service like SendGrid, AWS SES, etc.
    console.log(`Email notification sent to ${email}:`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${content}`);
  }

  /**
   * Send SMS notification (placeholder implementation)
   */
  private async sendSMSNotification(phoneNumber: string, message: string): Promise<void> {
    // In a real implementation, you would integrate with an SMS service like Twilio, AWS SNS, etc.
    console.log(`SMS notification sent to ${phoneNumber}:`);
    console.log(`Message: ${message}`);
  }

  /**
   * Run all scheduled notifications
   */
  async runScheduledNotifications(): Promise<void> {
    try {
      await this.sendDueDateReminders();
      await this.sendOverdueNotifications();
      console.log('Scheduled fee notifications completed successfully');
    } catch (error) {
      console.error('Error running scheduled fee notifications:', error);
    }
  }
}
