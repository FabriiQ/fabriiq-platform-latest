'use client';

import React, { useState } from 'react';
import { MultipleChoiceQuestionViewer } from '@/features/activities-v2/components/quiz/question-viewers/MultipleChoiceQuestionViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeProvider } from '@/providers/theme-provider';

const testQuestion = {
  id: 'test-question-1',
  content: {
    text: 'Based on the learning outcome "Given a short passage, the student will be able to recall the stated main idea with 100% accuracy." in Reading Comprehension, which of the following best demonstrates understanding of Reading Comprehension?',
    options: [
      { id: 'opt1', text: 'Correct answer related to Reading Comprehension', isCorrect: true },
      { id: 'opt2', text: 'Distractor option 1 for Reading Comprehension', isCorrect: false },
      { id: 'opt3', text: 'Distractor option 2 for Reading Comprehension', isCorrect: false },
      { id: 'opt4', text: 'Distractor option 3 for Reading Comprehension', isCorrect: false }
    ],
    explanation: 'This is the correct answer because it directly relates to the learning outcome of recalling the main idea from a passage, which is a fundamental skill in reading comprehension.'
  }
};

export default function TestMCQPage() {
  const [answer, setAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);

  const handleAnswerChange = (newAnswer: string) => {
    console.log('Answer changed to:', newAnswer);
    const selectedOption = testQuestion.content.options.find(opt => opt.id === newAnswer);
    console.log('Selected option:', selectedOption);
    setAnswer(newAnswer);
  };

  const handleSubmit = () => {
    setShowFeedback(true);
  };

  const handleReset = () => {
    setAnswer('');
    setShowFeedback(false);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Multiple Choice Question Viewer Test</CardTitle>
              <p className="text-gray-600">
                This page tests the updated MultipleChoiceQuestionViewer component with enhanced selection features.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!answer || showFeedback}
                    variant="default"
                  >
                    Submit Answer
                  </Button>
                  <Button 
                    onClick={handleReset} 
                    variant="outline"
                  >
                    Reset
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p><strong>Current Answer:</strong> {answer || 'None selected'}</p>
                  <p><strong>Selected Option:</strong> {answer ? testQuestion.content.options.find(opt => opt.id === answer)?.text : 'None'}</p>
                  <p><strong>Feedback Mode:</strong> {showFeedback ? 'On' : 'Off'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary-green text-white rounded-full w-8 h-8 inline-flex items-center justify-center text-sm font-bold">
                  1
                </span>
                Question 1 of 1
                <span className="ml-auto text-sm font-normal text-gray-500">1 point</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MultipleChoiceQuestionViewer
                question={testQuestion}
                answer={answer}
                onAnswerChange={handleAnswerChange}
                showFeedback={showFeedback}
                shuffleOptions={false}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Test Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <p><strong>Multiple Choice Question Tests:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Click on options to select them - should show visual feedback</li>
                    <li>Hover over options - should show hover effects</li>
                    <li>Use keyboard navigation (Tab + Enter/Space)</li>
                    <li>Submit answer to see feedback mode</li>
                    <li>Check that correct/incorrect answers are properly highlighted</li>
                    <li>Verify animations and transitions work smoothly</li>
                    <li>Test on mobile devices for touch interactions</li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <p><strong>Video Viewer Tests:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Video viewers now have minimum height of 400px (increased from 300px)</li>
                    <li>Maximum height increased to 80vh (from 70vh)</li>
                    <li>Check video activities to verify larger video display</li>
                    <li>Verify responsive behavior on different screen sizes</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-green-800 font-medium">✅ Both issues have been fixed:</p>
                  <p className="text-green-700 text-xs mt-1">
                    1. Multiple choice options now respond properly to clicks/touches<br/>
                    2. Video viewers are now larger and more visible
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ThemeProvider>
  );
}
