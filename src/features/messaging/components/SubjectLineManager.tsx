'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Edit, 
  Check, 
  X, 
  ChevronDown, 
  Search,
  BookOpen,
  Users,
  MessageSquare,
  Clock,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/utils/api';

interface SubjectLineManagerProps {
  conversationId?: string;
  currentSubject?: string;
  onSubjectChange: (subject: string) => void;
  canEdit?: boolean;
  isRequired?: boolean;
  placeholder?: string;
  className?: string;
}

interface SubjectSuggestion {
  text: string;
  category: 'recent' | 'class' | 'course' | 'template';
  metadata?: {
    classId?: string;
    className?: string;
    courseId?: string;
    courseName?: string;
    usageCount?: number;
  };
}

export const SubjectLineManager: React.FC<SubjectLineManagerProps> = ({
  conversationId,
  currentSubject = '',
  onSubjectChange,
  canEdit = true,
  isRequired = false,
  placeholder = "Enter conversation subject...",
  className
}) => {
  const [isEditing, setIsEditing] = useState(!currentSubject && isRequired);
  const [editValue, setEditValue] = useState(currentSubject);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch subject suggestions
  const { data: suggestions } = api.messaging.getSubjectSuggestions.useQuery({
    query: searchQuery,
    limit: 20
  }, {
    enabled: showSuggestions || isEditing
  });

  // Update subject mutation
  const updateSubjectMutation = api.messaging.updateConversationSubject.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      onSubjectChange(editValue);
    },
    onError: (error) => {
      console.error('Failed to update subject:', error);
    }
  });

  useEffect(() => {
    setEditValue(currentSubject);
  }, [currentSubject]);

  const handleSave = async () => {
    if (!editValue.trim()) {
      if (isRequired) return;
      setEditValue(currentSubject);
      setIsEditing(false);
      return;
    }

    if (conversationId) {
      await updateSubjectMutation.mutateAsync({
        conversationId,
        subject: editValue.trim()
      });
    } else {
      onSubjectChange(editValue.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(currentSubject);
    setIsEditing(false);
  };

  const handleSuggestionSelect = (suggestion: SubjectSuggestion) => {
    setEditValue(suggestion.text);
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'class': return <Users className="h-4 w-4" />;
      case 'course': return <BookOpen className="h-4 w-4" />;
      case 'recent': return <Clock className="h-4 w-4" />;
      case 'template': return <Tag className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'class': return 'Class Topics';
      case 'course': return 'Course Topics';
      case 'recent': return 'Recent Subjects';
      case 'template': return 'Templates';
      default: return 'Suggestions';
    }
  };

  const groupedSuggestions = (suggestions || []).reduce((acc: Record<string, SubjectSuggestion[]>, suggestion: SubjectSuggestion) => {
    if (!acc[suggestion.category]) {
      acc[suggestion.category] = [];
    }
    acc[suggestion.category].push(suggestion);
    return acc;
  }, {} as Record<string, SubjectSuggestion[]>);

  if (isEditing) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor="subject" className="text-sm font-medium">
          Conversation Subject {isRequired && <span className="text-red-500">*</span>}
        </Label>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              id="subject"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="pr-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              autoFocus
            />
            
            {/* Suggestions Trigger */}
            <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              
              <PopoverContent className="w-80 p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search suggestions..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No suggestions found.</CommandEmpty>
                    
                    {Object.entries(groupedSuggestions).map(([category, items]) => (
                      <CommandGroup key={category} heading={getCategoryLabel(category)}>
                        {items.map((suggestion, index) => (
                          <CommandItem
                            key={`${category}-${index}`}
                            onSelect={() => handleSuggestionSelect(suggestion)}
                            className="flex items-center gap-2"
                          >
                            {getCategoryIcon(category)}
                            <div className="flex-1">
                              <div className="font-medium">{suggestion.text}</div>
                              {suggestion.metadata && (
                                <div className="text-xs text-muted-foreground">
                                  {suggestion.metadata.className || suggestion.metadata.courseName}
                                  {suggestion.metadata.usageCount && (
                                    <span className="ml-2">Used {suggestion.metadata.usageCount} times</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <Button
            onClick={handleSave}
            size="sm"
            disabled={isRequired && !editValue.trim()}
          >
            <Check className="h-4 w-4" />
          </Button>
          
          {!isRequired && (
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {isRequired && !editValue.trim() && (
          <p className="text-sm text-red-500">Subject is required</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{currentSubject || 'No Subject'}</h3>
      </div>
      
      {canEdit && (
        <Button
          onClick={() => setIsEditing(true)}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

// Component for creating new conversations with subject
interface NewConversationSubjectProps {
  onSubjectSet: (subject: string) => void;
  onCancel: () => void;
  className?: string;
}

export const NewConversationSubject: React.FC<NewConversationSubjectProps> = ({
  onSubjectSet,
  onCancel,
  className
}) => {
  const [subject, setSubject] = useState('');

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Start New Conversation</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <SubjectLineManager
          currentSubject={subject}
          onSubjectChange={setSubject}
          isRequired={true}
          placeholder="What's this conversation about?"
        />
        
        <div className="flex items-center gap-2 justify-end">
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button 
            onClick={() => onSubjectSet(subject)}
            disabled={!subject.trim()}
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Search component for finding conversations by subject
interface SubjectSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SubjectSearch: React.FC<SubjectSearchProps> = ({
  onSearch,
  placeholder = "Search by subject or content...",
  className
}) => {
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
};
