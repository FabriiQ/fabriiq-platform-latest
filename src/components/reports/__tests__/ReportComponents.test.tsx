import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricCard } from '../MetricCard';
import { ReportTable } from '../ReportTable';
import { ExportButton } from '../ExportButton';
import { ReportContainer } from '../ReportContainer';
import { Users, Activity } from 'lucide-react';

// Mock data for testing
const mockTableData = [
  { id: 1, name: 'Institution A', students: 1200, teachers: 80, courses: 45 },
  { id: 2, name: 'Institution B', students: 950, teachers: 65, courses: 38 },
  { id: 3, name: 'Institution C', students: 1500, teachers: 95, courses: 52 },
];

const mockTableColumns = [
  { key: 'name', label: 'Institution', sortable: true },
  { key: 'students', label: 'Students', sortable: true, align: 'right' as const },
  { key: 'teachers', label: 'Teachers', sortable: true, align: 'right' as const },
  { key: 'courses', label: 'Courses', sortable: true, align: 'right' as const },
];

describe('Report Components', () => {
  describe('MetricCard', () => {
    it('renders basic metric card correctly', () => {
      render(
        <MetricCard
          title="Total Users"
          value={1250}
          description="Active users in the system"
          icon={Users}
        />
      );

      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('Active users in the system')).toBeInTheDocument();
    });

    it('renders metric card with trend', () => {
      render(
        <MetricCard
          title="Active Sessions"
          value={342}
          trend={{ value: 12.5, isPositive: true, label: 'vs last week' }}
          icon={Activity}
        />
      );

      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
      expect(screen.getByText('342')).toBeInTheDocument();
      expect(screen.getByText('+12.5%')).toBeInTheDocument();
      expect(screen.getByText('vs last week')).toBeInTheDocument();
    });

    it('applies variant styles correctly', () => {
      const { container } = render(
        <MetricCard
          title="Errors"
          value={5}
          variant="danger"
        />
      );

      const card = container.querySelector('.border-red-200');
      expect(card).toBeInTheDocument();
    });
  });

  describe('ReportTable', () => {
    it('renders table with data correctly', () => {
      render(
        <ReportTable
          title="Institution Performance"
          description="Performance metrics by institution"
          data={mockTableData}
          columns={mockTableColumns}
        />
      );

      expect(screen.getByText('Institution Performance')).toBeInTheDocument();
      expect(screen.getByText('Performance metrics by institution')).toBeInTheDocument();
      expect(screen.getByText('Institution A')).toBeInTheDocument();
      expect(screen.getByText('1200')).toBeInTheDocument();
    });

    it('handles search functionality', async () => {
      render(
        <ReportTable
          title="Test Table"
          data={mockTableData}
          columns={mockTableColumns}
          searchPlaceholder="Search institutions..."
        />
      );

      const searchInput = screen.getByPlaceholderText('Search institutions...');
      fireEvent.change(searchInput, { target: { value: 'Institution A' } });

      await waitFor(() => {
        expect(screen.getByText('Institution A')).toBeInTheDocument();
        expect(screen.queryByText('Institution B')).not.toBeInTheDocument();
      });
    });

    it('handles sorting functionality', async () => {
      render(
        <ReportTable
          title="Test Table"
          data={mockTableData}
          columns={mockTableColumns}
        />
      );

      const studentsHeader = screen.getByText('Students');
      fireEvent.click(studentsHeader);

      // After sorting by students ascending, Institution B (950) should come first
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('Institution B');
      });
    });

    it('shows empty state when no data', () => {
      render(
        <ReportTable
          title="Empty Table"
          data={[]}
          columns={mockTableColumns}
        />
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('ExportButton', () => {
    it('renders export button correctly', () => {
      render(
        <ExportButton
          data={mockTableData}
          filename="test-report"
        />
      );

      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('calls onExport when format is selected', async () => {
      const mockOnExport = jest.fn();
      
      render(
        <ExportButton
          data={mockTableData}
          filename="test-report"
          onExport={mockOnExport}
        />
      );

      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      const csvOption = await screen.findByText('Export as CSV');
      fireEvent.click(csvOption);

      expect(mockOnExport).toHaveBeenCalledWith('csv', expect.objectContaining({
        data: mockTableData,
        filename: expect.stringContaining('test-report-csv-'),
      }));
    });
  });

  describe('ReportContainer', () => {
    const mockTabs = [
      {
        id: 'overview',
        label: 'Overview',
        content: <div>Overview Content</div>,
      },
      {
        id: 'details',
        label: 'Details',
        content: <div>Details Content</div>,
      },
    ];

    it('renders container with tabs correctly', () => {
      render(
        <ReportContainer
          title="System Reports"
          description="Comprehensive system analytics"
          tabs={mockTabs}
          exportData={mockTableData}
        />
      );

      expect(screen.getByText('System Reports')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive system analytics')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Overview Content')).toBeInTheDocument();
    });

    it('handles search functionality', () => {
      const mockOnSearch = jest.fn();
      
      render(
        <ReportContainer
          title="Test Reports"
          tabs={mockTabs}
          onSearch={mockOnSearch}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search reports, metrics...');
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      expect(mockOnSearch).toHaveBeenCalledWith('test query');
    });

    it('renders export button when exportable', () => {
      render(
        <ReportContainer
          title="Test Reports"
          tabs={mockTabs}
          exportable={true}
          exportData={mockTableData}
        />
      );

      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });
});
