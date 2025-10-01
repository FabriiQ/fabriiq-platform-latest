/**
 * Test script to verify quiz activity registration
 * Run this in the browser console to test if quiz activity type is registered
 */

// Test function to check if quiz activity is registered
function testQuizRegistration() {
  console.log('Testing Quiz Activity Registration...');
  
  try {
    // Try to import the activity registry
    import('/src/features/activties/registry/index.js').then(({ activityRegistry }) => {
      console.log('Activity Registry loaded successfully');
      
      // Check if quiz activity is registered
      const quizActivity = activityRegistry.get('quiz');
      
      if (quizActivity) {
        console.log('✅ Quiz activity is registered!');
        console.log('Quiz Activity Details:', {
          id: quizActivity.id,
          name: quizActivity.name,
          description: quizActivity.description,
          category: quizActivity.category,
          subCategory: quizActivity.subCategory,
          capabilities: quizActivity.capabilities
        });
        
        // Test if components are available
        if (quizActivity.components.editor) {
          console.log('✅ Quiz Editor component is available');
        } else {
          console.log('❌ Quiz Editor component is missing');
        }
        
        if (quizActivity.components.viewer) {
          console.log('✅ Quiz Viewer component is available');
        } else {
          console.log('❌ Quiz Viewer component is missing');
        }
        
        // List all registered activity types
        const allActivities = activityRegistry.getAll();
        console.log('All registered activity types:', allActivities.map(a => ({ id: a.id, name: a.name })));
        
      } else {
        console.log('❌ Quiz activity is NOT registered');
        
        // List all registered activity types for debugging
        const allActivities = activityRegistry.getAll();
        console.log('Available activity types:', allActivities.map(a => ({ id: a.id, name: a.name })));
      }
    }).catch(error => {
      console.error('Failed to load activity registry:', error);
    });
    
  } catch (error) {
    console.error('Error testing quiz registration:', error);
  }
}

// Test function to check ActivityTypeSelectorGrid
function testActivityTypeSelectorGrid() {
  console.log('Testing ActivityTypeSelectorGrid...');

  try {
    import('/src/features/activties/components/ActivityTypeSelectorGrid.js').then((module) => {
      console.log('ActivityTypeSelectorGrid loaded successfully');

      // Try to access ACTIVITY_TYPES from the module
      const ACTIVITY_TYPES = module.ACTIVITY_TYPES || module.default?.ACTIVITY_TYPES;

      if (ACTIVITY_TYPES) {
        // Check if quiz is in the activity types
        const quizType = ACTIVITY_TYPES.find(type => type.id === 'quiz');

        if (quizType) {
          console.log('✅ Quiz is available in ActivityTypeSelectorGrid');
          console.log('Quiz Type Details:', quizType);
        } else {
          console.log('❌ Quiz is NOT available in ActivityTypeSelectorGrid');
          console.log('Available types:', ACTIVITY_TYPES.map(t => ({ id: t.id, name: t.name })));
        }
      } else {
        console.log('❌ Could not access ACTIVITY_TYPES from module');
        console.log('Module exports:', Object.keys(module));
      }
    }).catch(error => {
      console.error('Failed to load ActivityTypeSelectorGrid:', error);
    });

  } catch (error) {
    console.error('Error testing ActivityTypeSelectorGrid:', error);
  }
}

// Test function to check if quiz components can be loaded
function testQuizComponents() {
  console.log('Testing Quiz Components...');

  // Test QuizEditor
  import('/src/features/activties/components/quiz/QuizEditor.js').then((module) => {
    console.log('✅ QuizEditor component loaded successfully');
    console.log('QuizEditor exports:', Object.keys(module));
  }).catch(error => {
    console.error('❌ Failed to load QuizEditor:', error);
  });

  // Test QuizViewer
  import('/src/features/activties/components/quiz/QuizViewer.js').then((module) => {
    console.log('✅ QuizViewer component loaded successfully');
    console.log('QuizViewer exports:', Object.keys(module));
  }).catch(error => {
    console.error('❌ Failed to load QuizViewer:', error);
  });
}

// Run tests
console.log('Starting Quiz Activity Registration Tests...');
testQuizRegistration();
testActivityTypeSelectorGrid();
testQuizComponents();

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testQuizRegistration = testQuizRegistration;
  window.testActivityTypeSelectorGrid = testActivityTypeSelectorGrid;
  window.testQuizComponents = testQuizComponents;
  console.log('Test functions available as:');
  console.log('- window.testQuizRegistration()');
  console.log('- window.testActivityTypeSelectorGrid()');
  console.log('- window.testQuizComponents()');
}
