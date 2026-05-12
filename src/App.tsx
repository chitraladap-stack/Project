/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  LogIn, 
  User, 
  FileText, 
  Clock, 
  ChevronRight, 
  Info,
  CheckCircle2,
  AlertCircle,
  Calendar,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Firebase ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp,
  Timestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { 
  signInAnonymously 
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const APP_ID = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'c843a196-e84d-456e-b9dd-b8505f8c38fd';
const LEAVE_REQUESTS_PATH = `artifacts/${APP_ID}/public/data/requests`;

const ADMIN_LIST = [
  { email: 'chitralada.p@bu.ac.th', name: 'อ.จิตรลดา พวงอินทร์' },
  { email: 'withawat.s@bu.ac.th', name: 'อ.วิทวัส โสตถิโภคา' },
  { email: 'phoomipat.p@bu.ac.th', name: 'อ.ภูมิพัฒน์ ผุยพรม' },
  { email: 'waraporn.s@bu.ac.th', name: 'หน.ทบ.' },
  { email: 'records_office@bu.ac.th', name: 'สำนักทะเบียน' },
  { email: 'admin@bu.ac.th', name: 'ธนวัฒน์ มาดี' },
  { email: 'staff@bu.ac.th', name: 'ชื่อแอดมินคนที่สอง' }
];

const ADMIN_EMAILS = ADMIN_LIST.map(a => a.email.toLowerCase());

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Types ---
interface UserData {
  name: string;
  email: string;
  studentId?: string;
  role: 'student' | 'admin';
}

// Mock Email Notification Handler
const sendResultEmail = async (toEmail: string, studentName: string, status: string, impact: string) => {
  console.log(`[Email Service] Sending notification to ${toEmail}`);
  console.log(`Dear ${studentName}, your leave request has been ${status}.`);
  console.log(`Academic Impact: ${impact}`);
  // In a real scenario, you would use EmailJS, SendGrid, or a Firebase Function here.
  return true;
};

type TabType = 'request' | 'status' | 'admin';

interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  semester: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  faculty: string;
  gpa: string;
  paymentStatus: string;
  adminSubmissionPeriod?: string;
  feeAmount?: number;
  estimatedRefund?: number;
  refundNote?: string;
  academicImpactResult?: string;
  studentEmail: string;
  studentCardImage?: string; // Base64
  paymentProofImage?: string;  // Base64
  createdAt?: Timestamp;
}

// --- Components ---

const Navbar = ({ 
  user, 
  onLogin, 
  onLogout 
}: { 
  user: UserData | null; 
  onLogin: (isAdmin?: boolean) => void; 
  onLogout: () => void; 
}) => {
  return (
    <nav className="sticky top-0 z-50 bg-[#003399] text-white px-6 py-4 flex justify-between items-center shadow-lg shrink-0">
      <div className="flex items-center space-x-3">
        <div className="bg-white p-1.5 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-[#003399]" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
          <span className="text-lg font-bold tracking-tight">ระบบลาพักการศึกษา</span>
          <span className="hidden sm:inline text-blue-300">|</span>
          <span className="text-xs sm:text-sm font-medium text-blue-100 uppercase tracking-wider">
            {user?.role === 'admin' ? 'REGISTRAR ADMIN' : 'BU STUDENT'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-400 flex items-center justify-center font-bold text-sm text-[#003399] border-2 border-white/20">
                {user.name.charAt(0)}
              </div>
              <div className="text-sm text-right hidden sm:block">
                <p className="font-semibold leading-none">{user.role === 'admin' ? (user.name || 'เจ้าหน้าที่สำนักทะเบียน') : user.name}</p>
                <p className="text-blue-200 text-[10px] mt-1">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="flex items-center space-x-1 bg-[#cc0000] hover:bg-red-700 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        ) : (
          <div className="text-xs font-bold text-blue-200 bg-white/10 px-4 py-2 rounded-full border border-white/20">
            กรุณาเข้าสู่ระบบเพื่อดำเนินการ
          </div>
        )}
      </div>
    </nav>
  );
};

