import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Stethoscope, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Building2, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type LoginRole = "normal" | "hospital-admin" | "system-admin";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleType, setRoleType] = useState<LoginRole>("normal");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login({ email, password }, roleType);
      toast.success(`Welcome back, ${user.name}!`);

      if (user.role === "SYSTEM_ADMIN") navigate("/system-admin/dashboard");
      else if (user.role === "HOSPITAL_ADMIN") navigate("/hospital-admin/dashboard");
      else if (user.role === "DOCTOR") navigate("/doctor/dashboard");
      else navigate("/patient/dashboard");

    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'normal', label: 'User / Doctor', icon: ShieldCheck },
    { id: 'hospital-admin', label: 'Hospital Admin', icon: Building2 },
    { id: 'system-admin', label: 'System Admin', icon: LayoutDashboard },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      
      {/* LEFT PANEL - BRANDING CENTERED (FIXED) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 p-12 flex-col justify-between h-full relative">
        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl text-white">E-Health</span>
        </Link>
        
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
              Your Health Journey <br /> Starts Here
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Secure access to AI-powered healthcare consultations, encrypted EHR, and blockchain-verified medical records.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-500 font-mono tracking-widest uppercase">
              <span>HIPAA Compliant</span>
              <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
              <span>AES-256</span>
              <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
              <span>GDPR</span>
            </div>
          </div>
        </div>
        
        <div className="text-slate-600 text-sm relative z-10">
          © 2026 E-Health Systems. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL - INDEPENDENT SCROLL */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto flex flex-col items-center bg-white lg:bg-slate-50">
        <div className="w-full max-w-xl px-8 py-16 lg:px-16">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
            <p className="text-slate-500 mt-2">Sign in to access your dashboard</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6 bg-white lg:p-10 lg:rounded-2xl lg:shadow-sm lg:border lg:border-slate-100">
            
            {/* ROLE TILES */}
            <div className="space-y-3">
              <Label className="text-slate-700 font-medium">Continue as</Label>
              <div className="grid grid-cols-3 gap-3">
                {roles.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoleType(r.id as LoginRole)}
                      className={`flex flex-col items-center gap-2 py-3 px-1 rounded-xl border-2 text-xs font-bold transition-all ${
                        roleType === r.id
                          ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${roleType === r.id ? 'text-teal-600' : 'text-slate-400'}`} />
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="name@example.com" 
                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus:border-teal-500" 
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-teal-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    className="pl-10 pr-12 h-12 bg-slate-50 border-slate-200 focus:border-teal-500" 
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-14 bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-100 text-white font-bold text-lg rounded-xl transition-all"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>
          
          <p className="text-center text-slate-500 mt-10 pb-12 text-base">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-600 font-bold hover:underline decoration-2 underline-offset-4">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;