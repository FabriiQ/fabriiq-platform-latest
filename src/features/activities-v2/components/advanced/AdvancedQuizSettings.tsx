'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Target as Brain,
  Clock,
  FileText,
  Info,
  Settings,
  TrendingUp
} from 'lucide-react';
import { CATSettings, SpacedRepetitionSettings } from '../../types';

interface AdvancedQuizSettingsProps {
  assessmentMode: 'standard' | 'cat' | 'spaced_repetition';
  catSettings?: CATSettings;
  spacedRepetitionSettings?: SpacedRepetitionSettings;
  onAssessmentModeChange: (mode: 'standard' | 'cat' | 'spaced_repetition') => void;
  onCATSettingsChange: (settings: CATSettings) => void;
  onSpacedRepetitionSettingsChange: (settings: SpacedRepetitionSettings) => void;
}

export function AdvancedQuizSettings({
  assessmentMode,
  catSettings,
  spacedRepetitionSettings,
  onAssessmentModeChange,
  onCATSettingsChange,
  onSpacedRepetitionSettingsChange
}: AdvancedQuizSettingsProps) {
  const [activeTab, setActiveTab] = useState('mode');

  const handleCATSettingChange = (key: keyof CATSettings, value: any) => {
    const updatedSettings = { ...catSettings, [key]: value } as CATSettings;
    onCATSettingsChange(updatedSettings);
  };

  const handleCATTerminationChange = (key: string, value: any) => {
    const updatedSettings = {
      ...catSettings,
      terminationCriteria: {
        ...catSettings?.terminationCriteria,
        [key]: value
      }
    } as CATSettings;
    onCATSettingsChange(updatedSettings);
  };

  const handleSpacedRepetitionChange = (key: keyof SpacedRepetitionSettings, value: any) => {
    const updatedSettings = { ...spacedRepetitionSettings, [key]: value } as SpacedRepetitionSettings;
    onSpacedRepetitionSettingsChange(updatedSettings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Advanced Assessment Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mode">Assessment Mode</TabsTrigger>
            <TabsTrigger value="cat" disabled={assessmentMode !== 'cat'}>
              CAT Settings
            </TabsTrigger>
            <TabsTrigger value="spaced" disabled={assessmentMode !== 'spaced_repetition'}>
              Spaced Repetition
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mode" className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Assessment Mode</Label>
              
              <div className="grid gap-4">
                {/* Standard Mode */}
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    assessmentMode === 'standard' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => onAssessmentModeChange('standard')}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 mt-1 text-blue-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Standard Quiz</h4>
                        <Badge variant="secondary">Default</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Traditional quiz with fixed questions in predetermined order.
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>• Fixed question set</span>
                        <span>• Linear progression</span>
                        <span>• Consistent experience</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CAT Mode */}
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    assessmentMode === 'cat' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => onAssessmentModeChange('cat')}
                >
                  <div className="flex items-start gap-3">
                    <Brain className="h-5 w-5 mt-1 text-purple-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Computer Adaptive Testing (CAT)</h4>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          Advanced
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adaptive assessment that adjusts question difficulty based on student performance using IRT.
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>• Personalized difficulty</span>
                        <span>• Efficient assessment</span>
                        <span>• Precise ability measurement</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spaced Repetition Mode */}
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    assessmentMode === 'spaced_repetition' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => onAssessmentModeChange('spaced_repetition')}
                >
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 mt-1 text-green-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Spaced Repetition</h4>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Learning
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Optimized review system that schedules questions based on forgetting curves for better retention.
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>• Optimized retention</span>
                        <span>• Personalized scheduling</span>
                        <span>• Long-term learning</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {assessmentMode !== 'standard' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Advanced assessment modes require sufficient question bank data for optimal performance. 
                    Ensure questions have appropriate difficulty levels and usage history.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cat" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-medium">Computer Adaptive Testing Configuration</h3>
              </div>

              {/* IRT Algorithm */}
              <div className="space-y-2">
                <Label>IRT Algorithm</Label>
                <Select 
                  value={catSettings?.algorithm || 'irt_2pl'} 
                  onValueChange={(value) => handleCATSettingChange('algorithm', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rasch">Rasch Model (1PL)</SelectItem>
                    <SelectItem value="irt_2pl">2-Parameter Logistic (2PL)</SelectItem>
                    <SelectItem value="irt_3pl">3-Parameter Logistic (3PL)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  2PL is recommended for most educational assessments
                </p>
              </div>

              {/* Starting Difficulty */}
              <div className="space-y-2">
                <Label>Starting Difficulty</Label>
                <div className="px-3">
                  <Slider
                    value={[catSettings?.startingDifficulty || 0]}
                    onValueChange={([value]) => handleCATSettingChange('startingDifficulty', value)}
                    min={-3}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Easy (-3)</span>
                    <span>Neutral (0)</span>
                    <span>Hard (+3)</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current: {catSettings?.startingDifficulty || 0} (Neutral difficulty)
                </p>
              </div>

              {/* Termination Criteria */}
              <div className="space-y-4">
                <Label className="text-base">Termination Criteria</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Minimum Questions</Label>
                    <Input
                      type="number"
                      value={catSettings?.terminationCriteria?.minQuestions || 5}
                      onChange={(e) => handleCATTerminationChange('minQuestions', parseInt(e.target.value))}
                      min={3}
                      max={20}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Maximum Questions</Label>
                    <Input
                      type="number"
                      value={catSettings?.terminationCriteria?.maxQuestions || 20}
                      onChange={(e) => handleCATTerminationChange('maxQuestions', parseInt(e.target.value))}
                      min={5}
                      max={50}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Standard Error Threshold</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={catSettings?.terminationCriteria?.standardErrorThreshold || 0.3}
                      onChange={(e) => handleCATTerminationChange('standardErrorThreshold', parseFloat(e.target.value))}
                      min={0.1}
                      max={1.0}
                    />
                  </div>
                </div>
              </div>

              {/* Item Selection Method */}
              <div className="space-y-2">
                <Label>Item Selection Method</Label>
                <Select
                  value={catSettings?.itemSelectionMethod || 'maximum_information'}
                  onValueChange={(value) => handleCATSettingChange('itemSelectionMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maximum_information">Maximum Information</SelectItem>
                    <SelectItem value="bayesian">Bayesian</SelectItem>
                    <SelectItem value="weighted">Weighted</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Maximum Information provides the most precise ability estimates
                </p>
              </div>

              {/* Question Type Selection */}
              <div className="space-y-2">
                <Label>Question Types to Include</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                  {[
                    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
                    { value: 'TRUE_FALSE', label: 'True/False' },
                    { value: 'MULTIPLE_RESPONSE', label: 'Multiple Response' },
                    { value: 'FILL_IN_THE_BLANKS', label: 'Fill in the Blanks' },
                    { value: 'MATCHING', label: 'Matching' },
                    { value: 'NUMERIC', label: 'Numeric' },
                    { value: 'SHORT_ANSWER', label: 'Short Answer' },
                    { value: 'ESSAY', label: 'Essay' }
                  ].map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${type.value}`}
                        checked={catSettings?.questionTypes?.includes(type.value) || false}
                        onCheckedChange={(checked) => {
                          const currentTypes = catSettings?.questionTypes || [];
                          const newTypes = checked
                            ? [...currentTypes, type.value]
                            : currentTypes.filter(t => t !== type.value);
                          handleCATSettingChange('questionTypes', newTypes);
                        }}
                      />
                      <label htmlFor={`cat-${type.value}`} className="text-sm">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select which question types to include in the adaptive test. If none selected, all types will be used.
                </p>
              </div>

              {/* Difficulty Range */}
              <div className="space-y-2">
                <Label>Difficulty Range</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Minimum Difficulty</Label>
                    <Select
                      value={catSettings?.difficultyRange?.min?.toString() || '1'}
                      onValueChange={(value) => handleCATSettingChange('difficultyRange', {
                        ...catSettings?.difficultyRange,
                        min: parseInt(value)
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Very Easy</SelectItem>
                        <SelectItem value="2">Easy</SelectItem>
                        <SelectItem value="3">Medium</SelectItem>
                        <SelectItem value="4">Hard</SelectItem>
                        <SelectItem value="5">Very Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Maximum Difficulty</Label>
                    <Select
                      value={catSettings?.difficultyRange?.max?.toString() || '5'}
                      onValueChange={(value) => handleCATSettingChange('difficultyRange', {
                        ...catSettings?.difficultyRange,
                        max: parseInt(value)
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Very Easy</SelectItem>
                        <SelectItem value="2">Easy</SelectItem>
                        <SelectItem value="3">Medium</SelectItem>
                        <SelectItem value="4">Hard</SelectItem>
                        <SelectItem value="5">Very Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set the range of question difficulties to include in the adaptive test
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="spaced" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-medium">Spaced Repetition Configuration</h3>
              </div>

              {/* Algorithm */}
              <div className="space-y-2">
                <Label>Spaced Repetition Algorithm</Label>
                <Select 
                  value={spacedRepetitionSettings?.algorithm || 'sm2'} 
                  onValueChange={(value) => handleSpacedRepetitionChange('algorithm', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm2">SM-2 (SuperMemo 2)</SelectItem>
                    <SelectItem value="anki">Anki Algorithm</SelectItem>
                    <SelectItem value="supermemo">SuperMemo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  SM-2 is the most widely tested and reliable algorithm
                </p>
              </div>

              {/* Initial Interval */}
              <div className="space-y-2">
                <Label>Initial Interval (days)</Label>
                <Input
                  type="number"
                  value={spacedRepetitionSettings?.initialInterval || 1}
                  onChange={(e) => handleSpacedRepetitionChange('initialInterval', parseInt(e.target.value))}
                  min={1}
                  max={7}
                />
                <p className="text-xs text-muted-foreground">
                  Time before first review of new questions
                </p>
              </div>

              {/* Maximum Interval */}
              <div className="space-y-2">
                <Label>Maximum Interval (days)</Label>
                <Input
                  type="number"
                  value={spacedRepetitionSettings?.maxInterval || 365}
                  onChange={(e) => handleSpacedRepetitionChange('maxInterval', parseInt(e.target.value))}
                  min={30}
                  max={1000}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum time between reviews for well-known questions
                </p>
              </div>

              {/* Ease Factor */}
              <div className="space-y-2">
                <Label>Starting Ease Factor</Label>
                <div className="px-3">
                  <Slider
                    value={[spacedRepetitionSettings?.easeFactor || 2.5]}
                    onValueChange={([value]) => handleSpacedRepetitionChange('easeFactor', value)}
                    min={1.3}
                    max={4.0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Conservative (1.3)</span>
                    <span>Balanced (2.5)</span>
                    <span>Aggressive (4.0)</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current: {spacedRepetitionSettings?.easeFactor || 2.5} - Controls how quickly intervals increase
                </p>
              </div>

              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  Spaced repetition works best with consistent, regular practice. 
                  Students should review questions daily for optimal retention.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
