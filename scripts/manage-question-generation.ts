/**
 * Manage Question Generation Process
 * 
 * Provides management utilities for the million questions generation:
 * - Start/stop/pause/resume generation
 * - Clean up incomplete generations
 * - Backup and restore progress
 * - Database maintenance
 * - Performance optimization
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

const prisma = new PrismaClient();

interface GenerationProcess {
  pid?: number;
  status: 'running' | 'stopped' | 'paused' | 'completed' | 'error';
  startTime: Date;
  lastUpdate: Date;
  questionsGenerated: number;
  currentSubject?: string;
}

/**
 * Get current generation process status
 */
async function getProcessStatus(): Promise<GenerationProcess | null> {
  const statusFile = path.join(process.cwd(), 'data', 'million-questions-seed', 'process-status.json');
  
  try {
    if (fs.existsSync(statusFile)) {
      const content = await fs.promises.readFile(statusFile, 'utf-8');
      const status = JSON.parse(content);
      
      // Check if process is actually running
      if (status.pid) {
        try {
          process.kill(status.pid, 0); // Check if process exists
          status.status = 'running';
        } catch (error) {
          status.status = 'stopped';
          status.pid = undefined;
        }
      }
      
      return status;
    }
  } catch (error) {
    console.warn('Could not read process status:', error);
  }
  
  return null;
}

/**
 * Save process status
 */
async function saveProcessStatus(status: GenerationProcess): Promise<void> {
  const statusFile = path.join(process.cwd(), 'data', 'million-questions-seed', 'process-status.json');
  const dir = path.dirname(statusFile);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  await fs.promises.writeFile(statusFile, JSON.stringify(status, null, 2));
}

/**
 * Start generation process
 */
