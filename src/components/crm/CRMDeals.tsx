import React from 'react';
import { TrendingUp, Kanban } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout';
import { Button } from '@/components/Button';
import { DealTable } from './DealTable';
import { MOCK_DEALS } from '@/constants';
import { useNavigate } from 'react-router-dom';

const CRMDeals: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <PageHeader
        title="Negócios"
        description="Pipeline comercial — acompanhe todas as oportunidades em andamento."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/pipeline')}
          >
            <Kanban className="w-4 h-4 mr-2" />
            Ver no Kanban
          </Button>
        }
      />

      <DealTable deals={MOCK_DEALS} />
    </PageContainer>
  );
};

export default CRMDeals;
