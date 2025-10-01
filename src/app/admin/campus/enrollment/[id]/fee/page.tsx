"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/feedback/alert";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { FeeDetailCard } from "@/components/shared/entities/fee/fee-detail-card";
import { EnrollmentFeeForm } from "@/components/shared/entities/fee/enrollment-fee-form";
import { EnhancedFeeAssignmentDialog } from "@/components/shared/entities/fee/enhanced-fee-assignment-dialog";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { useSession } from "next-auth/react";

export default function EnrollmentFeePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("details");
  const [showEnhancedDialog, setShowEnhancedDialog] = useState(false);

  // Fetch enrollment data
  const { data: enrollment, isLoading: enrollmentLoading } = api.enrollment.getEnrollment.useQuery(
    { id },
    { enabled: !!id }
  );

  // Fetch fee data
  const { data: fee, isLoading: feeLoading, refetch: refetchFee } = api.enrollmentFee.getByEnrollment.useQuery(
    { enrollmentId: id },
    { enabled: !!id }
  );

  // Fetch fee structures
  const { data: feeStructures, isLoading: feeStructuresLoading } = api.feeStructure.getByProgramCampus.useQuery(
    { programCampusId: enrollment?.enrollment?.class?.programCampusId || "" },
    { enabled: !!enrollment?.enrollment?.class?.programCampusId }
  );

  // Fetch discount types
  const { data: discountTypes, isLoading: discountTypesLoading } = api.discountType.getAll.useQuery();

  // Get user's institution ID from session or enrollment
  const institutionId = enrollment?.enrollment?.class?.programCampus?.id || enrollment?.enrollment?.class?.courseCampus?.id || "default";

  // Fetch challan templates - get user's institution ID
  const { data: challanTemplates, isLoading: challanTemplatesLoading } = api.challan.getTemplatesByInstitution.useQuery(
    { institutionId: institutionId || "default" },
    { enabled: !!institutionId }
  );

  // Mutations with proper error handling and real-time updates
  const utils = api.useUtils();

  const createEnrollmentFeeMutation = api.enrollmentFee.create.useMutation({
    onSuccess: async () => {
      // Invalidate related queries for real-time updates
      await utils.enrollmentFee.getByEnrollment.invalidate({ enrollmentId: id });
      await utils.enrollmentFee.getFeeCollectionStats.invalidate();

      toast({
        title: "Fee assigned successfully",
        description: "The fee has been assigned to the enrollment.",
      });
      refetchFee();
      setActiveTab("details");
    },
    onError: (error) => {
      toast({
        title: "Error assigning fee",
        description: error.message || "Failed to assign fee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEnrollmentFeeMutation = api.enrollmentFee.update.useMutation({
    onSuccess: async () => {
      // Invalidate related queries for real-time updates
      await utils.enrollmentFee.getByEnrollment.invalidate({ enrollmentId: id });
      await utils.enrollmentFee.getFeeCollectionStats.invalidate();

      toast({
        title: "Fee updated successfully",
        description: "The fee has been updated.",
      });
      refetchFee();
    },
    onError: (error) => {
      toast({
        title: "Error updating fee",
        description: error.message || "Failed to update fee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addDiscountMutation = api.enrollmentFee.addDiscount.useMutation({
    onSuccess: async () => {
      // Invalidate related queries for real-time updates
      await utils.enrollmentFee.getByEnrollment.invalidate({ enrollmentId: id });
      await utils.enrollmentFee.getFeeCollectionStats.invalidate();

      toast({
        title: "Discount added successfully",
        description: "The discount has been added to the fee.",
      });
      refetchFee();
    },
    onError: (error) => {
      toast({
        title: "Error adding discount",
        description: error.message || "Failed to add discount. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeDiscountMutation = api.enrollmentFee.removeDiscount.useMutation({
    onSuccess: () => {
      toast({
        title: "Discount removed successfully",
        description: "The discount has been removed from the fee.",
      });
      refetchFee();
    },
    onError: (error) => {
      toast({
        title: "Error removing discount",
        description: error.message,
        variant: "error",
      });
    },
  });

  const addChargeMutation = api.enrollmentFee.addCharge.useMutation({
    onSuccess: () => {
      toast({
        title: "Charge added successfully",
        description: "The additional charge has been added to the fee.",
      });
      refetchFee();
    },
    onError: (error) => {
      toast({
        title: "Error adding charge",
        description: error.message,
        variant: "error",
      });
    },
  });

  const removeChargeMutation = api.enrollmentFee.removeCharge.useMutation({
    onSuccess: () => {
      toast({
        title: "Charge removed successfully",
        description: "The additional charge has been removed from the fee.",
      });
      refetchFee();
    },
    onError: (error) => {
      toast({
        title: "Error removing charge",
        description: error.message,
        variant: "error",
      });
    },
  });

  const addArrearMutation = api.enrollmentFee.addArrear.useMutation({
    onSuccess: () => {
      toast({
        title: "Arrear added successfully",
        description: "The arrear has been added to the fee.",
      });
      refetchFee();
    },
    onError: (error) => {
      toast({
        title: "Error adding arrear",
        description: error.message,
        variant: "error",
      });
    },
  });

  const removeArrearMutation = api.enrollmentFee.removeArrear.useMutation({
    onSuccess: () => {
      toast({
        title: "Arrear removed successfully",
        description: "The arrear has been removed from the fee.",
      });
      refetchFee();
    },
    onError: (error) => {
      toast({
        title: "Error removing arrear",
        description: error.message,
        variant: "error",
      });
    },
  });

  const generateChallanMutation = api.challan.generate.useMutation({
    onSuccess: () => {
      toast({
        title: "Challan generated successfully",
        description: "The fee challan has been generated.",
      });
      refetchFee();
    },
    onError: (error) => {
      toast({
        title: "Error generating challan",
        description: error.message,
        variant: "error",
      });
    },
  });

  const printChallanMutation = api.challan.print.useMutation({
    onSuccess: (data) => {
      // In a real implementation, this would open the print URL
      window.open(data.printUrl, "_blank");
    },
    onError: (error) => {
      toast({
        title: "Error printing challan",
        description: error.message,
        variant: "error",
      });
    },
  });

  const emailChallanMutation = api.challan.email.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Challan emailed successfully",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Error emailing challan",
        description: error.message,
        variant: "error",
      });
    },
  });

  const addTransactionMutation = api.enrollmentFee.addTransaction.useMutation({
    onSuccess: () => {
      toast({
        title: "Payment recorded successfully",
        description: "The payment transaction has been recorded.",
      });
      refetchFee();
    },
    onError: (error) => {
      toast({
        title: "Error recording payment",
        description: error.message,
        variant: "error",
      });
    },
  });

  // Handlers
  const handleCreateFee = (values: any) => {
    createEnrollmentFeeMutation.mutate({
      enrollmentId: id,
      ...values,
    });
  };

  const handleEnhancedFeeAssignmentSuccess = () => {
    refetchFee();
    setActiveTab("details");
  };

  const handleUpdateFee = (values: any) => {
    if (!fee) return;
    updateEnrollmentFeeMutation.mutate({
      id: fee.id,
      ...values,
    });
  };

  const handleAddDiscount = (values: any) => {
    if (!fee) return;

    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "User session not found",
        variant: "destructive",
      });
      return;
    }

    addDiscountMutation.mutate({
      enrollmentFeeId: fee.id,
      ...values,
      createdById: session.user.id,
    });
  };

  const handleRemoveDiscount = (discountId: string) => {
    removeDiscountMutation.mutate({ discountId });
  };

  const handleAddCharge = (values: any) => {
    if (!fee) return;
    addChargeMutation.mutate({
      enrollmentFeeId: fee.id,
      ...values,
    });
  };

  const handleRemoveCharge = (chargeId: string) => {
    removeChargeMutation.mutate({ chargeId });
  };

  const handleAddArrear = (values: any) => {
    if (!fee) return;
    addArrearMutation.mutate({
      enrollmentFeeId: fee.id,
      ...values,
    });
  };

  const handleRemoveArrear = (arrearId: string) => {
    removeArrearMutation.mutate({ arrearId });
  };

  const handleGenerateChallan = (values: any) => {
    if (!fee) return;
    generateChallanMutation.mutate({
      enrollmentFeeId: fee.id,
      ...values,
    });
  };

  const handlePrintChallan = (challanId: string) => {
    printChallanMutation.mutate({ id: challanId });
  };

  const handleEmailChallan = (challanId: string, email: string) => {
    emailChallanMutation.mutate({ id: challanId, email });
  };

  const handleAddTransaction = (values: any) => {
    if (!fee) return;
    addTransactionMutation.mutate({
      enrollmentFeeId: fee.id,
      ...values,
    });
  };

  // Loading state
  const isLoading = enrollmentLoading || feeLoading || feeStructuresLoading || discountTypesLoading || challanTemplatesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (!enrollment?.success || !enrollment?.enrollment) {
    return (
      <div className="container mx-auto py-10">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Enrollment not found. Please go back and try again.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.back()}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const enrollmentData = enrollment.enrollment;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enrollment Fee</h1>
          <p className="text-muted-foreground">
            Manage fee for {enrollmentData.student?.user?.name || "Student"}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Enrollment
        </Button>
      </div>

      <Separator />

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Fee Details</TabsTrigger>
          <TabsTrigger value="assign" disabled={!!fee}>Assign Fee</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          {fee ? (
            <FeeDetailCard
              fee={{
                id: fee.id,
                enrollmentId: fee.enrollmentId,
                feeStructureId: fee.feeStructureId,
                feeStructure: {
                  id: fee.feeStructure.id,
                  name: fee.feeStructure.name,
                  components: (fee.feeStructure.feeComponents as any) || [],
                  baseAmount: (fee.feeStructure.feeComponents as any)?.reduce((sum: number, comp: any) => sum + comp.amount, 0) || fee.baseAmount
                },
                baseAmount: fee.baseAmount,
                discountedAmount: fee.discountedAmount,
                finalAmount: fee.finalAmount,
                dueDate: fee.dueDate || undefined,
                paymentStatus: fee.paymentStatus,
                paymentMethod: fee.paymentMethod || undefined,
                notes: fee.notes || undefined,
                createdAt: fee.createdAt,
                updatedAt: fee.updatedAt
              }}
              studentName={enrollmentData.student?.user?.name || "Student"}
              studentId={enrollmentData.student?.id || ""}
              className={enrollmentData.class?.name || ""}
              programName={enrollmentData.class?.programCampus?.program?.name || enrollmentData.class?.courseCampus?.course?.name || ""}
              discounts={(fee.discounts || []).map(d => ({
                id: d.id,
                discountTypeId: d.discountTypeId,
                discountTypeName: d.discountType?.name || "",
                discountType: d.discountType?.applicableFor?.[0] as any || "SPECIAL",
                amount: d.amount,
                reason: d.reason || undefined,
                createdAt: d.createdAt
              }))}
              additionalCharges={(fee.additionalCharges || []).map(c => ({
                id: c.id,
                name: c.name,
                amount: c.amount,
                dueDate: c.dueDate || undefined,
                reason: c.reason || undefined,
                createdAt: c.createdAt
              }))}
              arrears={(fee.arrears || []).map(a => ({
                id: a.id,
                amount: a.amount,
                dueDate: a.dueDate || undefined,
                reason: a.reason || "",
                createdAt: a.createdAt
              }))}
              challans={fee.challans || []}
              paidAmount={fee.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0}
              availableFeeStructures={(feeStructures || []).map(fs => ({
                id: fs.id,
                name: fs.name,
                components: (fs.feeComponents as any) || [],
                baseAmount: (fs.feeComponents as any)?.reduce((sum: number, comp: any) => sum + comp.amount, 0) || 0
              }))}
              availableDiscountTypes={(discountTypes || []).map(dt => ({
                id: dt.id,
                name: dt.name,
                type: dt.applicableFor?.[0] as any || "SPECIAL",
                discountValue: dt.discountValue,
                isPercentage: dt.isPercentage,
                maxAmount: dt.maxAmount || undefined
              }))}
              availableChallanTemplates={(challanTemplates || []).map(ct => ({
                id: ct.id,
                name: ct.name,
                description: ct.description || undefined,
                copies: ct.copies
              }))}
              institutionName="Institution"
              onUpdateFee={handleUpdateFee}
              onAddDiscount={handleAddDiscount}
              onRemoveDiscount={handleRemoveDiscount}
              onAddCharge={handleAddCharge}
              onRemoveCharge={handleRemoveCharge}
              onAddArrear={handleAddArrear}
              onRemoveArrear={handleRemoveArrear}
              onGenerateChallan={handleGenerateChallan}
              onPrintChallan={handlePrintChallan}
              onEmailChallan={handleEmailChallan}
              onAddTransaction={handleAddTransaction}
              onAssignAdditionalFee={() => setShowEnhancedDialog(true)}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Fee Assigned</CardTitle>
                <CardDescription>
                  This enrollment does not have a fee assigned yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowEnhancedDialog(true)}>
                  Assign Fee
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="assign" className="mt-6">
          {!fee && feeStructures && (
            <EnrollmentFeeForm
              enrollmentId={id}
              feeStructures={(feeStructures || []).map(fs => ({
                id: fs.id,
                name: fs.name,
                components: (fs.feeComponents as any) || [],
                baseAmount: (fs.feeComponents as any)?.reduce((sum: number, comp: any) => sum + comp.amount, 0) || 0
              }))}
              discountTypes={discountTypes || []}
              onSubmit={handleCreateFee}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Enhanced Fee Assignment Dialog */}
      <EnhancedFeeAssignmentDialog
        open={showEnhancedDialog}
        onOpenChange={setShowEnhancedDialog}
        enrollmentId={id}
        studentName={enrollmentData.student?.user?.name || "Student"}
        className={enrollmentData.class?.name}
        feeStructures={(feeStructures || []).map(fs => ({
          id: fs.id,
          name: fs.name,
          description: fs.description || undefined,
          components: (fs.feeComponents as any) || [],
          baseAmount: (fs.feeComponents as any)?.reduce((sum: number, comp: any) => sum + comp.amount, 0) || 0
        }))}
        existingFeeStructures={fee ? [fee.feeStructureId] : []}
        onSuccess={handleEnhancedFeeAssignmentSuccess}
      />
    </div>
  );
}
