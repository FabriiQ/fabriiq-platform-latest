"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import { ChevronLeft, Save, Eye, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";

// Simplified form schema for challan template
const challanTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  copies: z.number().min(1).max(3).default(3),
  institutionName: z.string().min(1, "Institution name is required"),
  campusName: z.string().optional(),
  campusAddress: z.string().optional(),
  campusPhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  kuickpayPrefix: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankCollectionAccount: z.string().optional(),
  footerText: z.string().optional(),
  showStudentPhoto: z.boolean().default(false),
  showBarcode: z.boolean().default(true),
  showQRCode: z.boolean().default(true),
  showDueDate: z.boolean().default(true),
  showPaymentInstructions: z.boolean().default(true),
  template: z.enum(["standard", "compact", "detailed"]).default("standard"),
});

type ChallanTemplateFormValues = z.infer<typeof challanTemplateSchema>;

// Predefined templates
const templates = {
  standard: {
    name: "Standard Template",
    description: "A standard challan template with all essential information",
    preview: "Standard layout with header, student info, fee details, and footer"
  },
  compact: {
    name: "Compact Template", 
    description: "A compact template for smaller challans",
    preview: "Compact layout with minimal spacing"
  },
  detailed: {
    name: "Detailed Template",
    description: "A detailed template with comprehensive information",
    preview: "Detailed layout with additional fields and instructions"
  }
};

