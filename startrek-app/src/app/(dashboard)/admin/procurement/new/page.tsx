"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { store, useStartrekStore } from "@/lib/store";
import { LOCATION_DATABASE, getCityData, parseStructuredAddress } from "@/lib/location-data";
import { ArrowLeft, Check, ChevronsUpDown, UserPlus, ClipboardList, Phone, MapPin, Weight, Sprout, Building, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Farmer } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function NewIntakePage() {
  const router = useRouter();
  const { farmers } = useStartrekStore();

  const [open, setOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [isNewFarmer, setIsNewFarmer] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  // Structured Address State (Lane, Town, City, State)
  const [lane, setLane] = useState("Gat No 455/3B, Bittergaon Road");
  const [selectedCity, setSelectedCity] = useState("Solapur");
  const [selectedTown, setSelectedTown] = useState("Kandar");
  const [approxTonnage, setApproxTonnage] = useState("");

  // Dynamic Town/Village list based on selected City
  const availableTowns = useMemo(() => {
    const cityObj = getCityData(selectedCity);
    return cityObj ? cityObj.towns : [];
  }, [selectedCity]);

  // Auto-selected State based on selected City
  const autoState = useMemo(() => {
    const cityObj = getCityData(selectedCity);
    return cityObj ? cityObj.state : "Maharashtra";
  }, [selectedCity]);

  // Handle City Change: auto-update state & reset town to first town in list
  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    const cityObj = getCityData(newCity);
    if (cityObj && cityObj.towns.length > 0) {
      setSelectedTown(cityObj.towns[0]);
    } else {
      setSelectedTown("");
    }
  };

  const handleFarmerSelect = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setName(farmer.name);
    setMobile(farmer.mobileNumber);

    // Parse existing structured address if available
    const parsed = parseStructuredAddress(farmer.address);
    setLane(parsed.lane);
    setSelectedCity(parsed.city);
    setSelectedTown(parsed.town);

    setIsNewFarmer(false);
    setOpen(false);
  };

  const handleNewFarmer = () => {
    setSelectedFarmer(null);
    setIsNewFarmer(true);
    setName("");
    setMobile("");
    setLane("");
    setSelectedCity("Solapur");
    setSelectedTown("Kandar");
    setOpen(false);
  };

  const fullCombinedAddress = `${lane.trim()}, ${selectedTown}, ${selectedCity}, ${autoState}`;

  const isValid = name.trim() && mobile.trim() && lane.trim() && selectedTown && selectedCity && approxTonnage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    // Create intake task in local reactive store
    store.createIntake({
      farmerName: name,
      mobileNumber: mobile,
      address: fullCombinedAddress,
      approxTonnage: parseFloat(approxTonnage) || 0,
    });

    try {
      // 1. Create or get farmer record in database
      const farmerRes = await fetch("/api/farmers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mobileNumber: mobile,
          address: fullCombinedAddress,
        }),
      });
      const farmerData = await farmerRes.json();
      
      if (farmerData.farmer?.id) {
        // 2. Create procurement task record in database
        await fetch("/api/procurement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farmerId: farmerData.farmer.id,
            estTonnage: parseFloat(approxTonnage) || 0,
            location: fullCombinedAddress,
          }),
        });
      }
    } catch (e) {
      console.error("Failed to sync new intake to database", e);
    }

    toast.success("Intake form recorded successfully!", {
      description: `Task created for ${name} (${approxTonnage} T) at ${fullCombinedAddress} — pending supervisor allocation.`,
    });
    router.push("/admin/procurement");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-8 py-5 bg-white border-b border-slate-200 shadow-2xs">
        <Link href="/admin/procurement">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 font-heading">
              Inbound Yield Intake
            </h1>
            <p className="text-xs text-slate-500">
              Module 1.1 — Structured Address Intake (Lane, Town, City & Auto State)
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  Farmer & Farm Yield Details
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select an existing registered farmer or record a new farmer&apos;s structured address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                {/* Farmer Search Combobox */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Lookup Registered Farmer
                  </Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger className="w-full inline-flex items-center justify-between bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-900 h-11 px-4 rounded-xl font-medium text-sm transition-colors">
                      {selectedFarmer
                        ? `${selectedFarmer.name} (${selectedFarmer.mobileNumber})`
                        : isNewFarmer
                        ? "+ Registering New Farmer"
                        : "Search existing farmer by name or phone..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[480px] p-0 rounded-xl border-slate-200 shadow-xl" align="start">
                      <Command>
                        <CommandInput placeholder="Type farmer name or mobile..." className="h-10 text-sm" />
                        <CommandList>
                          <CommandEmpty className="p-3 text-xs text-slate-500 text-center">No matching farmer found.</CommandEmpty>
                          <CommandGroup heading="Registered Farmers">
                            {farmers.map((farmer) => (
                              <CommandItem
                                key={farmer.id}
                                value={farmer.name}
                                onSelect={() => handleFarmerSelect(farmer)}
                                className="cursor-pointer py-2.5 px-3"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedFarmer?.id === farmer.id
                                      ? "opacity-100 text-emerald-600"
                                      : "opacity-0"
                                  )}
                                />
                                <div>
                                  <p className="text-sm font-bold text-slate-900">
                                    {farmer.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {farmer.mobileNumber} · {farmer.address.split(",")[0]}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup>
                            <CommandItem onSelect={handleNewFarmer} className="cursor-pointer py-2.5 text-emerald-700 font-bold bg-emerald-50/50">
                              <UserPlus className="mr-2 h-4 w-4 text-emerald-600" />
                              <span>+ Create New Farmer Record</span>
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="h-px bg-slate-100 my-2" />

                {/* Farmer Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-slate-700">
                      Farmer Full Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter farmer name"
                      className="bg-white border-slate-200 text-slate-900 h-11 rounded-xl font-medium focus-visible:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Mobile Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="mobile"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="Enter mobile phone number"
                      className="bg-white border-slate-200 text-slate-900 h-11 rounded-xl font-medium focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Structured Address Columns (Lane, City, Town, State) */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1 uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Farm Structured Address
                    </Label>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      Auto State Mapping Active
                    </Badge>
                  </div>

                  {/* Lane / Gat No Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="lane" className="text-xs font-bold text-slate-700">
                      Lane / Gat No / Street <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="lane"
                      value={lane}
                      onChange={(e) => setLane(e.target.value)}
                      placeholder="Enter street or Gat number"
                      className="bg-white border-slate-200 text-slate-900 h-11 rounded-xl font-medium focus-visible:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* City Dropdown */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" /> City / District <span className="text-rose-500">*</span>
                      </Label>
                      <Select value={selectedCity} onValueChange={(val: any) => handleCityChange(val || "")}>
                        <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-11 rounded-xl font-semibold text-sm">
                          <SelectValue placeholder="Select City..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 max-h-60 overflow-y-auto">
                          {LOCATION_DATABASE.map((loc) => (
                            <SelectItem key={loc.city} value={loc.city} className="cursor-pointer font-medium text-xs py-2.5">
                              {loc.city} ({loc.state})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Town / Village Dropdown (Populated based on City) */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Compass className="w-3 h-3 text-slate-400" /> Town / Village <span className="text-rose-500">*</span>
                      </Label>
                      <Select value={selectedTown} onValueChange={(val: any) => setSelectedTown(val || "")}>
                        <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-11 rounded-xl font-semibold text-sm">
                          <SelectValue placeholder="Select Town..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 max-h-60 overflow-y-auto">
                          {availableTowns.map((town) => (
                            <SelectItem key={town} value={town} className="cursor-pointer font-medium text-xs py-2.5">
                              {town}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Auto State Display */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Auto State</Label>
                      <div className="h-11 rounded-xl bg-slate-100 border border-slate-200 px-3.5 flex items-center justify-between font-bold text-slate-800 text-xs">
                        <span>{autoState}</span>
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 sm:max-w-xs pt-1">
                  <Label
                    htmlFor="approxTonnage"
                    className="text-xs font-bold text-slate-700 flex items-center gap-1"
                  >
                    <Weight className="w-3.5 h-3.5 text-slate-400" /> Approximate Yield (Tons) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="approxTonnage"
                    type="number"
                    step="0.5"
                    min="0"
                    value={approxTonnage}
                    onChange={(e) => setApproxTonnage(e.target.value)}
                    placeholder="Enter estimated yield tonnage"
                    className="bg-white border-slate-200 text-slate-900 h-11 rounded-xl font-medium focus-visible:ring-emerald-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/admin/procurement">
                <Button variant="outline" className="rounded-xl border-slate-200 text-slate-700 font-bold h-11">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!isValid}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 h-11 rounded-xl shadow-sm shadow-emerald-600/20 gap-2 text-sm"
              >
                <Sprout className="w-4.5 h-4.5" />
                Save & Create Intake Task
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
