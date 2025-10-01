// Note: Core fee components are imported directly to avoid circular dependencies

// Shared fee components
export { FeeStructureForm } from "./fee-structure-form";
export type { FeeStructureFormValues, FeeComponentFormValues, FeeComponent, FeeComponentType } from "./fee-structure-form";

export { DiscountTypeForm } from "./discount-type-form";
export type { DiscountTypeFormValues } from "./discount-type-form";

export { EnrollmentFeeForm } from "./enrollment-fee-form";
export type { EnrollmentFeeFormValues } from "./enrollment-fee-form";

export { DiscountForm } from "./discount-form";
export type { DiscountFormValues } from "./discount-form";

export { AdditionalChargeForm } from "./additional-charge-form";
export type { AdditionalChargeFormValues } from "./additional-charge-form";

export { ArrearForm } from "./arrear-form";
export type { ArrearFormValues } from "./arrear-form";

export { ChallanGenerationForm } from "./challan-generation-form";
export type { ChallanFormValues } from "./challan-generation-form";

export { FeeDetailCard } from "./fee-detail-card";
export type {
  FeeDetailCardProps,
  Discount,
  AdditionalCharge,
  Arrear,
  Challan,
  FeeStructure as FeeStructureDetail,
  DiscountTypeOption as DiscountTypeDetail,
  ChallanTemplate
} from "./fee-detail-card";

// Note: Payment components are imported directly to avoid circular dependencies

export { TransactionForm } from "../enrollment/transaction-form";
export type { TransactionFormValues } from "../enrollment/transaction-form";
