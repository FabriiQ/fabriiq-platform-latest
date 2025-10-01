import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, BookOpen, Target, Settings, Zap, Brain, TrendingUp } from 'lucide-react';

interface CATSettingsGuideProps {
  children: React.ReactNode;
}

export const CATSettingsGuide: React.FC<CATSettingsGuideProps> = ({ children }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Computer Adaptive Testing (CAT) Guide
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                What is CAT?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Computer Adaptive Testing (CAT) is an advanced assessment method that dynamically selects questions 
                based on a student's ability level, providing more accurate measurements with fewer questions.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-700">✅ Benefits</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• More precise ability measurement</li>
                    <li>• Shorter test duration</li>
                    <li>• Reduced test anxiety</li>
                    <li>• Personalized difficulty</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-700">🎯 Best For</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Placement tests</li>
                    <li>• Diagnostic assessments</li>
                    <li>• Progress monitoring</li>
                    <li>• High-stakes testing</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Starting Ability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4" />
                  Starting Ability Level (θ₀)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Initial estimate of student ability before any questions are answered.
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>-2.0 (Very Low)</span>
                    <Badge variant="outline">10th percentile</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>0.0 (Average)</span>
                    <Badge variant="outline">50th percentile</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>+2.0 (Very High)</span>
                    <Badge variant="outline">90th percentile</Badge>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  💡 Use 0.0 for general populations, adjust based on known student ability
                </p>
              </CardContent>
            </Card>

            {/* Question Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4" />
                  Question Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-sm">Minimum Questions (5-10)</span>
                    <p className="text-xs text-muted-foreground">
                      Ensures reliable measurement. Too few = unreliable results.
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-sm">Maximum Questions (15-25)</span>
                    <p className="text-xs text-muted-foreground">
                      Prevents overly long tests. Balances precision with efficiency.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  💡 Most educational CATs use 5-20 questions
                </p>
              </CardContent>
            </Card>

            {/* Precision Threshold */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  Precision Threshold (SE)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Standard Error threshold for stopping the test when measurement is precise enough.
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>SE ≤ 0.2</span>
                    <Badge variant="outline">High Precision</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>SE ≤ 0.3</span>
                    <Badge variant="outline">Standard</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>SE ≤ 0.4</span>
                    <Badge variant="outline">Lower Precision</Badge>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  💡 0.3 is standard for most educational assessments
                </p>
              </CardContent>
            </Card>

            {/* Item Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4" />
                  Item Selection Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-sm">Maximum Information</span>
                    <p className="text-xs text-muted-foreground">
                      Selects questions that provide most information at current ability level.
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-sm">Bayesian</span>
                    <p className="text-xs text-muted-foreground">
                      Considers prior knowledge and uncertainty in selection.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  💡 Maximum Information is recommended for most cases
                </p>
              </CardContent>
            </Card>
          </div>

          {/* IRT Models */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                IRT Models Explained
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Badge variant="outline">2PL Model (Recommended)</Badge>
                  <p className="text-sm text-muted-foreground">
                    Considers item difficulty and discrimination. Best balance of accuracy and simplicity.
                  </p>
                  <p className="text-xs text-green-600">✅ Most commonly used</p>
                </div>
                <div className="space-y-2">
                  <Badge variant="outline">3PL Model (Advanced)</Badge>
                  <p className="text-sm text-muted-foreground">
                    Adds guessing parameter. More complex but handles multiple-choice better.
                  </p>
                  <p className="text-xs text-yellow-600">⚠️ Requires more data</p>
                </div>
                <div className="space-y-2">
                  <Badge variant="outline">Rasch Model (Simple)</Badge>
                  <p className="text-sm text-muted-foreground">
                    Only considers difficulty. Simpler but less flexible.
                  </p>
                  <p className="text-xs text-blue-600">ℹ️ Good for basic assessments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Implementation Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Implementation Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-700">✅ Best Practices</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Start with 2PL model and standard settings</li>
                    <li>• Ensure questions have proper IRT parameters</li>
                    <li>• Test with pilot groups before deployment</li>
                    <li>• Monitor performance and adjust as needed</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-red-700">❌ Common Mistakes</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Setting minimum questions too low (&lt;5)</li>
                    <li>• Using overly strict SE thresholds (&lt;0.2)</li>
                    <li>• Not calibrating item parameters properly</li>
                    <li>• Ignoring content balancing requirements</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
