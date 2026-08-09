"use client";

import { useState } from "react";
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
  Tag,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import { Farmer, VehicleSupplier, LabourTeam } from "@/types";
import { mockFarmers, mockVehicleSuppliers } from "@/lib/mock-data";
import { toast } from "sonner";

interface BrandItem {
  id: string;
  brandName: string;
  category: string;
  description: string;
}

interface ChemicalItem {
  id: string;
  chemicalName: string;
  dosage: string;
  purpose: string;
}

export default function MasterResourceManagementPage() {
  const [activeTab, setActiveTab] = useState<"farmers" | "labour" | "logistics" | "brands" | "chemicals">("farmers");

  // Master Registries State
  const [farmers, setFarmers] = useState<Farmer[]>(mockFarmers);
  const [suppliers, setSuppliers] = useState<VehicleSupplier[]>(mockVehicleSuppliers);
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

  // Brands & Chemicals Master State
  const [brands, setBrands] = useState<BrandItem[]>([
    { id: "b1", brandName: "KD Export Grade A", category: "Premium Export", description: "Class 1 Extra Cavendish Bananas" },
    { id: "b2", brandName: "Star Lanam", category: "Standard Export", description: "Gulf Market Standard Box Packing" },
    { id: "b3", brandName: "Solapur Royal", category: "Domestic Market", description: "Local Wholesale Cluster Packaging" },
  ]);

  const [chemicals, setChemicals] = useState<ChemicalItem[]>([
    { id: "c1", chemicalName: "Alum (Phitkari) Wash", dosage: "150 gm / 100L Water", purpose: "Latex Bleeding Removal & Cleaning" },
    { id: "c2", chemicalName: "Fungicide Post-Harvest Dip", dosage: "100 ML / Tank", purpose: "Crown Rot Prevention Treatment" },
    { id: "c3", chemicalName: "Ethylene Ripening Spray", dosage: "100 PPM", purpose: "Cold Storage Uniform Ripening" },
  ]);

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

  const [showAddBrand, setShowAddBrand] = useState(false);
  const [brandNameInput, setBrandNameInput] = useState("");
  const [brandCategoryInput, setBrandCategoryInput] = useState("Premium Export");
  const [brandDescInput, setBrandDescInput] = useState("");

  const [showAddChemical, setShowAddChemical] = useState(false);
  const [chemNameInput, setChemNameInput] = useState("");
  const [chemDosageInput, setChemDosageInput] = useState("");
  const [chemPurposeInput, setChemPurposeInput] = useState("");

  // CRUD Handler - Farmer
  const handleAddFarmer = () => {
    if (!farmerName || !farmerMobile) return;
    const newF: Farmer = {
      id: `f_${Date.now()}`,
      name: farmerName,
      mobileNumber: farmerMobile,
      address: farmerAddress || "Solapur, Maharashtra",
      createdAt: new Date(),
    };
    setFarmers([newF, ...farmers]);
    setShowAddFarmer(false);
    setFarmerName("");
    setFarmerMobile("");
    setFarmerAddress("");
    toast.success("Farmer Profile Created!", { description: `Registered ${newF.name} into Master Database.` });
  };

  // CRUD Handler - Vehicle Supplier
  const handleAddSupplier = () => {
    if (!supplierName || !vehicleNo) return;
    const newVS: VehicleSupplier = {
      id: `vs_${Date.now()}`,
      supplierName,
      vehicleNumber: vehicleNo,
      driverName,
      driverPhone,
    };
    setSuppliers([newVS, ...suppliers]);
    setShowAddSupplier(false);
    setSupplierName("");
    setVehicleNo("");
    setDriverName("");
    setDriverPhone("");
    toast.success("Vehicle Supplier Registered!", { description: `Added Truck ${newVS.vehicleNumber} (${newVS.supplierName}).` });
  };

  // CRUD Handler - Labour Team
  const handleAddLabourTeam = () => {
    if (!teamName || !leaderName) return;
    const newLT: LabourTeam = {
      id: `lt_${Date.now()}`,
      teamName,
      leaderName,
      contactNumber: leaderPhone,
      memberCount: parseInt(memberCount) || 10,
      isActive: true,
    };
    setLabourTeams([newLT, ...labourTeams]);
    setShowAddLabour(false);
    setTeamName("");
    setLeaderName("");
    setLeaderPhone("");
    toast.success("Labour Team Added!", { description: `Registered ${newLT.teamName} (${newLT.memberCount} members).` });
  };

  // CRUD Handler - Brand Name
  const handleAddBrand = () => {
    if (!brandNameInput) return;
    const newB: BrandItem = {
      id: `b_${Date.now()}`,
      brandName: brandNameInput,
      category: brandCategoryInput,
      description: brandDescInput || "Registered Packing Brand",
    };
    setBrands([newB, ...brands]);
    setShowAddBrand(false);
    setBrandNameInput("");
    setBrandDescInput("");
    toast.success("Export Brand Registered!", { description: `Added brand "${newB.brandName}" to master directory.` });
  };

  // CRUD Handler - Chemical Spray
  const handleAddChemical = () => {
    if (!chemNameInput) return;
    const newC: ChemicalItem = {
      id: `c_${Date.now()}`,
      chemicalName: chemNameInput,
      dosage: chemDosageInput || "Standard Field Dosage",
      purpose: chemPurposeInput || "Post-Harvest Treatment",
    };
    setChemicals([newC, ...chemicals]);
    setShowAddChemical(false);
    setChemNameInput("");
    setChemDosageInput("");
    setChemPurposeInput("");
    toast.success("Chemical Treatment Added!", { description: `Added "${newC.chemicalName}" to chemical master list.` });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-heading">
                Master Registries & Operations Control
              </h1>
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                Admin Master CRUD
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Manage Farmers Directory, Labour Teams, Logistics Fleet, Brand Particulars & Post-Harvest Chemical Lists
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
            <button
              onClick={() => setActiveTab("brands")}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "brands" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-indigo-600" /> Export Brands ({brands.length})
            </button>
            <button
              onClick={() => setActiveTab("chemicals")}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "chemicals" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-rose-600" /> Chemical Lists ({chemicals.length})
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

            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
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
                    .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.mobileNumber.includes(searchQuery))
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
                          <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-500 hover:text-slate-900 rounded-lg p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
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
                    <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold text-xs">
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

            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
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
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-500 hover:text-slate-900 rounded-lg p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* TAB 4: EXPORT BRANDS MASTER */}
        {activeTab === "brands" && (
          <div className="space-y-4">
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Registered Brand Names & Packaging Particulars</span>
              <Button
                onClick={() => setShowAddBrand(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-xl gap-1.5 text-xs shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Export Brand Name
              </Button>
            </Card>

            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100">
                    <TableHead className="pl-6 text-xs font-bold text-slate-500 uppercase">Brand Particular Name</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase">Category</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase">Description / Notes</TableHead>
                    <TableHead className="pr-6 text-right text-xs font-bold text-slate-500 uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((b) => (
                    <TableRow key={b.id} className="border-slate-100 hover:bg-slate-50/70">
                      <TableCell className="pl-6 py-3.5 font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Tag className="w-4 h-4 text-indigo-600" /> {b.brandName}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold">
                          {b.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-slate-600 text-xs">
                        {b.description}
                      </TableCell>
                      <TableCell className="pr-6 text-right py-3.5">
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-500 hover:text-slate-900 rounded-lg p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* TAB 5: CHEMICAL LISTS & SPRAYS MASTER */}
        {activeTab === "chemicals" && (
          <div className="space-y-4">
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Post-Harvest Chemical Treatments & Wash Sprays Master</span>
              <Button
                onClick={() => setShowAddChemical(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-10 rounded-xl gap-1.5 text-xs shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Chemical Treatment
              </Button>
            </Card>

            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100">
                    <TableHead className="pl-6 text-xs font-bold text-slate-500 uppercase">Chemical Particular</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase">Standard Dosage</TableHead>
                    <TableHead className="text-xs font-bold text-slate-500 uppercase">Treatment Purpose</TableHead>
                    <TableHead className="pr-6 text-right text-xs font-bold text-slate-500 uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chemicals.map((c) => (
                    <TableRow key={c.id} className="border-slate-100 hover:bg-slate-50/70">
                      <TableCell className="pl-6 py-3.5 font-bold text-slate-900 text-sm flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-rose-600" /> {c.chemicalName}
                      </TableCell>
                      <TableCell className="py-3.5 font-semibold text-slate-800 text-xs">
                        {c.dosage}
                      </TableCell>
                      <TableCell className="py-3.5 text-slate-600 text-xs">
                        {c.purpose}
                      </TableCell>
                      <TableCell className="pr-6 text-right py-3.5">
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-500 hover:text-slate-900 rounded-lg p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
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
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
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
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
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

        {/* Add Vehicle Supplier Modal */}
        {showAddSupplier && (
          <Dialog open onOpenChange={() => setShowAddSupplier(false)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
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

        {/* Add Brand Name Modal */}
        {showAddBrand && (
          <Dialog open onOpenChange={() => setShowAddBrand(false)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
                  <Tag className="w-5 h-5 text-indigo-600" /> Add Export Brand Name
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Brand Name</Label>
                  <Input value={brandNameInput} onChange={(e) => setBrandNameInput(e.target.value)} placeholder="Enter brand name" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Brand Category</Label>
                  <Input value={brandCategoryInput} onChange={(e) => setBrandCategoryInput(e.target.value)} placeholder="Enter category" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Description / Specifications</Label>
                  <Input value={brandDescInput} onChange={(e) => setBrandDescInput(e.target.value)} placeholder="Enter brand notes" className="h-10 rounded-xl" />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowAddBrand(false)} className="rounded-xl font-bold">Cancel</Button>
                <Button onClick={handleAddBrand} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">Add Brand</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Chemical Treatment Modal */}
        {showAddChemical && (
          <Dialog open onOpenChange={() => setShowAddChemical(false)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
                  <FlaskConical className="w-5 h-5 text-rose-600" /> Add Post-Harvest Chemical Treatment
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Chemical Particular / Spray Name</Label>
                  <Input value={chemNameInput} onChange={(e) => setChemNameInput(e.target.value)} placeholder="Enter chemical treatment name" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Standard Recommended Dosage</Label>
                  <Input value={chemDosageInput} onChange={(e) => setChemDosageInput(e.target.value)} placeholder="Enter dosage" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Treatment Purpose / Application</Label>
                  <Input value={chemPurposeInput} onChange={(e) => setChemPurposeInput(e.target.value)} placeholder="Enter treatment purpose" className="h-10 rounded-xl" />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowAddChemical(false)} className="rounded-xl font-bold">Cancel</Button>
                <Button onClick={handleAddChemical} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl">Add Chemical</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
