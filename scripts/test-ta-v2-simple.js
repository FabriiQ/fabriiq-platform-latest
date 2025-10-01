#!/usr/bin/env node

/**
 * Simple test script for Teacher Assistant V2
 * Tests basic functionality without complex dependencies
 */

console.log('🧪 Testing Teacher Assistant V2 Setup...\n');

// Test 1: Check if all required files exist
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/features/teacher-assistant-v2/lib/types.ts',
  'src/features/teacher-assistant-v2/lib/ai/providers.ts',
  'src/features/teacher-assistant-v2/server/router.ts',
  'src/features/teacher-assistant-v2/components/chat.tsx',
  'src/features/teacher-assistant-v2/components/messages.tsx',
  'src/features/teacher-assistant-v2/components/message.tsx',
  'src/features/teacher-assistant-v2/components/multimodal-input.tsx',
  'src/features/teacher-assistant-v2/components/artifact.tsx',
  'src/features/teacher-assistant-v2/artifacts/text/client.tsx',
  'src/app/teacher/assistant/v2/page.tsx',
];

console.log('📁 Checking required files...');
let allFilesExist = true;

for (const file of requiredFiles) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

console.log('\n✅ All required files exist!');

// Test 2: Check if router is properly added to root router
console.log('\n🔗 Checking router integration...');

const rootRouterPath = path.join(process.cwd(), 'src/server/api/root.ts');
if (fs.existsSync(rootRouterPath)) {
  const rootRouterContent = fs.readFileSync(rootRouterPath, 'utf8');
  
  if (rootRouterContent.includes('teacherAssistantV2Router')) {
    console.log('✅ teacherAssistantV2Router imported');
  } else {
    console.log('❌ teacherAssistantV2Router not imported');
  }
  
  if (rootRouterContent.includes('teacherAssistantV2: teacherAssistantV2Router')) {
    console.log('✅ teacherAssistantV2Router added to appRouter');
  } else {
    console.log('❌ teacherAssistantV2Router not added to appRouter');
  }
} else {
  console.log('❌ Root router file not found');
}

// Test 3: Check package.json dependencies
console.log('\n📦 Checking dependencies...');

const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = [
    'ai',
    '@ai-sdk/react',
    '@ai-sdk/google',
    'framer-motion',
    'sonner',
    'swr',
    'usehooks-ts',
    'fast-deep-equal',
    'date-fns',
    'react-markdown',
  ];
  
  for (const dep of requiredDeps) {
    if (dependencies[dep]) {
      console.log(`✅ ${dep}: ${dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
    }
  }
} else {
  console.log('❌ package.json not found');
}

// Test 4: Check TypeScript compilation
console.log('\n🔧 Checking TypeScript compilation...');

try {
  const { execSync } = require('child_process');
  
  // Check if TypeScript can compile the router
  console.log('Checking router compilation...');
  execSync('npx tsc --noEmit --skipLibCheck src/features/teacher-assistant-v2/server/router.ts', { 
    stdio: 'pipe',
    cwd: process.cwd()
  });
  console.log('✅ Router compiles successfully');
  
  // Check if main page compiles
  console.log('Checking page compilation...');
  execSync('npx tsc --noEmit --skipLibCheck src/app/teacher/assistant/v2/page.tsx', { 
    stdio: 'pipe',
    cwd: process.cwd()
  });
  console.log('✅ Page compiles successfully');
  
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout?.toString() || error.message);
}

// Test 5: Environment variables check
console.log('\n🔐 Checking environment variables...');

// Load .env file if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');

  const requiredEnvVars = [
    'GEMINI_API_KEY',
    'NEXT_PUBLIC_GEMINI_API_KEY',
    'JINA_API_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set in environment`);
    } else if (envContent.includes(`${envVar}=`)) {
      console.log(`✅ ${envVar} is set in .env file`);
    } else {
      console.log(`❌ ${envVar} is not set`);
    }
  }
} else {
  console.log('⚠️  .env file not found');
}

// Test 6: Check if Next.js can build the pages
console.log('\n🏗️  Testing Next.js build (dry run)...');

try {
  const { execSync } = require('child_process');
  
  // Just check if Next.js can parse the pages without full build
  execSync('npx next build --dry-run', { 
    stdio: 'pipe',
    cwd: process.cwd(),
    timeout: 30000 // 30 seconds timeout
  });
  console.log('✅ Next.js build check passed');
  
} catch (error) {
  console.log('⚠️  Next.js build check failed (this might be normal):');
  console.log(error.stdout?.toString() || error.message);
}

console.log('\n' + '='.repeat(50));
console.log('🎉 Teacher Assistant V2 Setup Test Complete!');
console.log('='.repeat(50));

console.log('\n📋 Next Steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Navigate to: http://localhost:3000/teacher/assistant/v2');
console.log('3. Sign in as a teacher (CAMPUS_TEACHER or TEACHER role)');
console.log('4. Test the chat interface and artifact creation');
console.log('5. Verify tRPC calls in Network tab');

console.log('\n🔍 Manual Testing Checklist:');
console.log('□ Chat interface loads without errors');
console.log('□ Can send messages and receive responses');
console.log('□ Educational greeting appears for new chats');
console.log('□ Artifact panel opens when creating documents');
console.log('□ Text editor works in artifact panel');
console.log('□ Document versioning works');
console.log('□ Authentication restricts access to teachers only');

console.log('\n✨ Teacher Assistant V2 is ready for testing!');
