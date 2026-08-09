"use client";

import { useState } from "react";
import { mockAuditLogs, AuditEvent } from "@/lib/audit";
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
import { ROLE_LABELS } from "@/types";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEvent[]>(mockAuditLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-heading">
                System Operational Audit Trail Logs
              </h1>
              <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] font-bold">
                Immutable History
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Complete historical log of rate approvals, box deductions, quality reports, and user role updates
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Search & Filter Controls */}
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit logs by staff member, action details, or ID..."
                className="pl-10 bg-slate-50 border-slate-200 text-slate-900 font-semibold h-10 rounded-xl text-sm"
              />
            </div>

            <div className="sm:col-span-4">
              <Select value={actionFilter} onValueChange={(val) => setActionFilter(val || "ALL")}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-10 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Filter by Action Type..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL" className="text-xs font-semibold">All Actions</SelectItem>
                  <SelectItem value="RATE_LOCKED" className="text-xs font-semibold">Rate Locked</SelectItem>
                  <SelectItem value="INVENTORY_DEDUCTED" className="text-xs font-semibold">Inventory Deducted</SelectItem>
                  <SelectItem value="QUALITY_REPORT_SAVED" className="text-xs font-semibold">Quality Report Saved</SelectItem>
                  <SelectItem value="USER_ROLE_UPDATED" className="text-xs font-semibold">User Role Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Audit Log Table */}
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-3.5 px-6">
            <CardTitle className="text-sm font-bold text-slate-900 font-heading">
              Operational Logs ({filteredLogs.length} Events Logged)
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100">
                  <TableHead className="pl-6 text-xs font-bold text-slate-500 uppercase">Timestamp</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase">Staff Member</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase">Action Type</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase">Entity / Target</TableHead>
                  <TableHead className="pr-6 text-xs font-bold text-slate-500 uppercase">Action Summary Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-slate-100 hover:bg-slate-50/70">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.timestamp).toLocaleString("en-IN")}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div>
                        <span className="font-bold text-slate-900 block text-xs sm:text-sm">{log.userName}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{ROLE_LABELS[log.userRole]}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <Badge variant="outline" className={`text-xs font-bold px-2.5 py-0.5 ${getActionBadge(log.action)}`}>
                        {log.action.replace("_", " ")}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4 font-mono text-slate-700 text-xs">
                      {log.entityType} ({log.entityId})
                    </TableCell>

                    <TableCell className="pr-6 py-4 text-xs font-medium text-slate-800">
                      {log.details}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
