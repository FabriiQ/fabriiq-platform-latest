/**
 * Phase 6 Integration Tests
 * Comprehensive tests for cross-portal messaging functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { MessageIcon } from '../components/MessageIcon';
import { useUnreadMessagesCount } from '../hooks/useUnreadMessagesCount';

// Mock feature flags
jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn(),
}));

// Mock hooks
jest.mock('../hooks/useUnreadMessagesCount', () => ({
  useUnreadMessagesCount: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock API
jest.mock('@/utils/api', () => ({
  api: {
    messaging: {
      getUnreadCount: {
        useQuery: jest.fn(() => ({
          data: { total: 5, priority: 2, academic: 3 },
          isLoading: false,
        })),
      },
    },
  },
}));

const mockSession = {
  user: {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    userType: 'STUDENT',
  },
  expires: '2024-12-31',
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={mockSession}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
};

describe('Phase 6 Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useUnreadMessagesCount as jest.Mock).mockReturnValue({
      unreadCount: { total: 5, priority: 2, academic: 3 },
      isLoading: false,
      isEnabled: true,
    });
  });

  describe('Feature Flag Integration', () => {
    it('should show MessageIcon when MESSAGING_ENABLED is true', () => {
      (isFeatureEnabled as jest.Mock).mockReturnValue(true);
      
      render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should hide MessageIcon when MESSAGING_ENABLED is false', () => {
      (isFeatureEnabled as jest.Mock).mockReturnValue(false);
      (useUnreadMessagesCount as jest.Mock).mockReturnValue({
        unreadCount: { total: 0 },
        isLoading: false,
        isEnabled: false,
      });
      
      render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Unread Badge Functionality', () => {
    it('should display correct unread count for students', () => {
      render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display 99+ for counts over 99', () => {
      (useUnreadMessagesCount as jest.Mock).mockReturnValue({
        unreadCount: { total: 150, priority: 50, academic: 100 },
        isLoading: false,
        isEnabled: true,
      });

      render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should not show badge when count is 0', () => {
      (useUnreadMessagesCount as jest.Mock).mockReturnValue({
        unreadCount: { total: 0, priority: 0, academic: 0 },
        isLoading: false,
        isEnabled: true,
      });

      render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Role-Based Navigation', () => {
    it('should navigate to student communications for student role', () => {
      const mockPush = jest.fn();
      jest.doMock('next/navigation', () => ({
        useRouter: () => ({ push: mockPush }),
      }));

      render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockPush).toHaveBeenCalledWith('/student/communications');
    });

    it('should navigate to teacher communications for teacher role', () => {
      const mockPush = jest.fn();
      jest.doMock('next/navigation', () => ({
        useRouter: () => ({ push: mockPush }),
      }));

      render(
        <TestWrapper>
          <MessageIcon role="teacher" />
        </TestWrapper>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockPush).toHaveBeenCalledWith('/teacher/communications');
    });
  });

  describe('Responsive Design', () => {
    it('should render small size correctly', () => {
      render(
        <TestWrapper>
          <MessageIcon role="student" size="sm" />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8'); // Small button size
    });

    it('should render large size correctly', () => {
      render(
        <TestWrapper>
          <MessageIcon role="student" size="lg" />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10'); // Large button size
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Messages (5 unread)');
    });

    it('should be keyboard accessible', () => {
      render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should handle rapid state changes without errors', async () => {
      const { rerender } = render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      // Simulate rapid unread count changes
      for (let i = 0; i < 10; i++) {
        (useUnreadMessagesCount as jest.Mock).mockReturnValue({
          unreadCount: { total: i, priority: 0, academic: i },
          isLoading: false,
          isEnabled: true,
        });

        rerender(
          <TestWrapper>
            <MessageIcon role="student" />
          </TestWrapper>
        );

        await waitFor(() => {
          if (i > 0) {
            expect(screen.getByText(i.toString())).toBeInTheDocument();
          }
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      (useUnreadMessagesCount as jest.Mock).mockReturnValue({
        unreadCount: { total: 0 },
        isLoading: false,
        isEnabled: true,
        error: new Error('API Error'),
      });

      render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      // Should still render the component without crashing
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle loading states', () => {
      (useUnreadMessagesCount as jest.Mock).mockReturnValue({
        unreadCount: { total: 0 },
        isLoading: true,
        isEnabled: true,
      });

      render(
        <TestWrapper>
          <MessageIcon role="student" />
        </TestWrapper>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});

describe('Cross-Portal Integration', () => {
  it('should maintain consistent behavior across all portals', () => {
    const roles = ['student', 'teacher'] as const;
    
    roles.forEach(role => {
      const { unmount } = render(
        <TestWrapper>
          <MessageIcon role={role} />
        </TestWrapper>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      
      unmount();
    });
  });
});

// Export test utilities for other test files
export { TestWrapper, mockSession };
