import { Sprout, Lock, Mail, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* Subtle green ambient accent */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 mb-4">
            <Sprout className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-heading">
            Startrek Enterprise
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Banana Produce & Supply Chain Management System
          </p>
        </div>

        <Card className="border-slate-200 bg-white shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 pt-5 px-6">
            <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Sign In to Your Workspace
            </h2>
            <p className="text-xs text-slate-500">
              Enter your authorized account email and password to proceed.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            <form className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                  Work Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@startrek.com"
                    className="pl-10 h-10 bg-slate-50 border-slate-200 text-slate-900 text-sm font-medium rounded-xl focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    className="pl-10 h-10 bg-slate-50 border-slate-200 text-slate-900 text-sm font-medium rounded-xl focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-md shadow-emerald-600/20 mt-2 gap-2 text-sm"
              >
                <span>Access System</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 font-medium">
          Protected enterprise system · Authorized personnel access only
        </p>
      </div>
    </div>
  );
}
