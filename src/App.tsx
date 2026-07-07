import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import Contacts from './components/Contacts';
import Settings from './components/Settings';
import Team from './components/Team';
import Scheduling from './components/Scheduling';
import Kanban from './components/Kanban';
import Operations from './components/Operations';
import Auth from './pages/Auth';
import SetNewPassword from './pages/SetNewPassword';
import ProtectedRoute from './components/ProtectedRoute';
import ModuleRoute from './components/ModuleRoute';
import CRMPeople from './components/crm/CRMPeople';
import CRMCompanies from './components/crm/CRMCompanies';
import CRMDeals from './components/crm/CRMDeals';
import CRMTasks from './components/crm/CRMTasks';
import ChannelManagement from './components/ChannelManagement';
import WebchatWidgetSettings from './components/WebchatWidgetSettings';
import AIAgentsPage from './components/ai/AIAgentsPage';
import AIKnowledgeBasePage from './components/ai/AIKnowledgeBasePage';
import AIToolsPage from './components/ai/AIToolsPage';
import AIPlaygroundPage from './components/ai/AIPlaygroundPage';
import AISettingsPage from './components/ai/AISettingsPage';

import { CompanySettingsProvider } from './hooks/useCompanySettings';
import { AuthProvider } from './hooks/useAuth';
import { Toaster } from 'sonner';
import { OnboardingWizard } from './components/OnboardingWizard';

// Componente de Layout que envolve a aplicação principal
const AppLayout: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[128px] pointer-events-none -translate-x-1/2 -translate-y-1/2 z-0"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[128px] pointer-events-none translate-x-1/2 translate-y-1/2 z-0"></div>
      
      <Sidebar />
      
      <main className="flex-1 h-full overflow-hidden relative z-10 flex flex-col">
        {/* Top Border Gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50 z-20"></div>
        
        <div className="flex-1 w-full h-full relative">
          <Outlet context={{ showOnboarding, setShowOnboarding }} />
        </div>
      </main>

      <OnboardingWizard 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CompanySettingsProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/nova-senha" element={<SetNewPassword />} />
            
            {/* Protected Routes (With Sidebar) */}
            <Route element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<Navigate to="/operations" replace />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pipeline" element={<Kanban />} />
              <Route path="/chat" element={<ChatInterface />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/scheduling" element={<Scheduling />} />
              <Route path="/team" element={<Team />} />
              <Route path="/settings" element={<Settings />} />
              {/* CRM — Sprint 007 (gated: Fase 2) */}
              <Route element={<ModuleRoute module="crm" />}>
                <Route path="/crm/people" element={<CRMPeople />} />
                <Route path="/crm/companies" element={<CRMCompanies />} />
                <Route path="/crm/deals" element={<CRMDeals />} />
                <Route path="/crm/tasks" element={<CRMTasks />} />
              </Route>
              {/* Omnichannel — Sprint 008 */}
              <Route path="/settings/channels" element={<ChannelManagement />} />
              <Route path="/settings/webchat-widget" element={<WebchatWidgetSettings />} />
              {/* IA — Sprint 009 (gated: Fase 2) */}
              <Route element={<ModuleRoute module="ia" />}>
                <Route path="/ia/agentes" element={<AIAgentsPage />} />
                <Route path="/ia/base-de-conhecimento" element={<AIKnowledgeBasePage />} />
                <Route path="/ia/ferramentas" element={<AIToolsPage />} />
                <Route path="/ia/testes" element={<AIPlaygroundPage />} />
                <Route path="/ia/configuracoes" element={<AISettingsPage />} />
              </Route>
            </Route>
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster 
          position="top-right"
          richColors
          theme="dark"
        />
      </CompanySettingsProvider>
    </AuthProvider>
  );
};

export default App;
