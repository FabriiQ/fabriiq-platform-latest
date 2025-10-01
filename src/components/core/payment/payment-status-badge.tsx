"use client";

import { Badge, BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PaymentStatus = "PAID" | "PENDING" | "PARTIAL" | "WAIVED" | "OVERDUE";

export interface PaymentStatusBadgeProps extends Omit<BadgeProps, "variant" | "children"> {
  status: PaymentStatus;
  showLabel?: boolean;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  showLabel = true,
  className,
  ...props
}: PaymentStatusBadgeProps) {
  const getVariant = (status: PaymentStatus): BadgeProps["variant"] => {
    switch (status) {
      case "PAID":
        return "success";
      case "PENDING":
        return "warning";
      case "PARTIAL":
        return "default";
      case "WAIVED":
        return "outline";
      case "OVERDUE":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getLabel = (status: PaymentStatus): string => {
    switch (status) {
      case "PAID":
        return "Paid";
      case "PENDING":
        return "Pending";
      case "PARTIAL":
        return "Partial";
      case "WAIVED":
        return "Waived";
      case "OVERDUE":
        return "Overdue";
      default:
        return status;
    }
  };

  return (
    <Badge
      variant={getVariant(status)}
      className={cn("capitalize", className)}
      {...props}
    >
      {showLabel ? getLabel(status) : null}
    </Badge>
  );
}
