/**
 * Monitor Question Generation Progress
 * 
 * Provides real-time monitoring and management for the million questions generation process:
 * - Progress tracking and ETA calculation
 * - Database statistics and health monitoring
 * - Memory usage tracking
 * - Performance metrics
 * - Resume/pause functionality
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface GenerationStats {
  totalQuestionsInDB: number;
  questionsBySubject: Record<string, number>;
  questionsByType: Record<string, number>;
  questionsByDifficulty: Record<string, number>;
  questionsByBloomsLevel: Record<string, number>;
  recentQuestions: number; // Questions added in last hour
  averageGenerationRate: number; // Questions per minute
  estimatedCompletion?: Date;
}

interface SystemHealth {
  databaseConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  diskSpace: string;
  cpuUsage: number;
  uptime: number;
}

/**
 * Get comprehensive database statistics
 */
async function getDatabaseStats(): Promise<GenerationStats> {
  console.log('📊 Fetching database statistics...');
  
  try {
    // Total questions count
    const totalQuestions = await prisma.question.count();
    
    // Questions by subject
    const questionsBySubject = await prisma.question.groupBy({
      by: ['subjectId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    // Get subject names
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true }
    });
    const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
    
    const subjectStats = questionsBySubject.reduce((acc, item) => {
      const subjectName = subjectMap.get(item.subjectId) || item.subjectId;
      acc[subjectName] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
    
    // Questions by type
    const questionsByType = await prisma.question.groupBy({
      by: ['questionType'],
      _count: {
        id: true
      }
    });
    const typeStats = questionsByType.reduce((acc, item) => {
      acc[item.questionType] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
    
    // Questions by difficulty
    const questionsByDifficulty = await prisma.question.groupBy({
      by: ['difficulty'],
      _count: {
        id: true
      }
    });
    const difficultyStats = questionsByDifficulty.reduce((acc, item) => {
      acc[item.difficulty] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
    
    // Questions by Bloom's level
    const questionsByBlooms = await prisma.question.groupBy({
      by: ['bloomsLevel'],
      _count: {
        id: true
      }
    });
    const bloomsStats = questionsByBlooms.reduce((acc, item) => {
      acc[item.bloomsLevel || 'UNKNOWN'] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
    
    // Recent questions (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentQuestions = await prisma.question.count({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      }
    });
    
    // Calculate average generation rate
    const oldestQuestion = await prisma.question.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    });
    
    let averageRate = 0;
    if (oldestQuestion) {
      const timeSpan = Date.now() - oldestQuestion.createdAt.getTime();
      const minutes = timeSpan / (1000 * 60);
      averageRate = totalQuestions / minutes;
    }
    
    return {
      totalQuestionsInDB: totalQuestions,
      questionsBySubject: subjectStats,
      questionsByType: typeStats,
      questionsByDifficulty: difficultyStats,
      questionsByBloomsLevel: bloomsStats,
      recentQuestions,
      averageGenerationRate: averageRate
    };
    
  } catch (error) {
    console.error('❌ Error fetching database stats:', error);
    throw error;
  }
}

/**
 * Get system health metrics
 */
function getSystemHealth(): SystemHealth {
  const memoryUsage = process.memoryUsage();
  
  return {
    databaseConnections: 1, // Simplified for now
    memoryUsage,
    diskSpace: 'N/A', // Would need OS-specific implementation
    cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
    uptime: process.uptime()
  };
}

/**
 * Load generation progress from file
 */
async function loadGenerationProgress(): Promise<any> {
  const progressFile = path.join(process.cwd(), 'data', 'million-questions-seed', 'generation-progress.json');
  
  try {
    if (fs.existsSync(progressFile)) {
      const content = await fs.promises.readFile(progressFile, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('Could not load progress file:', error);
  }
  
  return null;
}

/**
 * Display comprehensive monitoring dashboard
 */
async function displayDashboard(): Promise<void> {
  console.clear();
  console.log('🎯 MILLION QUESTIONS GENERATION MONITOR');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toLocaleString()}\n`);
  
  try {
    // Get database statistics
    const dbStats = await getDatabaseStats();
    const systemHealth = getSystemHealth();
    const progress = await loadGenerationProgress();
    
    // Display progress information
    if (progress) {
      console.log('📊 GENERATION PROGRESS');
      console.log('-'.repeat(30));
      console.log(`Total Generated: ${progress.totalGenerated?.toLocaleString() || 0}`);
      console.log(`Subjects Processed: ${progress.subjectsProcessed || 0}`);
      console.log(`Current Batch: ${progress.currentBatch || 0}`);
      if (progress.estimatedCompletion) {
        console.log(`Estimated Completion: ${new Date(progress.estimatedCompletion).toLocaleString()}`);
      }
      console.log();
    }
    
    // Display database statistics
    console.log('💾 DATABASE STATISTICS');
    console.log('-'.repeat(30));
    console.log(`Total Questions in DB: ${dbStats.totalQuestionsInDB.toLocaleString()}`);
    console.log(`Recent Questions (1h): ${dbStats.recentQuestions.toLocaleString()}`);
    console.log(`Average Rate: ${dbStats.averageGenerationRate.toFixed(2)} questions/minute`);
    console.log();
    
    // Display questions by subject
    console.log('📚 QUESTIONS BY SUBJECT');
    console.log('-'.repeat(30));
    Object.entries(dbStats.questionsBySubject)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([subject, count]) => {
        const percentage = ((count / dbStats.totalQuestionsInDB) * 100).toFixed(1);
        console.log(`${subject.substring(0, 40).padEnd(40)} ${count.toLocaleString().padStart(8)} (${percentage}%)`);
      });
    console.log();
    
    // Display question type distribution
    console.log('🎯 QUESTION TYPE DISTRIBUTION');
    console.log('-'.repeat(30));
    Object.entries(dbStats.questionsByType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        const percentage = ((count / dbStats.totalQuestionsInDB) * 100).toFixed(1);
        console.log(`${type.padEnd(20)} ${count.toLocaleString().padStart(8)} (${percentage}%)`);
      });
    console.log();
    
    // Display Bloom's taxonomy distribution
    console.log('🧠 BLOOM\'S TAXONOMY DISTRIBUTION');
    console.log('-'.repeat(30));
    Object.entries(dbStats.questionsByBloomsLevel)
      .sort(([,a], [,b]) => b - a)
      .forEach(([level, count]) => {
        const percentage = ((count / dbStats.totalQuestionsInDB) * 100).toFixed(1);
        console.log(`${level.padEnd(15)} ${count.toLocaleString().padStart(8)} (${percentage}%)`);
      });
    console.log();
    
    // Display system health
    console.log('🖥️  SYSTEM HEALTH');
    console.log('-'.repeat(30));
    console.log(`Memory Usage: ${Math.round(systemHealth.memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(systemHealth.memoryUsage.heapTotal / 1024 / 1024)}MB`);
    console.log(`RSS Memory: ${Math.round(systemHealth.memoryUsage.rss / 1024 / 1024)}MB`);
    console.log(`Uptime: ${Math.round(systemHealth.uptime / 60)} minutes`);
    console.log();
    
    // Display projections
    if (dbStats.averageGenerationRate > 0) {
      const remaining = 1000000 - dbStats.totalQuestionsInDB;
      const estimatedMinutes = remaining / dbStats.averageGenerationRate;
      const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000);
      
      console.log('🎯 PROJECTIONS');
      console.log('-'.repeat(30));
      console.log(`Questions Remaining: ${remaining.toLocaleString()}`);
      console.log(`Estimated Time to 1M: ${Math.round(estimatedMinutes)} minutes (${Math.round(estimatedMinutes / 60)} hours)`);
      console.log(`Estimated Completion: ${estimatedCompletion.toLocaleString()}`);
      console.log();
    }
    
    // Display status indicators
    console.log('🚦 STATUS INDICATORS');
    console.log('-'.repeat(30));
    
    if (dbStats.recentQuestions > 0) {
      console.log('✅ Generation is ACTIVE');
    } else {
      console.log('⏸️  Generation appears PAUSED or STOPPED');
    }
    
    if (systemHealth.memoryUsage.heapUsed < 500 * 1024 * 1024) {
      console.log('✅ Memory usage is HEALTHY');
    } else {
      console.log('⚠️  Memory usage is HIGH');
    }
    
    if (dbStats.averageGenerationRate > 50) {
      console.log('✅ Generation rate is GOOD');
    } else if (dbStats.averageGenerationRate > 10) {
      console.log('⚠️  Generation rate is MODERATE');
    } else {
      console.log('🐌 Generation rate is SLOW');
    }
    
  } catch (error) {
    console.error('❌ Error displaying dashboard:', error);
  }
}

/**
 * Continuous monitoring mode
 */
async function startMonitoring(intervalSeconds: number = 30): Promise<void> {
  console.log(`🔄 Starting continuous monitoring (updates every ${intervalSeconds} seconds)`);
  console.log('Press Ctrl+C to stop monitoring\n');
  
  const monitor = async () => {
    await displayDashboard();
    console.log(`\n🔄 Next update in ${intervalSeconds} seconds...`);
  };
  
  // Initial display
  await monitor();
  
  // Set up interval
  const interval = setInterval(monitor, intervalSeconds * 1000);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n👋 Monitoring stopped');
    process.exit(0);
  });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'dashboard';
  
  try {
    switch (command) {
      case 'dashboard':
        await displayDashboard();
        break;
        
      case 'monitor':
        const interval = parseInt(args[1]) || 30;
        await startMonitoring(interval);
        break;
        
      case 'stats':
        const stats = await getDatabaseStats();
        console.log(JSON.stringify(stats, null, 2));
        break;
        
      default:
        console.log('Usage:');
        console.log('  npx tsx scripts/monitor-question-generation.ts dashboard  # Show current status');
        console.log('  npx tsx scripts/monitor-question-generation.ts monitor [interval]  # Continuous monitoring');
        console.log('  npx tsx scripts/monitor-question-generation.ts stats     # Raw statistics JSON');
    }
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { getDatabaseStats, displayDashboard, startMonitoring, type GenerationStats, type SystemHealth };
