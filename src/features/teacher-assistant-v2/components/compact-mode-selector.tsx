'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Settings, FileText, BookOpen, Edit, Calculator, Lightbulb, Target, Users,
  ClipboardList, Eye, Clock, MessageSquare, Search, BarChart,
  Zap, AlertTriangle, CheckCircle, List, HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface TeacherMode {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  color: string;
  bgColor: string;
}

interface CompactModeSelectorProps {
  onModeChange: (mode: TeacherMode | null) => void;
  selectedMode: TeacherMode | null;
  className?: string;
}

export function CompactModeSelector({ onModeChange, selectedMode, className }: CompactModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedMode, setTempSelectedMode] = useState<TeacherMode | null>(selectedMode);

  const modes: TeacherMode[] = [
    {
      id: 'worksheet',
      label: 'Worksheet Generator',
      description: 'Create structured worksheets with questions and activities',
      icon: <FileText className="h-4 w-4" />,
      prompt: 'Create a comprehensive worksheet with clear instructions, varied question types, and an answer key. IMPORTANT: Search for and include relevant educational images, diagrams, and visual aids throughout the worksheet to enhance learning and engagement. Use the imageSearch tool to find appropriate visuals for the topic.',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      id: 'write-text',
      label: 'Write Text',
      description: 'Build chapters, case studies, articles, etc.',
      icon: <Edit className="h-4 w-4" />,
      prompt: 'Create well-structured educational text content including chapters, case studies, articles, and other written materials. Focus on clear organization, engaging content, and educational value.',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    },
    {
      id: 'creative-story',
      label: 'Creative Story',
      description: 'Present concepts with storytelling',
      icon: <BookOpen className="h-4 w-4" />,
      prompt: 'Create engaging stories that present educational concepts through narrative. Use storytelling techniques to make learning memorable and enjoyable.',
      color: 'text-purple-700',
      bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      id: 'create-qna',
      label: 'Create Q&A',
      description: 'Engage learners fast with Q&As',
      icon: <MessageSquare className="h-4 w-4" />,
      prompt: 'Create interactive question and answer sessions that engage learners quickly. Focus on thought-provoking questions that encourage participation and understanding.',
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    },
    {
      id: 'create-timeline',
      label: 'Create Timeline',
      description: 'Chronological series of events',
      icon: <Clock className="h-4 w-4" />,
      prompt: 'Create chronological timelines that organize events, processes, or historical developments in a clear, sequential manner.',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    },
    {
      id: 'create-glossary',
      label: 'Create Glossary',
      description: 'List terms and their meaning',
      icon: <Search className="h-4 w-4" />,
      prompt: 'Create comprehensive glossaries with clear definitions, examples, and context for key terms and concepts.',
      color: 'text-teal-700',
      bgColor: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
    },
    {
      id: 'lesson-plan',
      label: 'Lesson Planner',
      description: 'Generate detailed lesson plans with objectives and activities',
      icon: <BookOpen className="h-4 w-4" />,
      prompt: 'Create a detailed lesson plan with learning objectives, activities, assessment methods, and required materials. Include visual aids and interactive elements.',
      color: 'text-green-700',
      bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
    },
    {
      id: 'assessment',
      label: 'Assessment Creator',
      description: 'Create quizzes, tests, or evaluation rubrics',
      icon: <ClipboardList className="h-4 w-4" />,
      prompt: 'Design a comprehensive assessment with varied question types, clear rubrics, and answer keys. Include images and diagrams where helpful.',
      color: 'text-purple-700',
      bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      id: 'activity',
      label: 'Activity Designer',
      description: 'Design engaging classroom activities and exercises',
      icon: <Edit className="h-4 w-4" />,
      prompt: 'Create an engaging learning activity with clear instructions, materials list, and learning outcomes. Include visual elements and interactive components.',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    },
    {
      id: 'visual-content',
      label: 'Visual Content Creator',
      description: 'Create content with diagrams, charts, and images',
      icon: <Eye className="h-4 w-4" />,
      prompt: 'Create educational content that heavily incorporates visual elements like diagrams, charts, infographics, and relevant images to enhance understanding.',
      color: 'text-pink-700',
      bgColor: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
    },
    {
      id: 'math-problems',
      label: 'Math Problem Generator',
      description: 'Generate math problems and step-by-step solutions',
      icon: <Calculator className="h-4 w-4" />,
      prompt: 'Create a set of math problems with varying difficulty levels, step-by-step solutions, and visual representations where helpful.',
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    },
    // Additional modes from the main selector
    {
      id: 'argumentative-paragraph',
      label: 'Argumentative Paragraph',
      description: 'Present claims with supporting evidence',
      icon: <Target className="h-4 w-4" />,
      prompt: 'Create argumentative paragraphs that present clear claims supported by evidence, reasoning, and logical structure.',
      color: 'text-red-700',
      bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
    },
    {
      id: 'create-summary',
      label: 'Create Summary',
      description: 'Summary of ebook',
      icon: <BarChart className="h-4 w-4" />,
      prompt: 'Create concise, comprehensive summaries that capture the key points, main ideas, and essential information from educational content.',
      color: 'text-cyan-700',
      bgColor: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
    },
    {
      id: 'persuade-pas',
      label: 'Persuade (PAS)',
      description: 'Show a problem, urge & resolve',
      icon: <Target className="h-4 w-4" />,
      prompt: 'Use the Problem-Agitate-Solution framework to present educational content that identifies problems, emphasizes their importance, and provides clear solutions.',
      color: 'text-rose-700',
      bgColor: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
    },
    {
      id: 'simplify-concept',
      label: 'Simplify Concept',
      description: 'Explain a concept in a simple way',
      icon: <Lightbulb className="h-4 w-4" />,
      prompt: 'Break down complex concepts into simple, easy-to-understand explanations using analogies, examples, and clear language.',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    },
    {
      id: 'explain-as-character',
      label: 'Explain as Character',
      description: 'Ask a persona to describe a concept',
      icon: <Users className="h-4 w-4" />,
      prompt: 'Explain concepts through the perspective of different characters or personas, making learning more engaging and relatable.',
      color: 'text-violet-700',
      bgColor: 'bg-violet-50 hover:bg-violet-100 border-violet-200',
    },
    {
      id: 'describe-creatively',
      label: 'Describe Creatively',
      description: 'Provide imaginative descriptions of a concept',
      icon: <Zap className="h-4 w-4" />,
      prompt: 'Create imaginative, creative descriptions that bring concepts to life through vivid imagery, metaphors, and engaging language.',
      color: 'text-pink-700',
      bgColor: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
    },
    {
      id: 'instructional-approach',
      label: 'Instructional Approach',
      description: 'Create text based on instructional theories',
      icon: <Settings className="h-4 w-4" />,
      prompt: 'Apply instructional design theories and approaches to create effective educational content based on proven pedagogical methods.',
      color: 'text-slate-700',
      bgColor: 'bg-slate-50 hover:bg-slate-100 border-slate-200',
    },
    {
      id: 'socratic-dialogue',
      label: 'Socratic Dialogue',
      description: 'Create a provoking dialogue',
      icon: <MessageSquare className="h-4 w-4" />,
      prompt: 'Create Socratic dialogues that use questioning techniques to guide learners to discover knowledge and think critically.',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    },
    {
      id: 'different-perspectives',
      label: 'Different Perspectives',
      description: 'Multilens views of a concept',
      icon: <Eye className="h-4 w-4" />,
      prompt: 'Present concepts from multiple perspectives and viewpoints to provide comprehensive understanding and critical thinking opportunities.',
      color: 'text-lime-700',
      bgColor: 'bg-lime-50 hover:bg-lime-100 border-lime-200',
    },
    {
      id: 'compare-concepts',
      label: 'Compare Concepts',
      description: 'Explore competing concepts',
      icon: <List className="h-4 w-4" />,
      prompt: 'Create detailed comparisons between different concepts, theories, or ideas, highlighting similarities, differences, and relationships.',
      color: 'text-sky-700',
      bgColor: 'bg-sky-50 hover:bg-sky-100 border-sky-200',
    },
    {
      id: 'pros-and-cons',
      label: 'Pros and Cons',
      description: 'Analyze pros and cons of a concept',
      icon: <BarChart className="h-4 w-4" />,
      prompt: 'Analyze and present the advantages and disadvantages of concepts, decisions, or approaches in a balanced, educational manner.',
      color: 'text-stone-700',
      bgColor: 'bg-stone-50 hover:bg-stone-100 border-stone-200',
    },
    {
      id: 'create-dilemma',
      label: 'Create Dilemma',
      description: 'Develop critical thinking skills',
      icon: <AlertTriangle className="h-4 w-4" />,
      prompt: 'Create ethical dilemmas and challenging scenarios that develop critical thinking and decision-making skills.',
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
    },
    {
      id: 'discussion-prompts',
      label: 'Discussion Prompts',
      description: 'Prompt learners to discuss and understand',
      icon: <Users className="h-4 w-4" />,
      prompt: 'Create engaging discussion prompts that encourage learners to share ideas, debate concepts, and deepen understanding through dialogue.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      id: 'misconceptions',
      label: 'Misconceptions',
      description: 'Expose common learning pitfalls',
      icon: <AlertTriangle className="h-4 w-4" />,
      prompt: 'Identify and address common misconceptions in the subject area, providing clear explanations to correct misunderstandings.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    },
    {
      id: 'provide-critique',
      label: 'Provide Critique',
      description: 'Exploit constructive criticism',
      icon: <Search className="h-4 w-4" />,
      prompt: 'Provide constructive criticism and detailed analysis that helps learners improve their understanding and skills.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      id: 'explain-process',
      label: 'Explain Process',
      description: 'Describe the steps of a process',
      icon: <CheckCircle className="h-4 w-4" />,
      prompt: 'Break down complex processes into clear, sequential steps with explanations and examples for each stage.',
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
    },
  ];

  const handleModeSelect = (mode: TeacherMode) => {
    // Toggle selection - if same mode clicked, deselect it
    const newMode = tempSelectedMode?.id === mode.id ? null : mode;
    setTempSelectedMode(newMode);
    // Apply immediately and close to reflect selection in UI right away
    onModeChange(newMode);
    setIsOpen(false);
  };

  const handleClearMode = () => {
    setTempSelectedMode(null);
  };

  const handleDone = () => {
    // Apply the temporary selection to the actual selected mode
    onModeChange(tempSelectedMode);
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset temporary selection to current selected mode
    setTempSelectedMode(selectedMode);
    setIsOpen(false);
  };

  // Update temp selection when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempSelectedMode(selectedMode);
    }
    setIsOpen(open);
  };

  // Sync tempSelectedMode with selectedMode when selectedMode changes from parent
  useEffect(() => {
    setTempSelectedMode(selectedMode);
  }, [selectedMode]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Mode Selector Button - Always show, changes appearance based on selection */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant={selectedMode ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {selectedMode ? `${selectedMode.label} Mode` : "Agent Modes"}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-6xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              {selectedMode ? "Change Agent Mode" : "Agent Modes"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-left">
              {selectedMode
                ? `Currently active: ${selectedMode.label}${tempSelectedMode?.id !== selectedMode?.id ? ` → ${tempSelectedMode ? `Switching to: ${tempSelectedMode.label}` : 'Clearing mode'}` : ''}`
                : tempSelectedMode
                  ? `Selecting: ${tempSelectedMode.label}`
                  : "Select a mode to customize all AI responses for specific educational tasks"
              }
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh]">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {modes.map((mode) => (
                <Button
                  key={mode.id}
                  variant={tempSelectedMode?.id === mode.id ? "default" : "outline"}
                  className={cn(
                    "h-auto p-3 flex flex-col items-start gap-2 text-left transition-all duration-200",
                    tempSelectedMode?.id === mode.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : mode.bgColor
                  )}
                  onClick={() => handleModeSelect(mode)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={tempSelectedMode?.id === mode.id ? "text-primary-foreground" : mode.color}>
                      {mode.icon}
                    </div>
                    <span className="font-medium text-xs">{mode.label}</span>
                  </div>
                  <p className={cn(
                    "text-xs leading-relaxed line-clamp-2",
                    tempSelectedMode?.id === mode.id
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}>
                    {mode.description}
                  </p>
                </Button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearMode}
                >
                  {tempSelectedMode ? "Clear Mode" : "No Mode"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={handleDone}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
