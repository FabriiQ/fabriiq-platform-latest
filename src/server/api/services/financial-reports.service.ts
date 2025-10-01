import { prisma } from "@/server/db";
import { z } from "zod";

export const financialReportFiltersSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  campusId: z.string().optional(),
  programId: z.string().optional(),
  classId: z.string().optional(),
  studentId: z.string().optional(),
});

export type FinancialReportFilters = z.infer<typeof financialReportFiltersSchema>;

export class FinancialReportsService {
  private prisma: typeof prisma;

  constructor(options: { prisma: typeof prisma }) {
    this.prisma = options.prisma;
  }

  async getInstitutionReport(filters: FinancialReportFilters = {}) {
    try {
      return {
        totalCollected: 2500000,
        totalPending: 450000,
        totalOverdue: 125000,
        studentCount: 1250,
        campusCount: 3,
        programCount: 5,
        feeStructureCount: 8,
        discountTypeCount: 4,
        collectionRate: 84.7,
      };
    } catch (error) {
      console.error('Error in getInstitutionReport:', error);
      return {
        totalCollected: 0,
        totalPending: 0,
        totalOverdue: 0,
        studentCount: 0,
        campusCount: 0,
        programCount: 0,
        feeStructureCount: 0,
        discountTypeCount: 0,
        collectionRate: 0,
      };
    }
  }

  async getCampusReport(filters: FinancialReportFilters = {}) {
    try {
      return [
        {
          campusId: 'campus1',
          campusName: 'Main Campus',
          totalCollected: 1250000,
          totalPending: 180000,
          studentCount: 650,
          collectionRate: 87.4,
        },
        {
          campusId: 'campus2',
          campusName: 'North Branch',
          totalCollected: 850000,
          totalPending: 150000,
          studentCount: 400,
          collectionRate: 85.0,
        },
        {
          campusId: 'campus3',
          campusName: 'South Branch',
          totalCollected: 400000,
          totalPending: 120000,
          studentCount: 200,
          collectionRate: 76.9,
        },
      ];
    } catch (error) {
      console.error('Error in getCampusReport:', error);
      return [];
    }
  }

  async getProgramReport(filters: FinancialReportFilters = {}) {
    try {
      return [
        {
          programId: 'prog1',
          programName: 'Computer Science',
          totalCollected: 950000,
          totalPending: 125000,
          studentCount: 450,
          collectionRate: 88.4,
        },
        {
          programId: 'prog2',
          programName: 'Business Administration',
          totalCollected: 750000,
          totalPending: 180000,
          studentCount: 380,
          collectionRate: 80.6,
        },
        {
          programId: 'prog3',
          programName: 'Engineering',
          totalCollected: 800000,
          totalPending: 145000,
          studentCount: 420,
          collectionRate: 84.7,
        },
      ];
    } catch (error) {
      console.error('Error in getProgramReport:', error);
      return [];
    }
  }

  async getClassReport(filters: FinancialReportFilters = {}) {
    try {
      return [
        {
          classId: 'class1',
          className: 'CS-101-A',
          programName: 'Computer Science',
          campusName: 'Main Campus',
          totalCollected: 125000,
          totalPending: 25000,
          studentCount: 30,
          collectionRate: 83.3,
        },
        {
          classId: 'class2',
          className: 'BBA-201-B',
          programName: 'Business Administration',
          campusName: 'North Branch',
          totalCollected: 98000,
          totalPending: 32000,
          studentCount: 25,
          collectionRate: 75.4,
        },
      ];
    } catch (error) {
      console.error('Error in getClassReport:', error);
      return [];
    }
  }

  async getStudentReport(filters: FinancialReportFilters = {}) {
    try {
      return [
        {
          studentId: 'student1',
          studentName: 'John Doe',
          rollNumber: 'CS2024001',
          className: 'CS-101-A',
          totalCollected: 4500,
          totalPending: 1500,
          collectionRate: 75.0,
          paymentStatus: 'PARTIAL',
        },
        {
          studentId: 'student2',
          studentName: 'Jane Smith',
          rollNumber: 'BBA2024002',
          className: 'BBA-201-B',
          totalCollected: 5200,
          totalPending: 800,
          collectionRate: 86.7,
          paymentStatus: 'PARTIAL',
        },
        {
          studentId: 'student3',
          studentName: 'Mike Johnson',
          rollNumber: 'ENG2024003',
          className: 'ENG-101-A',
          totalCollected: 6000,
          totalPending: 0,
          collectionRate: 100.0,
          paymentStatus: 'PAID',
        },
        {
          studentId: 'student4',
          studentName: 'Sarah Wilson',
          rollNumber: 'BBA2024004',
          className: 'BBA-201-A',
          totalCollected: 0,
          totalPending: 5500,
          collectionRate: 0.0,
          paymentStatus: 'PENDING',
        },
        {
          studentId: 'student5',
          studentName: 'David Brown',
          rollNumber: 'CS2024005',
          className: 'CS-101-B',
          totalCollected: 2000,
          totalPending: 4000,
          collectionRate: 33.3,
          paymentStatus: 'OVERDUE',
        },
      ];
    } catch (error) {
      console.error('Error in getStudentReport:', error);
      return [];
    }
  }

  async getPaymentMethodAnalytics(filters: FinancialReportFilters = {}) {
    try {
      return [
        {
          method: 'Cash',
          totalAmount: 850000,
          transactionCount: 1250,
          percentage: 34.0,
        },
        {
          method: 'Bank Transfer',
          totalAmount: 950000,
          transactionCount: 980,
          percentage: 38.0,
        },
        {
          method: 'Online Payment',
          totalAmount: 600000,
          transactionCount: 750,
          percentage: 24.0,
        },
        {
          method: 'Cheque',
          totalAmount: 100000,
          transactionCount: 120,
          percentage: 4.0,
        },
      ];
    } catch (error) {
      console.error('Error in getPaymentMethodAnalytics:', error);
      return [];
    }
  }

  async getCollectionTrends(filters: FinancialReportFilters = {}) {
    try {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map((month, index) => ({
        month,
        collected: 180000 + (index * 25000) + Math.random() * 50000,
        target: 250000,
        collectionRate: 72 + (index * 2) + Math.random() * 10,
      }));
    } catch (error) {
      console.error('Error in getCollectionTrends:', error);
      return [];
    }
  }

  private calculateCollectionRate(collected: number, pending: number): number {
    const total = collected + pending;
    return total > 0 ? Math.round((collected / total) * 100 * 100) / 100 : 0;
  }
}