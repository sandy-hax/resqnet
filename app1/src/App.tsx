import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import { HomeScreen } from './screens/HomeScreen';
import { InstantSOSScreen } from './screens/InstantSOSScreen';
import { LiveStatusTrackerScreen } from './screens/LiveStatusTrackerScreen';
import { MyRequestsScreen } from './screens/MyRequestsScreen';
import { AwarenessScreen } from './screens/AwarenessScreen';
import { SheltersScreen } from './screens/SheltersScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/sos/new" element={<InstantSOSScreen />} />
              <Route path="/sos/:id" element={<LiveStatusTrackerScreen />} />
              <Route path="/requests" element={<MyRequestsScreen />} />
              <Route path="/awareness" element={<AwarenessScreen />} />
              <Route path="/preparedness" element={<AwarenessScreen />} />
              <Route path="/shelters" element={<SheltersScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