export default function SimpleChallanDesignerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof templates>("standard");
  const [showExistingTemplates, setShowExistingTemplates] = useState(false);

  // Fetch existing templates
  const { data: existingTemplates, isLoading: templatesLoading } = api.challan.getAllTemplates.useQuery();

  // Create template mutation
  const createTemplateMutation = api.challan.createTemplate.useMutation({
    onSuccess: () => {
      toast({
        title: "Template created",
        description: "Challan template has been created successfully.",
      });
      router.push("/admin/system/fee-management");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create challan template. Please try again.",
        variant: "destructive" as const,
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Initialize form
  const form = useForm<ChallanTemplateFormValues>({
    resolver: zodResolver(challanTemplateSchema),
    defaultValues: {
      name: "Standard Fee Challan",
      description: "Default fee challan template with 3 copies",
      copies: 3,
      institutionName: "Allied School Ferozpur Road",
      campusName: "Campus (Girls Branch)",
      campusAddress: "19 km Ferozpur Road Lahore",
      whatsappNumber: "03364015028",
      kuickpayPrefix: "13330",
      bankName: "Bank AL Habib Limited",
      bankAccountNumber: "0099-0981-0074-4601-6",
      bankCollectionAccount: "0099-0980-0047-4601-5",
      showStudentPhoto: false,
      showBarcode: true,
      showQRCode: true,
      showDueDate: true,
      showPaymentInstructions: true,
      template: "standard",
    },
  });

  // Handle form submission
  const onSubmit = (values: ChallanTemplateFormValues) => {
    setIsSubmitting(true);

    // Create the template design based on selected template
    const templateDesign = {
      template: values.template,
      institutionName: values.institutionName,
      campusName: values.campusName,
      campusAddress: values.campusAddress,
      campusPhone: values.campusPhone,
      whatsappNumber: values.whatsappNumber,
      kuickpayPrefix: values.kuickpayPrefix,
      bankName: values.bankName,
      bankAccountNumber: values.bankAccountNumber,
      bankCollectionAccount: values.bankCollectionAccount,
      footerText: values.footerText,
      showStudentPhoto: values.showStudentPhoto,
      showBarcode: values.showBarcode,
      showQRCode: values.showQRCode,
      showDueDate: values.showDueDate,
      showPaymentInstructions: values.showPaymentInstructions,
    };

    // Ensure we have a valid session
    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a template.",
        variant: "destructive" as const,
      });
      setIsSubmitting(false);
      return;
    }

    createTemplateMutation.mutate({
      name: values.name,
      description: values.description,
      design: templateDesign,
      copies: values.copies,
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Challan Designer"
          description="Create and customize fee challan templates"
        />
      </div>

      {/* Existing Templates Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Existing Templates</CardTitle>
              <CardDescription>Manage your existing challan templates</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowExistingTemplates(!showExistingTemplates)}
            >
              {showExistingTemplates ? 'Hide Templates' : 'Show Templates'}
            </Button>
          </div>
        </CardHeader>
        {showExistingTemplates && (
          <CardContent>
            {templatesLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading templates...</span>
              </div>
            ) : existingTemplates && existingTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingTemplates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{template.name}</h4>
                      <Badge variant="outline">{template.copies} copies</Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created by {template.createdBy?.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Institution: {template.institution?.name || 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No templates found. Create your first template below.</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Template Configuration</CardTitle>
            <CardDescription>Configure your challan template settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="template">Template</TabsTrigger>
                    <TabsTrigger value="options">Options</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter template name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter template description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="copies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Copies</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select number of copies" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 Copy</SelectItem>
                                <SelectItem value="2">2 Copies</SelectItem>
                                <SelectItem value="3">3 Copies</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="institutionName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Institution Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter institution name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="campusName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campus Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter campus name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="campusAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campus Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter campus address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="template" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="template"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Style</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedTemplate(value as keyof typeof templates);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select template style" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(templates).map(([key, template]) => (
                                  <SelectItem key={key} value={key}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">{templates[selectedTemplate].name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {templates[selectedTemplate].description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {templates[selectedTemplate].preview}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="options" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="showStudentPhoto"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Student Photo</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="showBarcode"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Barcode</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="showQRCode"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>QR Code</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="showDueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Due Date</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <Separator />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Template
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Template Preview</CardTitle>
            <CardDescription>Preview of your challan template</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-white min-h-[600px]">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold">{form.watch("institutionName") || "Institution Name"}</h2>
                <p className="text-sm">{form.watch("campusName") || "Campus Name"}</p>
                <p className="text-xs text-muted-foreground">{form.watch("campusAddress") || "Campus Address"}</p>
              </div>
              
              <div className="border-t border-b py-2 mb-4">
                <h3 className="text-center font-semibold">FEE CHALLAN</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p><strong>Student Name:</strong> [Student Name]</p>
                  <p><strong>Student ID:</strong> [Student ID]</p>
                  <p><strong>Class:</strong> [Class Name]</p>
                </div>
                <div>
                  <p><strong>Challan No:</strong> [Challan Number]</p>
                  <p><strong>Issue Date:</strong> [Issue Date]</p>
                  {form.watch("showDueDate") && <p><strong>Due Date:</strong> [Due Date]</p>}
                </div>
              </div>

              <div className="border rounded p-2 mb-4">
                <h4 className="font-semibold mb-2">Fee Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Tuition Fee</span>
                    <span>Rs. [Amount]</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Library Fee</span>
                    <span>Rs. [Amount]</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <span>Total Amount</span>
                    <span>Rs. [Total]</span>
                  </div>
                </div>
              </div>

              {form.watch("bankName") && (
                <div className="text-xs mb-4">
                  <p><strong>Bank:</strong> {form.watch("bankName")}</p>
                  {form.watch("bankAccountNumber") && <p><strong>Account:</strong> {form.watch("bankAccountNumber")}</p>}
                </div>
              )}

              {form.watch("showPaymentInstructions") && (
                <div className="text-xs text-muted-foreground">
                  <p>• Payment instructions will appear here</p>
                  <p>• Additional terms and conditions</p>
                </div>
              )}

              <div className="flex justify-between items-end mt-4">
                {form.watch("showBarcode") && (
                  <div className="text-xs">
                    <div className="h-8 bg-black bg-opacity-10 rounded mb-1"></div>
                    <p>Barcode</p>
                  </div>
                )}
                {form.watch("showQRCode") && (
                  <div className="text-xs">
                    <div className="h-8 w-8 bg-black bg-opacity-10 rounded mb-1"></div>
                    <p>QR Code</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
