import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  Calendar, Users, Clock, CheckCircle, 
  XCircle, LogOut, Activity, Stethoscope,
  ChevronRight, FilePlus, Plus, Trash2, Pill
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea'; // Assuming you have this, if not use <textarea> with className
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

// --- Types ---

interface Appointment {
  _id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  slot: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
}

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string
}

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // --- Prescription Form State ---
  const [isPrescribeOpen, setIsPrescribeOpen] = useState(false);
  const [prescribeLoading, setPrescribeLoading] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: "", dosage: "", frequency: "" , duration: ""}
  ]);

  // --- 1. Fetch Doctor's Data ---
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.get('http://127.0.0.1:8000/appointments/doctor/my-appointments', { headers });
      setAppointments(res.data);
      
    } catch (error) {
      console.error(error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- 2. Handle Accept Appointment ---
  const handleAccept = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://127.0.0.1:8000/appointments/doctor/${appointmentId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Appointment Confirmed");
      fetchDashboardData(); 

    } catch (error) {
      toast.error("Failed to accept appointment");
    } finally {
      setActionLoading(null);
    }
  };

  // --- 3. Prescription Form Handlers ---
  
  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const handleRemoveMedicine = (index: number) => {
    const newMeds = [...medicines];
    newMeds.splice(index, 1);
    setMedicines(newMeds);
  };

  const handleMedicineChange = (index: number, field: keyof Medicine, value: string) => {
    const newMeds = [...medicines];
    newMeds[index][field] = value;
    setMedicines(newMeds);
  };

  const handleSubmitPrescription = async () => {
    if (!selectedAptId || !diagnosis) {
      toast.error("Please select a patient and enter a diagnosis");
      return;
    }

    setPrescribeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const appointment = appointments.find(a => a._id === selectedAptId);
      
      if (!appointment) return;

      const payload = {
        appointmentId: selectedAptId,
        patientId: appointment.patientId,
        diagnosis: diagnosis,
        medicines: medicines,
        notes: notes
      };

      await axios.post('http://127.0.0.1:8000/prescriptions/doctor', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Prescription created & secured on blockchain!");
      setIsPrescribeOpen(false);
      
      // Reset Form
      setDiagnosis("");
      setNotes("");
      setMedicines([{ name: "", dosage: "", frequency: "" , duration: ""}]);
      setSelectedAptId("");

    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to create prescription");
    } finally {
      setPrescribeLoading(false);
    }
  };

  // --- Filters ---
  const pendingAppointments = appointments.filter(a => a.status === 'REQUESTED');
  
  const todayAppointments = appointments.filter(a => {
    const aptDate = new Date(a.slot).toDateString();
    const today = new Date().toDateString();
    return aptDate === today && a.status === 'ACCEPTED';
  });

  const upcomingAppointments = appointments.filter(a => {
    const aptDate = new Date(a.slot);
    const today = new Date();
    return aptDate > today && a.status === 'ACCEPTED';
  });

  // Approved appointments list for the dropdown
  const approvedAppointments = appointments.filter(a => a.status === 'ACCEPTED');

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans text-slate-900">
      
      {/* --- HEADER --- */}
      <div className="bg-indigo-900 text-white pt-10 pb-24 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
          <Stethoscope size={300} />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dr. {user?.name}</h1>
            <p className="text-indigo-200 mt-2 flex items-center gap-2 text-sm">
              <Activity size={16} className="text-green-400" /> 
              Online • Specialist Panel
            </p>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => { logout(); navigate('/login'); }} 
            className="text-indigo-200 hover:text-white hover:bg-indigo-800 mt-4 md:mt-0 gap-2 border border-indigo-700/50"
          >
            <LogOut size={16} /> Log Out
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-16 space-y-8 relative z-20">
        
        {/* --- STATS OVERVIEW --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-orange-500 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wide">Pending Requests</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-4xl font-bold text-slate-800">{pendingAppointments.length}</span>
                {pendingAppointments.length > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold">Action Needed</span>
                )}
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">Patients waiting for approval</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-indigo-500 flex flex-col justify-between">
             <div>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wide">Today's Visits</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-4xl font-bold text-slate-800">{todayAppointments.length}</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">
               {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-teal-500 flex flex-col justify-between">
             <div>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wide">Total Appointments</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-4xl font-bold text-slate-800">{appointments.length}</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">Lifetime patient interactions</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: PENDING & TODAY --- */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Pending Approvals Section */}
            {pendingAppointments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-orange-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="text-orange-500" size={20} /> Pending Approvals
                  </h3>
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                    {pendingAppointments.length} New
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {pendingAppointments.map((apt) => (
                    <div key={apt._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{apt.patientName}</h4>
                        <p className="text-slate-500 text-sm">Requested for: <span className="font-medium text-slate-700">{new Date(apt.slot).toLocaleString()}</span></p>
                      </div>
                      <div className="flex gap-3">
                         <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50">
                           Decline
                         </Button>
                         <Button 
                           onClick={() => handleAccept(apt._id)}
                           disabled={!!actionLoading}
                           className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]"
                         >
                           {actionLoading === apt._id ? "..." : "Accept"}
                         </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Today's Schedule */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="text-indigo-600" size={20} /> Today's Schedule
                  </h3>
               </div>
               
               {todayAppointments.length === 0 ? (
                 <div className="p-10 text-center text-slate-400">
                    <p>No appointments scheduled for today.</p>
                 </div>
               ) : (
                 <div className="divide-y divide-slate-100">
                    {todayAppointments.map((apt) => (
                      <div key={apt._id} className="p-6 hover:bg-slate-50 transition-colors flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-indigo-50 rounded-xl text-indigo-700">
                          <span className="text-sm font-bold">{new Date(apt.slot).getHours()}:{new Date(apt.slot).getMinutes().toString().padStart(2, '0')}</span>
                          <span className="text-[10px] uppercase font-medium">{new Date(apt.slot).getHours() >= 12 ? 'PM' : 'AM'}</span>
                        </div>
                        <div className="flex-1">
                           <h4 className="font-bold text-slate-900">{apt.patientName}</h4>
                           <p className="text-sm text-slate-500">General Consultation</p>
                        </div>
                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                           Start Visit <ChevronRight size={16} className="ml-1"/>
                        </Button>
                      </div>
                    ))}
                 </div>
               )}
            </div>

          </div>

          {/* --- RIGHT COLUMN: UPCOMING & ACTIONS --- */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Upcoming</h3>
              </div>
              
              <div className="p-2">
                {upcomingAppointments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    No future appointments.
                  </div>
                ) : (
                  upcomingAppointments.slice(0, 5).map((apt) => (
                    <div key={apt._id} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-lg transition-colors">
                      <p className="font-bold text-slate-800 text-sm">{apt.patientName}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                         <Calendar size={12} />
                         {new Date(apt.slot).toLocaleDateString()}
                         <span className="text-slate-300">|</span>
                         <Clock size={12} />
                         {new Date(apt.slot).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-slate-100">
                <Button variant="ghost" className="w-full text-indigo-600 text-sm hover:bg-indigo-50">
                  View Full Calendar
                </Button>
              </div>
            </div>

            {/* --- PRESCRIPTION MODAL TRIGGER --- */}
            <div className="mt-6 space-y-3">
               <Dialog open={isPrescribeOpen} onOpenChange={setIsPrescribeOpen}>
                 <DialogTrigger asChild>
                    <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 justify-start h-12 gap-3 shadow-sm hover:shadow-md transition-all">
                        <FilePlus size={18} className="text-teal-400" /> Create New Prescription
                    </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FilePlus className="text-teal-600" /> New Prescription
                      </DialogTitle>
                      <DialogDescription>
                        Create a secure, blockchain-verified prescription for your patient.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      
                      {/* 1. Patient Selector */}
                      <div className="space-y-2">
                        <Label>Select Patient (from Accepted Appointments)</Label>
                        <Select onValueChange={setSelectedAptId} value={selectedAptId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a patient..." />
                          </SelectTrigger>
                          <SelectContent>
                            {approvedAppointments.length === 0 ? (
                              <div className="p-2 text-sm text-slate-500">No accepted appointments found</div>
                            ) : (
                              approvedAppointments.map(a => (
                                <SelectItem key={a._id} value={a._id}>
                                  {a.patientName} — {new Date(a.slot).toLocaleDateString()}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 2. Diagnosis */}
                      <div className="space-y-2">
                         <Label>Diagnosis</Label>
                         <Input 
                            placeholder="e.g. Acute Bronchitis" 
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                         />
                      </div>

                      {/* 3. Medicines List */}
                      <div className="space-y-3">
                         <div className="flex justify-between items-center">
                            <Label>Medicines</Label>
                            <Button size="sm" variant="outline" onClick={handleAddMedicine} className="h-7 text-xs gap-1">
                               <Plus size={12} /> Add Drug
                            </Button>
                         </div>
                         
                         {medicines.map((med, idx) => (
                           <div key={idx} className="flex gap-2 items-start">
                              <div className="flex-1 space-y-1">
                                 {idx === 0 && <span className="text-[10px] text-slate-400 uppercase">Drug Name</span>}
                                 <Input 
                                   placeholder="Paracetamol" 
                                   value={med.name}
                                   onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                                 />
                              </div>
                              <div className="w-24 space-y-1">
                                 {idx === 0 && <span className="text-[10px] text-slate-400 uppercase">Dosage</span>}
                                 <Input 
                                   placeholder="500mg" 
                                   value={med.dosage}
                                   onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                                 />
                              </div>
                              <div className="w-32 space-y-1">
                                 {idx === 0 && <span className="text-[10px] text-slate-400 uppercase">Frequency</span>}
                                 <Input 
                                   placeholder="1-0-1" 
                                   value={med.frequency}
                                   onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                                 />
                              </div>
                              <div className="w-24 space-y-1">
                                {idx === 0 && <span className="text-[10px] text-slate-400 uppercase">Duration</span>}
                                <Input 
                                    placeholder="5 Days" 
                                    value={med.duration}
                                    onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                                />
                              </div>
                              <div className="pt-5"> {/* Spacer for labels */}
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleRemoveMedicine(idx)}
                                  disabled={medicines.length === 1}
                                >
                                   <Trash2 size={16} />
                                </Button>
                              </div>
                           </div>
                         ))}
                      </div>

                      {/* 4. Notes */}
                      <div className="space-y-2">
                         <Label>Doctor's Notes / Advice</Label>
                         <textarea 
                            className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Drink plenty of water, rest for 3 days..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                         />
                      </div>

                      <Button 
                        onClick={handleSubmitPrescription} 
                        disabled={prescribeLoading}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11"
                      >
                         {prescribeLoading ? "Securing Record..." : "Issue Prescription"}
                      </Button>

                    </div>
                 </DialogContent>
               </Dialog>

               <Button className="w-full bg-white text-slate-700 hover:bg-slate-50 justify-start h-12 gap-3 border border-slate-200">
                  <Users size={18} className="text-indigo-500" /> Patient Directory
               </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;