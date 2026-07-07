import React from 'react';
import { Shield, RotateCcw, Lock, Settings as SettingsIcon } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
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
  const { resetWizard } = useOnboardingStatus();
  const { setShowOnboarding } = useOutletContext<OutletContext>();

  const handleReopenOnboarding = () => {
    resetWizard();
    setShowOnboarding(true);
  };

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

      <EmptyState
        icon={SettingsIcon}
        title="Em construção"
        description="As configurações de agente, integrações e documentação estão sendo reconstruídas para a nova arquitetura. Em breve estarão disponíveis aqui."
      />
    </PageContainer>
  );
};

export default Settings;
