'use client';

import { useState } from 'react';
import { useTeacherAssistant } from '../hooks/use-teacher-assistant';
import { Button } from '@/components/ui/core/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/feedback/modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/core/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BookOpen, 
  Target, 
  CheckCircle2, 
  X,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorksheetModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: WorksheetSelection) => void;
}

interface WorksheetSelection {
  subject: string;
  subjectName: string;
  topic: string;
  topicName: string;
  learningOutcomes: string[];
  gradeLevel?: string;
}

/**
 * Popup for selecting subject, topic, and learning outcomes for worksheet mode
 */
export function WorksheetModeSelector({ isOpen, onClose, onConfirm }: WorksheetModeSelectorProps) {
  const { context } = useTeacherAssistant();
  
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);

  // Sample data - in real implementation, this would come from API
  const subjects = [
    { id: 'math', name: 'Mathematics', gradeLevel: 'Grade 6' },
    { id: 'science', name: 'Science', gradeLevel: 'Grade 6' },
    { id: 'english', name: 'English Language Arts', gradeLevel: 'Grade 6' },
    { id: 'history', name: 'History', gradeLevel: 'Grade 6' },
    { id: 'geography', name: 'Geography', gradeLevel: 'Grade 6' },
  ];

  const topics = {
    math: [
      { id: 'fractions', name: 'Fractions and Decimals' },
      { id: 'geometry', name: 'Basic Geometry' },
      { id: 'algebra', name: 'Introduction to Algebra' },
    ],
    science: [
      { id: 'plants', name: 'Plant Life Cycles' },
      { id: 'animals', name: 'Animal Habitats' },
      { id: 'weather', name: 'Weather Patterns' },
    ],
    english: [
      { id: 'reading', name: 'Reading Comprehension' },
      { id: 'writing', name: 'Creative Writing' },
      { id: 'grammar', name: 'Grammar and Punctuation' },
    ],
    history: [
      { id: 'ancient', name: 'Ancient Civilizations' },
      { id: 'medieval', name: 'Medieval Times' },
      { id: 'modern', name: 'Modern History' },
    ],
    geography: [
      { id: 'continents', name: 'Continents and Oceans' },
      { id: 'climate', name: 'Climate Zones' },
      { id: 'countries', name: 'Countries and Capitals' },
    ],
  };

  const learningOutcomes = {
    'math-fractions': [
      { id: 'lo1', statement: 'Identify and compare fractions with different denominators', bloomsLevel: 'UNDERSTAND' },
      { id: 'lo2', statement: 'Convert between fractions and decimals', bloomsLevel: 'APPLY' },
      { id: 'lo3', statement: 'Solve word problems involving fractions', bloomsLevel: 'ANALYZE' },
    ],
    'science-plants': [
      { id: 'lo1', statement: 'Describe the stages of plant life cycles', bloomsLevel: 'REMEMBER' },
      { id: 'lo2', statement: 'Explain how plants reproduce', bloomsLevel: 'UNDERSTAND' },
      { id: 'lo3', statement: 'Compare different types of plant reproduction', bloomsLevel: 'ANALYZE' },
    ],
    'english-reading': [
      { id: 'lo1', statement: 'Identify main ideas and supporting details', bloomsLevel: 'UNDERSTAND' },
      { id: 'lo2', statement: 'Make inferences from text', bloomsLevel: 'ANALYZE' },
      { id: 'lo3', statement: 'Evaluate author\'s purpose and perspective', bloomsLevel: 'EVALUATE' },
    ],
  };

  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
  const availableTopics = selectedSubject ? topics[selectedSubject as keyof typeof topics] || [] : [];
  const selectedTopicData = availableTopics.find(t => t.id === selectedTopic);
  const availableOutcomes = selectedSubject && selectedTopic 
    ? learningOutcomes[`${selectedSubject}-${selectedTopic}` as keyof typeof learningOutcomes] || []
    : [];

  const handleOutcomeToggle = (outcomeId: string) => {
    setSelectedOutcomes(prev => 
      prev.includes(outcomeId) 
        ? prev.filter(id => id !== outcomeId)
        : [...prev, outcomeId]
    );
  };

  const handleConfirm = () => {
    if (!selectedSubject || !selectedTopic || selectedOutcomes.length === 0) return;

    const selection: WorksheetSelection = {
      subject: selectedSubject,
      subjectName: selectedSubjectData?.name || '',
      topic: selectedTopic,
      topicName: selectedTopicData?.name || '',
      learningOutcomes: selectedOutcomes,
      gradeLevel: selectedSubjectData?.gradeLevel,
    };

    onConfirm(selection);
    handleReset();
  };

  const handleReset = () => {
    setSelectedSubject('');
    setSelectedTopic('');
    setSelectedOutcomes([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const getBloomsColor = (level: string) => {
    const colors: Record<string, string> = {
      'REMEMBER': 'bg-blue-100 text-blue-800 border-blue-200',
      'UNDERSTAND': 'bg-green-100 text-green-800 border-green-200',
      'APPLY': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'ANALYZE': 'bg-orange-100 text-orange-800 border-orange-200',
      'EVALUATE': 'bg-red-100 text-red-800 border-red-200',
      'CREATE': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[level.toUpperCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const canProceed = selectedSubject && selectedTopic && selectedOutcomes.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Worksheet Mode Setup</h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Step 1: Subject Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Step 1: Select Subject
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subject..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{subject.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {subject.gradeLevel}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Step 2: Topic Selection */}
          {selectedSubject && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Step 2: Select Topic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTopics.map(topic => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Learning Outcomes Selection */}
          {selectedTopic && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Step 3: Select Learning Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {availableOutcomes.map(outcome => (
                    <div key={outcome.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                      <Checkbox
                        id={outcome.id}
                        checked={selectedOutcomes.includes(outcome.id)}
                        onCheckedChange={() => handleOutcomeToggle(outcome.id)}
                      />
                      <div className="flex-1">
                        <label htmlFor={outcome.id} className="text-sm font-medium cursor-pointer">
                          {outcome.statement}
                        </label>
                        <div className="mt-1">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getBloomsColor(outcome.bloomsLevel))}
                          >
                            {outcome.bloomsLevel}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary and Action */}
          {canProceed && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-primary">Ready to Create Worksheet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedSubjectData?.name} • {selectedTopicData?.name} • {selectedOutcomes.length} learning outcomes
                    </p>
                  </div>
                  <Button onClick={handleConfirm} className="flex items-center gap-2">
                    Start Creating
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Modal>
  );
}
