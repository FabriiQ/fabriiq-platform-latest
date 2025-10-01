'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronLeft,
  Edit,
  ArrowRight,
  Calendar,
  User,
  GraduationCap,
  BookOpen,
  Clock,
  FileText,
  Mail,
  MapPin,
  Trash,
  Plus,
  Eye,
  CheckCircle,
  Download,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import {
  Building2,
  Phone as PhoneIcon,
  DollarSign
} from '@/components/ui/icons/lucide-icons';
import { api } from '@/trpc/react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { StudentTransferDialog } from '@/components/shared/entities/students/StudentTransferDialog';
import { FeeAssignmentDialog } from '@/components/admin/system/enrollment/FeeAssignmentDialog';
import { DiscountApplicationDialog } from '@/components/admin/system/enrollment/DiscountApplicationDialog';
import { ChallanGenerationDialog } from '@/components/admin/system/enrollment/ChallanGenerationDialog';
import { DocumentUploadDialog } from '@/components/admin/system/enrollment/DocumentUploadDialog';
import { LateFeeWaiverDialog } from '@/components/shared/entities/fee/late-fee-waiver-dialog';

import { PaymentStatusUpdateDialog } from '@/components/admin/system/enrollment/PaymentStatusUpdateDialog';
import { StudentProfileView } from '@/components/shared/entities/students/StudentProfileView';
import { UserRole, StudentTab } from '@/components/shared/entities/students/types';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

// Define EnrollmentStatus enum locally since it's not properly exported from Prisma client
enum EnrollmentStatus {
  ACTIVE = "ACTIVE",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  WITHDRAWN = "WITHDRAWN",
  INACTIVE = "INACTIVE"
}

