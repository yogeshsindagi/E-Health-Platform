import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  Calendar, FileText, Brain, Clock, 
  MapPin, Plus, ShieldCheck, Activity, LogOut, User,
  Download, Eye, FileBadge, Pill
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---

interface Appointment {
  _id: string;
  doctorId: string;
  hospitalId: string;
  slot: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
  // New Fields from Backend
  doctorName: string;
  specialization: string;
  hospitalName: string;
  hospitalCity: string;
  hospitalCoords?: [number, number];
}

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
}

interface Prescription {
  _id: string;
  diagnosis: string;
  medicines: Medicine[];
  notes: string;
  createdAt: string;
  hash: string;
  doctorId: string;
  hospitalId: string;
  doctorName?: string;
  doctorSpecialization?: string;
  hospitalName?: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization: string;
}

interface Hospital {
  hospitalId: string;
  hospitalName: string;
  city: string;
}

// --- Component ---

const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Data State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // --- 1. Fetch Dashboard Data ---
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [aptRes, presRes, hospRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/appointments/patient', { headers }),
        axios.get('http://127.0.0.1:8000/prescriptions/patient', { headers }),
        axios.get('http://127.0.0.1:8000/hospitals/') 
      ]);

      // Enrich prescriptions with doctor and hospital details
      const enrichedPrescriptions = await Promise.all(
        presRes.data.map(async (pres: Prescription) => {
          try {
            // Fetch doctor details
            const doctorRes = await axios.get(`http://127.0.0.1:8000/users/doctor/${pres.doctorId}`);
            const hospital = hospRes.data.find((h: Hospital) => h.hospitalId === pres.hospitalId);
            
            return {
              ...pres,
              doctorName: doctorRes.data.name,
              doctorSpecialization: doctorRes.data.specialization,
              hospitalName: hospital?.hospitalName || 'Unknown Hospital'
            };
          } catch (error) {
            console.error('Error fetching doctor details for prescription:', pres._id, error);
            // Return prescription with default values if doctor fetch fails
            const hospital = hospRes.data.find((h: Hospital) => h.hospitalId === pres.hospitalId);
            return {
              ...pres,
              doctorName: 'Unknown Doctor',
              doctorSpecialization: 'N/A',
              hospitalName: hospital?.hospitalName || 'Unknown Hospital'
            };
          }
        })
      );

      setAppointments(aptRes.data);
      setPrescriptions(enrichedPrescriptions);
      setHospitals(hospRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- 2. Dynamic Doctor Fetching ---
  const handleHospitalSelect = async (hospitalId: string) => {
    setSelectedHospital(hospitalId);
    setSelectedDoctor(""); 
    setAvailableDoctors([]); 

    try {
      const res = await axios.get(`http://127.0.0.1:8000/appointments/hospitals/${hospitalId}/doctors`);
      setAvailableDoctors(res.data);
    } catch (error) {
      toast.error("Could not fetch doctors for this hospital");
    }
  };

  // --- 3. Handle Appointment Booking ---
  const handleBookAppointment = async () => {
    if (!selectedHospital || !selectedDoctor || !selectedSlot) {
      toast.error("Please fill in all fields");
      return;
    }

    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:8000/appointments/request', {
        hospitalId: selectedHospital,
        doctorId: selectedDoctor,
        slot: new Date(selectedSlot).toISOString() 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Appointment requested successfully!");
      setIsBookingOpen(false);
      
      // Reset Form
      setSelectedDoctor("");
      setSelectedSlot("");
      setSelectedHospital("");
      
      fetchDashboardData(); 
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Booking failed");
    } finally {
      setBookingLoading(false);
    }
  };

  // --- 4. Generate PDF ---
  const generatePDF = (pres: Prescription) => {
    try {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(13, 148, 136); // Teal
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("MEDICAL PRESCRIPTION", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.text("Official Medical Document", 105, 28, { align: "center" });
        
        // Patient Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("PATIENT INFORMATION", 14, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Name: ${user?.name || 'N/A'}`, 14, 57);
        doc.text(`Date Issued: ${new Date(pres.createdAt).toLocaleDateString()}`, 14, 63);
        
        // Doctor Info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("PRESCRIBED BY", 120, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Dr. ${pres.doctorName || 'Unknown'}`, 120, 57);
        if (pres.doctorSpecialization) {
          doc.text(pres.doctorSpecialization, 120, 63);
        }
        if (pres.hospitalName) {
          doc.text(pres.hospitalName, 120, 69);
        }
        
        // Diagnosis
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136);
        doc.text(`DIAGNOSIS: ${pres.diagnosis}`, 14, 82);
        
        // Medicines Table
        const tableBody = pres.medicines.map(m => [m.name, m.dosage, m.frequency, m.duration || '-']);
        autoTable(doc, {
          startY: 88,
          head: [['Medicine', 'Dosage', 'Frequency', 'Duration']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [13, 148, 136], fontStyle: 'bold' },
          styles: { fontSize: 10 }
        });

        // Notes
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        if(pres.notes) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text("DOCTOR'S NOTES:", 14, finalY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const splitNotes = doc.splitTextToSize(pres.notes, 180);
            doc.text(splitNotes, 14, finalY + 6);
        }

        // Hash at bottom
        const hashY = finalY + (pres.notes ? 20 : 10);
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Verification Hash: ${pres.hash}`, 14, hashY);
        doc.text(`Document ID: ${pres._id}`, 14, hashY + 4);

        doc.save(`Prescription_${pres._id}.pdf`);
        toast.success("PDF Downloaded");
    } catch (err) {
        console.error(err);
        toast.error("Could not generate PDF");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans text-slate-900">
      
      {/* --- HEADER --- */}
      <div className="bg-slate-900 text-white pt-10 pb-24 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Activity size={300} />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hello, {user?.name}</h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2 text-sm">
              <ShieldCheck size={16} className="text-teal-400" /> 
              Secure Patient Portal • ID: {user?.id.slice(-6)}
            </p>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => { logout(); navigate('/login'); }} 
            className="text-slate-400 hover:text-white hover:bg-slate-800 mt-4 md:mt-0 gap-2 border border-slate-700/50"
          >
            <LogOut size={16} /> Log Out
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-16 space-y-8 relative z-20">
        
        {/* --- STATS & ACTIONS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-linear-to-br from-teal-600 to-teal-800 rounded-2xl p-6 text-white shadow-xl shadow-teal-900/10 relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="relative z-10">
              <div className="bg-white/20 w-fit p-3 rounded-xl mb-4 backdrop-blur-md">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Symptom Checker</h3>
              <p className="text-teal-100 text-sm mb-6 leading-relaxed">
                Feeling unwell? Our AI can analyze your symptoms and suggest the right specialist.
              </p>
              <Link to="/patient/triage">
                <Button className="w-full bg-white text-teal-800 hover:bg-teal-50 border-0 font-bold shadow-sm">
                  Start Analysis
                </Button>
              </Link>
            </div>
            <Brain className="absolute -right-6 -bottom-6 w-36 h-36 text-white/5 group-hover:scale-110 transition-transform duration-700 rotate-12" />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-50 p-2.5 rounded-xl"><Calendar className="w-5 h-5 text-orange-600" /></div>
                <span className="font-semibold text-slate-600">Appointments</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-4xl font-bold text-slate-800">
                  {appointments.filter(a => a.status === 'ACCEPTED').length}
                </p>
                <span className="text-sm text-slate-500">confirmed</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
              <div 
                className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${(appointments.length > 0 ? (appointments.filter(a => a.status === 'ACCEPTED').length / appointments.length) * 100 : 0)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors">
             <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-50 p-2.5 rounded-xl"><FileText className="w-5 h-5 text-blue-600" /></div>
                <span className="font-semibold text-slate-600">Records</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-4xl font-bold text-slate-800">{prescriptions.length}</p>
                <span className="text-sm text-slate-500">documents</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
               <ShieldCheck size={14} className="text-teal-600"/> 
               <span>Blockchain Verified</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: APPOINTMENTS --- */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="text-teal-600" size={24} /> My Appointments
              </h2>
              
              <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-900 text-white hover:bg-slate-800 gap-2 shadow-md hover:shadow-lg transition-all px-5">
                    <Plus size={18} /> Book New
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white sm:max-w-lg p-0 overflow-hidden gap-0">
                  <DialogHeader className="px-6 py-5 bg-slate-50 border-b border-slate-100">
                    <DialogTitle className="text-xl text-slate-800">Book an Appointment</DialogTitle>
                    <DialogDescription className="text-slate-500">
                      Select your preferred facility and specialist.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="p-6 space-y-5">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">Select Hospital</Label>
                      <Select onValueChange={handleHospitalSelect} value={selectedHospital}>
                        <SelectTrigger className="h-12 border-slate-200 focus:ring-teal-500">
                          <SelectValue placeholder="Choose a facility" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto bg-white">
                          {hospitals.map(h => (
                            <SelectItem key={h.hospitalId} value={h.hospitalId} className="cursor-pointer">
                              <div className="flex flex-col text-left py-1">
                                <span className="font-medium text-slate-900">{h.hospitalName}</span>
                                <span className="text-xs text-slate-400">{h.city}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">Select Doctor</Label>
                      <Select 
                        onValueChange={setSelectedDoctor} 
                        disabled={!selectedHospital || availableDoctors.length === 0}
                        value={selectedDoctor}
                      >
                        <SelectTrigger className="h-12 border-slate-200 focus:ring-teal-500">
                          <SelectValue placeholder={
                            !selectedHospital ? "Select hospital first" : 
                            availableDoctors.length === 0 ? "No doctors available" : 
                            "Choose a specialist"
                          } />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto bg-white">
                          {availableDoctors.map(d => (
                            <SelectItem key={d._id} value={d._id} className="cursor-pointer">
                              <span className="font-medium">{d.name}</span> 
                              <span className="text-slate-400 text-xs ml-2">({d.specialization})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">Preferred Date & Time</Label>
                      <Input 
                        type="datetime-local" 
                        value={selectedSlot}
                        onChange={(e) => setSelectedSlot(e.target.value)}
                        className="h-12 block border-slate-200 focus:ring-teal-500"
                      />
                    </div>

                    <Button 
                      onClick={handleBookAppointment} 
                      disabled={bookingLoading}
                      className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white mt-4 font-bold text-base shadow-md transition-all"
                    >
                      {bookingLoading ? "Processing..." : "Confirm Appointment"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* === APPOINTMENT LIST WITH DOCTOR DETAILS === */}
            {appointments.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center">
                <Calendar className="w-12 h-12 text-slate-200 mb-4" />
                <h3 className="text-slate-900 font-semibold text-lg">No appointments yet</h3>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <div key={apt._id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex gap-4">
                      {/* Doctor Avatar Placeholder */}
                      <div className="bg-slate-100 h-12 w-12 rounded-full flex items-center justify-center shrink-0">
                        <User size={24} className="text-slate-500" />
                      </div>
                      
                      <div>
                        {/* Doctor Name & Specialization */}
                        <h4 className="font-bold text-slate-900 text-lg">
                          Dr. {apt.doctorName}
                        </h4>
                        <p className="text-teal-600 font-medium text-sm">
                          {apt.specialization}
                        </p>
                        
                        {/* Time & Hospital */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1.5 text-sm text-slate-500">
    <span className="flex items-center gap-1.5">
        <Clock size={14} className="text-teal-500" /> 
        {new Date(apt.slot).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
    </span>
    <span className="hidden sm:inline text-slate-300">|</span>
    
    {/* HOSPITAL NAME + MAP LINK */}
    <span className="flex items-center gap-1.5">
        <MapPin size={14} className="text-orange-500" /> 
        {apt.hospitalName} {apt.hospitalCity ? `(${apt.hospitalCity})` : ''}
        
        {apt.hospitalCoords && (
            <a 
                href={`https://www.google.com/maps/search/?api=1&query=${apt.hospitalCoords[1]},${apt.hospitalCoords[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-xs ml-1 font-semibold"
                title="View on Google Maps"
            >
                [Google Map]
            </a>
        )}
    </span>
