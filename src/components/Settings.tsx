import React, { useRef, useState } from 'react';
import { Shield, Bot, Plug, Loader2, Save, RotateCcw, BookOpen, Lock } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import AgentSettings, { AgentSettingsRef } from './settings/AgentSettings';
import ApiSettings, { ApiSettingsRef } from './settings/ApiSettings';
import SystemRoadmap from './SystemRoadmap';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from './Button';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useOutletContext } from 'react-router-dom';

interface OutletContext {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
}

const Settings: React.FC = () => {
  const { companyName, isAdmin } = useCompanySettings();
  const agentRef = useRef<AgentSettingsRef>(null);
  const apiRef = useRef<ApiSettingsRef>(null);
  const [activeTab, setActiveTab] = useState('agent');
  const { resetWizard } = useOnboardingStatus();
  const { setShowOnboarding } = useOutletContext<OutletContext>();

  const handleReopenOnboarding = () => {
    resetWizard();
    setShowOnboarding(true);
  };

  const handleSave = async () => {
    if (activeTab === 'agent') {
      await agentRef.current?.save();
    } else if (activeTab === 'apis') {
      await apiRef.current?.save();
    }
  };

  const handleCancel = () => {
    if (activeTab === 'agent') {
      agentRef.current?.cancel();
    } else if (activeTab === 'apis') {
      apiRef.current?.cancel();
    }
  };

  const isSaving = activeTab === 'agent' 
    ? agentRef.current?.isSaving 
    : apiRef.current?.isSaving;
  
  return (
    <PageContainer className="max-w-5xl mx-auto">
      <PageHeader
        title="Configurações"
        description={
          <>
            Central de controle da sua instância {companyName}.
            {!isAdmin && <span className="ml-2 text-amber-600">(Somente leitura)</span>}
          </>
        }
        actions={
          <div className="flex gap-2 items-center">
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReopenOnboarding}
                className="text-muted-foreground hover:text-foreground gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Refazer Onboarding
              </Button>
            )}
            <span className="px-3 py-1 bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs rounded-full font-mono flex items-center">
              {isAdmin ? (
                <>
                  <Shield className="w-3 h-3 mr-1" /> Admin
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 mr-1" /> Somente Leitura
                </>
              )}
            </span>
          </div>
        }
      />

      <Tabs defaultValue="agent" className="w-full" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-8">
          <TabsList>
            <TabsTrigger value="agent" className="gap-2">
              <Bot className="w-4 h-4" />
              Agente
            </TabsTrigger>
            <TabsTrigger value="apis" className="gap-2">
              <Plug className="w-4 h-4" />
              APIs
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Documentação
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'docs' && isAdmin && (
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          )}
          
          {activeTab !== 'docs' && !isAdmin && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Lock className="w-4 h-4" />
              Apenas administradores podem editar
            </div>
          )}
        </div>

        <TabsContent value="agent">
          <AgentSettings ref={agentRef} />
        </TabsContent>

        <TabsContent value="apis">
          <ApiSettings ref={apiRef} />
        </TabsContent>

        <TabsContent value="docs">
          <SystemRoadmap />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Settings;
