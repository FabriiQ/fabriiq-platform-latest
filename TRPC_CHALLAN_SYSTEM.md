# tRPC-Based Challan System Implementation

## Overview
The challan printing system has been updated to use tRPC exclusively, removing the need for separate API routes that could cause conflicts. The system now generates HTML content server-side and returns it as base64-encoded data URLs for printing.

## System Architecture

### 1. tRPC Endpoints (`src/server/api/routers/challan.ts`)

#### Single Print Endpoint
```typescript
print: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    const challanService = new ChallanService();
    return challanService.printChallan(input.id);
  })
```

#### Batch Print Endpoint
```typescript
batchPrint: protectedProcedure
  .input(z.object({ ids: z.array(z.string()) }))
  .mutation(async ({ input }) => {
    const challanService = new ChallanService();
    return challanService.batchPrintChallans(input.ids);
  })
```

### 2. Challan Service (`src/server/api/services/challan.service.ts`)

#### Key Features
- **Default Template Creation**: Automatically creates standard templates if none exist
- **Comprehensive Data**: Includes discounts, payment history, and remaining amounts
- **HTML Generation**: Server-side HTML generation with professional styling
- **Base64 Encoding**: Returns printable content as data URLs

#### Print Response Structure
```typescript
{
  challan: {
    // Challan data with payment summary
    paymentSummary: {
      totalAmount: number,
      paidAmount: number,
      remainingAmount: number,
      paymentStatus: string
    }
  },
  printHTML: string, // Full HTML content
  printUrl: string   // Base64-encoded data URL
}
```

### 3. Frontend Integration

#### Current Usage Pattern (No Changes Required)
```typescript
const printChallanMutation = api.challan.print.useMutation({
  onSuccess: (data) => {
    // Opens the base64-encoded HTML in a new window
    if (data.printUrl) {
      window.open(data.printUrl, '_blank');
    }
  }
});

const handlePrintChallan = (challanId: string) => {
  printChallanMutation.mutate({ id: challanId });
};
```

## Template System

### Default Template Features
- **Professional Layout**: Clean, printable design with proper spacing
- **Comprehensive Information**: Student details, fee breakdown, discounts
- **Payment History**: Complete transaction history with dates and methods
- **Visual Indicators**: Color-coded discounts (green) and charges (red)
- **Remaining Balance**: Real-time calculation and display

### Template Structure
```json
{
  "design": {
    "header": {
      "institutionName": "Educational Institution",
      "institutionAddress": "Institution Address",
      "logo": null
    },
    "layout": {
      "showDiscounts": true,
      "showPartialPayments": true,
      "showDueDate": true,
      "showBankDetails": true
    },
    "footer": {
      "instructions": "Please pay before the due date to avoid late fees.",
      "bankInstructions": "Payment can be made through bank transfer or online payment."
    }
  }
}
```

## Challan Content Features

### 1. Student Information
- Student ID (enrollment number)
- Student name
- Class information
- Challan number and dates

### 2. Fee Breakdown
- Base fee amount
- Applied discounts with types and amounts
- Additional charges
- Total amount calculation

### 3. Payment Information
- Payment history table
- Amount paid vs. remaining balance
- Payment methods and references
- Transaction dates

### 4. Visual Enhancements
- Color-coded entries (discounts in green, charges in red)
- Professional table formatting
- Print-optimized styling
- Auto-print functionality

## Database Schema Compatibility

### Fixed Schema Issues
- **ChallanTemplate**: Uses `design` field instead of `templateData`
- **Institution ID**: Properly handles institution relationships
- **Default Templates**: Creates templates without `isDefault` field

### Audit Trail Integration
- **Print Tracking**: Records when challans are printed
- **Generation History**: Tracks challan creation with full details
- **Payment Updates**: Comprehensive audit trail for all payment operations

## Benefits of tRPC-Only Approach

### 1. Consistency
- Single API pattern throughout the application
- Unified error handling and authentication
- Type-safe operations with automatic TypeScript inference

### 2. No Route Conflicts
- Eliminates potential conflicts with Next.js API routes
- Centralized endpoint management
- Consistent middleware and validation

### 3. Enhanced Features
- Server-side HTML generation with full data access
- Base64 encoding for immediate browser compatibility
- Batch printing with combined HTML output

### 4. Maintainability
- Single codebase for all challan operations
- Centralized business logic
- Easy testing and debugging

## Usage Examples

### Single Challan Print
```typescript
// Frontend component
const printMutation = api.challan.print.useMutation({
  onSuccess: (data) => {
    window.open(data.printUrl, '_blank');
  }
});

// Usage
printMutation.mutate({ id: 'challan-id' });
```

### Batch Challan Print
```typescript
// Frontend component
const batchPrintMutation = api.challan.batchPrint.useMutation({
  onSuccess: (data) => {
    window.open(data.printUrl, '_blank');
  }
});

// Usage
batchPrintMutation.mutate({ ids: ['id1', 'id2', 'id3'] });
```

## Error Handling

### Server-Side
- Comprehensive error logging
- Specific error messages for different failure scenarios
- Graceful fallbacks for missing templates or data

### Client-Side
- Toast notifications for success/error states
- Loading states during print preparation
- User-friendly error messages

## Performance Considerations

### 1. HTML Generation
- Server-side rendering for optimal performance
- Cached template data for repeated operations
- Efficient database queries with proper includes

### 2. Base64 Encoding
- Immediate browser compatibility
- No additional network requests
- Suitable for moderate-sized HTML content

### 3. Batch Operations
- Combined HTML generation for multiple challans
- Page-break styling for proper printing
- Optimized database queries for bulk operations

## Future Enhancements

### 1. PDF Generation
- Server-side PDF generation using libraries like Puppeteer
- Direct PDF download instead of HTML printing
- Better print quality and formatting control

### 2. Template Customization
- Admin interface for template editing
- Multiple template options per institution
- Dynamic branding and styling options

### 3. Email Integration
- Direct email sending with PDF attachments
- Bulk email operations for multiple challans
- Email tracking and delivery confirmation

## Conclusion

The tRPC-based challan system provides a robust, maintainable, and feature-rich solution for fee challan generation and printing. By eliminating separate API routes and using base64-encoded HTML, the system ensures compatibility while providing comprehensive functionality for educational institutions.
