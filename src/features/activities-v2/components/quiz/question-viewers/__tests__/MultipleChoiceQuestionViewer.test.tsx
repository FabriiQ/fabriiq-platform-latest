import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MultipleChoiceQuestionViewer } from '../MultipleChoiceQuestionViewer';

// Mock the theme provider
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ theme: 'light' })
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon">✓</div>,
  X: () => <div data-testid="x-icon">✗</div>
}));

const mockQuestion = {
  id: 'test-question-1',
  content: {
    text: 'What is the capital of France?',
    options: [
      { id: 'opt1', text: 'London', isCorrect: false },
      { id: 'opt2', text: 'Paris', isCorrect: true },
      { id: 'opt3', text: 'Berlin', isCorrect: false },
      { id: 'opt4', text: 'Madrid', isCorrect: false }
    ],
    explanation: 'Paris is the capital and largest city of France.'
  }
};

describe('MultipleChoiceQuestionViewer', () => {
  const mockOnAnswerChange = jest.fn();

  beforeEach(() => {
    mockOnAnswerChange.mockClear();
  });

  it('renders question text and options correctly', () => {
    render(
      <MultipleChoiceQuestionViewer
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
      />
    );

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('displays option letters (A, B, C, D)', () => {
    render(
      <MultipleChoiceQuestionViewer
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
      />
    );

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('calls onAnswerChange when an option is clicked', () => {
    render(
      <MultipleChoiceQuestionViewer
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
      />
    );

    const parisOption = screen.getByText('Paris').closest('div[role="radio"]');
    fireEvent.click(parisOption!);

    expect(mockOnAnswerChange).toHaveBeenCalledWith('opt2');
  });

  it('shows selected state when answer is provided', () => {
    render(
      <MultipleChoiceQuestionViewer
        question={mockQuestion}
        answer="opt2"
        onAnswerChange={mockOnAnswerChange}
      />
    );

    const parisOption = screen.getByText('Paris').closest('div[role="radio"]');
    expect(parisOption).toHaveClass('border-primary-green');
  });

  it('shows feedback when showFeedback is true', () => {
    render(
      <MultipleChoiceQuestionViewer
        question={mockQuestion}
        answer="opt2"
        onAnswerChange={mockOnAnswerChange}
        showFeedback={true}
      />
    );

    expect(screen.getByText('Explanation:')).toBeInTheDocument();
    expect(screen.getByText('Paris is the capital and largest city of France.')).toBeInTheDocument();
  });

  it('disables clicking when showFeedback is true', () => {
    render(
      <MultipleChoiceQuestionViewer
        question={mockQuestion}
        answer="opt1"
        onAnswerChange={mockOnAnswerChange}
        showFeedback={true}
      />
    );

    const londonOption = screen.getByText('London').closest('div[role="radio"]');
    fireEvent.click(londonOption!);

    // Should not call onAnswerChange when in feedback mode
    expect(mockOnAnswerChange).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation', () => {
    render(
      <MultipleChoiceQuestionViewer
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
      />
    );

    const parisOption = screen.getByText('Paris').closest('div[role="radio"]');
    parisOption!.focus();
    fireEvent.keyDown(parisOption!, { key: 'Enter' });

    expect(mockOnAnswerChange).toHaveBeenCalledWith('opt2');
  });

  it('supports space key for selection', () => {
    render(
      <MultipleChoiceQuestionViewer
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
      />
    );

    const berlinOption = screen.getByText('Berlin').closest('div[role="radio"]');
    berlinOption!.focus();
    fireEvent.keyDown(berlinOption!, { key: ' ' });

    expect(mockOnAnswerChange).toHaveBeenCalledWith('opt3');
  });

  it('shows correct/incorrect status in feedback mode', () => {
    render(
      <MultipleChoiceQuestionViewer
        question={mockQuestion}
        answer="opt1" // Wrong answer (London)
        onAnswerChange={mockOnAnswerChange}
        showFeedback={true}
      />
    );

    // Check for correct answer styling (Paris should be green)
    const parisOption = screen.getByText('Paris').closest('div[role="radio"]');
    expect(parisOption).toHaveClass('border-green-600');

    // Check for incorrect answer styling (London should be red)
    const londonOption = screen.getByText('London').closest('div[role="radio"]');
    expect(londonOption).toHaveClass('border-red-600');
  });
});
