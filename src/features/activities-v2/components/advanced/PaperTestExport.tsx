'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Printer, 
  Settings, 
  Copy,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface PaperTestConfiguration {
  title: string;
  instructions?: string;
  layout: 'single_column' | 'two_column';
  fontSize: 'small' | 'medium' | 'large';
  spacing: 'compact' | 'normal' | 'wide';
  includeHeader: boolean;
  includeFooter: boolean;
  includeStudentInfo: boolean;
  includeAnswerSheet: boolean;
  showQuestionNumbers: boolean;
  showPointValues: boolean;
  showInstructions: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  answerSheetType: 'inline' | 'separate' | 'bubble_sheet';
  includeAnswerKey: boolean;
  generateMultipleVersions: boolean;
  numberOfVersions: number;
  examDate?: Date;
  duration?: number;
  totalMarks?: number;
  passingMarks?: number;
}

interface PaperTestExportProps {
  activityId: string;
  activityTitle: string;
  totalQuestions: number;
  totalMarks: number;
  onExport: (configuration: PaperTestConfiguration) => Promise<void>;
  isExporting?: boolean;
}

export function PaperTestExport({
  activityId,
  activityTitle,
  totalQuestions,
  totalMarks,
  onExport,
  isExporting = false
}: PaperTestExportProps) {
  const [configuration, setConfiguration] = useState<PaperTestConfiguration>({
    title: activityTitle,
    instructions: 'Read all questions carefully before answering. Choose the best answer for each question.',
    layout: 'single_column',
    fontSize: 'medium',
    spacing: 'normal',
    includeHeader: true,
    includeFooter: true,
    includeStudentInfo: true,
    includeAnswerSheet: true,
    showQuestionNumbers: true,
    showPointValues: true,
    showInstructions: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    answerSheetType: 'inline',
    includeAnswerKey: true,
    generateMultipleVersions: false,
    numberOfVersions: 2,
    totalMarks,
    passingMarks: Math.round(totalMarks * 0.6)
  });

  const updateConfiguration = (key: keyof PaperTestConfiguration, value: any) => {
    setConfiguration(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    await onExport(configuration);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Export to Paper Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Test Title</Label>
            <Input
              value={configuration.title}
              onChange={(e) => updateConfiguration('title', e.target.value)}
              placeholder="Enter test title"
            />
          </div>

          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea
              value={configuration.instructions}
              onChange={(e) => updateConfiguration('instructions', e.target.value)}
              placeholder="Enter test instructions"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exam Date</Label>
              <Input
                type="date"
                value={configuration.examDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => updateConfiguration('examDate', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={configuration.duration || ''}
                onChange={(e) => updateConfiguration('duration', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="60"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Layout Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Layout Settings
          </h4>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Layout</Label>
              <Select value={configuration.layout} onValueChange={(value) => updateConfiguration('layout', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_column">Single Column</SelectItem>
                  <SelectItem value="two_column">Two Column</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Font Size</Label>
              <Select value={configuration.fontSize} onValueChange={(value) => updateConfiguration('fontSize', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Spacing</Label>
              <Select value={configuration.spacing} onValueChange={(value) => updateConfiguration('spacing', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Content Options */}
        <div className="space-y-4">
          <h4 className="font-medium">Content Options</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label>Include Header</Label>
              <Switch
                checked={configuration.includeHeader}
                onCheckedChange={(checked) => updateConfiguration('includeHeader', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Include Footer</Label>
              <Switch
                checked={configuration.includeFooter}
                onCheckedChange={(checked) => updateConfiguration('includeFooter', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Student Information Section</Label>
              <Switch
                checked={configuration.includeStudentInfo}
                onCheckedChange={(checked) => updateConfiguration('includeStudentInfo', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Question Numbers</Label>
              <Switch
                checked={configuration.showQuestionNumbers}
                onCheckedChange={(checked) => updateConfiguration('showQuestionNumbers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Point Values</Label>
              <Switch
                checked={configuration.showPointValues}
                onCheckedChange={(checked) => updateConfiguration('showPointValues', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Instructions</Label>
              <Switch
                checked={configuration.showInstructions}
                onCheckedChange={(checked) => updateConfiguration('showInstructions', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Question Options */}
        <div className="space-y-4">
          <h4 className="font-medium">Question Options</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label>Shuffle Questions</Label>
              <Switch
                checked={configuration.shuffleQuestions}
                onCheckedChange={(checked) => updateConfiguration('shuffleQuestions', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Shuffle Answer Options</Label>
              <Switch
                checked={configuration.shuffleOptions}
                onCheckedChange={(checked) => updateConfiguration('shuffleOptions', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Answer Sheet Options */}
        <div className="space-y-4">
          <h4 className="font-medium">Answer Sheet Options</h4>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Answer Sheet Type</Label>
              <Select 
                value={configuration.answerSheetType} 
                onValueChange={(value) => updateConfiguration('answerSheetType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Inline (with questions)</SelectItem>
                  <SelectItem value="separate">Separate Answer Sheet</SelectItem>
                  <SelectItem value="bubble_sheet">Bubble Sheet (OMR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Include Answer Key</Label>
              <Switch
                checked={configuration.includeAnswerKey}
                onCheckedChange={(checked) => updateConfiguration('includeAnswerKey', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Multiple Versions */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Multiple Versions
          </h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Generate Multiple Versions</Label>
                <p className="text-xs text-muted-foreground">
                  Create different versions with shuffled questions and options
                </p>
              </div>
              <Switch
                checked={configuration.generateMultipleVersions}
                onCheckedChange={(checked) => updateConfiguration('generateMultipleVersions', checked)}
              />
            </div>

            {configuration.generateMultipleVersions && (
              <div className="space-y-2">
                <Label>Number of Versions</Label>
                <Input
                  type="number"
                  value={configuration.numberOfVersions}
                  onChange={(e) => updateConfiguration('numberOfVersions', parseInt(e.target.value))}
                  min={2}
                  max={10}
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Grading Information */}
        <div className="space-y-4">
          <h4 className="font-medium">Grading Information</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Marks</Label>
              <Input
                type="number"
                value={configuration.totalMarks}
                onChange={(e) => updateConfiguration('totalMarks', parseInt(e.target.value))}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Passing Marks</Label>
              <Input
                type="number"
                value={configuration.passingMarks}
                onChange={(e) => updateConfiguration('passingMarks', parseInt(e.target.value))}
                min={1}
                max={configuration.totalMarks}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Export Summary:</p>
              <div className="text-sm space-y-1">
                <p>• {totalQuestions} questions will be exported</p>
                <p>• {configuration.generateMultipleVersions ? configuration.numberOfVersions : 1} version(s) will be generated</p>
                <p>• Answer sheet type: {configuration.answerSheetType.replace('_', ' ')}</p>
                {configuration.includeAnswerKey && <p>• Answer key will be included</p>}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Export Button */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={isExporting}>
            <Printer className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Paper Test
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
