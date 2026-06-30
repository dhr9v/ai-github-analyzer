import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';

// Import Pages
import { Dashboard } from './pages/Dashboard';
import { Repositories } from './pages/Repositories';
import { AnalysisDetail } from './pages/AnalysisDetail';
import { Settings } from './pages/Settings';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />

      {/* Workspace */}
      <Route 
        path="/dashboard" 
        element={
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        } 
      />
      <Route 
        path="/repos" 
        element={
          <DashboardLayout>
            <Repositories />
          </DashboardLayout>
        } 
      />
      <Route 
        path="/repos/:id" 
        element={
          <DashboardLayout>
            <AnalysisDetail />
          </DashboardLayout>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        } 
      />

      {/* Fallback Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
