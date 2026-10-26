"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, MapPin, Scale } from "lucide-react";

interface SupervisorAddFarmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupervisorAddFarmerModal({ isOpen, onClose, onSuccess }: SupervisorAddFarmerModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: "",
    address: "",
    estTonnage: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create Farmer
      const farmerRes = await fetch("/api/farmers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          mobileNumber: formData.mobileNumber,
          address: formData.address,
        }),
      });

      if (!farmerRes.ok) {
        const err = await farmerRes.json();
        throw new Error(err.error || "Failed to create farmer");
      }
      
      const { farmer } = await farmerRes.json();

      // 2. Create Procurement Task (Auto-assigned to this supervisor by backend)
      const procRes = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: farmer.id,
          estTonnage: Number(formData.estTonnage),
        }),
      });

      if (!procRes.ok) throw new Error("Failed to create procurement task");

      toast.success("Farmer & Task Created", {
        description: "New intake created and auto-assigned to you.",
      });
      
      onSuccess();
      onClose();
      setFormData({ name: "", mobileNumber: "", address: "", estTonnage: "" });
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Quick Add Farmer & Intake
          </DialogTitle>
          <DialogDescription>
            Register a new farmer and auto-assign a procurement task to yourself.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Farmer Name</Label>
            <Input
              placeholder="e.g. Ramesh Pawar"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Mobile Number</Label>
            <Input
              placeholder="+91..."
              required
              value={formData.mobileNumber}
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Village / Location
            </Label>
            <Input
              placeholder="e.g. Solapur North"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              Estimated Yield (Tons)
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="e.g. 15.5"
              required
              value={formData.estTonnage}
              onChange={(e) => setFormData({ ...formData, estTonnage: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? "Creating..." : "Add & Assign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