const LandingPage = ({ onManualLogin, onBypass }: { onManualLogin: (name: string, email: string, studentId: string) => void; onBypass: (role: 'student' | 'admin') => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (!email.toLowerCase().endsWith('@bumail.net')) {
      setError('กรุณาใช้อีเมลมหาวิทยาลัย (@bumail.net) เท่านั้น');
      return;
    }
    if (studentId.length < 10) {
      setError('กรุณากรอกรหัสนักศึกษา 10 หลักให้ถูกต้อง');
      return;
    }
    onManualLogin(name, email, studentId);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-130px)] px-6 py-12 text-center bg-transparent">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="mb-10 relative inline-block">
          <div className="absolute -inset-4 bg-blue-100 rounded-full blur-2xl opacity-50 animate-pulse"></div>
          <div className="relative bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
            <FileText className="w-16 h-16 text-[#003399]" />
          </div>
        </div>
        
        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight leading-tight">
          Bangkok University
        </h2>
        <p className="text-[#003399] font-black text-xl mb-8 uppercase tracking-widest">Student Leave Portal</p>
        
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-left space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">ชื่อ-นามสกุล</label>
            <input 
              type="text"
              required
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="กรอกชื่อ-นามสกุลจริง"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">อีเมลนักศึกษา (@bumail.net)</label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="example@bumail.net"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">รหัสนักศึกษา (10 หลัก)</label>
            <input 
              type="text"
              required
              value={studentId}
              onChange={(e) => { setStudentId(e.target.value); setError(null); }}
              placeholder="16XXXXXXXX"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-[#003399] hover:bg-[#002a7a] text-white px-10 py-4 rounded-2xl shadow-xl shadow-blue-900/10 transition-all font-black text-lg"
          >
            <LogIn className="w-5 h-5" />
            เข้าสู่ระบบ
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button 
            onClick={() => onBypass('admin')}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-6 py-3 rounded-2xl transition-all font-bold text-sm shadow-sm"
          >
            <User className="w-4 h-4 text-blue-500" />
            สำหรับเจ้าหน้าที่ (Staff Portal)
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user }: { user: UserData }) => {
  const [activeTab, setActiveTab] = useState<TabType>('request');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Leave Requests from Firestore
  useEffect(() => {
    // Standard listeners for real users
    if (!user.email) return;

    const q = query(
      collection(db, LEAVE_REQUESTS_PATH), 
      where('studentEmail', '==', user.email)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRequest[];
      
      setLeaveRequests(data.sort((a,b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      }));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, LEAVE_REQUESTS_PATH);
    });

    return () => unsub();
  }, [user.email, auth.currentUser]);

  // Form State
  const [formData, setFormData] = useState({
    studentId: '1640900123',
    studentName: user.name,
    faculty: 'เทคโนโลยีสารสนเทศและนวัตกรรม',
    semester: '1/2567',
    reason: '',
    paymentStatus: 'paid', // 'paid', 'unpaid', 'not-registered'
    gpa: '',
    feeAmount: 0,
    studentCardImage: '',
    paymentProofImage: '',
  });

  // Sync user info to form data on load
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        studentName: user.name,
        studentId: user.studentId || prev.studentId
      }));
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (submitError) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [submitError]);

  const [isUploadingCard, setIsUploadingCard] = useState(false);
  const [isUploadingPayment, setIsUploadingPayment] = useState(false);

  const [gpaWarning, setGpaWarning] = useState(false);

  // Calculate Fee (Student view only sees fee)
  useEffect(() => {
    let fee = 0;
    if (formData.paymentStatus === 'unpaid' || formData.paymentStatus === 'not-registered') {
      fee = 1000;
    }
    setFormData(prev => ({
      ...prev,
      feeAmount: fee
    }));
  }, [formData.paymentStatus]);

  const handleGpaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, gpa: value }));
    setSubmitError(null);
    
    const numericGpa = parseFloat(value);
    if (!isNaN(numericGpa) && numericGpa < 1.50 && numericGpa >= 0 && value.trim() !== '') {
      setGpaWarning(true);
    } else {
      setGpaWarning(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSubmitError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'studentCardImage' | 'paymentProofImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: 2MB limit
    if (file.size > 2 * 1024 * 1024) {
      alert('ขนาดไฟล์ใหญ่เกินไป (จำกัดไม่เกิน 2MB)');
      return;
    }

    // Validation: Only images or pdf (user asked for images usually)
    if (!file.type.match('image.*') && file.type !== 'application/pdf') {
      alert('กรุณาเลือกไฟล์ภาพ (JPG, PNG) หรือ PDF เท่านั้น');
      return;
    }

    const setUploadLoading = field === 'studentCardImage' ? setIsUploadingCard : setIsUploadingPayment;
    setUploadLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, [field]: base64 }));
      setUploadLoading(false);
      if (submitError) setSubmitError(null);
    };
    reader.onerror = () => {
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Hard Validation
    const trimmedReason = formData.reason.trim();
    const gpaValue = formData.gpa.trim();

    if (!trimmedReason) {
      setSubmitError('กรุณากรอกเหตุผลประกอบการลา');
      return;
    }

    const numericGpa = parseFloat(gpaValue);
    if (!gpaValue || isNaN(numericGpa)) {
      setSubmitError('กรุณากรอกเกรดเฉลี่ยสะสมให้ถูกต้อง (ต้องใส่เป็นตัวเลข เช่น 3.50)');
      return;
    }

    if (numericGpa < 0 || numericGpa > 4.0) {
      setSubmitError('เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00 - 4.00');
      return;
    }

    if (!formData.studentName.trim()) {
      setSubmitError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (!formData.studentId.trim()) {
      setSubmitError('กรุณากรอกรหัสนักศึกษา');
      return;
    }

    if (!formData.studentCardImage) {
      setSubmitError('กรุณาอัปโหลดภาพถ่ายบัตรนักศึกษา (Mandatory)');
      return;
    }

    // Conditional Validation for Fees
    if ((formData.paymentStatus === 'unpaid' || formData.paymentStatus === 'not-registered') && !formData.paymentProofImage) {
      setSubmitError('กรณีที่ยังไม่ชำระค่าเล่าเรียน กรุณาอัปโหลดหลักฐานการชำระเงินค่าธรรมเนียมลาพัก (1,000 บาท)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Force Anonymous Authentication before write to ensure rules are satisfied
      // Even if user is manually logged in with an email, we might need a Firebase UID session
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const newRequest: any = {
        studentId: formData.studentId, 
        studentName: formData.studentName,
        studentEmail: user.email,
        faculty: formData.faculty,
        semester: formData.semester,
        reason: trimmedReason,
        paymentStatus: formData.paymentStatus,
        feeAmount: formData.feeAmount,
        gpa: gpaValue,
        studentCardImage: formData.studentCardImage,
        status: 'pending',
        date: new Date().toLocaleDateString('th-TH', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        }),
        createdAt: serverTimestamp(),
      };

      if (formData.paymentProofImage) {
        newRequest.paymentProofImage = formData.paymentProofImage;
      } else {
        newRequest.paymentProofImage = ''; // Ensure field exists for rules if needed or empty
      }

      await addDoc(collection(db, LEAVE_REQUESTS_PATH), newRequest);
      setIsSubmitting(false);
      setActiveTab('status');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Reset form
      setFormData({
        ...formData,
        reason: '',
        gpa: '',
        studentCardImage: '',
        paymentProofImage: '',
      });
    } catch (error) {
      setIsSubmitting(false);
      // More user-friendly error message for common issues
      let userMessage = 'เกิดข้อผิดพลาดในการส่งข้อมูล';
      if (error instanceof Error) {
        if (error.message.includes('permission-denied') || error.message.includes('Missing or insufficient permissions')) {
          userMessage = 'สิทธิ์การเข้าถึงฐานข้อมูลไม่ถูกต้อง กรุณาอัปเดตกฎ (Rules) ใน Firebase Console หรือตรวจสอบการ Login';
        } else {
          userMessage += ': ' + error.message;
        }
      }
      setSubmitError(userMessage);
      handleFirestoreError(error, OperationType.WRITE, LEAVE_REQUESTS_PATH);
    }
  };

  const handleAddToCalendar = () => {
    const baseUrl = "https://calendar.google.com/calendar/render";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "วันเปิดลงทะเบียนเรียนภาคการศึกษาถัดไป (Bangkok University)",
      dates: "20241101T020000Z/20241101T090000Z",
      details: "กรุณาเข้าสู่ระบบทะเบียนเพื่อลงทะเบียนเรียน หลังจากสิ้นสุดการลาพักการศึกษา",
      location: "Bangkok University"
    });
    window.open(`${baseUrl}?${params.toString()}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'อนุมัติเรียบร้อย', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
      case 'pending':
        return { label: 'กำลังตรวจสอบ', color: 'bg-amber-100 text-amber-700', icon: Clock };
      case 'rejected':
        return { label: 'ปฏิเสธคำร้อง', color: 'bg-red-100 text-red-700', icon: XCircle };
      default:
        return { label: 'ไม่ทราบสถานะ', color: 'bg-gray-100 text-gray-700', icon: Info };
    }
  };

  const isGpaValid = () => {
    const numericGpa = parseFloat(formData.gpa);
    return !isNaN(numericGpa) && numericGpa >= 0 && numericGpa <= 4.0;
  };

  const isSubmitButtonDisabled = isSubmitting || 
    !formData.studentName.trim() ||
    !formData.studentId.trim() ||
    !formData.reason.trim() || 
    !formData.gpa.trim() || 
    !isGpaValid() || 
    !formData.studentCardImage || 
    ((formData.paymentStatus === 'unpaid' || formData.paymentStatus === 'not-registered') && !formData.paymentProofImage);

  // Dynamic Feedback for Validation
  const showReasonError = !formData.reason.trim() && formData.reason.length > 0;
  const showGpaError = !isGpaValid() && formData.gpa.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-130px)] relative">
      {/* Global Loading Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-[#003399]">
              <div className="w-12 h-12 border-4 border-[#003399] border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-lg tracking-tight">กำลังบันทึกข้อมูล...</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">กรุณารอสักครู่ ระบบกำลังนำส่งคำร้องของท่าน</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sub-Header / Tab Section */}
      <div className="bg-white border-b border-slate-200 px-8 flex space-x-8 shrink-0 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('request')}
          className={`py-4 border-b-2 flex items-center space-x-2 transition-all whitespace-nowrap px-2 ${
            activeTab === 'request' 
            ? 'border-[#003399] text-[#003399] font-bold' 
            : 'border-transparent text-slate-500 hover:text-[#003399] font-medium'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>ยื่นคำร้องลาพัก</span>
        </button>
        <button 
          onClick={() => setActiveTab('status')}
          className={`py-4 border-b-2 flex items-center space-x-2 transition-all whitespace-nowrap px-2 ${
            activeTab === 'status' 
            ? 'border-[#003399] text-[#003399] font-bold' 
            : 'border-transparent text-slate-500 hover:text-[#003399] font-medium'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span>ติดตามสถานะ</span>
        </button>
      </div>

      <main className="flex-1 p-6 md:p-10 bg-slate-50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Info (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
            >
              <h3 className="text-slate-800 font-bold mb-5 flex items-center">
                <span className="w-1.5 h-6 bg-[#003399] rounded-full mr-3"></span>
                สรุปข้อมูลส่วนตัว
              </h3>
              <div className="space-y-4 text-sm font-medium">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-500">รหัสนักศึกษา</span>
                  <span className="text-slate-900 font-bold">{formData.studentId}</span>
                </div>
                <div className="flex flex-col py-2 border-b border-slate-50">
                  <span className="text-slate-500 mb-1">ชื่อ-นามสกุล</span>
                  <span className="text-slate-900 font-bold tracking-tight">{formData.studentName}</span>
                </div>
                <div className="flex flex-col py-2 border-b border-slate-50">
                  <span className="text-slate-500 mb-1">อีเมลมหาวิทยาลัย</span>
                  <span className="text-slate-900 font-bold tracking-tight">{user.email}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">สถานะปัจจุบัน</span>
                  <span className="text-green-600 font-bold">ปกติ (Normal)</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-blue-50 p-6 rounded-2xl border border-blue-100"
            >
              <h4 className="text-[#003399] font-bold text-sm mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                ระเบียบการลาพักการศึกษา
              </h4>
              <ul className="text-xs text-blue-800 space-y-3 font-medium">
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  <span>นักศึกษาต้องยื่นคำร้องไม่ช้ากว่า 30 วันหลังเปิดเทอม</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  <span>หากเกรดเฉลี่ยต่ำกว่า 1.50 ต้องปรึกษาอาจารย์ที่ปรึกษา</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  <span>การลาพักมีค่าธรรมเนียมรักษาสถานภาพฯ</span>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Main Area (8 cols) */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {activeTab === 'request' ? (
                <motion.div
                  key="request-form"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-800">แบบฟอร์มขอลาพักการศึกษา</h2>
                      <p className="text-slate-500 text-sm font-medium">กรุณาตรวจสอบข้อมูลและแนบหลักฐานให้ครบถ้วน</p>
                    </div>
                  </div>
                  
                  <div className="p-8 flex-1 space-y-8">
                    <form onSubmit={handleSubmit}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50/30 rounded-2xl border border-blue-100 mb-8">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">ชื่อ-นามสกุล (แก้ไขได้)</label>
                          <input 
                            type="text" 
                            name="studentName"
                            value={formData.studentName} 
                            onChange={handleInputChange}
                            className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm ${
                              !formData.studentName.trim() ? 'border-red-300' : 'border-blue-200'
                            }`} 
                            placeholder="กรอกชื่อ-นามสกุล"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">รหัสนักศึกษา (แก้ไขได้)</label>
                          <input 
                            type="text" 
                            name="studentId"
                            value={formData.studentId} 
                            onChange={handleInputChange}
                            className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm ${
                              !formData.studentId.trim() ? 'border-red-300' : 'border-blue-200'
                            }`} 
                            placeholder="ระบุรหัสนักศึกษา 10 หลัก"
                          />
                        </div>
                      </div>

                      <div className="space-y-8">
                        {/* ข้อมูลการเรียน */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">คณะ / สาขาวิชา</label>
                            <input 
                              type="text" 
                              name="faculty"
                              value={formData.faculty}
                              onChange={handleInputChange}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">ปีการศึกษา / ภาคเรียนที่ลา</label>
                            <div className="relative">
                              <select 
                                name="semester"
                                value={formData.semester}
                                onChange={handleInputChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium"
                              >
                                <option value="1/2567">1/2567 (ปัจจุบัน)</option>
                                <option value="2/2567">2/2567</option>
                              </select>
                              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90" />
                            </div>
                          </div>
                        </div>

                        {/* สถานะการชำระเงิน */}
                        <div className="space-y-4">
                          <label className="text-sm font-bold text-slate-700">ท่านได้ชำระเงินค่าลงทะเบียนเทอมนี้แล้วหรือไม่?</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                              { id: 'paid', label: 'ชำระเงินเรียบร้อยแล้ว' },
                              { id: 'unpaid', label: 'ยังไม่ชำระเงิน' },
                              { id: 'not-registered', label: 'ยังไม่ได้ลงทะเบียน' }
                            ].map((option) => (
                              <label key={option.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                formData.paymentStatus === option.id 
                                ? 'border-[#003399] bg-blue-50/50' 
                                : 'border-slate-100 bg-white hover:border-slate-200'
                              }`}>
                                <input 
                                  type="radio" 
                                  name="paymentStatus" 
                                  checked={formData.paymentStatus === option.id}
                                  onChange={() => setFormData({ ...formData, paymentStatus: option.id })}
                                  className="w-4 h-4 text-[#003399] accent-[#003399]"
                                />
                                <span className="text-sm font-bold text-slate-700">{option.label}</span>
                              </label>
                            ))}
                          </div>

                          <AnimatePresence mode="wait">
                            {formData.paymentStatus !== 'paid' ? (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3"
                              >
                                <Info className="w-5 h-5 text-amber-600 shrink-0" />
                                <div className="text-sm">
                                  <p className="font-bold text-amber-800 tracking-tight">ค่าธรรมเนียมการลาพักการศึกษา: 1,000 บาท ต่อภาคการศึกษา</p>
                                  <p className="text-amber-700 font-medium">กรุณาชำระเงินและแนบหลักฐาน "การชำระเงินค่าลาพักการศึกษา (1,000 บาท)" ที่ด้านล่าง</p>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-green-50 border border-green-100 p-4 rounded-xl flex gap-3"
                              >
                                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                                <div className="text-sm">
                                  <p className="font-bold text-green-800">ยกเว้นค่าธรรมเนียมการลาพักการศึกษา (ไม่ต้องชำระ 1,000 บาท)</p>
                                  <p className="text-green-700 text-xs font-medium mt-1">เนื่องจากท่านได้ชำระค่าเล่าเรียนในภาคการศึกษานี้เรียบร้อยแล้ว</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* GPA และ Validation */}
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">เกรดเฉลี่ยสะสม (Cum. GPA)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              min="0"
                              max="4"
                              placeholder="0.00"
                              name="gpa"
                              value={formData.gpa}
                              onChange={handleGpaChange}
                              className={`w-full sm:w-1/3 bg-slate-50 border rounded-xl p-3 text-sm focus:ring-2 outline-none font-bold ${
                                gpaWarning ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                              }`}
                            />
                          </div>
                          
                          <AnimatePresence>
                            {gpaWarning && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 overflow-hidden"
                              >
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-sm font-bold text-red-700 leading-relaxed">
                                  ⚠️ คำเตือน: เกรดเฉลี่ยของท่านอยู่ในเกณฑ์เสี่ยงพ้นสภาพนักศึกษา (Retire) โปรดปรึกษาอาจารย์ที่ปรึกษาก่อนดำเนินการ
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">เหตุผลประกอบการลา (ระบุโดยสังเขป)</label>
                          <textarea 
                            name="reason"
                            value={formData.reason}
                            onChange={handleInputChange}
                            className={`w-full h-32 bg-slate-50 border rounded-xl p-4 text-sm focus:ring-2 outline-none resize-none font-medium ${
                              formData.reason.trim() === '' && formData.reason.length > 0 ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                            }`} 
                            placeholder="ระบุรายละเอียดความจำเป็นในการขอลาพักฯ..."
                          />
                          {formData.reason.trim() === '' && formData.reason.length > 0 && (
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">กรุณากรอกเหตุผลประกอบการลา</p>
                          )}
                        </div>

                        {/* อัปโหลดหลักฐาน */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <label className="relative group border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 hover:border-[#003399]/30 transition-all overflow-hidden">
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*,application/pdf"
                              onChange={(e) => handleFileChange(e, 'studentCardImage')}
                            />
                            {isUploadingCard ? (
                              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                            ) : formData.studentCardImage ? (
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                                <img src={formData.studentCardImage} className="w-full h-full object-cover" alt="Card Preview" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-white text-[10px] font-bold">เปลี่ยนรูป</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <User className="w-8 h-8 text-slate-400 mb-2" />
                                <p className="text-xs font-bold text-slate-800 tracking-tight">อัปโหลดภาพถ่ายบัตรนักศึกษา*</p>
                                <p className="text-[10px] text-red-500 mt-1 uppercase font-bold tracking-widest leading-none">กรุณาแนบภาพหลักฐาน (บังคับ)</p>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">JPG, PNG, PDF (MAX 2MB)</p>
                              </>
                            )}
                          </label>

                          <AnimatePresence>
                            {(formData.paymentStatus !== 'paid') && (
                              <motion.label 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative group border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 hover:border-[#003399]/30 transition-all overflow-hidden"
                              >
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleFileChange(e, 'paymentProofImage')}
                                />
                                {isUploadingPayment ? (
                                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                ) : formData.paymentProofImage ? (
                                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                                    <img src={formData.paymentProofImage} className="w-full h-full object-cover" alt="Proof Preview" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span className="text-white text-[10px] font-bold">เปลี่ยนรูป</span>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <FileText className="w-8 h-8 text-slate-400 mb-2" />
                                    <p className="text-xs font-bold text-slate-800 tracking-tight">
                                      อัปโหลดสลิปชำระค่าลาพัก (1,000.-)*
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">JPG, PNG, PDF (MAX 2MB)</p>
                                  </>
                                )}
                              </motion.label>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                    {submitError && (
                      <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-700 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {submitError}
                      </div>
                    )}

                      <div className="py-2 flex items-center justify-between">
                        {(!formData.studentCardImage || 
                          (formData.paymentStatus !== 'paid' && !formData.paymentProofImage) || 
                          !formData.reason.trim() || 
                          !formData.gpa.trim() ||
                          !formData.studentName.trim() ||
                          !formData.studentId.trim()) ? (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-[11px] font-bold text-red-700 uppercase tracking-tight">หลักฐานยังไม่ครบ: 
                              {!formData.studentName.trim() && " ชื่อ,"}
                              {!formData.studentId.trim() && " รหัส,"}
                              {!formData.studentCardImage && " บัตรนักศึกษา,"}
                              {(formData.paymentStatus !== 'paid' && !formData.paymentProofImage) && " สลิป 1,000.-,"}
                              {(!formData.reason.trim()) && " เหตุผล,"}
                              {(!formData.gpa.trim()) && " เกรดเฉลี่ย"}
                            </span>
                          </div>
                        ) : (
                          <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-[11px] font-bold text-green-700 uppercase tracking-tight">ข้อมูลครบถ้วน พร้อมยื่นคำร้อง</span>
                          </div>
                        )}
                      </div>
                      <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
                        <button 
                          type="button"
                          className="px-8 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                        >
                          ยกเลิก
                        </button>
                        <button 
                          type="submit"
                          disabled={isSubmitButtonDisabled}
                          className={`px-10 py-3 text-sm font-bold text-white bg-[#003399] hover:bg-[#002a7a] rounded-xl shadow-lg shadow-blue-900/10 transition-all flex items-center justify-center gap-2 ${
                            isSubmitButtonDisabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-[0.98]'
                          }`}
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>กำลังส่งข้อมูล...</span>
                            </>
                          ) : (
                            <>
                              <span>ตรวจสอบข้อมูลและยื่นคำร้อง</span>
                              <ChevronRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                  </form>
                </div>
              </motion.div>
              ) : (
                <motion.div
                  key="status-history"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-4"
                >
                  {loading ? (
                    <div className="bg-white rounded-3xl p-12 border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
                      <div className="w-12 h-12 border-4 border-[#003399] border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="font-bold text-slate-400">กำลังโหลดรายการคำร้อง...</p>
                    </div>
                  ) : leaveRequests.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                        <Clock className="w-8 h-8 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">ยังไม่พบรายการคำร้อง</h3>
                      <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium leading-relaxed">
                        ท่านยังไม่มีประวัติการยื่นคำร้องลาพักการศึกษาในระบบ สามารถเริ่มยื่นคำร้องได้ที่แท็บ "ยื่นคำร้องลาพัก"
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {leaveRequests.map((item, i) => {
                        const badge = getStatusBadge(item.status);
                        const StatusIcon = badge.icon;

                        return (
                          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-[#003399]/20 transition-all group">
                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                                  item.status === 'pending' ? 'bg-amber-50 text-amber-600' : 
                                  item.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}>
                                  <StatusIcon className="w-8 h-8" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-extrabold text-slate-800 text-lg leading-none">ลาพักการศึกษา ({item.semester})</h4>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{item.id}</span>
                                  </div>
                                  <p className="text-sm text-slate-500 font-medium">ยื่นเมื่อ: {item.date}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between md:justify-end gap-6 pl-18 md:pl-0">
                                <div className="text-right">
                                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg inline-block ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                  {item.status === 'pending' && <p className="text-[10px] text-slate-400 font-medium mt-1">รอการอนุมัติจากอาจารย์ที่ปรึกษา</p>}
                                  {item.status === 'approved' && item.academicImpactResult && (
                                    <p className="text-[10px] text-[#003399] font-black mt-1 uppercase tracking-tight">{item.academicImpactResult}</p>
                                  )}
                                </div>
                                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-[#003399] transition-all">
                                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white transition-all" />
                                </div>
                              </div>
                            </div>

                            {item.status === 'approved' && (
                              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                <button 
                                  onClick={handleAddToCalendar}
                                  className="flex items-center gap-2 text-sm font-bold text-[#003399] hover:text-blue-700 transition-colors bg-white px-4 py-2 rounded-xl border border-blue-100 shadow-sm"
                                >
                                  <Calendar className="w-4 h-4" />
                                  <span>เพิ่มกำหนดการลงทะเบียนเทอมถัดไปลงปฏิทิน</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

const AdminDashboard = ({ user }: { user: UserData }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We want to try signing in anonymously if no user is present yet to ensure rules work
    const ensureAuth = async () => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn("Retrying anonymous auth in Admin view...");
        }
      }
    };
    ensureAuth();

    const unsub = onSnapshot(collection(db, LEAVE_REQUESTS_PATH), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRequest[];
      
      setRequests(data.sort((a,b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      }));
      setLoading(false);
    }, (error) => {
      // If we get a permission error, maybe it's because auth hasn't synced yet
      console.error("Admin fetch error:", error);
      setLoading(false);
      // Optional: handleFirestoreError(error, OperationType.GET, LEAVE_REQUESTS_PATH);
    });

    return () => unsub();
  }, [auth.currentUser]);

  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [adminSubmissionPeriod, setAdminSubmissionPeriod] = useState<'add-drop' | 'after-add-drop'>('add-drop');
  const [toast, setToast] = useState<string | null>(null);

  const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      const requestRef = doc(db, LEAVE_REQUESTS_PATH, id);
      
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        processedBy: user.name || 'เจ้าหน้าที่สำนักทะเบียน', // Log who processed the request
        processedAt: serverTimestamp(), // Record time of action
        adminEmail: user.email // Keep track of which admin processed it
      };

      if (newStatus === 'approved') {
        const impact = adminSubmissionPeriod === 'add-drop' 
          ? 'ภายในโควตา (คืนเงิน 40%): ลดวิชาและตั้งยอดคืนเงินส่วนต่างเพื่อใช้ในเทอมถัดไป' 
          : 'หลังกำหนดการ (ติด W): เพิกถอนวิชาทั้งหมดและปรากฏสัญลักษณ์ W ใน Transcript (ไม่คืนเงิน)';
        
        updateData.adminSubmissionPeriod = adminSubmissionPeriod;
        updateData.academicImpactResult = impact;
        updateData.refundNote = adminSubmissionPeriod === 'add-drop' ? 'ได้รับสิทธิ์คืนเงิน 40%' : 'ไม่ได้รับสิทธิ์คืนเงิน';
      }

      await updateDoc(requestRef, updateData);
      
      // Trigger Email Notification (Simulated)
      await sendResultEmail(
        selectedRequest.studentEmail, 
        selectedRequest.studentName, 
        newStatus === 'approved' ? 'อนุมัติ (Approved)' : 'ปฏิเสธ (Rejected)',
        updateData.academicImpactResult || 'คำร้องไม่ได้รับการอนุมัติ'
      );

      setSelectedRequest(null);
      setToast(`อัปเดตสถานะคำร้อง ${id} เป็น${newStatus === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} เรียบร้อยแล้ว ระบบได้ส่งอีเมลแจ้งนักศึกษาที่ ${selectedRequest.studentEmail}`);
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${LEAVE_REQUESTS_PATH}/${id}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-700' };
      case 'pending':
        return { label: 'รอการตรวจสอบ', color: 'bg-amber-100 text-amber-700' };
      case 'rejected':
        return { label: 'ปฏิเสธ', color: 'bg-red-100 text-red-700' };
      default:
        return { label: '-', color: 'bg-gray-100' };
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800">ระบบจัดการคำร้อง (Admin)</h2>
            <p className="text-slate-500 font-medium tracking-tight">ยินดีต้อนรับ, {user.name} • สำนักทะเบียนและสถิติ</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">รอการตรวจสอบ</p>
              <p className="text-2xl font-black text-amber-600">{requests.filter(r => r.status === 'pending').length}</p>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">ทั้งหมดวันนี้</p>
              <p className="text-2xl font-black text-blue-900">{requests.length}</p>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#003399] text-white p-4 rounded-xl shadow-xl flex items-center justify-between font-bold text-sm"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-300" />
                {toast}
              </div>
              <button onClick={() => setToast(null)}><XCircle className="w-5 h-5 opacity-50 hover:opacity-100" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Request Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">นักศึกษา</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">ภาคเรียน</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">เหตุผล</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">สถานะ</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requests.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-400">ไม่พบข้อมูลคำร้องในระบบ (โปรดตรวจสอบ Firebase Rules หรือส่งข้อมูลทดสอบ)</p>
                      <p className="text-[10px] text-slate-300 uppercase font-black">Path: {LEAVE_REQUESTS_PATH}</p>
                    </div>
                  </td>
                </tr>
              )}
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{req.studentName}</div>
                    <div className="text-xs text-slate-400 font-medium">{req.studentId}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{req.semester}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-500 font-medium truncate max-w-[200px]">{req.reason}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase ${getStatusBadge(req.status).color}`}>
                      {getStatusBadge(req.status).label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedRequest(req)}
                      className="text-xs font-bold text-[#003399] hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Details */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-800">รายละเอียดคำร้อง</h3>
                  <p className="text-sm text-slate-500 font-medium">เลขที่อ้างอิง: {selectedRequest.id}</p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ข้อมูลนักศึกษา</label>
                      <p className="font-bold text-slate-800">{selectedRequest.studentName}</p>
                      <p className="text-sm text-slate-500">{selectedRequest.studentId}</p>
                      <p className="text-sm text-slate-500 font-medium">{selectedRequest.faculty}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GPA สะสม</label>
                      <p className={`text-lg font-black ${parseFloat(selectedRequest.gpa) < 1.5 ? 'text-red-500' : 'text-slate-800'}`}>
                        {selectedRequest.gpa}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ภาคเรียนที่ยื่นลา</label>
                      <p className="font-bold text-slate-800">{selectedRequest.semester}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะการเงิน</label>
                      <p className="text-sm font-bold text-slate-700">
                        {selectedRequest.paymentStatus === 'paid' ? '✅ ชำระค่าเทอมแล้ว' : '⚠️ ยังไม่ได้ชำระ'}
                      </p>
                      {selectedRequest.feeAmount !== undefined && selectedRequest.feeAmount > 0 && (
                        <p className="text-[10px] font-bold text-amber-600 mt-1">ต้องชำรระค่าธรรมเนียมลาพัก: {selectedRequest.feeAmount} บาท</p>
                      )}
                    </div>
                  </div>
                </div>

               {/* Admin Submission Period Evaluation */}
               {selectedRequest.status === 'pending' && (
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                   <label className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                     <Clock className="w-4 h-4 text-[#003399]" />
                     ระบุช่วงเวลาการยื่น (มีผลต่อผลการเรียนและการคืนเงิน)
                   </label>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {[
                       { id: 'add-drop', label: 'ภายในกำหนดการเพิ่ม-ลดวิชา', sub: 'ได้รับสิทธิ์คืนเงิน 40%' },
                       { id: 'after-add-drop', label: 'หลังกำหนดการเพิ่ม-ลดวิชา', sub: 'ติด W / ไม่คืนเงิน' }
                     ].map((option) => (
                       <label key={option.id} className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                         adminSubmissionPeriod === option.id 
                         ? 'border-[#003399] bg-blue-50/50 shadow-sm' 
                         : 'border-slate-100 bg-white hover:border-slate-200'
                       }`}>
                         <input 
                           type="radio" 
                           name="adminSubmissionPeriod" 
                           checked={adminSubmissionPeriod === option.id}
                           onChange={() => setAdminSubmissionPeriod(option.id as any)}
                           className="w-4 h-4 text-[#003399] accent-[#003399]"
                         />
                         <div className="flex flex-col">
                           <span className="text-xs font-bold text-slate-700">{option.label}</span>
                           <span className="text-[9px] text-slate-400 font-bold uppercase">{option.sub}</span>
                         </div>
                       </label>
                     ))}
                   </div>

                   <AnimatePresence mode="wait">
                     {adminSubmissionPeriod === 'add-drop' ? (
                       <motion.div
                         key="admin-impact-drop"
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: 10 }}
                         className="text-blue-700 bg-blue-50/80 p-4 rounded-2xl text-xs font-bold leading-relaxed border border-blue-100 flex items-start gap-3"
                       >
                         <Info className="w-4 h-4 shrink-0 text-blue-500" />
                         <div>
                             <p className="font-black text-blue-800 mb-1">สรุปผลการพิจารณา (ภายในกำหนดการ):</p>
                             <p>ลดวิชาและตั้งยอดคืนเงิน 40% (เพื่อใช้ในเทอมถัดไป) ตามระเบียบข้อบังคับมหาวิทยาลัย</p>
                         </div>
                       </motion.div>
                     ) : (
                       <motion.div
                         key="admin-impact-w"
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: 10 }}
                         className="text-red-700 bg-red-50/80 p-4 rounded-2xl text-xs font-bold leading-relaxed border border-red-100 flex items-start gap-3"
                       >
                         <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                         <div>
                             <p className="font-black text-red-800 mb-1">สรุปผลการพิจารณา (หลังกำหนดการ):</p>
                             <p>เพิกถอนวิชาทั้งหมดและปรากฏสัญลักษณ์ W ในใบรายงานผลการศึกษา (Transcript)</p>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </div>
               )}

                {selectedRequest.status !== 'pending' && selectedRequest.paymentStatus === 'paid' && (
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">สรุปผลกระทบทางวิชาการ</span>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase">{selectedRequest.adminSubmissionPeriod === 'add-drop' ? 'ADD-DROP PERIOD' : 'AFTER ADD-DROP'}</span>
                    </div>
                    <p className="text-sm font-bold text-blue-800 leading-tight">{selectedRequest.academicImpactResult || '-'}</p>
                    <div className="pt-2 border-t border-blue-100">
                      <p className="text-[10px] font-black text-blue-400 uppercase">สิทธิ์การคืนเงิน</p>
                      <p className="text-sm font-bold text-blue-800">{selectedRequest.refundNote || '-'}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เหตุผลความจำเป็น</label>
                  <div className="mt-2 p-4 bg-slate-50 rounded-2xl text-sm font-medium text-slate-600 leading-relaxed italic border border-slate-100">
                    "{selectedRequest.reason}"
                  </div>
                  {selectedRequest.processedBy && (
                    <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mr-2">พิจารณาโดย:</span>
                      <span className="text-xs font-bold text-blue-800">{selectedRequest.processedBy}</span>
                      {selectedRequest.processedAt && (
                        <span className="text-[10px] text-blue-400 font-medium ml-auto">
                          {selectedRequest.processedAt.toDate ? selectedRequest.processedAt.toDate().toLocaleString('th-TH') : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative aspect-video bg-slate-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden group">
                    {selectedRequest.studentCardImage ? (
                      <img src={selectedRequest.studentCardImage} className="w-full h-full object-cover" alt="Student Card" />
                    ) : (
                      <>
                        <User className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">ยังไม่ได้อัปโหลด</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1">บัตรนักศึกษา</p>
                      </>
                    )}
                  </div>
                  <div className="relative aspect-video bg-slate-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden group">
                    {selectedRequest.paymentProofImage ? (
                      <img src={selectedRequest.paymentProofImage} className="w-full h-full object-cover" alt="Payment Proof" />
                    ) : (
                      <>
                        <FileText className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">ยังไม่ได้อัปโหลด</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1">หลักฐานการชำระเงิน</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => handleAction(selectedRequest.id, 'rejected')}
                  className="flex-1 py-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-2xl font-black transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  ปฏิเสธ (Reject)
                </button>
                <button 
                  onClick={() => handleAction(selectedRequest.id, 'approved')}
                  className="flex-3 py-4 bg-[#003399] hover:bg-[#002a7a] text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  อนุมัติคำร้อง (Approve)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Initial anonymous sign-in to satisfy rules for public browsing if needed
    const initAuth = async () => {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn("Initial anonymous auth failed, will retry on action:", e);
        }
      }
    };
    initAuth();

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // If it's a student login using our manual session, we handle it via setUser in handleManualLogin
        if (firebaseUser.isAnonymous && !user) {
          setAuthLoading(false);
          return;
        }

        if (!firebaseUser.isAnonymous) {
          const email = (firebaseUser.email || '').toLowerCase();
          const adminEntry = ADMIN_LIST.find(a => a.email.toLowerCase() === email);
          const isAdmin = !!adminEntry || email.endsWith('@bu.ac.th');

          setUser({
            name: adminEntry ? adminEntry.name : (firebaseUser.displayName || (isAdmin ? 'เจ้าหน้าที่สำนักทะเบียน' : 'User')),
            email: email,
            role: isAdmin ? 'admin' : 'student'
          });
        }
        setAuthError(null);
      } else if (!user) {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleManualLogin = async (name: string, email: string, studentId: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.warn("Manual login anonymous auth restricted, proceeding with guest state:", e);
      }
      
      const normalizedEmail = email.toLowerCase();
      const adminEntry = ADMIN_LIST.find(a => a.email.toLowerCase() === normalizedEmail);
      const isAdmin = !!adminEntry || normalizedEmail.endsWith('@bu.ac.th');

      setUser({
        name: adminEntry ? adminEntry.name : (isAdmin ? 'เจ้าหน้าที่สำนักทะเบียน' : name),
        email: normalizedEmail,
        studentId: studentId,
        role: isAdmin ? 'admin' : 'student'
      });
    } catch (error) {
      console.error("Login session error:", error);
      const normalizedEmail = email.toLowerCase();
      const adminEntry = ADMIN_LIST.find(a => a.email.toLowerCase() === normalizedEmail);
      const isAdmin = !!adminEntry || normalizedEmail.endsWith('@bu.ac.th');

      // Specific handling for common anonymous auth restrictions in some Firebase projects
      if (error instanceof Error && error.message.includes('auth/admin-restricted-operation')) {
        setAuthError('ระบบการเข้าใช้แบบ Anonymous ถูกจำกัดใน Firebase Console (โปรดเปิดใช้งานเเพื่อรองรับ Guest Mode)');
      }

      setUser({
        name: adminEntry ? adminEntry.name : (isAdmin ? 'เจ้าหน้าที่สำนักทะเบียน' : name),
        email: normalizedEmail,
        studentId: studentId,
        role: isAdmin ? 'admin' : 'student'
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (isAdminRole = false) => {
    // Google login removed for students as requested
    if (isAdminRole) {
      setAuthError(null);
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("Login Error:", error);
        setAuthError('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Auth');
      }
    }
  };

  const handleBypassLogin = async (role: 'student' | 'admin') => {
    setAuthLoading(true);
    try {
      await signInAnonymously(auth);
      
      const email = role === 'admin' ? 'admin@bu.ac.th' : 'student.portal@bumail.net';
      const adminEntry = ADMIN_LIST.find(a => a.email.toLowerCase() === email.toLowerCase());
      const isAdmin = role === 'admin' || !!adminEntry;

      setUser({
        name: adminEntry ? adminEntry.name : (role === 'admin' ? 'เจ้าหน้าที่สำนักทะเบียน' : 'อนิรุทธิ์ บุญส่ง (นักศึกษา)'),
        email: email,
        studentId: role === 'admin' ? undefined : '1640900123',
        role: isAdmin ? 'admin' : 'student'
      });
    } catch (error) {
      console.error("Bypass login error:", error);
      const email = role === 'admin' ? 'admin@bu.ac.th' : 'student@bumail.net';
      const adminEntry = ADMIN_LIST.find(a => a.email.toLowerCase() === email.toLowerCase());
      
      setUser({
        name: adminEntry ? adminEntry.name : (role === 'admin' ? 'เจ้าหน้าที่สำนักทะเบียน' : 'นักศึกษาตัวอย่าง'),
        email: email,
        role: role
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#003399] border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-slate-400 animate-pulse">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-[#003399]/10 selection:text-[#003399] flex flex-col overflow-hidden">
      <Navbar user={user} onLogin={handleLogin} onLogout={handleLogout} />
      
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {authError && (
          <div className="bg-red-50 border-b border-red-100 px-8 py-3 flex items-center justify-center gap-3 text-red-600 text-sm font-bold animate-in slide-in-from-top duration-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{authError}</p>
            <button onClick={() => setAuthError(null)} className="ml-2 hover:bg-red-100 p-1 rounded">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <LandingPage onManualLogin={handleManualLogin} onBypass={handleBypassLogin} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="h-full flex flex-col overflow-hidden"
            >
              {user.role === 'admin' ? (
                <AdminDashboard user={user} />
              ) : (
                <Dashboard user={user} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-slate-200 px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <p className="text-xs text-slate-400 font-medium font-sans">
          © 2024 Bangkok University Student Leave Management System
        </p>
        <div className="flex items-center space-x-4">
          <span className="text-[10px] text-slate-400 px-3 py-1 border border-slate-100 rounded-full font-bold uppercase tracking-wider">
            Stable v1.3.0
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-[10px] text-green-600 font-black tracking-tight uppercase">Live System Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


