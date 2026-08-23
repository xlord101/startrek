"use client";

import { useState, useEffect } from "react";
import { store, useStartrekStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  UserPlus,
  Edit,
  KeyRound,
  UserX,
  UserCheck,
  Search,
  Users,
  Building2,
  Sprout,
  Warehouse,
  Lock,
} from "lucide-react";
import { User, UserRole, ROLE_LABELS } from "@/types";
import { toast } from "sonner";

export default function UserManagementPage() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Load users from real Supabase DB on mount
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setUsersList(data.users.map((u: any) => ({ ...u, createdAt: new Date(u.createdAt) })));
      })
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setIsLoading(false));
  }, []);

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("password123");
  const [newRole, setNewRole] = useState<UserRole>("SUPERVISOR");

  // Edit User Modal State
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("SUPERVISOR");

  // Reset Password Modal State
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("newpassword123");

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async () => {
    if (!newName || !newEmail || !newPassword) return;

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create user");
        return;
      }

      const newUser: User = { ...data.user, createdAt: new Date(data.user.createdAt) };
      setUsersList([newUser, ...usersList]);
      setShowCreateModal(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("password123");

      toast.success("New Staff Account Created!", {
        description: `Created ${newUser.name} with role ${ROLE_LABELS[newUser.role]}.`,
      });
    } catch {
      toast.error("Network error — please try again.");
    }
  };

  const handleOpenEditModal = (user: User) => {
    setEditTarget(user);
    setEditName(user.name);
    setEditRole(user.role);
  };

  const handleToggleActive = async (user: User) => {
    try {
      const newStatus = !user.isActive;
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        toast.error("Failed to update account status");
        return;
      }

      setUsersList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );

      toast.info(newStatus ? "Account Activated" : "Account Deactivated", {
        description: `${user.name}'s access status set to ${newStatus ? "Active" : "Inactive"}.`,
      });
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSaveEditUser = async () => {
    if (!editTarget || !editName.trim()) return;

    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), role: editRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update user");
        return;
      }

      setUsersList((prev) =>
        prev.map((u) =>
          u.id === editTarget.id ? { ...u, name: data.user.name, role: data.user.role } : u
        )
      );

      toast.success("User Profile Updated!", {
        description: `Updated name to "${data.user.name}" and role to ${ROLE_LABELS[data.user.role as UserRole]}.`,
      });

      setEditTarget(null);
    } catch {
      toast.error("Network error updating user");
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPasswordInput.trim()) return;

    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordInput.trim() }),
      });

      if (!res.ok) {
        toast.error("Failed to reset password");
        return;
      }

      toast.success("Password Reset Successfully!", {
        description: `Password for ${resetTarget.name} has been updated.`,
      });

      setResetTarget(null);
      setResetPasswordInput("newpassword123");
    } catch {
      toast.error("Network error resetting password");
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case "MAIN_ADMIN":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "OFFICE_ADMIN":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "SUPERVISOR":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "INVENTORY_ADMIN":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "COLD_STORAGE_ADMIN":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-5 bg-white border-b border-slate-200 shadow-2xs gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Staff Accounts & Access Control (RBAC)
              </h1>
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                Main Admin Privilege
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage member & operator accounts, assign page privileges, and toggle active status
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-11 px-4 gap-2 text-xs shadow-md shrink-0 w-full sm:w-auto"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          Create New Staff Account
        </Button>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Role Distribution Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Total Staff Members</span>
              <span className="text-2xl font-black text-slate-900 font-heading block mt-0.5">
                {usersList.length} Accounts
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Users className="w-5 h-5" />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Active Accounts</span>
              <span className="text-2xl font-black text-emerald-700 font-heading block mt-0.5">
                {usersList.filter((u) => u.isActive).length} Active
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Supervisors</span>
              <span className="text-2xl font-black text-emerald-800 font-heading block mt-0.5">
                {usersList.filter((u) => u.role === "SUPERVISOR").length} Field Staff
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sprout className="w-5 h-5" />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Warehouse & Storage</span>
              <span className="text-2xl font-black text-indigo-700 font-heading block mt-0.5">
                {usersList.filter((u) => u.role === "INVENTORY_ADMIN" || u.role === "COLD_STORAGE_ADMIN").length} Admins
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
          </Card>
        </div>

        {/* Filter Controls & Search */}
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff members by name or email..."
                className="pl-10 bg-slate-50 border-slate-200 text-slate-900 font-semibold h-10 rounded-xl text-sm"
              />
            </div>

            <div className="sm:col-span-4">
              <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val || "ALL")}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-10 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Filter by Role..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL" className="text-xs font-semibold">All RBAC Roles</SelectItem>
                  <SelectItem value="MAIN_ADMIN" className="text-xs font-semibold">Main Admin</SelectItem>
                  <SelectItem value="OFFICE_ADMIN" className="text-xs font-semibold">Office Admin</SelectItem>
                  <SelectItem value="SUPERVISOR" className="text-xs font-semibold">Field Supervisor</SelectItem>
                  <SelectItem value="INVENTORY_ADMIN" className="text-xs font-semibold">Inventory Admin</SelectItem>
                  <SelectItem value="COLD_STORAGE_ADMIN" className="text-xs font-semibold">Cold Storage Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* User Accounts Table */}
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-3.5 px-6">
            <CardTitle className="text-sm font-bold text-slate-900 font-heading">
              Registered Staff Accounts & Access Control List
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100">
                  <TableHead className="pl-6 text-xs font-bold text-slate-500 uppercase">Staff Name</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase">Email Address</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase">Assigned RBAC Role</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase">Status</TableHead>
                  <TableHead className="pr-6 text-right text-xs font-bold text-slate-500 uppercase">CRUD Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="border-slate-100 hover:bg-slate-50/70">
                    <TableCell className="pl-6 py-4">
                      <div>
                        <span className="font-bold text-slate-900 block text-sm">{u.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">ID: #{u.id}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 font-semibold text-slate-700 text-xs">
                      {u.email}
                    </TableCell>

                    <TableCell className="py-4">
                      <Badge variant="outline" className={`text-xs font-bold px-2.5 py-0.5 ${getRoleBadgeStyle(u.role)}`}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4">
                      {u.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold">
                          DEACTIVATED
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="pr-6 text-right py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditModal(u)}
                          className="h-8 w-8 text-slate-600 hover:bg-slate-100 rounded-lg p-0"
                          title="Edit Staff Name & Role"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setResetTarget(u)}
                          className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-lg p-0"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(u)}
                          className={`h-8 w-8 rounded-lg p-0 ${
                            u.isActive ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={u.isActive ? "Deactivate Account" : "Activate Account"}
                        >
                          {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Staff Account Modal */}
        {showCreateModal && (
          <Dialog open onOpenChange={() => setShowCreateModal(false)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  Create New Staff Account
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Staff Full Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter full name"
                    className="bg-white border-slate-200 text-slate-900 font-bold h-10 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="bg-white border-slate-200 text-slate-900 font-bold h-10 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Default Initial Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 font-bold h-10 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Assign RBAC Role</Label>
                  <Select value={newRole} onValueChange={(val: any) => setNewRole(val)}>
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="MAIN_ADMIN">Main Admin (Full System Privileges)</SelectItem>
                      <SelectItem value="OFFICE_ADMIN">Office Admin (Rate Locking & Approval)</SelectItem>
                      <SelectItem value="SUPERVISOR">Field Supervisor (Inspection & Harvest)</SelectItem>
                      <SelectItem value="INVENTORY_ADMIN">Inventory Admin (Warehouse Stock)</SelectItem>
                      <SelectItem value="COLD_STORAGE_ADMIN">Cold Storage Admin (KD Quality Reports)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5">
                  <UserPlus className="w-4 h-4" /> Create Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit User Modal */}
        {editTarget && (
          <Dialog open onOpenChange={() => setEditTarget(null)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
                  <Edit className="w-5 h-5 text-indigo-600" />
                  Edit User Details & Privileges
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Staff Full Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter staff full name (e.g. Kiran Doke)"
                    className="bg-white border-slate-200 text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 font-mono text-[11px] text-slate-400">
                    EMAIL ADDRESS (READ-ONLY)
                  </Label>
                  <Input
                    value={editTarget.email}
                    disabled
                    className="bg-slate-100 border-slate-200 text-slate-500 font-mono text-xs cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Select RBAC Access Role</Label>
                  <Select value={editRole} onValueChange={(val: any) => setEditRole(val)}>
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="MAIN_ADMIN">Main Admin</SelectItem>
                      <SelectItem value="OFFICE_ADMIN">Office Admin</SelectItem>
                      <SelectItem value="SUPERVISOR">Field Supervisor</SelectItem>
                      <SelectItem value="INVENTORY_ADMIN">Inventory Admin</SelectItem>
                      <SelectItem value="COLD_STORAGE_ADMIN">Cold Storage Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setEditTarget(null)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleSaveEditUser} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl">
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Reset Password Modal */}
        {resetTarget && (
          <Dialog open onOpenChange={() => setResetTarget(null)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-800 text-lg font-bold">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                  Reset Password for {resetTarget.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <Label className="text-xs font-bold text-slate-700">Enter New Password</Label>
                <Input
                  type="password"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  className="bg-white border-slate-200 text-slate-900 font-bold h-10 rounded-xl text-sm"
                />
              </div>

              <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setResetTarget(null)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleResetPassword} className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl">
                  Confirm Reset Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
