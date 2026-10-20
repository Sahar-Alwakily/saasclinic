import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ClinicProvider, useClinic } from './context/ClinicContext';
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
const ProtectedApp = ({ children }) => {
  const { loadingClinic } = useClinic();

  if (loadingClinic) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-500">جاري التحميل...</div>;

  // مؤقتاً: السماح بالمرور دائماً (لحد ما نجهز صفحة الدفع)
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClinicProvider>
<Routes>
            {/* الصفحة الرئيسية */}
            <Route path="/" element={<LandingPage />} />
            
            {/* مسارات عامة */}
            <Route path="/register" element={<RegisterClinic />} />
            <Route path="/login" element={<Login />} />
            
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
              <Route path="/ops" element={<FillOps />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerProfile />} />
              <Route path="/website" element={<Website />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/winback" element={<Winback />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/team" element={<Team />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/treatments" element={<TreatmentTracker />} />
              <Route path="/services" element={<Services />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* أي مسار غلط يروح للرئيسية */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ClinicProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;