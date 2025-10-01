'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, BookOpen, Target, Users } from 'lucide-react';

interface ContextData {
  class: string;
  subject: string;
  topic: string;
  learningOutcomes: string;
  assessmentCriteria: string;
  gradeLevel: string;
}

interface ContextSelectorProps {
  onContextUpdate: (context: ContextData) => void;
  currentContext?: ContextData;
}

export function ContextSelector({ onContextUpdate, currentContext }: ContextSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<ContextData>(
    currentContext || {
      class: '',
      subject: '',
      topic: '',
      learningOutcomes: '',
      assessmentCriteria: '',
      gradeLevel: '',
    }
  );

  const handleSave = () => {
    onContextUpdate(context);
    setIsOpen(false);
  };

  const handleReset = () => {
    const emptyContext = {
      class: '',
      subject: '',
      topic: '',
      learningOutcomes: '',
      assessmentCriteria: '',
      gradeLevel: '',
    };
    setContext(emptyContext);
    onContextUpdate(emptyContext);
  };

  const hasContext = Object.values(currentContext || {}).some(value => value.trim() !== '');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={hasContext ? "default" : "outline"}
          size="sm"
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Context
          {hasContext && (
            <span className="bg-primary-foreground text-primary px-1.5 py-0.5 rounded-full text-xs">
              Set
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Educational Context
          </DialogTitle>
          <DialogDescription>
            Set the educational context for better, more targeted responses from your assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Class Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Class/Section</Label>
                <Input
                  id="class"
                  placeholder="e.g., 5th Grade A, Year 7 Science"
                  value={context.class}
                  onChange={(e) => setContext(prev => ({ ...prev, class: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gradeLevel">Grade Level</Label>
                <Select
                  value={context.gradeLevel}
                  onValueChange={(value) => setContext(prev => ({ ...prev, gradeLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="k">Kindergarten</SelectItem>
                    <SelectItem value="1">1st Grade</SelectItem>
                    <SelectItem value="2">2nd Grade</SelectItem>
                    <SelectItem value="3">3rd Grade</SelectItem>
                    <SelectItem value="4">4th Grade</SelectItem>
                    <SelectItem value="5">5th Grade</SelectItem>
                    <SelectItem value="6">6th Grade</SelectItem>
                    <SelectItem value="7">7th Grade</SelectItem>
                    <SelectItem value="8">8th Grade</SelectItem>
                    <SelectItem value="9">9th Grade</SelectItem>
                    <SelectItem value="10">10th Grade</SelectItem>
                    <SelectItem value="11">11th Grade</SelectItem>
                    <SelectItem value="12">12th Grade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Mathematics, Science, English Language Arts"
                value={context.subject}
                onChange={(e) => setContext(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
          </div>

          {/* Current Topic */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Current Focus
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="topic">Topic/Unit</Label>
              <Input
                id="topic"
                placeholder="e.g., Fractions, Photosynthesis, Creative Writing"
                value={context.topic}
                onChange={(e) => setContext(prev => ({ ...prev, topic: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="learningOutcomes">Learning Outcomes</Label>
              <Textarea
                id="learningOutcomes"
                placeholder="What should students be able to do by the end of this lesson/unit?"
                className="min-h-[80px]"
                value={context.learningOutcomes}
                onChange={(e) => setContext(prev => ({ ...prev, learningOutcomes: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessmentCriteria">Assessment Criteria</Label>
              <Textarea
                id="assessmentCriteria"
                placeholder="How will student understanding be assessed? What are the success criteria?"
                className="min-h-[80px]"
                value={context.assessmentCriteria}
                onChange={(e) => setContext(prev => ({ ...prev, assessmentCriteria: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Context
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
