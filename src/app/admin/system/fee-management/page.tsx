'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/trpc/react';
import {
  Plus,
  BarChart,
  FileText,
  Settings,
  Loader2,
  LayoutGrid,
  AlertCircle,
  Bell,
  Zap
} from 'lucide-react';
import { DollarSign } from '@/components/ui/icons/custom-icons';
import { format } from 'date-fns';
import { getPaymentMethodLabel, getPaymentMethodIcon } from '@/types/payment-methods';
import { DataTable } from '@/components/ui/data-display/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Eye, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function SystemFeeManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fee structures table columns
  const feeStructuresColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Structure Name',
    },
    {
      accessorKey: 'programCampus.program.name',
      header: 'Program',
    },
    {
      accessorKey: 'programCampus.campus.name',
      header: 'Campus',
    },
    {
      accessorKey: 'feeComponents',
      header: 'Total Amount',
      cell: ({ row }) => {
        const components = row.original.feeComponents;
        if (!components || !Array.isArray(components)) {
          return 'Rs. 0';
        }
        const total = components.reduce((sum: number, comp: any) => sum + (comp.amount || 0), 0);
        return `Rs. ${total.toLocaleString()}`;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/admin/system/fee-management/structures/${row.original.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/admin/system/fee-management/structures/${row.original.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Discount types table columns
  const discountTypesColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Discount Type',
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'discountValue',
      header: 'Value',
      cell: ({ row }) => {
        const value = row.original.discountValue;
        if (value === null || value === undefined) {
          return 'N/A';
        }
        return (
          <div className="flex items-center">
            {row.original.isPercentage ? (
              <>
                <span className="h-4 w-4 mr-1 inline-flex items-center justify-center">%</span>
                {value}%
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-1" />
                Rs. {value.toLocaleString()}
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/admin/system/fee-management/discount-types/${row.original.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/admin/system/fee-management/discount-types/${row.original.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Fetch fee collection statistics
  const { data: feeStats, isLoading: isLoadingFeeStats } = api.enrollmentFee.getFeeCollectionStats.useQuery();

  // Fetch fee structures
  const { data: feeStructures, isLoading: feeStructuresLoading } = api.feeStructure.getAll.useQuery();

  // Fetch discount types
  const { data: discountTypes, isLoading: discountTypesLoading } = api.discountType.getAll.useQuery();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Fee Management"
          description="Manage fee structures and student fees across all campuses"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/system/fee-management/unified')}
          >
            <Zap className="h-4 w-4 mr-2" />
            Unified Settings
          </Button>
          <Button onClick={() => router.push('/admin/system/fee-management/structures/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Fee Structure
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="discount-types">Discount Types</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Unified Settings Highlight */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Zap className="h-5 w-5" />
                New: Unified Fee Management Settings
              </CardTitle>
              <CardDescription className="text-blue-700">
                Streamlined configuration for all fee management operations in one place.
                No more scattered settings or duplicate configurations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push('/admin/system/fee-management/unified')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Open Unified Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin/system/fee-management/settings')}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Legacy Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Fee Collected</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFeeStats ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">Rs. {feeStats?.totalCollected.toLocaleString() || '0'}</div>
                    <p className="text-xs text-muted-foreground">Across all campuses</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFeeStats ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">Rs. {feeStats?.pendingFees.toLocaleString() || '0'}</div>
                    <p className="text-xs text-muted-foreground">Yet to be collected</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFeeStats ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {feeStats?.collectionRate?.toFixed(1) || '0.0'}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {feeStats?.monthlyComparison?.trend === 'up' && '↗ '}
                      {feeStats?.monthlyComparison?.trend === 'down' && '↘ '}
                      {feeStats?.monthlyComparison?.percentageChange?.toFixed(1) || '0'}% vs last month
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overdue Fees</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFeeStats ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-600">Rs. {feeStats?.overdueFees?.toLocaleString() || '0'}</div>
                    <p className="text-xs text-muted-foreground">Past due date</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFeeStats ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">Rs. {feeStats?.monthlyComparison?.currentMonth?.toLocaleString() || '0'}</div>
                    <p className="text-xs text-muted-foreground">Current month collection</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Fee Structures</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFeeStats ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{feeStats?.feeStructures || 0}</div>
                    <p className="text-xs text-muted-foreground">Active structures</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Discount Types</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFeeStats ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{feeStats?.discountTypes || 0}</div>
                    <p className="text-xs text-muted-foreground">Available discounts</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Collection Trends</CardTitle>
                <CardDescription>Monthly fee collection over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isLoadingFeeStats ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : feeStats?.collectionTrends && feeStats.collectionTrends.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-6 gap-2 text-xs">
                      {feeStats.collectionTrends.slice(-6).map((trend, index) => (
                        <div key={index} className="text-center">
                          <div className="font-medium">{trend.month}</div>
                          <div className="text-muted-foreground">Rs. {trend.amount.toLocaleString()}</div>
                          <div className="mt-2 bg-primary/20 rounded-full h-2">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{
                                width: `${Math.max(10, (trend.amount / Math.max(...feeStats.collectionTrends.map(t => t.amount))) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground flex items-center justify-center h-full">
                    <div>
                      <BarChart className="h-16 w-16 mx-auto mb-4" />
                      <p>No collection data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Distribution of payment methods used</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isLoadingFeeStats ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : feeStats?.paymentMethods && feeStats.paymentMethods.length > 0 ? (
                  <div className="space-y-4">
                    {feeStats.paymentMethods.map((method, index) => {
                      const totalAmount = feeStats.paymentMethods.reduce((sum, m) => sum + m.amount, 0);
                      const percentage = totalAmount > 0 ? (method.amount / totalAmount) * 100 : 0;
                      const methodLabel = getPaymentMethodLabel(method.method);
                      const methodIcon = getPaymentMethodIcon(method.method);
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{methodIcon}</span>
                              <span className="text-sm font-medium">{methodLabel}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              Rs. {method.amount.toLocaleString()} ({method.count} transactions)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(5, percentage)}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {percentage.toFixed(1)}% of total amount
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground flex items-center justify-center h-full">
                    <div>
                      <BarChart className="h-16 w-16 mx-auto mb-4" />
                      <p>No payment method data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Fee Transactions</CardTitle>
                <CardDescription>Latest fee payments across all campuses</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFeeStats ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center border-b pb-2">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-24" />
                      </div>
                    ))}
                  </div>
                ) : feeStats?.recentTransactions && feeStats.recentTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {feeStats.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <div className="font-medium">{transaction.studentName}</div>
                          <div className="text-xs text-muted-foreground">{transaction.campusName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">Rs. {transaction.amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(transaction.date), 'dd MMM yyyy')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No recent transactions found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common fee management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/system/fee-management/structures')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Manage Fee Structures
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/system/fee-management/discount-types')}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Manage Discount Types
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/system/fee-management/challan-designer')}>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Challan Designer
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/system/fee-management/bulk-challan')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Bulk Generate Challans
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/system/fee-management/reports')}>
                    <BarChart className="h-4 w-4 mr-2" />
                    Generate Reports
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/system/fee-management/settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Fee Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Student Fee Status</CardTitle>
                <CardDescription>Overview of student fee payment status</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFeeStats ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <h3 className="text-lg font-medium">Students with Fees</h3>
                        <p className="text-3xl font-bold mt-2">{feeStats?.studentsWithFees || 0}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <h3 className="text-lg font-medium">Students without Fees</h3>
                        <p className="text-3xl font-bold mt-2">{feeStats?.studentsWithoutFees || 0}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Fee Payment Status</h3>
                        <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                          {feeStats?.totalCollected !== undefined && feeStats?.pendingFees !== undefined && (
                            <div
                              className="bg-primary h-full transition-all duration-300"
                              style={{
                                width: `${Math.round((feeStats.totalCollected / (feeStats.totalCollected + feeStats.pendingFees)) * 100)}%`
                              }}
                            />
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>Received: Rs. {feeStats?.totalCollected.toLocaleString() || 0}</span>
                          <span>Pending: Rs. {feeStats?.pendingFees.toLocaleString() || 0}</span>
                        </div>
                      </div>

                      {feeStats?.overdueFees && feeStats.overdueFees > 0 && (
                        <div>
                          <h3 className="text-sm font-medium mb-2 text-red-600">Overdue Fees Alert</h3>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-red-800">Amount Overdue</span>
                              <span className="text-sm font-bold text-red-800">Rs. {feeStats.overdueFees.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-red-600 mt-1">Requires immediate attention</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="structures" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fee Structures</CardTitle>
                <CardDescription>
                  {feeStructuresLoading
                    ? 'Loading fee structures...'
                    : `Showing ${feeStructures?.length || 0} fee structures`}
                </CardDescription>
              </div>
              <Button onClick={() => router.push('/admin/system/fee-management/structures/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Structure
              </Button>
            </CardHeader>
            <CardContent>
              {feeStructuresLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : feeStructures && feeStructures.length > 0 ? (
                <DataTable
                  columns={feeStructuresColumns}
                  data={feeStructures}
                  searchColumn="name"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No fee structures found. Create your first fee structure to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discount-types" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Discount Types</CardTitle>
                <CardDescription>
                  {discountTypesLoading
                    ? 'Loading discount types...'
                    : `Showing ${discountTypes?.length || 0} discount types`}
                </CardDescription>
              </div>
              <Button onClick={() => router.push('/admin/system/fee-management/discount-types/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Discount Type
              </Button>
            </CardHeader>
            <CardContent>
              {discountTypesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : discountTypes && discountTypes.length > 0 ? (
                <DataTable
                  columns={discountTypesColumns}
                  data={discountTypes}
                  searchColumn="name"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No discount types found. Create your first discount type to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/system/fee-management/reports')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Financial Reports
                </CardTitle>
                <CardDescription>Comprehensive financial analytics and reporting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">View detailed reports</span>
                  <Button size="sm" variant="outline">
                    View Reports
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/system/fee-management/settings')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Fee Settings
                </CardTitle>
                <CardDescription>Configure fee structures, discount types, and payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Manage configurations</span>
                  <Button size="sm" variant="outline">
                    Open Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common fee management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/system/fee-management/structures/new')}>
                    <Plus className="h-3 w-3 mr-2" />
                    New Fee Structure
                  </Button>
                  <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => router.push('/admin/system/fee-management/discount-types/new')}>
                    <Plus className="h-3 w-3 mr-2" />
                    New Discount Type
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/system/fee-management/settings')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>Configure currency, due dates, and receipt settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Manage fee configurations</span>
                  <Button size="sm" variant="outline">
                    Open Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/system/fee-management/settings?tab=late-fees')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Late Fee Policies
                </CardTitle>
                <CardDescription>Configure late fee policies and automated processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Manage late fee rules</span>
                  <Button size="sm" variant="outline">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/system/fee-management/settings?tab=notifications')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>Configure automated notifications and reminders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Setup notifications</span>
                  <Button size="sm" variant="outline">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
