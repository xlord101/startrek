"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, ArrowRight, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Client-side redirect if already logged in (prevents back-button loops)
    if (typeof document !== 'undefined') {
      const hasToken = document.cookie.includes('auth_token=');
      if (hasToken) {
        // Optimistic redirect to admin to let middleware handle role routing
        router.replace('/admin');
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Required Fields", { description: "Please enter your staff email/username and password." });
      return;
    }

    setLoading(true);

    // Request notification permission on user gesture
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Authentication Failed", {
          description: data.error || "Invalid staff credentials.",
        });
        setLoading(false);
        return;
      }

      toast.success(`Hi ${data.user.name || "there"}`, {
        duration: 2000,
        className: "bg-slate-800 text-white border-none shadow-lg !rounded-lg animate-in fade-in slide-in-from-top-2 duration-300",
      });

      // Role-based landing page redirection
      const role = data.user.role;
      if (role === "FIELD_SUPERVISOR" || role === "PROCUREMENT_SUPERVISOR") {
        router.replace("/supervisor");
      } else if (role === "INVENTORY_ADMIN") {
        router.replace("/admin/inventory");
      } else if (role === "COLD_STORAGE_ADMIN") {
        router.replace("/admin/cold-storage");
      } else {
        // Main Admin & Office Admin land directly on Overview page (/admin)
        router.replace("/admin");
      }
    } catch (err) {
      toast.error("Connection Error", { description: "Unable to reach server. Please check connection." });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between items-center p-4 sm:p-8 font-sans selection:bg-slate-200 selection:text-slate-900 relative">
      {/* Header Branding */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 overflow-hidden">
            <Image
              src="/images/kd-export-icon.png"
              alt="KD EXPORT Logo"
              width={44}
              height={44}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading uppercase leading-none">
              KD EXPORT
            </h1>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Kandar Tal Karmala, Solapur</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>+91 9823435133</span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md my-auto py-8">
        <Card className="bg-white border-slate-200 shadow-md rounded-2xl p-6 sm:p-8 overflow-hidden relative border transition-all duration-300 animate-in fade-in fill-mode-forwards">
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800" />

          <CardHeader className="p-0 pb-6 text-center space-y-4 border-b border-slate-100">
            <div className="mx-auto relative w-full h-32 flex items-center justify-center pt-1 pb-2">
              <Image
                src="/images/kd-export-logo.png"
                alt="KD EXPORT Official Logo"
                width={260}
                height={110}
                className="object-contain max-h-32"
                priority
              />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 tracking-tight font-heading">
              Staff Portal Sign In
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleLogin} className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 tracking-wider uppercase">
                Email or Username
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Enter email or staff name"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 bg-slate-50/80 border-slate-200 focus:bg-white text-slate-900 rounded-xl text-sm font-semibold transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-10 bg-slate-50/70 border-slate-200 text-slate-900 font-semibold h-12 rounded-xl text-sm focus-visible:ring-slate-900 focus-visible:bg-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold h-11 rounded-xl text-sm shadow-sm gap-2 transition-all duration-200"
              >
                {loading ? (
                  "Authenticating..."
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-slate-500 gap-2 text-center sm:text-left">
        <div>
          © {new Date().getFullYear()} <strong className="text-slate-700">KD EXPORT</strong>. Gat No 504 Kandar Tal Karmala, Solapur, Maharashtra 413202.
        </div>
      </footer>
    </div>
  );
}
