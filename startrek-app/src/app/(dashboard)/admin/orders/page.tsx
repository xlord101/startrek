"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExportOrderPlanner } from "@/components/shared/ExportOrderPlanner";
import { store, useStartrekStore } from "@/lib/store";
import { ExportOrder } from "@/types";

export default function ExportOrdersPage() {
  const router = useRouter();
  const { coldStorageReceipts } = useStartrekStore();

  useEffect(() => {
    // Refresh cold storage receipts for live stock balance
    fetch("/api/cold-storage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.receipts) {
          store.setColdStorageReceipts(data.receipts);
        }
      })
      .catch(() => {});
  }, []);

  const handleRaiseContainerForOrder = (order: ExportOrder) => {
    // Navigate to Container Dispatch with pre-selected order
    router.push(`/admin/cold-storage?tab=CONTAINER&orderId=${order.id}`);
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50 min-h-screen">
      <ExportOrderPlanner
        receipts={coldStorageReceipts}
        onRaiseContainerForOrder={handleRaiseContainerForOrder}
      />
    </div>
  );
}

