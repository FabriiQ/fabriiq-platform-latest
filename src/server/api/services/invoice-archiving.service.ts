import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export interface InvoiceArchivingConfig {
  prisma: PrismaClient;
}

export interface PartitionInfo {
  partitionName: string;
  partitionKey: string;
  startDate: Date;
  endDate: Date;
  recordCount: number;
  totalSize: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPRESSED';
}

export interface ArchivingPolicy {
  archiveAfterMonths: number;
  compressAfterMonths: number;
  deleteAfterYears: number;
  batchSize: number;
  enableCompression: boolean;
  enablePartitioning: boolean;
}

export class InvoiceArchivingService {
  private prisma: PrismaClient;
  private defaultPolicy: ArchivingPolicy = {
    archiveAfterMonths: 12,
    compressAfterMonths: 24,
    deleteAfterYears: 7,
    batchSize: 1000,
    enableCompression: true,
    enablePartitioning: true
  };

  constructor(config: InvoiceArchivingConfig) {
    this.prisma = config.prisma;
  }

  /**
   * Create quarterly partitions for invoices
   */
  async createPartitions(year: number): Promise<void> {
    try {
      const quarters = [
        { quarter: 1, months: [1, 2, 3] },
        { quarter: 2, months: [4, 5, 6] },
        { quarter: 3, months: [7, 8, 9] },
        { quarter: 4, months: [10, 11, 12] }
      ];

      for (const q of quarters) {
        const partitionKey = `${year}_${q.quarter}`;
        const partitionName = `invoices_${partitionKey}`;
        const startDate = new Date(year, q.months[0] - 1, 1);
        const endDate = new Date(year, q.months[2], 0, 23, 59, 59);

        // Check if partition already exists
        const existingPartition = await this.prisma.$queryRaw<any[]>`
          SELECT schemaname, tablename 
          FROM pg_tables 
          WHERE tablename = ${partitionName}
        `;

        if (existingPartition.length === 0) {
          // Create partition table
          await this.prisma.$executeRawUnsafe(`
            CREATE TABLE ${partitionName} PARTITION OF invoices
            FOR VALUES FROM ('${startDate.toISOString()}') TO ('${endDate.toISOString()}')
          `);

          // Create indexes on partition
          await this.prisma.$executeRawUnsafe(`
            CREATE INDEX idx_${partitionName}_student_status 
            ON ${partitionName} ("studentId", status)
          `);

          await this.prisma.$executeRawUnsafe(`
            CREATE INDEX idx_${partitionName}_type_status 
            ON ${partitionName} ("invoiceType", status)
          `);

          await this.prisma.$executeRawUnsafe(`
            CREATE INDEX idx_${partitionName}_due_date 
            ON ${partitionName} ("dueDate", status)
          `);

          console.log(`Created partition: ${partitionName}`);
        }
      }
    } catch (error) {
      console.error('Error creating partitions:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create partitions'
      });
    }
  }

  /**
   * Get partition information
   */
  async getPartitionInfo(): Promise<PartitionInfo[]> {
    try {
      const partitions = await this.prisma.$queryRaw<any[]>`
        SELECT 
          schemaname,
          tablename as "partitionName",
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "totalSize"
        FROM pg_tables 
        WHERE tablename LIKE 'invoices_%'
        ORDER BY tablename
      `;

      const partitionInfo: PartitionInfo[] = [];

      for (const partition of partitions) {
        // Extract partition key from table name
        const partitionKey = partition.partitionName.replace('invoices_', '');
        const [year, quarter] = partitionKey.split('_').map(Number);
        
        // Calculate date range
        const quarterMonths = {
          1: [1, 2, 3],
          2: [4, 5, 6],
          3: [7, 8, 9],
          4: [10, 11, 12]
        };
        
        const months = quarterMonths[quarter as keyof typeof quarterMonths];
        const startDate = new Date(year, months[0] - 1, 1);
        const endDate = new Date(year, months[2], 0, 23, 59, 59);

        // Get record count
        const countResult = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(`
          SELECT COUNT(*) as count FROM ${partition.partitionName}
        `);

        const recordCount = Number(countResult[0].count);

        // Determine status based on age
        const now = new Date();
        const ageInMonths = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        let status: 'ACTIVE' | 'ARCHIVED' | 'COMPRESSED' = 'ACTIVE';
        
        if (ageInMonths > this.defaultPolicy.compressAfterMonths) {
          status = 'COMPRESSED';
        } else if (ageInMonths > this.defaultPolicy.archiveAfterMonths) {
          status = 'ARCHIVED';
        }

        partitionInfo.push({
          partitionName: partition.partitionName,
          partitionKey,
          startDate,
          endDate,
          recordCount,
          totalSize: partition.totalSize,
          status
        });
      }

      return partitionInfo;
    } catch (error) {
      console.error('Error getting partition info:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get partition information'
      });
    }
  }

  /**
   * Archive old invoices by moving them to archive tables
   */
  async archiveOldInvoices(policy?: Partial<ArchivingPolicy>): Promise<{
    archivedCount: number;
    compressedCount: number;
    deletedCount: number;
    processedPartitions: string[];
  }> {
    const effectivePolicy = { ...this.defaultPolicy, ...policy };
    const results = {
      archivedCount: 0,
      compressedCount: 0,
      deletedCount: 0,
      processedPartitions: [] as string[]
    };

    try {
      const partitions = await this.getPartitionInfo();
      const now = new Date();

      for (const partition of partitions) {
        const ageInMonths = (now.getTime() - partition.endDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        const ageInYears = ageInMonths / 12;

        // Delete very old partitions
        if (ageInYears > effectivePolicy.deleteAfterYears) {
          await this.deletePartition(partition.partitionName);
          results.deletedCount += partition.recordCount;
          results.processedPartitions.push(`DELETED: ${partition.partitionName}`);
          continue;
        }

        // Compress old partitions
        if (ageInMonths > effectivePolicy.compressAfterMonths && 
            partition.status !== 'COMPRESSED' && 
            effectivePolicy.enableCompression) {
          await this.compressPartition(partition.partitionName);
          results.compressedCount += partition.recordCount;
          results.processedPartitions.push(`COMPRESSED: ${partition.partitionName}`);
          continue;
        }

        // Archive moderately old partitions
        if (ageInMonths > effectivePolicy.archiveAfterMonths && 
            partition.status === 'ACTIVE') {
          await this.archivePartition(partition.partitionName);
          results.archivedCount += partition.recordCount;
          results.processedPartitions.push(`ARCHIVED: ${partition.partitionName}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error archiving invoices:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to archive invoices'
      });
    }
  }

  /**
   * Archive a specific partition
   */
  private async archivePartition(partitionName: string): Promise<void> {
    try {
      // Create archive table if it doesn't exist
      const archiveTableName = `${partitionName}_archive`;
      
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${archiveTableName} (
          LIKE ${partitionName} INCLUDING ALL
        )
      `);

      // Move data to archive table
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO ${archiveTableName}
        SELECT * FROM ${partitionName}
        WHERE status NOT IN ('DRAFT', 'SENT', 'VIEWED')
      `);

      // Delete archived records from main partition
      await this.prisma.$executeRawUnsafe(`
        DELETE FROM ${partitionName}
        WHERE status NOT IN ('DRAFT', 'SENT', 'VIEWED')
      `);

      console.log(`Archived partition: ${partitionName}`);
    } catch (error) {
      console.error(`Error archiving partition ${partitionName}:`, error);
      throw error;
    }
  }

  /**
   * Compress a partition using PostgreSQL compression
   */
  private async compressPartition(partitionName: string): Promise<void> {
    try {
      // Enable compression on the partition
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE ${partitionName} SET (toast_tuple_target = 128)
      `);

      // Compress JSON columns
      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE ${partitionName} 
        ALTER COLUMN "lineItems" SET COMPRESSION lz4
      `);

      await this.prisma.$executeRawUnsafe(`
        ALTER TABLE ${partitionName} 
        ALTER COLUMN metadata SET COMPRESSION lz4
      `);

      // Vacuum to apply compression
      await this.prisma.$executeRawUnsafe(`
        VACUUM FULL ${partitionName}
      `);

      console.log(`Compressed partition: ${partitionName}`);
    } catch (error) {
      console.error(`Error compressing partition ${partitionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a partition completely
   */
  private async deletePartition(partitionName: string): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`
        DROP TABLE IF EXISTS ${partitionName} CASCADE
      `);

      await this.prisma.$executeRawUnsafe(`
        DROP TABLE IF EXISTS ${partitionName}_archive CASCADE
      `);

      console.log(`Deleted partition: ${partitionName}`);
    } catch (error) {
      console.error(`Error deleting partition ${partitionName}:`, error);
      throw error;
    }
  }

  /**
   * Get archiving statistics
   */
  async getArchivingStats(): Promise<{
    totalInvoices: number;
    activeInvoices: number;
    archivedInvoices: number;
    compressedInvoices: number;
    totalSize: string;
    oldestInvoice: Date | null;
    newestInvoice: Date | null;
    partitionCount: number;
  }> {
    try {
      const partitions = await this.getPartitionInfo();
      
      const stats = {
        totalInvoices: 0,
        activeInvoices: 0,
        archivedInvoices: 0,
        compressedInvoices: 0,
        totalSize: '0 bytes',
        oldestInvoice: null as Date | null,
        newestInvoice: null as Date | null,
        partitionCount: partitions.length
      };

      for (const partition of partitions) {
        stats.totalInvoices += partition.recordCount;
        
        switch (partition.status) {
          case 'ACTIVE':
            stats.activeInvoices += partition.recordCount;
            break;
          case 'ARCHIVED':
            stats.archivedInvoices += partition.recordCount;
            break;
          case 'COMPRESSED':
            stats.compressedInvoices += partition.recordCount;
            break;
        }

        if (!stats.oldestInvoice || partition.startDate < stats.oldestInvoice) {
          stats.oldestInvoice = partition.startDate;
        }
        
        if (!stats.newestInvoice || partition.endDate > stats.newestInvoice) {
          stats.newestInvoice = partition.endDate;
        }
      }

      // Get total size
      const sizeResult = await this.prisma.$queryRaw<[{ total_size: string }]>`
        SELECT pg_size_pretty(
          SUM(pg_total_relation_size(schemaname||'.'||tablename))
        ) as total_size
        FROM pg_tables 
        WHERE tablename LIKE 'invoices%'
      `;

      stats.totalSize = sizeResult[0].total_size || '0 bytes';

      return stats;
    } catch (error) {
      console.error('Error getting archiving stats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get archiving statistics'
      });
    }
  }
}
