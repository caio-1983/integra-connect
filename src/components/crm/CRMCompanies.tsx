import React from 'react';
import { Building2, PlusCircle } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout';
import { Button } from '@/components/Button';
import { CompanyTable } from './CompanyTable';
import { MOCK_COMPANIES } from '@/constants';

const CRMCompanies: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader
        title="Empresas"
        description="Gerencie as empresas e organizações vinculadas ao CRM."
        actions={
          <Button
            className="opacity-50 cursor-not-allowed"
            disabled
            title="Em breve: Adicionar empresa"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        }
      />

      <CompanyTable companies={MOCK_COMPANIES} />
    </PageContainer>
  );
};

export default CRMCompanies;
