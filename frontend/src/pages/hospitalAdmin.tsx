import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  Building2, MapPin, Users, LogOut, 
  Stethoscope, CheckCircle, AlertCircle, 
  Search, ExternalLink 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

// --- Types ---

interface DashboardStats {
  hospitalName: string;
  city: string;
  state: string;
  coordinates: number[]; // [longitude, latitude]
  pendingApprovals: number;
}

interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialization: string;
  licenseNumber: string;
  phone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

// --- Component ---

const HospitalAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');

  const { logout } = useAuth();
  const navigate = useNavigate();

  // --- 1. Fetch Data ---
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate("/login"); return; }

      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, doctorsRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/hospital-admin/overview', { headers }),
        axios.get('http://127.0.0.1:8000/hospital-admin/doctors', { headers })
      ]);

      setStats(statsRes.data);
      setDoctors(doctorsRes.data);

    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        toast.error("Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  // --- 2. Action Handlers ---

  const handleAction = async (doctorId: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(`${doctorId}-${action}`);
      const token = localStorage.getItem('token');
      
      const endpoint = action === 'approve' ? 'approve' : 'reject';
      
      await axios.post(
        `http://127.0.0.1:8000/hospital-admin/${endpoint}/${doctorId}`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Doctor ${action}d successfully`);
      fetchData(); // Refresh list

    } catch (error) {
      toast.error(`Failed to ${action} doctor`);
    } finally {
      setActionLoading(null);
    }
  };

  // --- 3. Filtering Logic ---
  const filteredDoctors = doctors.filter(doc => 
    doc.status === activeTab && 
    (doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
    </div>
  );

  if (!stats) return <div className="p-10 text-center text-red-500">Error loading data</div>;

  // MongoDB stores [lng, lat], Google Maps needs lat,lng
  const googleMapsUrl = `https://www.google.com/maps?q=${stats.coordinates[1]},${stats.coordinates[0]}`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* --- Header Section --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-2 rounded-lg text-white">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{stats.hospitalName}</h1>
              <p className="text-xs text-slate-500">Hospital Admin Console</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => { logout(); navigate("/login"); }} className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-2">
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* --- Stats Overview --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Card 1: Facility Info */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-36 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Building2 size={64} className="text-teal-600" />
            </div>
            <p className="text-slate-500 font-medium text-sm">Location</p>
            <div>
              <p className="text-xl font-bold text-slate-800">{stats.city}</p>
              <p className="text-sm text-slate-400">{stats.state}</p>
            </div>
          </div>

          {/* Card 2: Google Maps Link (UPDATED) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-36 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <MapPin size={64} className="text-indigo-600" />
            </div>
            <p className="text-slate-500 font-medium text-sm">Coordinates</p>
            <div>
              <div className="flex items-baseline gap-2 font-mono text-sm text-slate-600">
                <span>{stats.coordinates[1].toFixed(4)}° N,</span>
                <span>{stats.coordinates[0].toFixed(4)}° E</span>
              </div>
              <a 
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                View on Google Maps <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Card 3: Pending Approvals */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-36 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertCircle size={64} className="text-orange-500" />
            </div>
            <p className="text-slate-500 font-medium text-sm">Action Required</p>
            <div>
              <p className="text-3xl font-bold text-slate-800">{stats.pendingApprovals}</p>
              <p className="text-sm text-slate-400">Pending Approvals</p>
            </div>
          </div>
        </div>

        {/* --- Main Content Area --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Tabs & Search */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              <button 
                onClick={() => setActiveTab('PENDING')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'PENDING' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pending ({stats.pendingApprovals})
              </button>
              <button 
                onClick={() => setActiveTab('APPROVED')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'APPROVED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Active Staff
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="Search doctors..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="p-6 bg-slate-50/50 min-h-[400px]">
            {filteredDoctors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  {activeTab === 'PENDING' ? <CheckCircle className="text-slate-300" size={32} /> : <Users className="text-slate-300" size={32} />}
                </div>
                <h3 className="text-slate-900 font-medium">No {activeTab.toLowerCase()} doctors found</h3>
                <p className="text-slate-500 text-sm mt-1">
                  {searchTerm ? "Try adjusting your search terms" : `No doctors in the ${activeTab.toLowerCase()} list`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredDoctors.map((doc) => (
                  <div key={doc._id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                    
                    {/* Doctor Info */}
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${activeTab === 'APPROVED' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        <Stethoscope size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-lg">{doc.name}</h3>
                          {activeTab === 'PENDING' && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold tracking-wide uppercase">New</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            {doc.specialization}
                          </span>
                          <span className="hidden md:inline text-slate-300">|</span>
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">LIC: {doc.licenseNumber}</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-400 flex gap-4">
                          <span>{doc.email}</span>
                          <span>{doc.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0 mt-4 md:mt-0">
                      
                      {activeTab === 'PENDING' && (
                        <>
                          <Button 
                            variant="outline"
                            onClick={() => handleAction(doc._id, 'reject')}
                            disabled={!!actionLoading}
                            className="border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200"
                          >
                            {actionLoading === `${doc._id}-reject` ? <span className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full"/> : "Reject"}
                          </Button>
                          <Button 
                            onClick={() => handleAction(doc._id, 'approve')}
                            disabled={!!actionLoading}
                            className="bg-teal-600 hover:bg-teal-700 text-white min-w-[100px]"
                          >
                             {actionLoading === `${doc._id}-approve` ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : "Approve"}
                          </Button>
                        </>
                      )}

                      {activeTab === 'APPROVED' && (
                        <Button 
                          variant="ghost"
                          onClick={() => handleAction(doc._id, 'reject')}
                          disabled={!!actionLoading}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          Revoke Access
                        </Button>
                      )}

                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default HospitalAdminDashboard;