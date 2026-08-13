import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Overview from '@/pages/Overview';
import SosVerification from '@/pages/SosVerification';
import ContentManagement from '@/pages/ContentManagement';
import TeamsDirectory from '@/pages/TeamsDirectory';
import Reports from '@/pages/Reports';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Overview />} />
            <Route path="/sos" element={<SosVerification />} />
            <Route path="/content" element={<ContentManagement />} />
            <Route path="/teams" element={<TeamsDirectory />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