</div>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        apt.status === 'ACCEPTED' ? 'bg-green-50 text-green-700 border-green-200' :
                        apt.status === 'REQUESTED' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN: PRESCRIPTIONS --- */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600" size={24} /> Medical Records
            </h2>
            <div className="space-y-4">
              {prescriptions.length === 0 ? (
                <div className="text-center py-12 px-6 bg-white rounded-2xl border border-slate-200">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-slate-900 font-medium">No records found</p>
                </div>
              ) : (
                prescriptions.map((pres) => (
                  <div key={pres._id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all relative">
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                         <h4 className="font-bold text-slate-800 text-lg">{pres.diagnosis}</h4>
                         <p className="text-xs text-slate-400 mt-1">{new Date(pres.createdAt).toDateString()}</p>
                      </div>
                      <ShieldCheck size={18} className="text-teal-500" />
                    </div>
                    
                    {/* Medicine Count */}
                    <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Pill size={14} className="text-teal-500"/>
                        <span className="font-medium">{pres.medicines.length} Medicine{pres.medicines.length > 1 ? 's' : ''} prescribed</span>
                      </div>
                    </div>

                    {/* View Prescription Button */}
                    <Dialog>
                      <DialogTrigger asChild>
                         <Button size="sm" className="w-full h-9 text-sm gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                           <Eye size={16} /> View Prescription
                         </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                         <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-teal-700 text-xl">
                              <FileBadge size={24} /> Prescription Details
                            </DialogTitle>
                            <DialogDescription className="text-xs font-mono text-slate-400">
                              ID: {pres._id}
                            </DialogDescription>
                         </DialogHeader>
                         
                         {/* Modal Content */}
                         <div className="space-y-5 py-2">
                            {/* Prescribed By Section */}
                            <div className="bg-linear-to-r from-teal-50 to-blue-50 p-4 rounded-lg border border-teal-100">
                              <p className="text-xs text-teal-600 font-bold uppercase mb-2">Prescribed By</p>
                              <div className="space-y-1">
                                <p className="font-bold text-slate-900 text-lg">
                                  Dr. {pres.doctorName || 'Unknown Doctor'}
                                </p>
                                {pres.doctorSpecialization && (
                                  <p className="text-sm text-teal-600 font-medium">
                                    {pres.doctorSpecialization}
                                  </p>
                                )}
                                {pres.hospitalName && (
                                  <p className="text-sm text-slate-600 flex items-center gap-1">
                                    <MapPin size={12} /> {pres.hospitalName}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Patient & Date Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                               <div>
                                  <p className="text-slate-500 text-xs uppercase mb-1">Patient Name</p>
                                  <p className="font-bold text-slate-800">{user?.name}</p>
                               </div>
                               <div>
                                  <p className="text-slate-500 text-xs uppercase mb-1">Date Issued</p>
                                  <p className="font-medium text-slate-800">{new Date(pres.createdAt).toLocaleString()}</p>
                               </div>
                            </div>

                            {/* Diagnosis */}
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                              <p className="text-xs text-orange-600 font-bold uppercase mb-1">Diagnosis</p>
                              <p className="text-lg font-bold text-slate-900">{pres.diagnosis}</p>
                            </div>

                            {/* Medicines Table */}
                            <div>
                              <p className="text-sm font-bold text-slate-700 mb-2 uppercase">Prescribed Medicines</p>
                              <div className="border rounded-lg overflow-hidden">
                                 <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                                       <tr>
                                          <th className="px-4 py-3">Medicine</th>
                                          <th className="px-4 py-3">Dosage</th>
                                          <th className="px-4 py-3">Frequency</th>
                                          <th className="px-4 py-3">Duration</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                       {pres.medicines.map((m, i) => (
                                          <tr key={i} className="hover:bg-slate-50">
                                             <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                                             <td className="px-4 py-3 text-slate-600">{m.dosage}</td>
                                             <td className="px-4 py-3 text-slate-600">{m.frequency}</td>
                                             <td className="px-4 py-3 text-slate-600">{m.duration || '-'}</td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                            </div>

                            {/* Doctor's Notes */}
                            {pres.notes && (
                              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                 <p className="text-xs text-yellow-700 font-bold mb-2 uppercase">Doctor's Notes</p>
                                 <p className="text-sm text-slate-700 leading-relaxed">{pres.notes}</p>
                              </div>
                            )}
                            
                            {/* Verification Hash */}
                            <div className="bg-slate-100 p-3 rounded-lg">
                              <p className="text-xs text-slate-500 font-bold mb-1 uppercase">Verification Hash</p>
                              <p className="text-[10px] font-mono text-slate-600 break-all">{pres.hash}</p>
                            </div>
                         </div>

                         {/* Download Button */}
                         <DialogFooter className="border-t pt-4">
                            <Button 
                              className="w-full gap-2 bg-slate-900 text-white hover:bg-slate-800 h-11" 
                              onClick={() => generatePDF(pres)}
                            >
                               <Download size={18} /> Download Official PDF
                            </Button>
                         </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;