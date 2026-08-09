"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Lock,
  Mail,
  ShieldCheck,
  Phone,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Required Fields", { description: "Please enter your staff email and password." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Authentication Failed", {
          description: data.error || "Invalid staff email or password.",
        });
        setLoading(false);
        return;
      }

      toast.success("Welcome Back!", {
        description: `Authenticated as ${data.user.name}. Opening your dashboard...`,
      });

      // Automated credentials-based role redirection
      const role = data.user.role;
      if (role === "SUPERVISOR") {
        router.push("/supervisor");
      } else if (role === "INVENTORY_ADMIN") {
        router.push("/admin/inventory");
      } else if (role === "COLD_STORAGE_ADMIN") {
        router.push("/admin/cold-storage");
      } else if (role === "MAIN_ADMIN") {
        router.push("/admin/users");
      } else {
        router.push("/admin/procurement");
      }
    } catch (err) {
      toast.error("Connection Error", { description: "Unable to reach server. Please check connection." });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between items-center p-4 sm:p-8 font-sans selection:bg-rose-100 selection:text-rose-900 relative">
      {/* Top Header Branding */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 overflow-hidden">
            <Image
              src="/images/kd-export-icon.png"
              alt="KD EXPORT Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 font-heading uppercase leading-none">
              KD EXPORT ®
            </h1>
            <p className="text-[11px] font-bold text-rose-600 tracking-wider uppercase mt-1">
              Banana Supply Chain Platform
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-600" />
            <span>Kandar Tal Karmala, Solapur</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-rose-600" />
            <span>+91 9823435133</span>
          </div>
        </div>
      </header>

      {/* Main Professional Light Login Card */}
      <main className="w-full max-w-md my-auto py-8">
        <Card className="bg-white border-slate-200 shadow-xl rounded-3xl p-6 sm:p-8 overflow-hidden relative border">
          {/* Top Decorative Banner Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600" />

          <CardHeader className="p-0 pb-6 text-center space-y-4 border-b border-slate-100">
            {/* Official KD EXPORT Brand Logo */}
            <div className="mx-auto relative w-full h-36 flex items-center justify-center pt-1 pb-2">
              <Image
                src="/images/kd-export-logo.png"
                alt="KD EXPORT Official Logo"
                width={280}
                height={120}
                className="object-contain max-h-36"
                priority
              />
            </div>
            <CardTitle className="text-xl font-black text-slate-900 tracking-tight font-heading">
              Staff Account Sign In
            </CardTitle>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Enter your assigned employee email and password to access your workstation dashboard.
            </p>
          </CardHeader>

          <form onSubmit={handleLogin} className="space-y-5 py-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Employee Email Address
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="pl-10 bg-slate-50/70 border-slate-200 text-slate-900 font-semibold h-12 rounded-xl text-sm focus-visible:ring-rose-600 focus-visible:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Account Password
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-10 bg-slate-50/70 border-slate-200 text-slate-900 font-semibold h-12 rounded-xl text-sm focus-visible:ring-rose-600 focus-visible:bg-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 rounded-xl text-sm shadow-md shadow-rose-600/20 gap-2 transition-all"
              >
                {loading ? (
                  "Authenticating Staff Credentials..."
                ) : (
                  <>
                    Sign In to Workstation <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>Encrypted Session • Role Privileges Enforced Automatically</span>
          </div>
        </Card>
      </main>

      {/* Footer Details */}
      <footer className="w-full max-w-5xl py-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-slate-500 gap-2 text-center sm:text-left">
        <div>
          © {new Date().getFullYear()} <strong className="text-slate-700">KD EXPORT / KD Cold Storage</strong>. Gat No 504 Kandar Tal Karmala, Solapur, Maharashtra 413202.
        </div>
        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
          <span>KD EXPORT v2.0</span>
          <span>•</span>
          <span>JWT Edge Security</span>
        </div>
      </footer>
    </div>
  );
}