export default function EnrollmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const enrollmentId = params?.id as string;

  // Dialog states
  const [feeAssignmentOpen, setFeeAssignmentOpen] = useState(false);
  const [discountApplicationOpen, setDiscountApplicationOpen] = useState(false);
  const [challanGenerationOpen, setChallanGenerationOpen] = useState(false);
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);

  const [paymentStatusUpdateOpen, setPaymentStatusUpdateOpen] = useState(false);
  const [lateFeeWaiverOpen, setLateFeeWaiverOpen] = useState(false);

  // Fetch enrollment details
  const { data: enrollmentData, isLoading, error, refetch: refetchEnrollment } = api.enrollment.getEnrollment.useQuery(
    { id: enrollmentId },
    { enabled: !!enrollmentId }
  );

  const enrollment = enrollmentData?.enrollment;

  // Fetch data for transfer dialog
  const { data: currentClasses } = api.enrollment.getEnrollmentsByStudent.useQuery(
    { studentId: enrollment?.student?.id || '' },
    { enabled: !!enrollment?.student?.id }
  );

  const { data: availableClasses } = api.class.getAllClasses.useQuery(
    undefined,
    { enabled: !!enrollment?.class }
  );

  const { data: availableCampuses } = api.campus.getAllCampuses.useQuery();

  // Fee management queries - get all fees for this enrollment
  const { data: enrollmentFees, refetch: refetchFees } = api.enrollmentFee.getAllByEnrollment.useQuery(
    { enrollmentId },
    { enabled: !!enrollmentId }
  );

  // For backward compatibility, get the first fee
  const enrollmentFee = enrollmentFees && enrollmentFees.length > 0 ? enrollmentFees[0] : null;

  const { data: feeStructures, isLoading: feeStructuresLoading, error: feeStructuresError } = api.feeStructure.getByProgramCampus.useQuery(
    { programCampusId: enrollment?.class?.programCampusId || '' },
    { enabled: !!enrollment?.class?.programCampusId }
  );

  // Debug logging for fee structures
  console.log('Fee Structures Debug:', {
    programCampusId: enrollment?.class?.programCampusId,
    feeStructures,
    feeStructuresLoading,
    feeStructuresError: feeStructuresError?.message,
    enrollmentClass: enrollment?.class
  });

  const { data: discountTypes } = api.discountType.getAll.useQuery();

  // Get institution ID from enrollment or session
  const institutionId = enrollment?.class?.programCampusId ||
                       enrollment?.class?.courseCampus?.id ||
                       session?.user?.primaryCampusId ||
                       'default';

  const { data: challanTemplates, isLoading: challanTemplatesLoading, error: challanTemplatesError } = api.challan.getTemplatesByInstitution.useQuery(
    { institutionId },
    { enabled: !!institutionId }
  );



  // Invoice queries
  const { data: invoicesData, refetch: refetchInvoices } = api.invoice.getByStudent.useQuery(
    { studentId: enrollment?.student?.id || '', limit: 20 },
    { enabled: !!enrollment?.student?.id }
  );

  // Comprehensive enrollment history query
  const { data: enrollmentHistoryData } = api.enrollment.getEnrollmentHistory.useQuery(
    {
      enrollmentId: enrollmentId,
      limit: 50
    },
    { enabled: !!enrollmentId }
  );

  // Fee management mutations
  const assignFeeMutation = api.enrollmentFee.create.useMutation({
    onSuccess: async () => {
      toast({
        title: "Fee Assigned",
        description: "Fee structure has been successfully assigned.",
      });
      setFeeAssignmentOpen(false);

      // Invalidate and refetch related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enrollmentFee'] }),
        queryClient.invalidateQueries({ queryKey: ['enrollment'] }),
        refetchFees(),
        refetchEnrollment(),
      ]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const recalculateFeeMutation = api.enrollmentFee.recalculateFee.useMutation({
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Fee amounts recalculated successfully.",
      });

      // Invalidate and refetch related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enrollmentFee'] }),
        queryClient.invalidateQueries({ queryKey: ['enrollment'] }),
        refetchFees(),
        refetchEnrollment(),
      ]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const applyDiscountMutation = api.enrollmentFee.addDiscount.useMutation({
    onSuccess: async () => {
      toast({
        title: "Discount Applied",
        description: "Discount has been successfully applied.",
      });
      setDiscountApplicationOpen(false);

      // Invalidate and refetch related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enrollmentFee'] }),
        queryClient.invalidateQueries({ queryKey: ['enrollment'] }),
        refetchFees(),
        refetchEnrollment(),
      ]);
    },
    onError: (error) => {
      console.error('Discount application error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to apply discount. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateChallanMutation = api.challan.generate.useMutation({
    onSuccess: () => {
      toast({
        title: "Challan Generated",
        description: "Fee challan has been successfully generated.",
      });
      refetchFees();
      setChallanGenerationOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Invoice mutations
  const generateInvoiceMutation = api.invoice.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Invoice Generated",
        description: "Invoice has been successfully generated.",
      });
      refetchInvoices();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateInvoicePDFMutation = api.invoice.generatePDF.useMutation({
    onSuccess: (data) => {
      // Open PDF in new tab
      window.open(data.pdfUrl, '_blank');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFeePaymentStatusMutation = api.enrollmentFee.updatePaymentStatus.useMutation({
    onSuccess: async () => {
      toast({
        title: "Payment Status Updated",
        description: "Fee payment status has been successfully updated.",
      });

      // Close the dialog first
      setPaymentStatusUpdateOpen(false);

      // Invalidate and refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enrollmentFee'] }),
        queryClient.invalidateQueries({ queryKey: ['enrollment'] }),
        queryClient.invalidateQueries({ queryKey: ['feeTransaction'] }),
        refetchFees(),
        refetchEnrollment(),
      ]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleAssignFee = (data: any) => {
    assignFeeMutation.mutate({
      enrollmentId,
      ...data,
    });
  };

  const handleApplyDiscount = (data: any) => {
    if (!enrollmentFee?.id) return;

    console.log('Applying discount with data:', data);

    // Ensure we have the required fields
    if (!data.amount || data.amount <= 0) {
      toast({
        title: "Error",
        description: "Invalid discount amount",
        variant: "destructive",
      });
      return;
    }

    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "User session not found",
        variant: "destructive",
      });
      return;
    }

    applyDiscountMutation.mutate({
      enrollmentFeeId: enrollmentFee.id,
      discountTypeId: data.discountTypeId,
      amount: data.amount,
      reason: data.reason,
      createdById: session.user.id,
    });
  };

  const handleGenerateChallan = (data: any) => {
    if (!enrollmentFee?.id) return;
    generateChallanMutation.mutate({
      enrollmentFeeId: enrollmentFee.id,
      ...data,
    });
  };

  const printChallanMutation = api.challan.print.useMutation({
    onSuccess: (data) => {
      // Open the print URL in a new window
      if (data.printUrl) {
        window.open(data.printUrl, '_blank');
      }
      toast({
        title: "Challan Ready",
        description: "Challan is ready for printing.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to prepare challan for printing.",
        variant: "destructive",
      });
    },
  });

  const handlePrintChallan = (challanId: string) => {
    printChallanMutation.mutate({ id: challanId });
  };

  const handleEmailChallan = (challanId: string, email: string) => {
    // In a real implementation, this would call the email API
    toast({
      title: "Challan Emailed",
      description: `Challan has been sent to ${email}`,
    });
  };

  // Invoice handlers
  const handleGenerateInvoice = () => {
    if (!enrollment?.student?.id || !enrollmentFee) return;

    generateInvoiceMutation.mutate({
      studentId: enrollment.student.id,
      enrollmentId: enrollmentId,
      feeStructureId: enrollmentFee.feeStructureId,
      invoiceType: 'TUITION_FEE',
      title: `Tuition Fee - ${enrollment.class?.name}`,
      description: `Tuition fee for ${enrollment.student.user?.name} in ${enrollment.class?.name}`,
      lineItems: [{
        description: 'Tuition Fee',
        quantity: 1,
        unitPrice: enrollmentFee.finalAmount,
        totalAmount: enrollmentFee.finalAmount
      }],
      subtotal: enrollmentFee.baseAmount,
      discountAmount: enrollmentFee.discountedAmount,
      totalAmount: enrollmentFee.finalAmount,
      dueDate: enrollmentFee.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paymentTerms: 'Payment due within 30 days'
    });
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    generateInvoicePDFMutation.mutate({ id: invoiceId });
  };

  const handleShareInvoice = (invoiceId: string, email: string) => {
    // In a real implementation, this would call the email API
    toast({
      title: "Invoice Shared",
      description: `Invoice has been sent to ${email}`,
    });
  };

  const handleUpdateFeePaymentStatus = (data: any) => {
    updateFeePaymentStatusMutation.mutate(data, {
      onSuccess: () => {
        // Note: Automatic invoice generation disabled due to missing Invoice table
        // TODO: Enable after running database migration to create Invoice table
        if (data.paymentStatus === 'PAID' && enrollmentFee) {
          toast({
            title: "Payment Status Updated",
            description: "Fee marked as paid. You can manually generate an invoice from the Invoices tab.",
          });
          // handleGenerateInvoice(); // Disabled temporarily
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !enrollment) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Enrollment Not Found</h1>
            <p className="text-muted-foreground">The requested enrollment could not be found</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              The enrollment you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button asChild className="mt-4">
              <Link href="/admin/system/enrollment">Back to Enrollments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'WITHDRAWN': return 'bg-red-100 text-red-800';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Use real enrollment fee data for payment information
  const payment = enrollmentFee ? {
    id: enrollmentFee.id,
    enrollmentId,
    amount: enrollmentFee.finalAmount,
    dueDate: enrollmentFee.dueDate,
    paymentStatus: enrollmentFee.paymentStatus,
    paymentMethod: enrollmentFee.paymentMethod || 'Not specified',
    notes: enrollmentFee.notes || 'No payment notes available',
    transactions: enrollmentFee.transactions || []
  } : null;

  // Use comprehensive enrollment history data
  const history = enrollmentHistoryData?.history || [];

  // Mock enrollment documents (would be replaced with real API call)
  const documents = [
    {
      id: 'mock-doc-1',
      enrollmentId,
      name: 'Enrollment Form',
      type: 'Application',
      url: '#',
      fileSize: 1024,
      createdAt: new Date(),
    }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/system/enrollment">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Enrollment Details</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={async () => {
              await Promise.all([
                refetchEnrollment(),
                refetchFees()
              ]);
              toast({
                title: "Refreshed",
                description: "Enrollment data has been refreshed.",
              });
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/system/enrollment/${enrollmentId}/edit`}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Link>
          </Button>
          <Button variant="destructive">
            <Trash className="mr-2 h-4 w-4" /> Cancel Enrollment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Enrollment Information</CardTitle>
                  <CardDescription>Details about this enrollment</CardDescription>
                </div>
                <Badge
                  variant={
                    enrollment.status === "ACTIVE" ? "success" :
                    enrollment.status === "PENDING" ? "warning" :
                    enrollment.status === "COMPLETED" ? "default" :
                    "destructive"
                  }
                >
                  {enrollment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Class</h3>
                  <p className="text-lg font-medium">{enrollment.class?.name}</p>
                  <p className="text-sm text-muted-foreground">{enrollment.class?.programCampus?.program?.name || 'No program'}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Enrollment Period</h3>
                  <p className="text-lg font-medium">{format(new Date(enrollment.startDate), "MMMM d, yyyy")}</p>
                  {enrollment.endDate && (
                    <p className="text-sm text-muted-foreground">
                      to {format(new Date(enrollment.endDate), "MMMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Campus & Program</h3>
                <div className="flex items-start space-x-3 p-3 rounded-md bg-muted">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Campus Information</p>
                    <p className="text-sm text-muted-foreground">
                      {enrollment.class?.programCampus?.program?.name}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Notes</h3>
                <p className="text-sm">
                  No notes available for this enrollment.
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="payment" className="w-full">
            <TabsList className="grid w-full max-w-lg grid-cols-5">
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="fee">Fee</TabsTrigger>
            </TabsList>

            <TabsContent value="payment">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Payment Status</CardTitle>
                      <CardDescription>Fee payment status and transaction history</CardDescription>
                    </div>
                    {enrollmentFee && (
                      <Badge
                        variant={
                          enrollmentFee.paymentStatus === "PAID" ? "success" :
                          enrollmentFee.paymentStatus === "PARTIAL" ? "secondary" :
                          enrollmentFee.paymentStatus === "WAIVED" ? "outline" :
                          "warning"
                        }
                      >
                        {enrollmentFee.paymentStatus}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {enrollmentFee ? (
                    <>
                      {/* Payment Status Summary */}
                      <div className="rounded-lg border p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Payment Summary</h4>
                          <Badge
                            variant={
                              enrollmentFee.paymentStatus === "PAID" ? "success" :
                              enrollmentFee.paymentStatus === "PARTIAL" ? "secondary" :
                              enrollmentFee.paymentStatus === "WAIVED" ? "outline" :
                              "warning"
                            }
                          >
                            {enrollmentFee.paymentStatus}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">${enrollmentFee.finalAmount.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">Total Amount</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              ${(enrollmentFee.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Paid Amount</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              ${Math.max(0, enrollmentFee.finalAmount - (enrollmentFee.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0)).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Remaining</div>
                          </div>
                        </div>
                      </div>

                      {enrollmentFee.dueDate && (
                        <>
                          <Separator />
                          <div className="space-y-1">
                            <h3 className="text-sm font-medium text-muted-foreground">Due Date</h3>
                            <p className="text-lg font-medium">
                              {format(new Date(enrollmentFee.dueDate), "MMMM d, yyyy")}
                            </p>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          {enrollmentFee.paymentStatus === 'PENDING' ? 'Payment Status' : 'Latest Payment'}
                        </h3>
                        {enrollmentFee.transactions && enrollmentFee.transactions.length > 0 ? (
                          <div className="space-y-3">
                            {/* Show only the latest transaction for paid fees, or all for pending */}
                            {(enrollmentFee.paymentStatus === 'PENDING' ?
                              enrollmentFee.transactions :
                              enrollmentFee.transactions.slice(-1)
                            ).map((transaction) => (
                              <div key={transaction.id} className="flex items-start justify-between p-3 rounded-md bg-muted">
                                <div className="flex items-start space-x-3">
                                  <Calendar className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="font-medium">{format(new Date(transaction.date), "MMMM d, yyyy")}</p>
                                    <p className="text-sm text-muted-foreground">{transaction.method}</p>
                                    {transaction.reference && (
                                      <p className="text-xs text-muted-foreground">Ref: {transaction.reference}</p>
                                    )}
                                  </div>
                                </div>
                                <p className="font-medium">${transaction.amount.toFixed(2)}</p>
                              </div>
                            ))}
                            {enrollmentFee.transactions.length > 1 && enrollmentFee.paymentStatus !== 'PENDING' && (
                              <p className="text-xs text-muted-foreground text-center">
                                {enrollmentFee.transactions.length - 1} more transaction(s) - View in Fee tab for complete history
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-2">No payment transactions recorded</p>
                            {enrollmentFee.paymentStatus === 'PENDING' && (
                              <p className="text-xs text-muted-foreground">
                                Click "Update Payment Status" below to record a payment
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {enrollmentFee.notes && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Notes</h3>
                            <p className="text-sm">{enrollmentFee.notes}</p>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No fee assigned to this enrollment</p>
                      <Button className="mt-4" onClick={() => setFeeAssignmentOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Assign Fee
                      </Button>
                    </div>
                  )}
                </CardContent>

                {/* Show action buttons when there are existing fees */}
                {enrollmentFees && enrollmentFees.length > 0 && (
                  <CardFooter className="border-t bg-gray-50 dark:bg-gray-900">
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setFeeAssignmentOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Assign Additional Fee
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setPaymentStatusUpdateOpen(true)}
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Update Payment Status
                      </Button>
                    </div>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <div className="space-y-6">
                {/* Invoice Overview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Student Invoices</CardTitle>
                        <CardDescription>All invoices generated for this enrollment</CardDescription>
                      </div>
                      <Button onClick={handleGenerateInvoice} disabled={generateInvoiceMutation.isLoading}>
                        <Plus className="mr-2 h-4 w-4" />
                        {generateInvoiceMutation.isLoading ? 'Generating...' : 'Generate Invoice'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Invoice Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 rounded-lg bg-blue-50">
                        <div className="text-2xl font-bold text-blue-600">
                          {invoicesData?.invoices?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Invoices</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-green-50">
                        <div className="text-2xl font-bold text-green-600">
                          {invoicesData?.invoices?.filter(inv => inv.status === 'PAID').length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Paid</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-yellow-50">
                        <div className="text-2xl font-bold text-yellow-600">
                          {invoicesData?.invoices?.filter(inv => inv.status === 'PENDING').length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-red-50">
                        <div className="text-2xl font-bold text-red-600">
                          {invoicesData?.invoices?.filter(inv => inv.status === 'OVERDUE').length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Overdue</div>
                      </div>
                    </div>

                    {/* Invoice List */}
                    <div className="space-y-3">
                      {invoicesData?.invoices && invoicesData.invoices.length > 0 ? (
                        invoicesData.invoices.map((invoice) => (
                          <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <FileText className="h-8 w-8 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{invoice.invoiceNumber}</p>
                                  <Badge className={
                                    invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                    invoice.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                    invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {invoice.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  {invoice.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Issued: {format(new Date(invoice.issueDate), "MMM d, yyyy")} •
                                  Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold">
                                  Rs. {Number(invoice.totalAmount).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Button variant="ghost" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadInvoice(invoice.id)}
                                disabled={generateInvoicePDFMutation.isLoading}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShareInvoice(invoice.id, enrollment?.student?.user?.email || '')}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Share
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">No invoices generated</h3>
                          <p className="text-muted-foreground mb-6">
                            Generate the first invoice for this enrollment
                          </p>
                          <Button onClick={handleGenerateInvoice} disabled={generateInvoiceMutation.isLoading}>
                            <Plus className="mr-2 h-4 w-4" />
                            {generateInvoiceMutation.isLoading ? 'Generating...' : 'Generate First Invoice'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Enrollment History</CardTitle>
                  <CardDescription>Complete history of enrollment activities, payments, and changes</CardDescription>
                </CardHeader>
                <CardContent>
                  {history && history.length > 0 ? (
                    <div className="space-y-4">
                      {history.map((entry) => (
                        <div key={entry.id} className="border-l-2 border-primary pl-4 pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                entry.type === 'PAYMENT_TRANSACTION' ? 'bg-green-100 text-green-800' :
                                entry.type === 'FEE_CREATED' ? 'bg-blue-100 text-blue-800' :
                                entry.type === 'PAYMENT_STATUS_CHANGE' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.type?.replace('_', ' ') || 'ACTIVITY'}
                              </span>
                              <p className="font-medium">{entry.action}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            by {entry.createdBy?.name || 'System'}
                          </p>
                          <p className="text-sm mt-2">
                            {entry.description}
                          </p>
                          {entry.details && Object.keys(entry.details).length > 0 && (
                            <div className="text-xs mt-2 p-2 bg-muted rounded">
                              <strong>Details:</strong>
                              <div className="mt-1 space-y-1">
                                {Object.entries(entry.details).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">
                        <p className="mb-2">No history available</p>
                        <p className="text-sm">Activity history will appear here as actions are performed on this enrollment.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <div className="space-y-6">

                {/* Document List */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Uploaded Documents</CardTitle>
                        <CardDescription>All documents related to this enrollment</CardDescription>
                      </div>
                      <Button onClick={() => setDocumentUploadOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Upload Document
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {documents && documents.length > 0 ? (
                      <div className="space-y-4">
                        {/* Document Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {documents.filter(d => d.type === 'REQUIRED').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Required</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {documents.filter(d => d.type === 'ACADEMIC').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Academic</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {documents.filter(d => d.type === 'OTHER').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Other</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {documents.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Total</div>
                          </div>
                        </div>

                        {/* Document Items */}
                        <div className="space-y-3">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                  <FileText className="h-8 w-8 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium">{doc.name}</p>
                                    <Badge variant="outline" className="text-xs">
                                      {doc.type || 'Document'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Uploaded on {format(new Date(doc.createdAt), "MMM d, yyyy")} • {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'Unknown size'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={doc.url} target="_blank">
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                  </Link>
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No documents uploaded</h3>
                        <p className="text-muted-foreground mb-6">
                          Start by uploading the required enrollment documents
                        </p>
                        <Button onClick={() => setDocumentUploadOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Upload First Document
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="fee">
              <div className="space-y-6">
                {/* Fee Status Overview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Fee Management</CardTitle>
                        <CardDescription>Manage enrollment fees, discounts, and payments</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/system/enrollment/${enrollmentId}/fee`)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Manage Fees
                        </Button>
                        {enrollmentFee ? (
                          <Badge className={
                            enrollmentFee.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                            enrollmentFee.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                            enrollmentFee.paymentStatus === 'PENDING' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {enrollmentFee.paymentStatus}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">No Fee Assigned</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {enrollmentFee ? (
                      <div className="space-y-4">
                        {/* Fee Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold text-blue-600">
                              Rs. {enrollmentFee.baseAmount.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Base Amount</div>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold text-green-600">
                              Rs. {(enrollmentFee.baseAmount - enrollmentFee.finalAmount).toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Discount</div>
                          </div>
                          <div className="text-center p-4 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold text-purple-600">
                              Rs. {enrollmentFee.finalAmount.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Final Amount</div>
                          </div>
                        </div>

                        {/* Fee Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <Button
                            variant="outline"
                            className="h-auto p-4"
                            onClick={() => setDiscountApplicationOpen(true)}
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <DollarSign className="h-6 w-6" />
                              <div className="text-center">
                                <div className="font-medium">Apply Discount</div>
                                <div className="text-xs text-muted-foreground">
                                  Recurring or one-time
                                </div>
                              </div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-auto p-4"
                            onClick={() => setChallanGenerationOpen(true)}
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <CheckCircle className="h-6 w-6" />
                              <div className="text-center">
                                <div className="font-medium">Generate Challan</div>
                                <div className="text-xs text-muted-foreground">
                                  Create fee payment slip
                                </div>
                              </div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-auto p-4"
                            onClick={() => {
                              if (enrollmentFee?.challans && enrollmentFee.challans.length > 0) {
                                // Get the latest challan
                                const latestChallan = enrollmentFee.challans[0];
                                handlePrintChallan(latestChallan.id);
                              } else {
                                toast({
                                  title: "No Challan Available",
                                  description: "Please generate a challan first.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <Download className="h-6 w-6" />
                              <div className="text-center">
                                <div className="font-medium">Download Challan</div>
                                <div className="text-xs text-muted-foreground">
                                  Download fee slip
                                </div>
                              </div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            className="h-auto p-4"
                            onClick={() => window.open(`/admin/system/enrollment/${enrollment.id}/fee`, '_blank')}
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <FileText className="h-6 w-6" />
                              <div className="text-center">
                                <div className="font-medium">Fee Details</div>
                                <div className="text-xs text-muted-foreground">
                                  View detailed fee info
                                </div>
                              </div>
                            </div>
                          </Button>

                          {/* Show Waive Late Fee button if fee is overdue */}
                          {enrollmentFee.paymentStatus === 'OVERDUE' && (
                            <Button
                              variant="outline"
                              className="h-auto p-4 border-orange-200 hover:bg-orange-50"
                              onClick={() => setLateFeeWaiverOpen(true)}
                            >
                              <div className="flex flex-col items-center space-y-2">
                                <AlertTriangle className="h-6 w-6 text-orange-600" />
                                <div className="text-center">
                                  <div className="font-medium text-orange-700">Waive Late Fee</div>
                                  <div className="text-xs text-orange-600">
                                    Request fee waiver
                                  </div>
                                </div>
                              </div>
                            </Button>
                          )}
                        </div>

                        {/* Fee Details */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Fee Structure Details</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => recalculateFeeMutation.mutate({ enrollmentFeeId: enrollmentFee.id })}
                              disabled={recalculateFeeMutation.isLoading}
                            >
                              {recalculateFeeMutation.isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Recalculating...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Recalculate
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="rounded-lg border p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{enrollmentFee.feeStructure?.name}</span>
                              <span className="text-sm text-muted-foreground">
                                Due: {enrollmentFee.dueDate ? format(new Date(enrollmentFee.dueDate), 'PPP') : 'Not set'}
                              </span>
                            </div>
                            {enrollmentFee.notes && (
                              <p className="text-sm text-muted-foreground">{enrollmentFee.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="space-y-4">
                          <div className="text-muted-foreground">
                            No fee structure has been assigned to this enrollment yet.
                          </div>
                          <Button onClick={() => setFeeAssignmentOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Assign Fee Structure
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          {enrollment.student && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Student Information</CardTitle>
                    <CardDescription>Student details and profile</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/admin/system/students/${enrollment.student.user?.id || enrollment.student.id}`, '_blank')}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Profile
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {enrollment.student.user?.name?.substring(0, 2).toUpperCase() || 'ST'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {enrollment.student.user?.name || 'Unknown Student'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {enrollment.student.user?.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ID: {enrollment.student.enrollmentNumber}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Program:</span>
                    <span className="font-medium text-right">
                      {enrollment.class?.programCampus?.program?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class:</span>
                    <span className="font-medium text-right">
                      {enrollment.class?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="ml-2">
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Other Enrollments</CardTitle>
              <CardDescription>Other classes this student is enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentClasses?.success && currentClasses.enrollments && currentClasses.enrollments.length > 0 ? (
                  currentClasses.enrollments
                    .filter(otherEnrollment => otherEnrollment.id !== enrollmentId) // Exclude current enrollment
                    .map((otherEnrollment) => (
                      <div key={otherEnrollment.id} className="p-3 rounded-md border">
                        <p className="font-medium">{otherEnrollment.class?.name || 'Unknown Class'}</p>
                        <p className="text-sm text-muted-foreground">
                          {otherEnrollment.class?.courseCampus?.course?.name ||
                           'Unknown Program'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge
                            variant={otherEnrollment.status === 'ACTIVE' ? 'default' : 'outline'}
                            className={
                              otherEnrollment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              otherEnrollment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                              otherEnrollment.status === 'INACTIVE' ? 'bg-red-100 text-red-800' :
                              otherEnrollment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              otherEnrollment.status === 'WITHDRAWN' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {otherEnrollment.status}
                          </Badge>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/system/enrollment/${otherEnrollment.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No other enrollments found for this student.</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/admin/system/students/${enrollment.student?.id}/enrollments`}>
                  View All Enrollments
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Fee Management Dialogs */}
      <FeeAssignmentDialog
        open={feeAssignmentOpen}
        onOpenChange={setFeeAssignmentOpen}
        enrollmentId={enrollmentId}
        studentName={enrollment?.student?.user?.name || 'Student'}
        className={enrollment?.class?.name || 'Class'}
        feeStructures={feeStructures?.map(fs => ({
          id: fs.id,
          name: fs.name,
          description: fs.description || undefined,
          components: (fs.feeComponents as any) || [],
          baseAmount: (fs.feeComponents as any)?.reduce((sum: number, comp: any) => sum + comp.amount, 0) || 0
        })) || []}
        onAssign={handleAssignFee}
        isLoading={assignFeeMutation.isLoading}
      />

      <DiscountApplicationDialog
        open={discountApplicationOpen}
        onOpenChange={setDiscountApplicationOpen}
        enrollmentFeeId={enrollmentFee?.id || ''}
        studentName={enrollment?.student?.user?.name || 'Student'}
        currentFeeAmount={enrollmentFee?.finalAmount || 0}
        discountTypes={discountTypes?.map(dt => ({
          id: dt.id,
          name: dt.name,
          description: dt.description || undefined,
          discountValue: dt.discountValue,
          isPercentage: dt.isPercentage,
          maxAmount: dt.maxAmount || undefined,
          type: dt.applicableFor?.[0] as any || 'SPECIAL'
        })) || []}
        onApply={handleApplyDiscount}
        isLoading={applyDiscountMutation.isLoading}
      />

      <ChallanGenerationDialog
        open={challanGenerationOpen}
        onOpenChange={setChallanGenerationOpen}
        enrollmentFeeId={enrollmentFee?.id || ''}
        studentName={enrollment?.student?.user?.name || 'Student'}
        studentId={enrollment?.student?.enrollmentNumber || ''}
        className={enrollment?.class?.name || 'Class'}
        feeBreakdown={{
          baseAmount: enrollmentFee?.baseAmount || 0,
          discountAmount: enrollmentFee?.discountedAmount || 0,
          finalAmount: enrollmentFee?.finalAmount || 0,
          components: (enrollmentFee?.feeStructure?.feeComponents as any) || [],
          discounts: enrollmentFee?.discounts?.map(d => ({
            name: d.discountType?.name || 'Discount',
            amount: d.amount
          })) || []
        }}
        challanTemplates={challanTemplates?.map(ct => ({
          id: ct.id,
          name: ct.name,
          description: ct.description || undefined,
          copies: ct.copies
        })) || []}
        onGenerate={handleGenerateChallan}
        onPrint={handlePrintChallan}
        onEmail={handleEmailChallan}
        isLoading={generateChallanMutation.isLoading}
      />

      <DocumentUploadDialog
        open={documentUploadOpen}
        onOpenChange={setDocumentUploadOpen}
        enrollmentId={enrollmentId}
        studentName={enrollment?.student?.user?.name || 'Student'}
        onUploadComplete={() => {
          // Refetch documents or update state
          console.log('Documents uploaded successfully');
        }}
      />



      {enrollmentFee && (
        <PaymentStatusUpdateDialog
          open={paymentStatusUpdateOpen}
          onOpenChange={setPaymentStatusUpdateOpen}
          enrollmentFee={{
            id: enrollmentFee.id,
            finalAmount: enrollmentFee.finalAmount,
            paymentStatus: enrollmentFee.paymentStatus,
            dueDate: enrollmentFee.dueDate || undefined,
            paidAmount: enrollmentFee.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0,
            paymentMethod: enrollmentFee.paymentMethod || undefined,
            notes: enrollmentFee.notes || undefined,
          }}
          studentName={enrollment?.student?.user?.name || 'Student'}
          onUpdate={handleUpdateFeePaymentStatus}
          isLoading={updateFeePaymentStatusMutation.isLoading}
        />
      )}

      {/* Late Fee Waiver Dialog */}
      {enrollmentFee && (
        <LateFeeWaiverDialog
          open={lateFeeWaiverOpen}
          onOpenChange={setLateFeeWaiverOpen}
          enrollmentFeeId={enrollmentFee.id}
          lateFeeApplications={(enrollmentFee as any)?.lateFeeApplications?.map(lf => ({
            id: lf.id,
            appliedAmount: lf.appliedAmount,
            waivedAmount: lf.waivedAmount || 0,
            status: lf.status,
            applicationDate: lf.applicationDate,
            reason: lf.reason || 'Late payment',
            daysOverdue: lf.daysOverdue || 0,
          })) || []}
          onSuccess={() => {
            refetchFees();
            toast({
              title: "Success",
              description: "Late fee waiver request submitted successfully.",
            });
          }}
        />
      )}
    </div>
  );
}
