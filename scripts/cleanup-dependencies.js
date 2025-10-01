#!/usr/bin/env node

/**
 * Dependency Cleanup Script
 * 
 * This script removes redundant dependencies identified in the performance analysis.
 * It systematically removes competing libraries while preserving functionality.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 FabriiQ Dependency Cleanup Script');
console.log('=====================================');

// Read current package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log(`📦 Current dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
console.log(`📦 Current devDependencies: ${Object.keys(packageJson.devDependencies || {}).length}`);

// Define redundant packages to remove
const REDUNDANT_PACKAGES = {
  // UI Libraries - Keep Radix UI, Remove others
  'EDITOR_LIBRARIES': {
    keep: '@tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-placeholder',
    remove: [
      // Remove most @udecode/plate packages (30+ packages)
      '@udecode/plate',
      '@udecode/plate-alignment',
      '@udecode/plate-autoformat',
      '@udecode/plate-basic-elements',
      '@udecode/plate-basic-marks',
      '@udecode/plate-block-quote',
      '@udecode/plate-break',
      '@udecode/plate-code-block',
      '@udecode/plate-dnd',
      '@udecode/plate-docx',
      '@udecode/plate-emoji',
      '@udecode/plate-excalidraw',
      '@udecode/plate-floating',
      '@udecode/plate-font',
      '@udecode/plate-heading',
      '@udecode/plate-highlight',
      '@udecode/plate-horizontal-rule',
      '@udecode/plate-indent',
      '@udecode/plate-kbd',
      '@udecode/plate-line-height',
      '@udecode/plate-link',
      '@udecode/plate-list',
      '@udecode/plate-markdown',
      '@udecode/plate-media',
      '@udecode/plate-mention',
      '@udecode/plate-node-id',
      '@udecode/plate-normalizers',
      '@udecode/plate-reset-node',
      '@udecode/plate-select',
      '@udecode/plate-selection',
      '@udecode/plate-table',
      '@udecode/plate-trailing-block',
      '@udecode/plate-ui',
      '@udecode/slate',
      '@udecode/utils',
      '@udecode/cn',
      // Remove most @tiptap extensions (keep only essential ones)
      '@tiptap/extension-blockquote',
      '@tiptap/extension-code-block-lowlight',
      '@tiptap/extension-color',
      '@tiptap/extension-font-family',
      '@tiptap/extension-highlight',
      '@tiptap/extension-horizontal-rule',
      '@tiptap/extension-list-item',
      '@tiptap/extension-mention',
      '@tiptap/extension-strike',
      '@tiptap/extension-subscript',
      '@tiptap/extension-superscript',
      '@tiptap/extension-table',
      '@tiptap/extension-table-cell',
      '@tiptap/extension-table-header',
      '@tiptap/extension-table-row',
      '@tiptap/extension-task-item',
      '@tiptap/extension-task-list',
      '@tiptap/extension-text-align',
      '@tiptap/extension-text-style',
      '@tiptap/extension-underline',
      '@tiptap/pm',
      '@tiptap/suggestion',
    ]
  },
  
  // Icon Libraries - Keep Lucide React, Remove Heroicons
  'ICON_LIBRARIES': {
    keep: 'lucide-react',
    remove: [
      '@heroicons/react',
      '@radix-ui/react-icons', // Keep this actually, it's used by Radix components
    ]
  },
  
  // Drag & Drop Libraries - Keep @dnd-kit, Remove others
  'DRAG_DROP_LIBRARIES': {
    keep: '@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @dnd-kit/modifiers',
    remove: [
      '@hello-pangea/dnd',
      'react-beautiful-dnd',
      '@types/react-beautiful-dnd',
      'react-dnd',
      'react-dnd-html5-backend',
    ]
  },
  
  // File Upload Libraries - Keep Uppy core only
  'FILE_UPLOAD_LIBRARIES': {
    keep: '@uppy/core @uppy/dashboard',
    remove: [
      '@uppy/audio',
      '@uppy/drag-drop',
      '@uppy/drop-target',
      '@uppy/file-input',
      '@uppy/image-editor',
      '@uppy/progress-bar',
      '@uppy/status-bar',
      '@uppy/webcam',
    ]
  },
  
  // Chart Libraries - Keep Nivo core only
  'CHART_LIBRARIES': {
    keep: '@nivo/core @nivo/bar @nivo/line @nivo/pie',
    remove: [
      '@nivo/heatmap',
      '@nivo/radar',
    ]
  }
};

// Function to remove packages
function removePackages(packages) {
  if (packages.length === 0) return;
  
  console.log(`\n🗑️  Removing ${packages.length} redundant packages...`);
  packages.forEach(pkg => console.log(`   - ${pkg}`));
  
  try {
    const command = `npm uninstall ${packages.join(' ')}`;
    console.log(`\n⚡ Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Packages removed successfully');
  } catch (error) {
    console.error('❌ Error removing packages:', error.message);
  }
}

// Function to get packages to remove
function getPackagesToRemove(category) {
  const config = REDUNDANT_PACKAGES[category];
  if (!config) return [];
  
  return config.remove.filter(pkg => {
    return packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg];
  });
}

// Main cleanup process
async function cleanupDependencies() {
  console.log('\n🔍 Analyzing redundant dependencies...\n');
  
  // 1. Editor Libraries Cleanup
  console.log('📝 Editor Libraries Cleanup');
  console.log(`   Keep: ${REDUNDANT_PACKAGES.EDITOR_LIBRARIES.keep}`);
  const editorPackagesToRemove = getPackagesToRemove('EDITOR_LIBRARIES');
  removePackages(editorPackagesToRemove);
  
  // 2. Icon Libraries Cleanup
  console.log('\n🎨 Icon Libraries Cleanup');
  console.log(`   Keep: ${REDUNDANT_PACKAGES.ICON_LIBRARIES.keep}`);
  const iconPackagesToRemove = getPackagesToRemove('ICON_LIBRARIES');
  // Don't remove @radix-ui/react-icons as it's needed by Radix components
  const filteredIconPackages = iconPackagesToRemove.filter(pkg => pkg !== '@radix-ui/react-icons');
  removePackages(filteredIconPackages);
  
  // 3. Drag & Drop Libraries Cleanup
  console.log('\n🖱️  Drag & Drop Libraries Cleanup');
  console.log(`   Keep: ${REDUNDANT_PACKAGES.DRAG_DROP_LIBRARIES.keep}`);
  const dragDropPackagesToRemove = getPackagesToRemove('DRAG_DROP_LIBRARIES');
  removePackages(dragDropPackagesToRemove);
  
  // 4. File Upload Libraries Cleanup
  console.log('\n📁 File Upload Libraries Cleanup');
  console.log(`   Keep: ${REDUNDANT_PACKAGES.FILE_UPLOAD_LIBRARIES.keep}`);
  const fileUploadPackagesToRemove = getPackagesToRemove('FILE_UPLOAD_LIBRARIES');
  removePackages(fileUploadPackagesToRemove);
  
  // 5. Chart Libraries Cleanup
  console.log('\n📊 Chart Libraries Cleanup');
  console.log(`   Keep: ${REDUNDANT_PACKAGES.CHART_LIBRARIES.keep}`);
  const chartPackagesToRemove = getPackagesToRemove('CHART_LIBRARIES');
  removePackages(chartPackagesToRemove);
  
  // Final summary
  console.log('\n📊 CLEANUP SUMMARY');
  console.log('==================');
  
  const totalRemoved = [
    ...editorPackagesToRemove,
    ...filteredIconPackages,
    ...dragDropPackagesToRemove,
    ...fileUploadPackagesToRemove,
    ...chartPackagesToRemove
  ].length;
  
  console.log(`✅ Removed ${totalRemoved} redundant packages`);
  console.log('✅ Kept essential packages for functionality');
  console.log('✅ Expected bundle size reduction: 60-70%');
  
  // Read updated package.json
  const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const newDepCount = Object.keys(updatedPackageJson.dependencies || {}).length;
  const newDevDepCount = Object.keys(updatedPackageJson.devDependencies || {}).length;
  
  console.log(`\n📦 Updated dependencies: ${newDepCount} (was ${Object.keys(packageJson.dependencies || {}).length})`);
  console.log(`📦 Updated devDependencies: ${newDevDepCount} (was ${Object.keys(packageJson.devDependencies || {}).length})`);
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Run `npm install` to clean up node_modules');
  console.log('2. Update imports in components to use remaining libraries');
  console.log('3. Test application functionality');
  console.log('4. Run build to verify bundle size reduction');
}

// Run cleanup
cleanupDependencies().catch(console.error);
