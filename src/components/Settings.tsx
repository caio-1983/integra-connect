import React from 'react';
import { PageContainer, PageHeader } from '@/components/layout';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { QuickRepliesSettings } from '@/components/settings/QuickRepliesSettings';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { ROLE_LABEL } from '@/components/team/teamLabels';

const Settings: React.FC = () => {
  const { companyName, role } = useCompanySettings();

  return (
    <PageContainer>
      {/* Same centred reading column as Contatos and Conexões; the header aligns with it. */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-3">
      <PageHeader
        title="Configurações"
        description={companyName}
        className="mb-3"
        actions={role && (
          <span className="px-3 h-7 rounded-full bg-card border border-border text-muted-foreground text-xs font-medium flex items-center">
            {ROLE_LABEL[role]}
          </span>
        )}
      />
        <QuickRepliesSettings />

        <AppearanceSettings />
      </div>
    </PageContainer>
  );
};

export default Settings;
