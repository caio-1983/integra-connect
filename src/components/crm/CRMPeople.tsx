import React from 'react';
import { UserPlus, Users } from 'lucide-react';
import { PageContainer, PageHeader, Toolbar } from '@/components/layout';
import { Button } from '@/components/Button';
import { PeopleTable } from './PeopleTable';
import { MOCK_PEOPLE } from '@/constants';

const CRMPeople: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader
        title="Pessoas"
        description="Cadastro de contatos, leads e clientes com histórico completo de relacionamento."
        actions={
          <Button
            className="opacity-50 cursor-not-allowed"
            disabled
            title="Em breve: Adicionar pessoa"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nova Pessoa
          </Button>
        }
      />

      <PeopleTable people={MOCK_PEOPLE} />
    </PageContainer>
  );
};

export default CRMPeople;
