"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { useCurrency } from "@/contexts/currency-context";
import { FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react";

const waiverRequestSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  justification: z.string().min(10, "Justification must be at least 10 characters"),
  requestedAmount: z.number().min(0.01, "Amount must be greater than 0"),
  supportingDocuments: z.array(z.string()).optional(),
});

type WaiverRequestFormValues = z.infer<typeof waiverRequestSchema>;

interface LateFeeApplication {
  id: string;
  appliedAmount: number;
  waivedAmount?: number;
  status: string;
  applicationDate: Date;
  reason: string;
  daysOverdue: number;
}

interface LateFeeWaiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentFeeId: string;
  lateFeeApplications: LateFeeApplication[];
  onSuccess?: () => void;
}

export function LateFeeWaiverDialog({
  open,
  onOpenChange,
  enrollmentFeeId,
  lateFeeApplications,
  onSuccess,
}: LateFeeWaiverDialogProps) {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [selectedApplication, setSelectedApplication] = useState<string>("");

  const form = useForm<WaiverRequestFormValues>({
    resolver: zodResolver(waiverRequestSchema),
    defaultValues: {
      reason: "",
      justification: "",
      requestedAmount: 0,
      supportingDocuments: [],
    },
  });

  // Create waiver request mutation
  const createWaiverMutation = api.lateFee.createWaiverRequest.useMutation({
    onSuccess: () => {
      toast({
        title: "Waiver Request Submitted",
        description: "Your late fee waiver request has been submitted for review.",
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit waiver request.",
        variant: "destructive",
      });
    },
  });

  const selectedApp = lateFeeApplications.find(app => app.id === selectedApplication);

  const handleSubmit = (values: WaiverRequestFormValues) => {
    if (!selectedApplication) {
      toast({
        title: "Error",
        description: "Please select a late fee application to waive.",
        variant: "destructive",
      });
      return;
    }

    createWaiverMutation.mutate({
      enrollmentFeeId,
      reason: `${values.reason}${values.justification ? ` - ${values.justification}` : ''}`,
      requestedAmount: values.requestedAmount,
      supportingDocuments: values.supportingDocuments,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPLIED":
        return <Badge variant="destructive">Applied</Badge>;
      case "WAIVED":
        return <Badge variant="default">Waived</Badge>;
      case "PARTIAL_WAIVED":
        return <Badge variant="secondary">Partially Waived</Badge>;
      case "PAID":
        return <Badge variant="default">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPLIED":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "WAIVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "PARTIAL_WAIVED":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "PAID":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Filter applications that can be waived
  const waiverableApplications = lateFeeApplications.filter(
    app => app.status === "APPLIED" || app.status === "PARTIAL_WAIVED"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Request Late Fee Waiver
          </DialogTitle>
          <DialogDescription>
            Submit a request to waive late fees applied to this enrollment. Provide a valid reason and justification for the waiver.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Late Fee Applications */}
          <div className="space-y-4">
            <h4 className="font-medium">Late Fee Applications</h4>
            {lateFeeApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No late fees have been applied to this enrollment.</p>
            ) : (
              <div className="space-y-2">
                {lateFeeApplications.map((app) => (
                  <div
                    key={app.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedApplication === app.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    } ${
                      !waiverableApplications.some(w => w.id === app.id) ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => {
                      if (waiverableApplications.some(w => w.id === app.id)) {
                        setSelectedApplication(app.id);
                        form.setValue("requestedAmount", app.appliedAmount - (app.waivedAmount || 0));
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(app.status)}
                        <span className="font-medium">{formatCurrency(app.appliedAmount)}</span>
                        {getStatusBadge(app.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {app.daysOverdue} days overdue
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Applied on {new Date(app.applicationDate).toLocaleDateString()}
                    </div>
                    <div className="mt-1 text-sm">{app.reason}</div>
                    {app.waivedAmount && app.waivedAmount > 0 && (
                      <div className="mt-1 text-sm text-green-600">
                        Waived: {formatCurrency(app.waivedAmount)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {waiverableApplications.length > 0 && (
            <>
              <Separator />

              {/* Waiver Request Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waiver Reason <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a reason for the waiver" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="financial_hardship">Financial Hardship</SelectItem>
                            <SelectItem value="medical_emergency">Medical Emergency</SelectItem>
                            <SelectItem value="system_error">System Error</SelectItem>
                            <SelectItem value="administrative_error">Administrative Error</SelectItem>
                            <SelectItem value="exceptional_circumstances">Exceptional Circumstances</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="justification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Justification <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide detailed justification for the waiver request..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requestedAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Waiver Amount <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={selectedApp ? selectedApp.appliedAmount - (selectedApp.waivedAmount || 0) : undefined}
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        {selectedApp && (
                          <p className="text-sm text-muted-foreground">
                            Maximum waiverable amount: {formatCurrency(selectedApp.appliedAmount - (selectedApp.waivedAmount || 0))}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createWaiverMutation.isLoading || !selectedApplication}
                    >
                      {createWaiverMutation.isLoading ? "Submitting..." : "Submit Waiver Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
