import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClinicProvider, useClinic } from './context/ClinicContext';
import { LocaleProvider } from './context/LocaleContext';
import RegisterClinic from './pages/RegisterClinic';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Customers from './pages/Customers';
import Services from './pages/Services';
import Settings from './pages/Settings';
import PublicBooking from './pages/PublicBooking';
import Staff from './pages/Staff';
import CustomerProfile from './pages/CustomerProfile';
import TreatmentTracker from './pages/TreatmentTracker';
import LandingPage from './pages/LandingPage';
import Blog from './pages/Blog';
import ServiceDetails from './pages/ServiceDetails';
import PublicBranch from './pages/PublicBranch';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Branches from './pages/Branches';
import Winback from './pages/Winback';
import FillOps from './pages/FillOps';
import ManageAppointment from './pages/ManageAppointment';
import WaitlistOffer from './pages/WaitlistOffer';
import Website from './pages/Website';
import Assistant from './pages/Assistant';
import Marketing from './pages/Marketing';
import Reports from './pages/Reports';
import Billing from './pages/Billing';
import Team from './pages/Team';
import SupportRequests from './pages/SupportRequests';
import SupportAccess from './pages/SupportAccess';
import PlanGate from './components/plan/PlanGate';
const bootScreen = (
  <div className="min-h-screen flex items-center justify-center bg-[#f3f5f7] text-[#8a9199] text-sm">جاري فتح مساحة العمل...</div>
);

const SuspendedClinic = () => {
  const { logout } = useAuth();
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#F7F8F6] p-6">
      <div className="max-w-md bg-white border border-[#E5E9EC] rounded-2xl p-8 text-center space-y-3">
        <p className="text-[11px] tracking-[0.22em] uppercase text-[#A67C2D] font-semibold">account paused</p>
        <h1 className="text-2xl font-semibold text-[#202A32]">العيادة متوقفة مؤقتاً</h1>
        <p className="text-sm text-[#75818B] leading-relaxed">تم إيقاف هذا الحساب من إدارة المنصة. الكونسول وصفحة الحجز غير متاحين حتى يُعاد التشغيل.</p>
        <button type="button" onClick={() => logout()} className="mt-2 text-sm font-semibold text-[#172B3A]">خروج</button>
      </div>
    </div>
  );
};

const ProtectedApp = ({ children }) => {
  const { user, loading: authLoading, userMeta } = useAuth();
  const { loadingClinic, clinicInfo } = useClinic();

  if (authLoading || loadingClinic) return bootScreen;
  if (!user) return <Navigate to="/login" replace />;
  if (clinicInfo && clinicInfo.isActive === false && userMeta?.role !== 'support') return <SuspendedClinic />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <LocaleProvider>
      <AuthProvider>
        <ClinicProvider>
<Routes>
            {/* الصفحة الرئيسية */}
            <Route path="/" element={<LandingPage />} />
            
            {/* مسارات عامة */}
            <Route path="/register" element={<RegisterClinic />} />
            <Route path="/login" element={<Login />} />
            <Route path="/impersonate/:token" element={<SupportAccess />} />
            
            {/* ✅ مسارات واجهة العملاء (عامة، بدون حماية) */}
            <Route path="/book/:clinicId" element={<PublicBooking />} />
            <Route path="/book/:clinicId/service/:serviceId" element={<ServiceDetails />} />
            <Route path="/book/:clinicId/branch/:branchId" element={<PublicBranch />} />
            <Route path="/book/:clinicId/manage/:token" element={<ManageAppointment />} />
            <Route path="/book/:clinicId/offer/:token" element={<WaitlistOffer />} />

            {/* مسارات محمية (للعاملين بالعيادة فقط) */}
            <Route element={<ProtectedApp><DashboardLayout /></ProtectedApp>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/appointments/waitlist" element={<PlanGate cap="ops"><Appointments /></PlanGate>} />
              <Route path="/appointments/gaps" element={<PlanGate cap="ops"><Appointments /></PlanGate>} />
              <Route path="/appointments/reminders" element={<PlanGate cap="ops"><Appointments /></PlanGate>} />
              <Route path="/appointments/attendance" element={<Appointments />} />
              <Route path="/appointments/schedule" element={<Appointments />} />
              <Route path="/ops" element={<PlanGate cap="ops"><FillOps /></PlanGate>} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerProfile />} />
              <Route path="/website" element={<Website />} />
              <Route path="/website/editor" element={<Navigate to="/website" replace />} />
              <Route path="/assistant" element={<PlanGate cap="assistant"><Assistant /></PlanGate>} />
              <Route path="/winback" element={<PlanGate cap="winback"><Winback /></PlanGate>} />
              <Route path="/marketing" element={<PlanGate cap="marketing"><Marketing /></PlanGate>} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/team" element={<Team />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/support" element={<SupportRequests />} />
              <Route path="/treatments" element={<PlanGate cap="treatments"><TreatmentTracker /></PlanGate>} />
              <Route path="/services" element={<Services />} />
              <Route path="/products" element={<Products />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/blog" element={<PlanGate cap="marketing"><Blog /></PlanGate>} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* أي مسار غلط يروح للرئيسية */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ClinicProvider>
      </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  );
}

export default App;