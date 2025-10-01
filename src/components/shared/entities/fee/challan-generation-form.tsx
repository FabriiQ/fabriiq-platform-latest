"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/data-display/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChallanPreview, ChallanData } from "@/components/core/fee/challan-preview";
import { Separator } from "@/components/ui/separator";

const challanFormSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  issueDate: z.date().default(() => new Date()),
  dueDate: z.date(),
  bankDetails: z.object({
    name: z.string().min(1, "Bank name is required"),
    accountNo: z.string().min(1, "Account number is required"),
    branch: z.string().min(1, "Branch is required"),
  }),
});

export type ChallanFormValues = z.infer<typeof challanFormSchema>;

interface ChallanTemplate {
  id: string;
  name: string;
  description?: string;
  copies: number;
}

interface ChallanGenerationFormProps {
  enrollmentFeeId: string;
  enrollmentFeeData: {
    studentName: string;
    studentId: string;
    className: string;
    programName: string;
    totalAmount: number;
    paidAmount: number;
    feeComponents: Array<{ name: string; amount: number }>;
    discounts: Array<{ name: string; amount: number }>;
    additionalCharges: Array<{ name: string; amount: number }>;
    arrears: Array<{ description: string; amount: number }>;
  };
  templates: ChallanTemplate[];
  institutionName: string;
  institutionLogo?: string;
  initialData?: Partial<ChallanFormValues>;
  onSubmit: (values: ChallanFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

export function ChallanGenerationForm({
  enrollmentFeeId,
  enrollmentFeeData,
  templates,
  institutionName,
  institutionLogo,
  initialData,
  onSubmit,
  isLoading = false,
  className,
}: ChallanGenerationFormProps) {
  const [previewTab, setPreviewTab] = useState<"STUDENT" | "BANK" | "INSTITUTION">("STUDENT");

  const form = useForm<ChallanFormValues>({
    resolver: zodResolver(challanFormSchema),
    defaultValues: {
      templateId: initialData?.templateId || undefined,
      issueDate: initialData?.issueDate || new Date(),
      dueDate: initialData?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
      bankDetails: initialData?.bankDetails || {
        name: "",
        accountNo: "",
        branch: "",
      },
    },
  });

  const handleSubmit = (values: ChallanFormValues) => {
    onSubmit(values);
  };

  const selectedTemplate = templates.find(t => t.id === form.watch("templateId"));
  const issueDate = form.watch("issueDate");
  const dueDate = form.watch("dueDate");
  const bankDetails = form.watch("bankDetails");

  // Generate preview data
  const previewData: ChallanData = {
    id: "preview",
    challanNo: "PREVIEW",
    issueDate,
    dueDate,
    totalAmount: enrollmentFeeData.totalAmount,
    paidAmount: enrollmentFeeData.paidAmount,
    paymentStatus: enrollmentFeeData.paidAmount >= enrollmentFeeData.totalAmount ? "PAID" : 
                  enrollmentFeeData.paidAmount > 0 ? "PARTIAL" : "PENDING",
    studentName: enrollmentFeeData.studentName,
    studentId: enrollmentFeeData.studentId,
    className: enrollmentFeeData.className,
    programName: enrollmentFeeData.programName,
    feeComponents: enrollmentFeeData.feeComponents,
    discounts: enrollmentFeeData.discounts,
    additionalCharges: enrollmentFeeData.additionalCharges,
    arrears: enrollmentFeeData.arrears,
    bankDetails: {
      name: bankDetails.name,
      accountNo: bankDetails.accountNo,
      branch: bankDetails.branch,
    },
    institutionName,
    institutionLogo,
    copyType: previewTab,
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Fee Challan
        </CardTitle>
        <CardDescription>
          Create a payment challan for {enrollmentFeeData.studentName}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Student Information */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2">Student Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Name:</span> {enrollmentFeeData.studentName}</div>
                    <div><span className="font-medium">Class:</span> {enrollmentFeeData.className}</div>
                    <div><span className="font-medium">Program:</span> {enrollmentFeeData.programName}</div>
                    <div><span className="font-medium">Total Amount:</span> {enrollmentFeeData.totalAmount.toLocaleString()}</div>
                  </div>
                </div>

                {/* Template Selection */}
                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Challan Template <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormDescription>
                        Choose a template for the challan layout and design
                      </FormDescription>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select a challan template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No templates available</p>
                              <p className="text-xs">Please create a template first</p>
                            </div>
                          ) : (
                            templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex flex-col py-1">
                                  <span className="font-medium">{template.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {template.description} • {template.copies} copies
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Settings */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Date Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Issue Date <span className="text-destructive">*</span></FormLabel>
                          <FormDescription>When the challan is issued</FormDescription>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Due Date <span className="text-destructive">*</span></FormLabel>
                          <FormDescription>Payment deadline</FormDescription>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                </div>

                <Separator />

                {/* Bank Details */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Bank Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the bank account information for payment collection
                  </p>
                  <FormField
                    control={form.control}
                    name="bankDetails.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter bank name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankDetails.accountNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter account number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankDetails.branch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter branch name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-4">Challan Preview</h3>
                <Tabs defaultValue="STUDENT" onValueChange={(value) => setPreviewTab(value as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="STUDENT">Student Copy</TabsTrigger>
                    <TabsTrigger value="BANK">Bank Copy</TabsTrigger>
                    <TabsTrigger value="INSTITUTION">Institution Copy</TabsTrigger>
                  </TabsList>
                  <TabsContent value="STUDENT" className="mt-4">
                    <ChallanPreview challan={previewData} showActions={false} />
                  </TabsContent>
                  <TabsContent value="BANK" className="mt-4">
                    <ChallanPreview challan={{...previewData, copyType: "BANK"}} showActions={false} />
                  </TabsContent>
                  <TabsContent value="INSTITUTION" className="mt-4">
                    <ChallanPreview challan={{...previewData, copyType: "INSTITUTION"}} showActions={false} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {templates.length === 0 ? (
                <span className="text-destructive">⚠️ No templates available. Please create a template first.</span>
              ) : (
                <span>✓ Ready to generate challan</span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Reset Form
              </Button>
              <Button type="submit" disabled={isLoading || templates.length === 0}>
                {isLoading ? "Generating..." : "Generate Challan"}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
