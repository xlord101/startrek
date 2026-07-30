"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { mockFarmers } from "@/lib/mock-data";
import { ArrowLeft, Check, ChevronsUpDown, UserPlus, ClipboardList, Phone, MapPin, Weight, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Farmer } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function NewIntakePage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [isNewFarmer, setIsNewFarmer] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [approxTonnage, setApproxTonnage] = useState("");

  const handleFarmerSelect = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setName(farmer.name);
    setMobile(farmer.mobileNumber);
    setAddress(farmer.address);
    setIsNewFarmer(false);
    setOpen(false);
  };

  const handleNewFarmer = () => {
    setSelectedFarmer(null);
    setIsNewFarmer(true);
    setName("");
    setMobile("");
    setAddress("");
    setOpen(false);
  };

  const isValid = name.trim() && mobile.trim() && address.trim() && approxTonnage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    toast.success("Intake form recorded successfully!", {
      description: `Task created for ${name} (${approxTonnage} T) — pending supervisor allocation.`,
    });
    router.push("/admin/procurement");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
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
              Module 1.1 — Record incoming yield information from any medium
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  Farmer & Farm Yield Information
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select an existing farmer from the database or enter a new farmer&apos;s details.
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
                            {mockFarmers.map((farmer) => (
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

                {/* Farmer Detail Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-slate-700">
                      Farmer Full Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Murugan Selvam"
                      className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-medium focus-visible:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> Mobile Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="mobile"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="10-digit primary phone"
                      className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-medium focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> Farm Location / Address <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Village, Taluk, District (e.g. Marthandam, Kanyakumari)"
                    rows={2}
                    className="bg-white border-slate-200 text-slate-900 rounded-xl font-medium resize-none focus-visible:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5 sm:max-w-xs">
                  <Label
                    htmlFor="approxTonnage"
                    className="text-xs font-bold text-slate-700 flex items-center gap-1"
                  >
                    <Weight className="w-3 h-3 text-slate-400" /> Approximate Yield (Tons) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="approxTonnage"
                    type="number"
                    step="0.5"
                    min="0"
                    value={approxTonnage}
                    onChange={(e) => setApproxTonnage(e.target.value)}
                    placeholder="e.g. 12"
                    className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-medium focus-visible:ring-emerald-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/admin/procurement">
                <Button variant="outline" className="rounded-xl border-slate-200 text-slate-700 font-bold">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!isValid}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 h-10 rounded-xl shadow-sm shadow-emerald-600/20 gap-2"
              >
                <Sprout className="w-4 h-4" />
                Save & Create Task
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
