"use client";

import { Badge } from "@/components/ui/badge";
import { ProcurementStatus, STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import { Clock, UserCheck, AlertCircle, CheckCircle2 } from "lucide-react";

interface StatusBadgeProps {
  status: ProcurementStatus;
  className?: string;
  showIcon?: boolean;
}

const statusStyles: Record<ProcurementStatus, string> = {
  PENDING_ASSIGNMENT: "bg-amber-50 text-amber-700 border-amber-200/80 shadow-2xs",
  ASSIGNED: "bg-sky-50 text-sky-700 border-sky-200/80 shadow-2xs",
  FIELD_SUBMITTED: "bg-orange-50 text-orange-700 border-orange-200/80 shadow-2xs",
  APPROVED_PROCUREMENT: "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs",
};

const statusDotColors: Record<ProcurementStatus, string> = {
  PENDING_ASSIGNMENT: "bg-amber-500",
  ASSIGNED: "bg-sky-500",
  FIELD_SUBMITTED: "bg-orange-500",
  APPROVED_PROCUREMENT: "bg-emerald-500",
};

const statusIcons: Record<ProcurementStatus, React.ElementType> = {
  PENDING_ASSIGNMENT: Clock,
  ASSIGNED: UserCheck,
  FIELD_SUBMITTED: AlertCircle,
  APPROVED_PROCUREMENT: CheckCircle2,
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const Icon = statusIcons[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all duration-150",
        statusStyles[status],
        className
      )}
    >
      {showIcon ? (
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      ) : (
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusDotColors[status])} />
      )}
      <span>{STATUS_LABELS[status]}</span>
    </Badge>
  );
}
