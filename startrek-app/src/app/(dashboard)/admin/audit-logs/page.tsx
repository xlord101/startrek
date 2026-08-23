"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  ShieldCheck,
  Clock,
  User,
  Filter,
} from "lucide-react";
import { ROLE_LABELS, UserRole } from "@/types";

interface AuditItem {
  id: string;
  userId: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string | null;
  createdAt: Date | string;
  user?: { name: string };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) {
          setLogs(data.logs);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((log) => {
    const userName = log.user?.name || log.userId || "";
    const detailsText = log.details || "";
    const matchesSearch =
      (userName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (detailsText || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entityId || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "RATE_LOCKED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "INVENTORY_DEDUCTED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "QUALITY_REPORT_SAVED":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "USER_ROLE_UPDATED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              System Audit Trail
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Immutable, tamper-evident logs of all operational state transitions & administrative actions.
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3 py-1 text-xs">
          🔒 Production Security Active
        </Badge>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-100 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by User, Action Details, or Entity ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
              />
            </div>
            <div className="w-full sm:w-64">
              <Select value={actionFilter} onValueChange={(val) => setActionFilter(val || "ALL")}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 font-medium">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <SelectValue placeholder="Filter by Action" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="RATE_LOCKED">Rate Locked</SelectItem>
                  <SelectItem value="INVENTORY_DEDUCTED">Inventory Deducted</SelectItem>
                  <SelectItem value="QUALITY_REPORT_SAVED">Quality Report Saved</SelectItem>
                  <SelectItem value="USER_ROLE_UPDATED">User Role Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-slate-100 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
          <CardTitle className="text-sm font-bold text-slate-700 flex items-center justify-between">
            <span>Operational Log Entries</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {filteredLogs.length} Records
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-medium">Loading live audit trail from database...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Audit Events Found</h3>
              <p className="text-slate-500 text-sm mt-1">
                No system actions matching your filter criteria have been recorded yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700 text-xs">TIMESTAMP</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs">ACTOR</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs">ACTION</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs">TARGET ENTITY</TableHead>
                    <TableHead className="font-bold text-slate-700 text-xs">DETAILS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-xs font-semibold text-slate-600 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">
                            {log.user?.name || log.userId}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {ROLE_LABELS[log.userRole] || log.userRole}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge
                          variant="outline"
                          className={`font-extrabold text-[11px] px-2.5 py-0.5 ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {log.entityType}: {log.entityId}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700 py-3.5 max-w-md">
                        {log.details || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
