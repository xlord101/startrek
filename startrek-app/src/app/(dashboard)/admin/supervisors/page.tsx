"use client";

import { useState, useEffect } from "react";
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
  Users,
  UserPlus,
  Truck,
  HardHat,
  Sprout,
  Plus,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Farmer, VehicleSupplier, LabourTeam } from "@/types";
import { toast } from "sonner";

export default function MasterResourceManagementPage() {
  const [activeTab, setActiveTab] = useState<"farmers" | "labour" | "logistics">("farmers");

  // Master Registries State
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [suppliers, setSuppliers] = useState<VehicleSupplier[]>([]);
  const [labourTeams, setLabourTeams] = useState<LabourTeam[]>([
    {
      id: "lt1",
      teamName: "Solapur Harvesting Crew Alpha",
      leaderName: "Ramesh Pawar",
      contactNumber: "+91 9812345678",
      memberCount: 12,
      isActive: true,
    },
    {
      id: "lt2",
      teamName: "Karmala Field Packing Squad B",
      leaderName: "Sanjay Shinde",
      contactNumber: "+91 9712345678",
      memberCount: 15,
      isActive: true,
    },
  ]);

  // Load from Supabase on mount
  useEffect(() => {
    fetch("/api/farmers")
      .then((r) => r.json())
      .then((data) => { if (data.farmers) setFarmers(data.farmers.map((f: any) => ({ ...f, createdAt: new Date(f.createdAt) }))); })
      .catch(() => {});
    fetch("/api/vehicle-suppliers")
      .then((r) => r.json())
      .then((data) => { if (data.suppliers) setSuppliers(data.suppliers.map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) }))); })
      .catch(() => {});
    fetch("/api/labour-teams")
      .then((r) => r.json())
      .then((data) => { if (data.teams && data.teams.length > 0) setLabourTeams(data.teams); })
      .catch(() => {});
  }, []);

  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showAddFarmer, setShowAddFarmer] = useState(false);
  const [farmerName, setFarmerName] = useState("");
  const [farmerMobile, setFarmerMobile] = useState("");
  const [farmerAddress, setFarmerAddress] = useState("");

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  const [showAddLabour, setShowAddLabour] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderPhone, setLeaderPhone] = useState("");
  const [memberCount, setMemberCount] = useState("10");

  const [editingLabourTeam, setEditingLabourTeam] = useState<LabourTeam | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editLeaderName, setEditLeaderName] = useState("");
  const [editLeaderPhone, setEditLeaderPhone] = useState("");
  const [editMemberCount, setEditMemberCount] = useState("10");

  // CRUD Handler - Farmer
  const handleAddFarmer = async () => {
    if (!farmerName || !farmerMobile) return;
    try {
      const res = await fetch("/api/farmers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: farmerName,
          mobileNumber: farmerMobile,
          address: farmerAddress || "Solapur, Maharashtra",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create farmer");
        return;
      }

      const newF: Farmer = { ...data.farmer, createdAt: new Date(data.farmer.createdAt) };
      setFarmers([newF, ...farmers]);
      setShowAddFarmer(false);
      setFarmerName("");
      setFarmerMobile("");
      setFarmerAddress("");
      toast.success("Farmer Profile Created!", { description: `Registered ${newF.name} into Master Database.` });
    } catch {
      toast.error("Network error saving farmer");
    }
  };

  const handleDeleteFarmer = async (id: string) => {
    try {
      const res = await fetch(`/api/farmers?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete farmer");
        return;
      }
      setFarmers(farmers.filter((f) => f.id !== id));
      toast.info("Farmer Record Removed");
    } catch {
      toast.error("Error deleting farmer");
    }
  };

  // CRUD Handler - Vehicle Supplier
  const handleAddSupplier = async () => {
    if (!supplierName || !vehicleNo) return;
    try {
      const res = await fetch("/api/vehicle-suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName,
          vehicleNumber: vehicleNo,
          driverName,
          driverPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create supplier");
        return;
      }

      const newVS: VehicleSupplier = data.supplier;
      setSuppliers([newVS, ...suppliers]);
      setShowAddSupplier(false);
      setSupplierName("");
      setVehicleNo("");
      setDriverName("");
      setDriverPhone("");
      toast.success("Vehicle Supplier Registered!", { description: `Added Truck ${newVS.vehicleNumber} (${newVS.supplierName}).` });
    } catch {
      toast.error("Network error saving vehicle supplier");
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const res = await fetch(`/api/vehicle-suppliers?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete supplier");
        return;
      }
      setSuppliers(suppliers.filter((s) => s.id !== id));
      toast.info("Vehicle Supplier Removed");
    } catch {
      toast.error("Error deleting supplier");
    }
  };

  // CRUD Handler - Labour Team
  const handleAddLabourTeam = async () => {
    if (!teamName || !leaderPhone) {
      toast.error("Team name and leader contact number are required");
      return;
    }
    try {
      const res = await fetch("/api/labour-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName,
          leaderName,
          contactNumber: leaderPhone,
          memberCount: parseInt(memberCount, 10) || 10,
        }),
      });
      const data = await res.json();
      if (res.ok && data.team) {
        setLabourTeams([data.team, ...labourTeams]);
        toast.success("Labour Team Added!", { description: `Registered ${data.team.teamName} with phone ${data.team.contactNumber}.` });
      } else {
        toast.error(data.error || "Failed to add labour team");
      }
    } catch {
      toast.error("Error creating labour team");
    }
    setShowAddLabour(false);
    setTeamName("");
    setLeaderName("");
    setLeaderPhone("");
  };

  const openEditLabourTeam = (lt: LabourTeam) => {
    setEditingLabourTeam(lt);
    setEditTeamName(lt.teamName);
    setEditLeaderName(lt.leaderName || "");
    setEditLeaderPhone(lt.contactNumber || "");
    setEditMemberCount(String(lt.memberCount || 10));
  };

  const handleUpdateLabourTeam = async () => {
    if (!editingLabourTeam || !editTeamName || !editLeaderPhone) {
      toast.error("Team name and contact number are required");
      return;
    }
    try {
      const res = await fetch("/api/labour-teams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingLabourTeam.id,
          teamName: editTeamName,
          leaderName: editLeaderName,
          contactNumber: editLeaderPhone,
          memberCount: parseInt(editMemberCount, 10) || 10,
        }),
      });
      const data = await res.json();
      if (res.ok && data.team) {
        setLabourTeams(labourTeams.map((lt) => (lt.id === data.team.id ? data.team : lt)));
        toast.success("Labour Team Updated!", { description: `Updated ${data.team.teamName} phone to ${data.team.contactNumber}.` });
        setEditingLabourTeam(null);
      } else {
        toast.error(data.error || "Failed to update labour team");
      }
    } catch {
      toast.error("Error updating labour team");
    }
  };

  const handleDeleteLabourTeam = async (id: string) => {
    if (!confirm("Are you sure you want to remove this labour team?")) return;
    try {
      const res = await fetch(`/api/labour-teams?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setLabourTeams(labourTeams.filter((lt) => lt.id !== id));
        toast.success("Labour team removed");
        if (editingLabourTeam?.id === id) setEditingLabourTeam(null);
      } else {
        toast.error("Failed to delete labour team");
      }
    } catch {
      toast.error("Error deleting labour team");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-5 bg-white border-b border-slate-200 shadow-2xs gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Master Registries & Operations Control
              </h1>
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                Admin Master CRUD
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage Farmers Directory, Labour Teams, & Logistics Fleet
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between overflow-x-auto pb-1">
          <div className="bg-slate-200/70 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab("farmers")}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "farmers" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sprout className="w-3.5 h-3.5 text-emerald-600" /> Farmers Master ({farmers.length})
            </button>
            <button
              onClick={() => setActiveTab("labour")}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "labour" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <HardHat className="w-3.5 h-3.5 text-amber-600" /> Labour Teams ({labourTeams.length})
            </button>
            <button
              onClick={() => setActiveTab("logistics")}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "logistics" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-cyan-600" /> Logistics Fleet ({suppliers.length})
            </button>
          </div>
        </div>

        {/* TAB 1: FARMERS MASTER REGISTRY */}
        {activeTab === "farmers" && (
          <div className="space-y-4">
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search farmer directory by name or phone..."
                    className="pl-10 bg-slate-50 border-slate-200 text-slate-900 font-semibold h-10 rounded-xl text-sm"
                  />
                </div>
                <Button
                  onClick={() => setShowAddFarmer(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl gap-1.5 text-xs shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add New Farmer Profile
                </Button>
              </div>
            </Card>

            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100">
                    <TableHead className="pl-6 text-xs font-bold text-slate-500 uppercase">Farmer Name</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase">Mobile Number</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase">Farm Location / Address</TableHead>
                    <TableHead className="pr-6 text-right text-xs font-bold text-slate-500 uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmers
                    .filter((f) => (f.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (f.mobileNumber || "").includes(searchQuery))
                    .map((f) => (
                      <TableRow key={f.id} className="border-slate-100 hover:bg-slate-50/70">
                        <TableCell className="pl-6 py-3.5 font-bold text-slate-900 text-sm">
                          {f.name}
                        </TableCell>
                        <TableCell className="py-3.5 font-semibold text-slate-700 text-xs">
                          {f.mobileNumber}
                        </TableCell>
                        <TableCell className="py-3.5 text-slate-600 text-xs">
                          {f.address}
                        </TableCell>
                        <TableCell className="pr-6 text-right py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFarmer(f.id)}
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg p-0"
                              title="Delete Farmer Profile"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* TAB 2: LABOUR TEAMS REGISTRY */}
        {activeTab === "labour" && (
          <div className="space-y-4">
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Registered Cutting & Field Packing Labour Contractors</span>
              <Button
                onClick={() => setShowAddLabour(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 rounded-xl gap-1.5 text-xs shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add New Labour Team
              </Button>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {labourTeams.map((lt) => (
                <Card key={lt.id} className="border-slate-200 bg-white shadow-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{lt.teamName}</h3>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                          {lt.memberCount} Members
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500 block mt-1">Team Leader: {lt.leaderName}</span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <HardHat className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-600 font-medium">Contact: {lt.contactNumber}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditLabourTeam(lt)}
                      className="h-8 rounded-lg font-bold text-xs hover:bg-amber-50 hover:text-amber-700"
                    >
                      Edit Team
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LOGISTICS FLEET REGISTRY */}
        {activeTab === "logistics" && (
          <div className="space-y-4">
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Logistics Transport Suppliers & Truck Fleet</span>
              <Button
                onClick={() => setShowAddSupplier(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-10 rounded-xl gap-1.5 text-xs shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Vehicle Supplier
              </Button>
            </Card>

            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100">
                    <TableHead className="pl-6 text-xs font-bold text-slate-500 uppercase">Supplier Company</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase">Vehicle / Truck No</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase">Assigned Driver</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase">Driver Contact</TableHead>
                    <TableHead className="pr-6 text-right text-xs font-bold text-slate-500 uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((vs) => (
                    <TableRow key={vs.id} className="border-slate-100 hover:bg-slate-50/70">
                      <TableCell className="pl-6 py-3.5 font-bold text-slate-900 text-sm">
                        {vs.supplierName}
                      </TableCell>
                      <TableCell className="py-3.5 font-mono font-bold text-slate-800 text-xs">
                        {vs.vehicleNumber}
                      </TableCell>
                      <TableCell className="py-3.5 font-semibold text-slate-700 text-xs">
                        {vs.driverName}
                      </TableCell>
                      <TableCell className="py-3.5 text-slate-600 text-xs">
                        {vs.driverPhone}
                      </TableCell>
                      <TableCell className="pr-6 text-right py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSupplier(vs.id)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg p-0"
                            title="Delete Vehicle Supplier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Add Farmer Modal */}
        {showAddFarmer && (
          <Dialog open onOpenChange={() => setShowAddFarmer(false)}>
            <DialogContent className="w-[96vw] max-w-xl sm:max-w-xl md:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-7">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
                  <Sprout className="w-5 h-5 text-emerald-600" /> Add Farmer Profile
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Farmer Full Name</Label>
                  <Input value={farmerName} onChange={(e) => setFarmerName(e.target.value)} placeholder="Enter farmer full name" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Mobile Number</Label>
                  <Input value={farmerMobile} onChange={(e) => setFarmerMobile(e.target.value)} placeholder="Enter mobile number" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Farm Location Address</Label>
                  <Input value={farmerAddress} onChange={(e) => setFarmerAddress(e.target.value)} placeholder="Enter farm address" className="h-10 rounded-xl" />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowAddFarmer(false)} className="rounded-xl font-bold">Cancel</Button>
                <Button onClick={handleAddFarmer} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">Create Profile</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Labour Modal */}
        {showAddLabour && (
          <Dialog open onOpenChange={() => setShowAddLabour(false)}>
            <DialogContent className="w-[96vw] max-w-xl sm:max-w-xl md:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-7">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
                  <HardHat className="w-5 h-5 text-amber-600" /> Add Harvesting Labour Team
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Team / Squad Name</Label>
                  <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Enter team name" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Team Leader Name</Label>
                  <Input value={leaderName} onChange={(e) => setLeaderName(e.target.value)} placeholder="Enter team leader name" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Leader Phone Number</Label>
                  <Input value={leaderPhone} onChange={(e) => setLeaderPhone(e.target.value)} placeholder="Enter contact phone number" className="h-10 rounded-xl" />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowAddLabour(false)} className="rounded-xl font-bold">Cancel</Button>
                <Button onClick={handleAddLabourTeam} className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl">Add Team</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Labour Modal */}
        {editingLabourTeam && (
          <Dialog open onOpenChange={() => setEditingLabourTeam(null)}>
            <DialogContent className="w-[96vw] max-w-xl sm:max-w-xl md:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-7">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
                  <HardHat className="w-5 h-5 text-amber-600" /> Edit Labour Team & Phone
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Team / Squad Name</Label>
                  <Input value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} placeholder="Enter team name" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Team Leader Name</Label>
                  <Input value={editLeaderName} onChange={(e) => setEditLeaderName(e.target.value)} placeholder="Enter team leader name" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Leader Phone Number (for work order SMS)</Label>
                  <Input value={editLeaderPhone} onChange={(e) => setEditLeaderPhone(e.target.value)} placeholder="e.g. +91 98221 12345" className="h-10 rounded-xl font-mono font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Member Count</Label>
                  <Input type="number" value={editMemberCount} onChange={(e) => setEditMemberCount(e.target.value)} className="h-10 rounded-xl" />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => handleDeleteLabourTeam(editingLabourTeam.id)}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-xs"
                >
                  Delete Team
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setEditingLabourTeam(null)} className="rounded-xl font-bold">Cancel</Button>
                  <Button onClick={handleUpdateLabourTeam} className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl">Save Changes</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Vehicle Supplier Modal */}
        {showAddSupplier && (
          <Dialog open onOpenChange={() => setShowAddSupplier(false)}>
            <DialogContent className="w-[96vw] max-w-xl sm:max-w-xl md:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-7">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
                  <Truck className="w-5 h-5 text-cyan-600" /> Add Vehicle Transport Supplier
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Transport Supplier / Contractor Name</Label>
                  <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Enter transport supplier name" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Vehicle / Truck Number</Label>
                  <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="Enter vehicle number" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Driver Name</Label>
                  <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Enter driver name" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Driver Phone Number</Label>
                  <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="Enter driver phone number" className="h-10 rounded-xl" />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowAddSupplier(false)} className="rounded-xl font-bold">Cancel</Button>
                <Button onClick={handleAddSupplier} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl">Add Supplier</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
