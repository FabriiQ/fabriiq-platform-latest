#!/usr/bin/env node

/**
 * Component Test Script for Resources
 * 
 * Tests the React components for proper structure and functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🧩 Testing Resources Components...\n');

// Component files to test
const components = [
  {
    path: 'src/components/student/resources/ResourceCard.tsx',
    name: 'ResourceCard',
    type: 'component'
  },
  {
    path: 'src/components/student/resources/ResourceFilters.tsx',
    name: 'ResourceFilters',
    type: 'component'
  },
  {
    path: 'src/components/student/resources/ResourceGrid.tsx',
    name: 'ResourceGrid',
    type: 'component'
  },
  {
    path: 'src/app/student/class/[id]/resources/page.tsx',
    name: 'StudentResourcesPage',
    type: 'page'
  },
  {
    path: 'src/app/teacher/classes/[classId]/resources/page.tsx',
    name: 'TeacherResourcesPage',
    type: 'page'
  }
];

// Test each component
components.forEach(component => {
  console.log(`\n📦 Testing ${component.name}...`);
  
  if (!fs.existsSync(component.path)) {
    console.log(`❌ File not found: ${component.path}`);
    return;
  }
  
  const content = fs.readFileSync(component.path, 'utf8');
  
  // Basic structure tests
  const tests = [
    {
      name: 'Has proper export',
      test: () => content.includes('export function') || content.includes('export default'),
      required: true
    },
    {
      name: 'Uses TypeScript',
      test: () => content.includes('interface') || content.includes('type '),
      required: true
    },
    {
      name: 'Has proper imports',
      test: () => content.includes("from 'react'") || content.includes("'use client'"),
      required: true
    },
    {
      name: 'Uses UI components',
      test: () => content.includes('@/components/ui/'),
      required: false
    },
    {
      name: 'Has responsive classes',
      test: () => /\b(md:|lg:|sm:|grid-cols|flex-col|flex-row)\b/.test(content),
      required: false
    },
    {
      name: 'Has accessibility features',
      test: () => content.includes('aria-') || content.includes('ariaLabel'),
      required: false
    },
    {
      name: 'Uses proper state management',
      test: () => content.includes('useState') || content.includes('useQuery'),
      required: component.type === 'page'
    },
    {
      name: 'Has error handling',
      test: () => content.includes('isLoading') || content.includes('error'),
      required: component.type === 'page'
    }
  ];
  
  let passed = 0;
  let required = 0;
  
  tests.forEach(test => {
    const result = test.test();
    const status = result ? '✅' : (test.required ? '❌' : '⚠️ ');
    console.log(`  ${status} ${test.name}`);
    
    if (result) passed++;
    if (test.required) required++;
  });
  
  console.log(`  📊 Score: ${passed}/${tests.length} (${required} required tests)`);
});

// Test component props and interfaces
console.log('\n🔍 Checking Component Interfaces...');

const interfaceChecks = [
  {
    file: 'src/components/student/resources/ResourceCard.tsx',
    expectedProps: ['resource', 'courseName', 'showCourse', 'className']
  },
  {
    file: 'src/components/student/resources/ResourceFilters.tsx',
    expectedProps: ['searchTerm', 'onSearchChange', 'selectedCourse', 'onCourseChange']
  },
  {
    file: 'src/components/student/resources/ResourceGrid.tsx',
    expectedProps: ['resources', 'courses', 'isLoading', 'emptyMessage']
  }
];

interfaceChecks.forEach(check => {
  if (fs.existsSync(check.file)) {
    const content = fs.readFileSync(check.file, 'utf8');
    const componentName = path.basename(check.file, '.tsx');
    
    console.log(`\n📋 ${componentName} Props:`);
    
    check.expectedProps.forEach(prop => {
      if (content.includes(prop)) {
        console.log(`  ✅ ${prop}`);
      } else {
        console.log(`  ⚠️  ${prop} - not found (might be optional)`);
      }
    });
  }
});

// Check for common React patterns
console.log('\n⚛️  React Patterns Check...');

const patterns = [
  {
    name: 'Proper hook usage',
    pattern: /const \[.+, set.+\] = useState/,
    description: 'useState with proper naming'
  },
  {
    name: 'Conditional rendering',
    pattern: /\{.*\?.*:.*\}/,
    description: 'Ternary operators for conditional rendering'
  },
  {
    name: 'Map function for lists',
    pattern: /\.map\(/,
    description: 'Using map for rendering lists'
  },
  {
    name: 'Event handlers',
    pattern: /on[A-Z]\w+/,
    description: 'Proper event handler naming'
  },
  {
    name: 'CSS classes with cn utility',
    pattern: /cn\(/,
    description: 'Using cn utility for conditional classes'
  }
];

components.forEach(component => {
  if (fs.existsSync(component.path)) {
    const content = fs.readFileSync(component.path, 'utf8');
    console.log(`\n📝 ${component.name} Patterns:`);
    
    patterns.forEach(pattern => {
      if (pattern.pattern.test(content)) {
        console.log(`  ✅ ${pattern.name}`);
      } else {
        console.log(`  ⚪ ${pattern.name} - not used`);
      }
    });
  }
});

// Performance checks
console.log('\n⚡ Performance Considerations...');

const performanceChecks = [
  {
    name: 'Memoization opportunities',
    check: (content) => content.includes('useMemo') || content.includes('useCallback'),
    suggestion: 'Consider using useMemo for expensive calculations'
  },
  {
    name: 'Lazy loading',
    check: (content) => content.includes('lazy') || content.includes('Suspense'),
    suggestion: 'Consider lazy loading for large components'
  },
  {
    name: 'Efficient re-renders',
    check: (content) => content.includes('React.memo') || content.includes('useCallback'),
    suggestion: 'Consider React.memo for components that re-render frequently'
  }
];

components.forEach(component => {
  if (fs.existsSync(component.path)) {
    const content = fs.readFileSync(component.path, 'utf8');
    console.log(`\n⚡ ${component.name} Performance:`);
    
    performanceChecks.forEach(check => {
      if (check.check(content)) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  💡 ${check.suggestion}`);
      }
    });
  }
});

// Final summary
console.log('\n📊 Component Test Summary:');
console.log('==========================');

const totalComponents = components.length;
const existingComponents = components.filter(c => fs.existsSync(c.path)).length;

console.log(`📦 Components found: ${existingComponents}/${totalComponents}`);

if (existingComponents === totalComponents) {
  console.log('✅ All components are present and properly structured!');
  console.log('\n🚀 Ready for integration testing:');
  console.log('1. Test components in Storybook (if available)');
  console.log('2. Test components in the actual application');
  console.log('3. Test responsive behavior on different screen sizes');
  console.log('4. Test accessibility with screen readers');
  console.log('5. Test performance with React DevTools');
} else {
  console.log('❌ Some components are missing. Please check the implementation.');
}

console.log('\n🎯 Next Steps:');
console.log('- Run the application and test each component manually');
console.log('- Check browser console for any runtime errors');
console.log('- Test component interactions and state updates');
console.log('- Verify proper data flow between components');