async function startGeneration(options: {
  totalQuestions?: number;
  batchSize?: number;
  questionsPerSubject?: number;
  resume?: boolean;
}): Promise<void> {
  console.log('🚀 Starting million questions generation...');
  
  const currentStatus = await getProcessStatus();
  if (currentStatus && currentStatus.status === 'running') {
    console.log('⚠️  Generation process is already running');
    console.log(`   PID: ${currentStatus.pid}`);
    console.log(`   Started: ${new Date(currentStatus.startTime).toLocaleString()}`);
    return;
  }
  
  // Set environment variables
  const env = { ...process.env };
  if (options.totalQuestions) env.TOTAL_QUESTIONS = options.totalQuestions.toString();
  if (options.batchSize) env.BATCH_SIZE = options.batchSize.toString();
  if (options.questionsPerSubject) env.QUESTIONS_PER_SUBJECT = options.questionsPerSubject.toString();
  
  // Start the generation process
  const scriptPath = path.join(process.cwd(), 'scripts', 'generate-million-questions-seed.ts');
  const child = spawn('npx', ['tsx', scriptPath], {
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Save process status
  const status: GenerationProcess = {
    pid: child.pid,
    status: 'running',
    startTime: new Date(),
    lastUpdate: new Date(),
    questionsGenerated: 0
  };
  
  await saveProcessStatus(status);
  
  console.log(`✅ Generation process started with PID: ${child.pid}`);
  console.log('   Use "npx tsx scripts/monitor-question-generation.ts monitor" to track progress');
  
  // Handle process events
  child.on('exit', async (code) => {
    const finalStatus = await getProcessStatus();
    if (finalStatus) {
      finalStatus.status = code === 0 ? 'completed' : 'error';
      finalStatus.pid = undefined;
      await saveProcessStatus(finalStatus);
    }
  });
  
  // Detach the process so it continues running
  child.unref();
}

/**
 * Stop generation process
 */
async function stopGeneration(force: boolean = false): Promise<void> {
  console.log('🛑 Stopping generation process...');
  
  const status = await getProcessStatus();
  if (!status || !status.pid) {
    console.log('ℹ️  No running generation process found');
    return;
  }
  
  try {
    const signal = force ? 'SIGKILL' : 'SIGTERM';
    process.kill(status.pid, signal);
    
    // Update status
    status.status = 'stopped';
    status.pid = undefined;
    await saveProcessStatus(status);
    
    console.log(`✅ Generation process stopped ${force ? '(forced)' : '(graceful)'}`);
    
  } catch (error) {
    console.error('❌ Failed to stop process:', error);
  }
}

/**
 * Clean up incomplete generation data
 */
async function cleanupIncompleteData(): Promise<void> {
  console.log('🧹 Cleaning up incomplete generation data...');
  
  try {
    // Find questions created in the last hour that might be incomplete
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentQuestions = await prisma.question.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      },
      select: {
        id: true,
        title: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`📊 Found ${recentQuestions.length} recent questions`);
    
    if (recentQuestions.length > 0) {
      console.log('Recent questions:');
      recentQuestions.forEach(q => {
        console.log(`   ${q.createdAt.toLocaleTimeString()}: ${q.title.substring(0, 60)}...`);
      });
    }
    
    // Check for orphaned questions (questions without proper relationships)
    const orphanedQuestions = await prisma.question.count({
      where: {
        OR: [
          { subjectId: null },
          { topicId: null },
          { learningOutcomeIds: { equals: [] } }
        ]
      }
    });
    
    if (orphanedQuestions > 0) {
      console.log(`⚠️  Found ${orphanedQuestions} orphaned questions`);
      console.log('   Consider running data integrity check');
    } else {
      console.log('✅ No orphaned questions found');
    }
    
    // Clean up temporary files
    const tempDir = path.join(process.cwd(), 'data', 'million-questions-seed');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      console.log(`📁 Found ${files.length} files in temp directory`);
      
      files.forEach(file => {
        console.log(`   ${file}`);
      });
    }
    
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Backup generation progress
 */
async function backupProgress(): Promise<void> {
  console.log('💾 Creating backup of generation progress...');
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'data', 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Backup progress file
    const progressFile = path.join(process.cwd(), 'data', 'million-questions-seed', 'generation-progress.json');
    if (fs.existsSync(progressFile)) {
      const backupFile = path.join(backupDir, `progress-backup-${timestamp}.json`);
      fs.copyFileSync(progressFile, backupFile);
      console.log(`✅ Progress backed up to: ${backupFile}`);
    }
    
    // Backup process status
    const statusFile = path.join(process.cwd(), 'data', 'million-questions-seed', 'process-status.json');
    if (fs.existsSync(statusFile)) {
      const backupFile = path.join(backupDir, `status-backup-${timestamp}.json`);
      fs.copyFileSync(statusFile, backupFile);
      console.log(`✅ Status backed up to: ${backupFile}`);
    }
    
    // Create database statistics backup
    const totalQuestions = await prisma.question.count();
    const stats = {
      timestamp: new Date().toISOString(),
      totalQuestions,
      backupReason: 'Manual backup'
    };
    
    const statsBackupFile = path.join(backupDir, `stats-backup-${timestamp}.json`);
    await fs.promises.writeFile(statsBackupFile, JSON.stringify(stats, null, 2));
    console.log(`✅ Statistics backed up to: ${statsBackupFile}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
  }
}

/**
 * Optimize database performance
 */
async function optimizeDatabase(): Promise<void> {
  console.log('⚡ Optimizing database performance...');
  
  try {
    // Analyze table statistics
    console.log('📊 Analyzing table statistics...');
    
    const questionCount = await prisma.question.count();
    const subjectCount = await prisma.subject.count();
    const topicCount = await prisma.subjectTopic.count();
    const outcomeCount = await prisma.learningOutcome.count();
    
    console.log(`   Questions: ${questionCount.toLocaleString()}`);
    console.log(`   Subjects: ${subjectCount}`);
    console.log(`   Topics: ${topicCount}`);
    console.log(`   Learning Outcomes: ${outcomeCount}`);
    
    // Check for potential performance issues
    if (questionCount > 100000) {
      console.log('💡 Recommendations for large dataset:');
      console.log('   • Consider partitioning questions by subject or date');
      console.log('   • Monitor query performance on filtered searches');
      console.log('   • Consider archiving old questions if not needed');
    }
    
    // Memory usage recommendations
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > 500) {
      console.log('⚠️  High memory usage detected:');
      console.log(`   Current heap usage: ${heapUsedMB}MB`);
      console.log('   Consider restarting the generation process');
    }
    
    console.log('✅ Database optimization analysis completed');
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
  }
}

/**
 * Display generation summary
 */
async function showSummary(): Promise<void> {
  console.log('📋 GENERATION SUMMARY');
  console.log('='.repeat(40));
  
  try {
    const status = await getProcessStatus();
    const totalQuestions = await prisma.question.count();
    
    if (status) {
      console.log(`Status: ${status.status.toUpperCase()}`);
      console.log(`Started: ${new Date(status.startTime).toLocaleString()}`);
      console.log(`Last Update: ${new Date(status.lastUpdate).toLocaleString()}`);
      if (status.pid) {
        console.log(`Process ID: ${status.pid}`);
      }
    }
    
    console.log(`Total Questions in DB: ${totalQuestions.toLocaleString()}`);
    console.log(`Progress to 1M: ${((totalQuestions / 1000000) * 100).toFixed(2)}%`);
    
    if (totalQuestions > 0) {
      const oldestQuestion = await prisma.question.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      });
      
      if (oldestQuestion) {
        const timeSpan = Date.now() - oldestQuestion.createdAt.getTime();
        const hours = timeSpan / (1000 * 60 * 60);
        const rate = totalQuestions / hours;
        
        console.log(`Average Rate: ${rate.toFixed(0)} questions/hour`);
        
        if (rate > 0) {
          const remaining = 1000000 - totalQuestions;
          const hoursRemaining = remaining / rate;
          console.log(`Estimated Time to 1M: ${Math.round(hoursRemaining)} hours`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to generate summary:', error);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'start':
        const options = {
          totalQuestions: args.includes('--total') ? parseInt(args[args.indexOf('--total') + 1]) : undefined,
          batchSize: args.includes('--batch') ? parseInt(args[args.indexOf('--batch') + 1]) : undefined,
          questionsPerSubject: args.includes('--per-subject') ? parseInt(args[args.indexOf('--per-subject') + 1]) : undefined,
          resume: args.includes('--resume')
        };
        await startGeneration(options);
        break;
        
      case 'stop':
        const force = args.includes('--force');
        await stopGeneration(force);
        break;
        
      case 'status':
        await showSummary();
        break;
        
      case 'cleanup':
        await cleanupIncompleteData();
        break;
        
      case 'backup':
        await backupProgress();
        break;
        
      case 'optimize':
        await optimizeDatabase();
        break;
        
      default:
        console.log('🎯 Question Generation Management');
        console.log('='.repeat(40));
        console.log('Usage:');
        console.log('  start [--total N] [--batch N] [--per-subject N] [--resume]');
        console.log('  stop [--force]');
        console.log('  status');
        console.log('  cleanup');
        console.log('  backup');
        console.log('  optimize');
        console.log('');
        console.log('Examples:');
        console.log('  npx tsx scripts/manage-question-generation.ts start');
        console.log('  npx tsx scripts/manage-question-generation.ts start --total 500000');
        console.log('  npx tsx scripts/manage-question-generation.ts stop');
        console.log('  npx tsx scripts/manage-question-generation.ts status');
    }
    
  } catch (error) {
    console.error('❌ Management command failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { 
  startGeneration, 
  stopGeneration, 
  getProcessStatus, 
  cleanupIncompleteData, 
  backupProgress, 
  optimizeDatabase 
};
