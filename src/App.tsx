import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
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
import RoleRoute from './components/RoleRoute';
import CRMPeople from './components/crm/CRMPeople';
import CRMCompanies from './components/crm/CRMCompanies';
import CRMDeals from './components/crm/CRMDeals';
import CRMTasks from './components/crm/CRMTasks';
import ChannelManagement from './components/ChannelManagement';
import CampaignSettings from './components/campaigns/CampaignSettings';
import CampaignsLayout from './components/campaigns/CampaignsLayout';
import CampaignScoreboard from './components/campaigns/CampaignScoreboard';
import LightingProjects from './components/projects/LightingProjects';
import ResultsLayout from './components/results/ResultsLayout';
import ResultsOverview from './components/results/ResultsOverview';
import ResultsCampaigns from './components/results/ResultsCampaigns';
import ResultsOrigin from './components/results/ResultsOrigin';
import ResultsLosses from './components/results/ResultsLosses';
import ResultsAttendance from './components/results/ResultsAttendance';
import AIAgentsPage from './components/ai/AIAgentsPage';
import AIKnowledgeBasePage from './components/ai/AIKnowledgeBasePage';
import AIToolsPage from './components/ai/AIToolsPage';
import AIPlaygroundPage from './components/ai/AIPlaygroundPage';
import AISettingsPage from './components/ai/AISettingsPage';

import { CompanySettingsProvider } from './hooks/useCompanySettings';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './contexts/ThemeProvider';
import { NotificationsProvider } from './hooks/useNotifications';
import { RemindersOnLogin } from './components/notifications/RemindersOnLogin';
import { Toaster } from 'sonner';

/** Toaster that follows the current light/dark mode. */
const ThemedToaster: React.FC = () => {
  const { mode } = useTheme();
  return <Toaster position="top-right" richColors theme={mode} />;
};

// Componente de Layout que envolve a aplicação principal
const AppLayout: React.FC = () => {
  return (
    <NotificationsProvider>
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        <Sidebar />

        <main className="flex-1 h-full overflow-hidden relative flex flex-col">
          <div className="flex-1 w-full h-full relative">
            <Outlet />
          </div>
        </main>
      </div>
      <RemindersOnLogin />
    </NotificationsProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
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
              {/* Resultados — abas sob uma única rota, compartilhando o seletor de
                  período. A comparação entre atendentes fica atrás de RoleRoute:
                  não é dado de atendente. */}
              <Route path="/dashboard" element={<ResultsLayout />}>
                <Route index element={<ResultsOverview />} />
                <Route path="campanhas" element={<ResultsCampaigns />} />
                <Route path="origem" element={<ResultsOrigin />} />
                <Route path="perdas" element={<ResultsLosses />} />
                <Route element={<RoleRoute />}>
                  <Route path="atendimento" element={<ResultsAttendance />} />
                </Route>
              </Route>
              <Route path="/pipeline" element={<Kanban />} />
              <Route path="/chat" element={<ChatInterface />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/scheduling" element={<Scheduling />} />
              <Route path="/projetos" element={<LightingProjects />} />
              {/* Equipe/Usuários — RBAC: só admin/gestor (Route element={<RoleRoute />}) */}
              <Route element={<RoleRoute />}>
                <Route path="/team" element={<Team />} />
              </Route>
              {/* Campanhas — "Sinais e regras" é aberta a qualquer usuário; o
                  placar compara atendentes, então segue admin/gestor e o
                  atendente cai direto na configuração. */}
              <Route path="/campanhas" element={<CampaignsLayout />}>
                <Route element={<RoleRoute redirectTo="/campanhas/configurar" />}>
                  <Route index element={<CampaignScoreboard />} />
                </Route>
                <Route path="configurar" element={<CampaignSettings embedded />} />
              </Route>
              <Route path="/settings/campanhas" element={<Navigate to="/campanhas/configurar" replace />} />
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
          <ThemedToaster />
        </CompanySettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
