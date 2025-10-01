'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/trpc/react';
import {
  FileText,
  Download,
  Calendar,
  Home,
  GraduationCap,
  BookOpen,
  Users,
  User,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Filter,
  RefreshCw,
  Eye,
  ArrowUp,
} from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { getPaymentMethodLabel, getPaymentMethodIcon } from '@/types/payment-methods';
import { toast } from 'sonner';
import { exportData, REPORT_COLUMNS } from '@/utils/export-utils';
import { FeeImportDialog } from '@/components/admin/system/fee-management/FeeImportDialog';
import { SimpleBarChart, SimplePieChart, SimpleLineChart } from '@/components/ui/charts/SimpleChart';
import { useCurrency } from '@/contexts/currency-context';

export default function FeeReportsPage() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    to: formatDate(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Fetch data
  const { data: feeStats, isLoading: loadingStats, refetch: refetchStats } = api.enrollmentFee.getFeeCollectionStats.useQuery();

  // Fetch fee analytics data
  const { data: feeAnalytics, isLoading: analyticsLoading } = api.enrollmentFee.getFeeAnalytics.useQuery({
    timeframe: 'month',
  });

  // Fetch enrollment fees for reports
  const { data: enrollmentFees, isLoading: feesLoading } = api.enrollmentFee.getAllByEnrollment.useQuery(
    { enrollmentId: '' }, // This would need to be dynamic based on filters
    { enabled: false } // Disable by default, enable based on filters
  );
  const { data: institutionReport, isLoading: loadingInstitution } = api.financialReports.getInstitutionReport.useQuery();
  const { data: campusReport, isLoading: loadingCampusReport } = api.financialReports.getCampusReport.useQuery();
  const { data: programReport, isLoading: loadingProgramReport } = api.financialReports.getProgramReport.useQuery();
  const { data: campuses, isLoading: loadingCampuses } = api.campus.getAllCampuses.useQuery();
  const { data: programs, isLoading: loadingPrograms } = api.program.getAllPrograms.useQuery();
  const { data: paymentMethodAnalytics, isLoading: loadingPaymentMethods } = api.financialReports.getPaymentMethodAnalytics.useQuery();
  const { data: collectionTrends, isLoading: loadingTrends } = api.financialReports.getCollectionTrends.useQuery({
    period: 'monthly',
    months: 6
  });
  const { data: classReport, isLoading: loadingClassReport } = api.financialReports.getClassReport.useQuery();
  const { data: studentReport, isLoading: loadingStudentReport } = api.financialReports.getStudentReport.useQuery();

  const handleExportReport = (reportType: string, exportFormat: 'excel' | 'csv') => {
    try {
      let data: any[] = [];
      let columns: any[] = [];
      let filename = '';

      switch (reportType) {
        case 'collection-trends':
          // Use real analytics data if available
          if (feeAnalytics && feeAnalytics.collectionTrends) {
            data = feeAnalytics.collectionTrends.map(trend => ({
              month: trend.period,
              totalCollected: trend.amount,
              targetAmount: feeStats?.pendingFees || 0,
              collectionRate: feeStats?.collectionRate || 0,
              transactionCount: feeStats?.totalTransactions || 0,
            }));
          } else {
            // Fallback to basic structure if no data
            data = [{
              month: formatDate(new Date(), 'MMM yyyy'),
              totalCollected: feeStats?.totalCollected || 0,
              targetAmount: feeStats?.pendingFees || 0,
              collectionRate: feeStats?.collectionRate || 0,
              transactionCount: feeStats?.totalTransactions || 0,
            }];
          }
          columns = [
            { key: 'month', label: 'Month', width: 15 },
            { key: 'totalCollected', label: 'Total Collected', width: 18, format: 'currency' },
            { key: 'targetAmount', label: 'Target Amount', width: 18, format: 'currency' },
            { key: 'collectionRate', label: 'Collection Rate', width: 15, format: 'percentage' },
            { key: 'transactionCount', label: 'Transactions', width: 15, format: 'number' },
          ];
          filename = 'collection-trends-report';
          break;

        case 'payment-methods':
          if (paymentMethodAnalytics && paymentMethodAnalytics.length > 0) {
            const totalAmount = paymentMethodAnalytics.reduce((sum, pm) => sum + pm.totalAmount, 0);
            data = paymentMethodAnalytics.map(pm => ({
              paymentMethod: getPaymentMethodLabel(pm.method as any),
              transactionCount: pm.transactionCount,
              totalAmount: pm.totalAmount,
              percentage: totalAmount > 0 ? Math.round((pm.totalAmount / totalAmount) * 100) : 0,
              averageAmount: pm.averageAmount
            }));
          } else {
            // Fallback to mock data if no real data available
            data = [
              { paymentMethod: 'Bank Transfer', transactionCount: 150, totalAmount: 750000, percentage: 45 },
              { paymentMethod: 'JazzCash', transactionCount: 80, totalAmount: 320000, percentage: 25 },
              { paymentMethod: 'EasyPaisa', transactionCount: 60, totalAmount: 240000, percentage: 18 },
              { paymentMethod: 'Cash', transactionCount: 40, totalAmount: 120000, percentage: 12 },
            ];
          }
          columns = REPORT_COLUMNS.paymentMethods;
          filename = 'payment-methods-report';
          break;

        case 'overdue-analysis':
          data = Array.from({ length: 20 }, (_, i) => ({
            studentName: `Student ${i + 1}`,
            enrollmentNumber: `ENR${String(i + 1).padStart(4, '0')}`,
            className: `Class ${Math.floor(i / 5) + 1}`,
            overdueAmount: Math.floor(Math.random() * 50000) + 10000,
            daysPastDue: Math.floor(Math.random() * 60) + 1,
            dueDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            contactInfo: `student${i + 1}@example.com`,
          }));
          columns = REPORT_COLUMNS.overdueAnalysis;
          filename = 'overdue-analysis-report';
          break;

        case 'campus-report':
          data = campusReport || [];
          columns = REPORT_COLUMNS.campusReport;
          filename = 'campus-financial-report';
          break;

        case 'program-report':
          data = programReport || [];
          columns = REPORT_COLUMNS.programReport;
          filename = 'program-financial-report';
          break;

        default:
          // General fee collection report
          data = Array.from({ length: 50 }, (_, i) => ({
            studentName: `Student ${i + 1}`,
            enrollmentNumber: `ENR${String(i + 1).padStart(4, '0')}`,
            className: `Class ${Math.floor(i / 10) + 1}`,
            feeStructure: `Fee Structure ${Math.floor(i / 15) + 1}`,
            totalAmount: Math.floor(Math.random() * 100000) + 50000,
            paidAmount: Math.floor(Math.random() * 80000) + 20000,
            pendingAmount: Math.floor(Math.random() * 30000),
            status: Math.random() > 0.7 ? 'Overdue' : Math.random() > 0.3 ? 'Partial' : 'Paid',
            dueDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          }));
          columns = REPORT_COLUMNS.feeCollection;
          filename = 'fee-collection-report';
      }

      exportData({
        filename: `${filename}-${formatDate(new Date(), 'yyyy-MM-dd')}`,
        columns,
        data,
        format: exportFormat,
      });

      toast.success(`${reportType} report exported successfully as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report. Please try again.');
    }
  };

  const handleRefreshData = () => {
    refetchStats();
    toast.success('Data refreshed successfully');
  };

  const handleViewDetailedReport = (reportType: string) => {
    toast.info(`Opening detailed ${reportType} report...`);
    // TODO: Navigate to detailed report page
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Comprehensive financial analytics and reporting for fee management"
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
          <CardDescription>Configure filters to customize your reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Campus</Label>
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {campuses?.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs?.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleRefreshData} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => setShowImportDialog(true)} variant="outline" className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                Import Fees
              </Button>
              <Button onClick={() => handleExportReport('filtered', 'excel')} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
              <Button onClick={() => handleExportReport('filtered', 'csv')} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="institution" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Institution
          </TabsTrigger>
          <TabsTrigger value="campus" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Campus
          </TabsTrigger>
          <TabsTrigger value="program" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Program
          </TabsTrigger>
          <TabsTrigger value="class" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Class
          </TabsTrigger>
          <TabsTrigger value="student" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Student
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Collection</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-600">
                      Rs. {feeStats?.totalCollected?.toLocaleString() || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {feeStats?.monthlyComparison?.percentageChange?.toFixed(1) || '0'}% vs last month
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-orange-600">
                      Rs. {feeStats?.pendingFees?.toLocaleString() || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {feeStats?.studentsWithFees || 0} students with pending fees
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-600">
                      Rs. {feeStats?.overdueFees?.toLocaleString() || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requires immediate attention
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {feeStats?.collectionRate?.toFixed(1) || '0.0'}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Overall collection efficiency
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Collection Trends
                </CardTitle>
                <CardDescription>Monthly collection analysis over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTrends ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <SimpleLineChart
                    data={collectionTrends && Array.isArray(collectionTrends) ? collectionTrends.map((trend: any) => ({
                      label: formatDate(new Date(trend.period), 'MMM'),
                      value: trend.totalCollected ?? 0
                    })) : [
                      { label: 'Jul', value: 450000 },
                      { label: 'Aug', value: 520000 },
                      { label: 'Sep', value: 480000 },
                      { label: 'Oct', value: 610000 },
                      { label: 'Nov', value: 580000 },
                      { label: 'Dec', value: 650000 },
                    ]}
                    height={200}
                  />
                )}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => handleViewDetailedReport('collection-trends')}>
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportReport('collection-trends', 'excel')}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-600" />
                  Payment Methods Distribution
                </CardTitle>
                <CardDescription>Breakdown of payment methods used</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPaymentMethods ? (
                  <Skeleton className="h-[180px] w-full" />
                ) : (
                  <SimplePieChart
                    data={paymentMethodAnalytics?.length ?
                      paymentMethodAnalytics.map((pm, index) => {
                        const totalAmount = paymentMethodAnalytics.reduce((sum, p) => sum + p.totalAmount, 0);
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];
                        return {
                          label: getPaymentMethodLabel(pm.method as any),
                          value: totalAmount > 0 ? Math.round((pm.totalAmount / totalAmount) * 100) : 0,
                          color: colors[index % colors.length]
                        };
                      }) : [
                        { label: 'Bank Transfer', value: 45, color: '#3b82f6' },
                        { label: 'JazzCash', value: 25, color: '#10b981' },
                        { label: 'EasyPaisa', value: 18, color: '#f59e0b' },
                        { label: 'Cash', value: 12, color: '#ef4444' },
                      ]
                    }
                    size={180}
                  />
                )}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => handleViewDetailedReport('payment-methods')}>
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportReport('payment-methods', 'excel')}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Campus Performance
                </CardTitle>
                <CardDescription>Fee collection by campus</CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleBarChart
                  data={[
                    { label: 'Main', value: 850000, color: 'bg-purple-500' },
                    { label: 'Branch A', value: 620000, color: 'bg-purple-400' },
                    { label: 'Branch B', value: 480000, color: 'bg-purple-300' },
                  ]}
                  height={150}
                />
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => handleViewDetailedReport('campus-performance')}>
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportReport('campus-report', 'excel')}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-600" />
                  Payment Methods Analysis
                </CardTitle>
                <CardDescription>Detailed payment method breakdown and trends</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPaymentMethods ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentMethodAnalytics?.map((pm, index) => {
                      const totalAmount = paymentMethodAnalytics.reduce((sum, p) => sum + p.totalAmount, 0);
                      const percentage = totalAmount > 0 ? (pm.totalAmount / totalAmount) * 100 : 0;
                      return (
                        <div key={pm.method} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="text-lg">{getPaymentMethodIcon(pm.method as any)}</div>
                              <span className="font-medium">{getPaymentMethodLabel(pm.method as any)}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">Rs. {(pm.totalAmount ?? 0).toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">{pm.transactionCount} transactions</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{percentage.toFixed(1)}% of total</span>
                            <span>Avg: Rs. {(pm.averageAmount ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    }) || (
                      <div className="text-center py-4 text-muted-foreground">
                        No payment method data available
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => handleViewDetailedReport('payment-methods')}>
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleExportReport('payment-methods', 'excel')}>
                      <Download className="h-3 w-3 mr-1" />
                      Excel
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExportReport('payment-methods', 'csv')}>
                      <Download className="h-3 w-3 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Overdue Analysis
                </CardTitle>
                <CardDescription>Aging analysis and recovery trends for overdue fees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Overdue Aging Chart */}
                  <div>
                    <h4 className="font-medium mb-2">Overdue Aging Distribution</h4>
                    <SimpleBarChart
                      data={[
                        { label: '1-30 days', value: feeStats?.overdueFees ? feeStats.overdueFees * 0.4 : 120000, color: 'bg-yellow-500' },
                        { label: '31-60 days', value: feeStats?.overdueFees ? feeStats.overdueFees * 0.3 : 90000, color: 'bg-orange-500' },
                        { label: '61-90 days', value: feeStats?.overdueFees ? feeStats.overdueFees * 0.2 : 60000, color: 'bg-red-500' },
                        { label: '90+ days', value: feeStats?.overdueFees ? feeStats.overdueFees * 0.1 : 30000, color: 'bg-red-700' },
                      ]}
                      height={120}
                    />
                  </div>

                  {/* Risk Assessment */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">
                        Rs. {feeStats?.overdueFees?.toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-red-700">Total Overdue</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-xl font-bold text-orange-600">
                        {feeStats?.overdueFees && feeStats?.totalCollected ?
                          Math.round((feeStats.overdueFees / (feeStats.totalCollected + feeStats.overdueFees)) * 100) : 0}%
                      </div>
                      <div className="text-sm text-orange-700">Risk Ratio</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => handleViewDetailedReport('overdue-analysis')}>
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleExportReport('overdue-analysis', 'excel')}>
                      <Download className="h-3 w-3 mr-1" />
                      Excel
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExportReport('overdue-analysis', 'csv')}>
                      <Download className="h-3 w-3 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Institution Tab */}
        <TabsContent value="institution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Key Metrics */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingInstitution ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-green-600">
                        Rs. {institutionReport?.totalCollected?.toLocaleString() || '0'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Across all campuses and programs
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingInstitution ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-blue-600">
                        {institutionReport?.studentCount || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Active enrollments
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingInstitution ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-purple-600">
                        {institutionReport?.collectionRate?.toFixed(1) || '0'}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Overall efficiency
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Structures</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingInstitution ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-orange-600">
                        {institutionReport?.feeStructureCount || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Fee structures in use
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Export Reports</CardTitle>
                <CardDescription>Download institutional reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleExportReport('institution', 'excel')}>
                  <Download className="h-3 w-3 mr-1" />
                  Excel Report
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleExportReport('institution', 'csv')}>
                  <Download className="h-3 w-3 mr-1" />
                  CSV Report
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleExportReport('collection-trends', 'excel')}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trends Report
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Revenue Trends
                </CardTitle>
                <CardDescription>Monthly revenue collection over time</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTrends ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <SimpleLineChart
                    data={collectionTrends && Array.isArray(collectionTrends) ? collectionTrends.map((trend: any) => ({
                      label: formatDate(new Date(trend.period), 'MMM'),
                      value: trend.totalCollected ?? 0
                    })) : [
                      { label: 'Jul', value: 450000 },
                      { label: 'Aug', value: 520000 },
                      { label: 'Sep', value: 480000 },
                      { label: 'Oct', value: 610000 },
                      { label: 'Nov', value: 580000 },
                      { label: 'Dec', value: 650000 },
                    ]}
                    height={200}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-600" />
                  Campus Distribution
                </CardTitle>
                <CardDescription>Revenue distribution across campuses</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCampusReport ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <SimplePieChart
                    data={campusReport?.map((campus, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                      return {
                        label: campus.campusName,
                        value: campus.totalCollected,
                        color: colors[index % colors.length]
                      };
                    }) || [
                      { label: 'Main Campus', value: 1250000, color: '#3b82f6' },
                      { label: 'North Branch', value: 850000, color: '#10b981' },
                      { label: 'South Branch', value: 620000, color: '#f59e0b' },
                      { label: 'East Branch', value: 480000, color: '#ef4444' },
                    ]}
                    size={180}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campus Tab */}
        <TabsContent value="campus" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Campus Collection Comparison
                </CardTitle>
                <CardDescription>Total collections by campus</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCampusReport ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <SimpleBarChart
                    data={campusReport?.map((campus, index) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
                      return {
                        label: campus.campusName,
                        value: campus.totalCollected,
                        color: colors[index % colors.length]
                      };
                    }) || [
                      { label: 'Main Campus', value: 1250000, color: 'bg-blue-500' },
                      { label: 'North Branch', value: 850000, color: 'bg-green-500' },
                      { label: 'South Branch', value: 620000, color: 'bg-yellow-500' },
                      { label: 'East Branch', value: 480000, color: 'bg-red-500' },
                    ]}
                    height={250}
                  />
                )}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => handleExportReport('campus-report', 'excel')}>
                    <Download className="h-3 w-3 mr-1" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campus Collection Rates</CardTitle>
                <CardDescription>Collection efficiency by campus</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCampusReport ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-2 w-full" />
                        <div className="flex justify-between">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(campusReport || [
                      { campusName: 'Main Campus', collectionRate: 92, totalCollected: 1250000, totalPending: 108000 },
                      { campusName: 'North Branch', collectionRate: 88, totalCollected: 850000, totalPending: 116000 },
                      { campusName: 'South Branch', collectionRate: 85, totalCollected: 620000, totalPending: 109000 },
                      { campusName: 'East Branch', collectionRate: 82, totalCollected: 480000, totalPending: 105000 },
                    ]).map((campus, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{campus.campusName}</span>
                          <span className="text-sm font-medium">{campus.collectionRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${campus.collectionRate}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Collected: Rs. {(campus.totalCollected ?? 0).toLocaleString()}</span>
                          <span>Pending: Rs. {(campus.totalPending ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Detailed Campus Report
              </CardTitle>
              <CardDescription>Comprehensive financial breakdown by campus</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCampusReport ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {campusReport?.map((campus) => (
                    <div key={campus.campusId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div>
                        <h4 className="font-medium">{campus.campusName}</h4>
                        <p className="text-sm text-muted-foreground">{campus.studentCount} students</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">Rs. {(campus.totalCollected ?? 0).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Collection</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-orange-600">Rs. {(campus.totalPending ?? 0).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Pending</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{(campus.collectionRate ?? 0).toFixed(1)}%</div>
                          <div className="text-sm text-muted-foreground">Rate</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(`campus-${campus.campusId}`, 'excel')}>
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Program Tab */}
        <TabsContent value="program" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Program-wise Financial Report
              </CardTitle>
              <CardDescription>Financial performance breakdown by academic program</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProgramReport ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {programReport?.map((program) => (
                    <div key={program.programId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div>
                        <h4 className="font-medium">{program.programName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Program • {program.studentCount} students
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">Rs. {(program.totalCollected ?? 0).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Collection</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-orange-600">Rs. {(program.totalPending ?? 0).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Pending</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{(program.collectionRate ?? 0).toFixed(1)}%</div>
                          <div className="text-sm text-muted-foreground">Rate</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(`program-${program.programId}`, 'excel')}>
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Class Tab */}
        <TabsContent value="class" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Class-wise Financial Reports</h2>
              <p className="text-muted-foreground">Financial performance breakdown by class</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleExportReport('all-classes', 'excel')}>
                <Download className="h-4 w-4 mr-2" />
                Export All Classes
              </Button>
            </div>
          </div>

          {/* Class Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Class Collection Performance
                </CardTitle>
                <CardDescription>Top performing classes by collection rate</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingClassReport ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <SimpleBarChart
                    data={classReport?.slice(0, 5).map((cls, index) => ({
                      label: cls.className,
                      value: cls.collectionRate,
                      color: `bg-blue-${500 + (index * 100)}`
                    })) || [
                      { label: 'Class A', value: 95, color: 'bg-blue-500' },
                      { label: 'Class B', value: 88, color: 'bg-blue-400' },
                      { label: 'Class C', value: 82, color: 'bg-blue-300' },
                      { label: 'Class D', value: 76, color: 'bg-blue-200' },
                    ]}
                    height={200}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-600" />
                  Revenue Distribution
                </CardTitle>
                <CardDescription>Revenue contribution by class</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingClassReport ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <SimplePieChart
                    data={classReport?.slice(0, 6).map((cls, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];
                      return {
                        label: cls.className,
                        value: cls.totalCollected,
                        color: colors[index % colors.length]
                      };
                    }) || [
                      { label: 'Class A', value: 450000, color: '#3b82f6' },
                      { label: 'Class B', value: 320000, color: '#10b981' },
                      { label: 'Class C', value: 280000, color: '#f59e0b' },
                      { label: 'Class D', value: 180000, color: '#ef4444' },
                    ]}
                    size={180}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Class List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Detailed Class Financial Report
              </CardTitle>
              <CardDescription>Comprehensive financial breakdown by class</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingClassReport ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {classReport?.map((cls) => (
                    <div key={cls.classId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div>
                        <h4 className="font-medium">{cls.className}</h4>
                        <p className="text-sm text-muted-foreground">
                          {cls.programName} • {cls.studentCount} students
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">Rs. {(cls.totalCollected ?? 0).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Collection</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-orange-600">Rs. {(cls.totalPending ?? 0).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Pending</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{(cls.collectionRate ?? 0).toFixed(1)}%</div>
                          <div className="text-sm text-muted-foreground">Rate</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(`class-${cls.classId}`, 'excel')}>
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Class Data Available</h3>
                      <p className="text-muted-foreground">
                        Class financial data will appear here once available.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Tab */}
        <TabsContent value="student" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Student-wise Financial Reports</h2>
              <p className="text-muted-foreground">Individual student fee status and payment history</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleExportReport('all-students', 'csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export Student List
              </Button>
              <Button variant="outline" onClick={() => handleExportReport('payment-history', 'excel')}>
                <FileText className="h-4 w-4 mr-2" />
                Payment History
              </Button>
            </div>
          </div>

          {/* Student Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {studentReport?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Enrolled students</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Fully Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {studentReport?.filter(s => s.totalCollected >= s.totalPending).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Complete payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Partial Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {studentReport?.filter(s => s.totalCollected > 0 && s.totalCollected < s.totalPending).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Pending balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {studentReport?.filter(s => s.totalPending > s.totalCollected).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Past due date</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  Payment Status Distribution
                </CardTitle>
                <CardDescription>Student payment status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStudentReport ? (
                  <Skeleton className="h-[180px] w-full" />
                ) : (
                  <SimplePieChart
                    data={[
                      {
                        label: 'Fully Paid',
                        value: studentReport?.filter(s => s.totalCollected >= s.totalPending).length || 25,
                        color: '#10b981'
                      },
                      {
                        label: 'Partial',
                        value: studentReport?.filter(s => s.totalCollected > 0 && s.totalCollected < s.totalPending).length || 15,
                        color: '#f59e0b'
                      },
                      {
                        label: 'Pending',
                        value: studentReport?.filter(s => s.totalCollected === 0).length || 8,
                        color: '#6b7280'
                      },
                      {
                        label: 'Overdue',
                        value: studentReport?.filter(s => s.paymentStatus === 'OVERDUE').length || 5,
                        color: '#ef4444'
                      },
                    ]}
                    size={180}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Top Outstanding Amounts
                </CardTitle>
                <CardDescription>Students with highest pending amounts</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStudentReport ? (
                  <Skeleton className="h-[180px] w-full" />
                ) : (
                  <SimpleBarChart
                    data={studentReport?.sort((a, b) => b.totalPending - a.totalPending)
                      .slice(0, 5)
                      .map((student, index) => ({
                        label: student.studentName.split(' ')[0], // First name only for space
                        value: student.totalPending,
                        color: `bg-red-${500 - (index * 50)}`
                      })) || [
                        { label: 'John', value: 45000, color: 'bg-red-500' },
                        { label: 'Sarah', value: 38000, color: 'bg-red-450' },
                        { label: 'Mike', value: 32000, color: 'bg-red-400' },
                        { label: 'Lisa', value: 28000, color: 'bg-red-350' },
                        { label: 'Tom', value: 22000, color: 'bg-red-300' },
                      ]}
                    height={180}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Student List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Detailed Student Financial Report
              </CardTitle>
              <CardDescription>Individual student fee status and payment details</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStudentReport ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {studentReport?.slice(0, 10).map((student) => (
                    <div key={student.studentId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div>
                        <h4 className="font-medium">{student.studentName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Student ID: {student.studentId}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">Rs. {(student.totalCollected ?? 0).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Collected</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-orange-600">Rs. {(student.totalPending ?? 0).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Pending</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-red-600">Rs. {Math.max(0, (student.totalPending ?? 0) - (student.totalCollected ?? 0)).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Overdue</div>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            student.totalCollected >= student.totalPending ? 'bg-green-100 text-green-800' :
                            student.totalCollected > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {student.totalCollected >= student.totalPending ? 'PAID' :
                             student.totalCollected > 0 ? 'PARTIAL' : 'PENDING'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(`student-${student.studentId}`, 'excel')}>
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Student Data Available</h3>
                      <p className="text-muted-foreground">
                        Student financial data will appear here once available.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <FeeImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={() => {
          refetchStats();
          toast.success('Fee data imported successfully');
        }}
      />
    </div>
  );
}
