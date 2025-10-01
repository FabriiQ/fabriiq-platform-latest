"use client";

import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { UnifiedFeeManagement } from "@/components/admin/system/fee-management/UnifiedFeeManagement";

export default function UnifiedFeeManagementPage() {
  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Unified Fee Management"
        description="Streamlined configuration for all fee management operations"
      />
      
      <div className="mt-8">
        <UnifiedFeeManagement />
      </div>
    </div>
  );
}
