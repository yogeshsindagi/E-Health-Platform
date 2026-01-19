import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  Stethoscope, Mail, Lock, User, ArrowRight, Eye, EyeOff,
  Phone, MapPin, Award, Building, CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';

const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const defaultRole = (searchParams.get('role') as any) || 'patient';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: defaultRole as 'patient' | 'doctor' | 'admin',
    specialization: '',
    license_number: '',
    phone: '',
    address: '',
    hospitalId: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          toast.success('Clinic location captured');
          setGettingLocation(false);
        },
        () => {
          toast.error('Could not retrieve location');
          setGettingLocation(false);
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const mappedRole = formData.role === 'admin' ? 'hospital-admin' : formData.role;

      const payload: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: mappedRole,
      };

      if (mappedRole === 'doctor') {
        payload.specialization = formData.specialization;
        payload.licenseNumber = formData.license_number;
        payload.hospitalId = formData.hospitalId;
        payload.latitude = formData.latitude;
        payload.longitude = formData.longitude;
      }

      if (mappedRole === 'hospital-admin') {
        payload.hospitalId = formData.hospitalId;
      }
      
      await register(payload);
      toast.success("Registration successful!");
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const specializations = [
    'General Practitioner', 'Cardiologist', 'Dermatologist', 
    'Neurologist', 'Orthopedist', 'Pediatrician', 
    'Psychiatrist', 'Gynecologist', 'Ophthalmologist'
  ];

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      
      {/* LEFT PANEL - CONTENT CENTERED */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 p-12 sticky top-0 h-screen overflow-hidden flex-col">
        {/* Logo at top */}
        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">E-Health</span>
        </Link>
        
        {/* Main Content - Centered */}
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold text-white mb-8 leading-tight">
              Join the Future of <br /> Healthcare
            </h1>
            
            <div className="space-y-10">
              {[
                { title: 'AI Triage', desc: 'Symptom analysis powered by advanced AI' },
                { title: 'Secure Records', desc: 'Encrypted and blockchain-verified storage' },
                { title: 'Video Calls', desc: 'Connect with doctors instantly' }
              ].map((item, i) => (
                <div key={i} className="flex gap-5">
                  <div className="mt-1">
                    <CheckCircle2 className="w-6 h-6 text-teal-500 shrink-0" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-xl">{item.title}</h4>
                    <p className="text-slate-400 text-base leading-relaxed mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer at bottom */}
        <div className="text-slate-500 text-sm relative z-10">
          © 2026 E-Health Systems. All rights reserved.
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-teal-500/5 blur-[120px] rounded-full" />
      </div>

      {/* RIGHT PANEL - FULL WIDTH FORM */}
      <div className="w-full lg:w-1/2 flex flex-col items-center">
        <div className="w-full max-w-xl px-6 py-12 lg:px-16 lg:py-20">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Create Account</h2>
            <p className="text-slate-500 mt-2">Access your personalized healthcare portal</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection Tabs */}
            <div className="space-y-3">
              <Label className="text-slate-700 font-semibold">I am registering as a</Label>
              <div className="grid grid-cols-3 gap-3">
                {['patient', 'doctor', 'admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleChange('role', r)}
                    className={`py-3 px-1 rounded-xl border-2 text-sm font-bold capitalize transition-all duration-200 ${
                      formData.role === r
                        ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* General Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="John Doe" className="pl-10 h-12 text-base" required />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="name@example.com" className="pl-10 h-12 text-base" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input id="phone" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+91 98765 43210" className="pl-10 h-12 text-base" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handleChange('password', e.target.value)} placeholder="••••••••" className="pl-10 pr-12 h-12 text-base" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Doctor Section */}
            {formData.role === 'doctor' && (
              <div className="pt-6 mt-6 border-t border-slate-100 space-y-5 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-2">
                  <Label htmlFor="docHospitalId">Hospital ID</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input id="docHospitalId" value={formData.hospitalId} onChange={(e) => handleChange('hospitalId', e.target.value)} placeholder="Enter Hospital Code" className="pl-10 h-12" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Medical Specialization</Label>
                  <Select value={formData.specialization} onValueChange={(v) => handleChange('specialization', v)}>
                    <SelectTrigger className="h-12 w-full bg-white text-base">
                      <SelectValue placeholder="Select Specialization" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-9999 bg-white border shadow-2xl">
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec} className="text-base">{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="license">License Number</Label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input id="license" value={formData.license_number} onChange={(e) => handleChange('license_number', e.target.value)} placeholder="MED-12345" className="pl-10 h-12" required />
                  </div>
                </div>

                <Button type="button" variant="outline" onClick={getLocation} disabled={gettingLocation} className={`w-full h-12 rounded-xl text-base ${formData.latitude ? 'border-teal-500 text-teal-600 bg-teal-50' : 'hover:bg-teal-50/50'}`}>
                  <MapPin className="w-5 h-5 mr-2" />
                  {gettingLocation ? 'Capturing Location...' : formData.latitude ? 'GPS Coordinates Saved' : 'Capture Clinic GPS Location'}
                </Button>
              </div>
            )}

            {/* Admin Section */}
            {formData.role === 'admin' && (
              <div className="pt-6 mt-6 border-t border-slate-100 space-y-5 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-2">
                  <Label htmlFor="adminHospitalId">Hospital Identifier</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input id="adminHospitalId" value={formData.hospitalId} onChange={(e) => handleChange('hospitalId', e.target.value)} placeholder="EG: 5" className="pl-10 h-12 text-base" required />
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-14 bg-teal-600 hover:bg-teal-700 shadow-lg text-white font-bold text-lg rounded-xl transition-all active:scale-[0.98]">
              {loading ? "Processing..." : "Create Account"}
              {!loading && <ArrowRight className="ml-2 w-6 h-6" />}
            </Button>
          </form>
          
          <div className="mt-8 text-center pb-10">
            <p className="text-slate-500 text-base">
              Already have an account?{' '}
              <Link to="/login" className="text-teal-600 font-bold hover:underline decoration-2 underline-offset-4">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;