#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * 
 * This script analyzes the bundle size and provides insights on optimization opportunities.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📊 FabriiQ Bundle Analysis');
console.log('==========================');

// Check if build exists
const buildDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(buildDir)) {
  console.log('❌ No build found. Running build first...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Analyze bundle size
function analyzeBundleSize() {
  console.log('\n📦 Bundle Size Analysis');
  console.log('========================');
  
  try {
    // Get build info
    const buildManifest = path.join(buildDir, 'build-manifest.json');
    if (fs.existsSync(buildManifest)) {
      const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
      
      console.log('📄 Pages and their bundles:');
      Object.entries(manifest.pages).forEach(([page, files]) => {
        console.log(`  ${page}:`);
        files.forEach(file => {
          const filePath = path.join(buildDir, 'static', file);
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`    - ${file} (${sizeKB} KB)`);
          }
        });
      });
    }
    
    // Analyze static chunks
    const staticDir = path.join(buildDir, 'static', 'chunks');
    if (fs.existsSync(staticDir)) {
      console.log('\n📊 Static Chunks:');
      const chunks = fs.readdirSync(staticDir)
        .filter(file => file.endsWith('.js'))
        .map(file => {
          const filePath = path.join(staticDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            sizeKB: (stats.size / 1024).toFixed(2),
          };
        })
        .sort((a, b) => b.size - a.size);
      
      chunks.slice(0, 10).forEach(chunk => {
        console.log(`  ${chunk.name}: ${chunk.sizeKB} KB`);
      });
      
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log(`\n📈 Total chunk size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
  } catch (error) {
    console.error('❌ Error analyzing bundle:', error.message);
  }
}

// Check for optimization opportunities
function checkOptimizationOpportunities() {
  console.log('\n🔍 Optimization Opportunities');
  console.log('==============================');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Check for heavy dependencies
  const heavyDependencies = [
    '@tiptap/react',
    '@tiptap/starter-kit',
    'framer-motion',
    'react-beautiful-dnd',
    '@radix-ui/react-dialog',
    '@radix-ui/react-select',
    'lucide-react',
  ];
  
  console.log('📚 Heavy dependencies in use:');
  heavyDependencies.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`  ✅ ${dep} (${dependencies[dep]})`);
    }
  });
  
  // Check for potential duplicates
  const potentialDuplicates = [
    ['@radix-ui/react-icons', 'lucide-react'],
    ['@tiptap/react', '@udecode/plate'],
    ['react-beautiful-dnd', '@dnd-kit/core'],
  ];
  
  console.log('\n🔄 Potential duplicate libraries:');
  potentialDuplicates.forEach(([lib1, lib2]) => {
    const has1 = dependencies[lib1];
    const has2 = dependencies[lib2];
    if (has1 && has2) {
      console.log(`  ⚠️  Both ${lib1} and ${lib2} are installed`);
    } else if (has1 || has2) {
      console.log(`  ✅ Only ${has1 ? lib1 : lib2} is installed`);
    }
  });
}

// Provide optimization recommendations
function provideRecommendations() {
  console.log('\n💡 Optimization Recommendations');
  console.log('================================');
  
  console.log('1. 📦 Bundle Splitting:');
  console.log('   - Vendor chunks are separated for better caching');
  console.log('   - React libraries are in separate chunks');
  console.log('   - UI libraries are grouped together');
  
  console.log('\n2. 🌳 Tree Shaking:');
  console.log('   - Import only needed components from libraries');
  console.log('   - Use dynamic imports for heavy components');
  console.log('   - Remove unused dependencies');
  
  console.log('\n3. 📱 Code Splitting:');
  console.log('   - Use Next.js dynamic imports for route-based splitting');
  console.log('   - Lazy load non-critical components');
  console.log('   - Split activity editors by type');
  
  console.log('\n4. 🎯 Further Optimizations:');
  console.log('   - Enable gzip/brotli compression');
  console.log('   - Use CDN for static assets');
  console.log('   - Implement service worker for caching');
  console.log('   - Consider using lighter alternatives for heavy libraries');
}

// Run analysis
function runAnalysis() {
  analyzeBundleSize();
  checkOptimizationOpportunities();
  provideRecommendations();
  
  console.log('\n🚀 Next Steps:');
  console.log('===============');
  console.log('1. Run `npm run build` to see the latest bundle sizes');
  console.log('2. Use `npm run analyze` to get detailed bundle analysis');
  console.log('3. Monitor bundle size changes after dependency updates');
  console.log('4. Consider using webpack-bundle-analyzer for visual analysis');
}

// Install bundle analyzer if not present
function installBundleAnalyzer() {
  try {
    require.resolve('@next/bundle-analyzer');
    console.log('✅ Bundle analyzer is available');
    return true;
  } catch (error) {
    console.log('📦 Installing bundle analyzer...');
    try {
      execSync('npm install --save-dev @next/bundle-analyzer', { stdio: 'inherit' });
      console.log('✅ Bundle analyzer installed');
      return true;
    } catch (installError) {
      console.log('⚠️  Could not install bundle analyzer:', installError.message);
      return false;
    }
  }
}

// Main execution
if (require.main === module) {
  runAnalysis();
  
  if (installBundleAnalyzer()) {
    console.log('\n📊 To get visual bundle analysis, run:');
    console.log('   ANALYZE=true npm run build');
  }
}
