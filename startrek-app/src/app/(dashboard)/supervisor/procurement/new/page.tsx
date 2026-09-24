"use client";

import { useState, useMemo, useEffect } from "react";
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
import { store, useStartrekStore } from "@/lib/store";
import { LOCATION_DATABASE, parseStructuredAddress } from "@/lib/location-data";
import { ArrowLeft, Check, ChevronsUpDown, UserPlus, ClipboardList, Phone, MapPin, Weight, Sprout } from "lucide-react";
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

  // Fetch real farmers from database
  useEffect(() => {
    fetch("/api/farmers")
      .then((res) => {
        if (res.status === 401) window.location.href = '/login';
        return res.json();
      })
      .then((data) => {
        if (data.farmers) {
          store.setFarmers(data.farmers);
        }
      })
      .catch((err) => console.error("Failed to load farmers", err));
  }, []);

  // Form state
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  // Village-only location: free text with autocomplete suggestions
  const [village, setVillage] = useState("");
  const [showVillageSuggestions, setShowVillageSuggestions] = useState(false);
  const [approxTonnage, setApproxTonnage] = useState("");

  // Flat list of every known village/town (deduped) for autocomplete
  const allVillages = useMemo(() => {
    const set = new Set<string>();
    for (const loc of LOCATION_DATABASE) {
      set.add(loc.city);
      for (const t of loc.towns) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  // Suggestions filtered by what the user typed (exact matches excluded)
  const villageSuggestions = useMemo(() => {
    const q = village.trim().toLowerCase();
    if (!q) return allVillages.slice(0, 8);
    return allVillages
      .filter((v) => v.toLowerCase().includes(q) && v.toLowerCase() !== q)
      .slice(0, 8);
  }, [village, allVillages]);

  const handleFarmerSelect = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setName(farmer.name);
    setMobile(farmer.mobileNumber);

    // Show the village part of an existing structured address if present
    const parsed = parseStructuredAddress(farmer.address);
    setVillage(parsed.town || parsed.city || "");

    setIsNewFarmer(false);
    setOpen(false);
  };

  const handleNewFarmer = () => {
    setSelectedFarmer(null);
    setIsNewFarmer(true);
    setName("");
    setMobile("");
    setVillage("");
    setOpen(false);
  };

  // Address is now the village name only
  const fullCombinedAddress = village.trim();

  const isValid = name.trim() && mobile.trim() && village.trim() && approxTonnage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      let farmerId = selectedFarmer?.id;

      // 1. Create farmer if not selected
      if (!farmerId) {
        const farmerRes = await fetch("/api/farmers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            mobileNumber: mobile,
            address: fullCombinedAddress,
          }),
        });
        
        if (!farmerRes.ok) {
          const err = await farmerRes.json();
          toast.error("Failed to register farmer", { description: err.error });
          return; // Stop execution if farmer creation fails
        }
        
        const farmerData = await farmerRes.json();
        farmerId = farmerData.farmer?.id;
      }
      
      if (farmerId) {
        // 2. Create procurement task record in database
        const procRes = await fetch("/api/procurement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farmerId: farmerId,
            estTonnage: parseFloat(approxTonnage) || 0,
            location: fullCombinedAddress,
          }),
        });

        if (!procRes.ok) {
          throw new Error("Failed to create procurement task");
        }
      }
    } catch (e) {
      console.error("Failed to sync new intake to database", e);
      toast.error("Failed to create task in database");
      return; // Stop execution on error
    }

    // Only update local store if DB was successful (for optimistic UI transition)
    store.createIntake({
      farmerName: name,
      mobileNumber: mobile,
      address: fullCombinedAddress,
      approxTonnage: parseFloat(approxTonnage) || 0,
    });

    toast.success("Intake form recorded successfully!", {
      description: `Task created for ${name} (${approxTonnage} T) at ${fullCombinedAddress} — assigned to you.`,
    });
    router.push("/supervisor");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-8 py-5 bg-white border-b border-slate-200 shadow-2xs">
        <Link href="/supervisor">
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
              New Farmer & Yield Request
            </h1>
            <p className="text-xs text-slate-500">
              Supervisor Field Intake — This request will be auto-assigned to you.
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

                {/* Village-only Location */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1 uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Farm Location
                    </Label>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      Village Name Only
                    </Badge>
                  </div>

                  {/* Village Input with autocomplete suggestions */}
                  <div className="relative">
                    <Label htmlFor="village" className="text-xs font-bold text-slate-700">
                      Village Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="village"
                      value={village}
                      onChange={(e) => {
                        setVillage(e.target.value);
                        setShowVillageSuggestions(true);
                      }}
                      onFocus={() => setShowVillageSuggestions(true)}
                      onBlur={() => window.setTimeout(() => setShowVillageSuggestions(false), 150)}
                      placeholder="Start typing a village name..."
                      autoComplete="off"
                      className="bg-white border-slate-200 text-slate-900 h-11 rounded-xl font-medium focus-visible:ring-emerald-500 mt-1"
                    />
                    {showVillageSuggestions && villageSuggestions.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {villageSuggestions.map((v) => (
                          <button
                            key={v}
                            type="button"
                            className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-slate-800 hover:bg-emerald-50 cursor-pointer"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setVillage(v);
                              setShowVillageSuggestions(false);
                            }}
                          >
                            <MapPin className="w-3 h-3 inline-block mr-1.5 text-slate-400" />
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
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
              <Link href="/supervisor">
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
