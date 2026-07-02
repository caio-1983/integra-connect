import React from 'react';
import { Building2, ExternalLink, Globe, BarChart2 } from 'lucide-react';
import { Company } from '@/types';
import { useNavigate } from 'react-router-dom';

interface CompanyBlockProps {
  company?: Company;
  companyName?: string;
}

const porteLabel: Record<string, string> = {
  mei:        'MEI',
  pequena:    'Pequena',
  media:      'Média',
  grande:     'Grande',
  enterprise: 'Enterprise',
};

export const CompanyBlock: React.FC<CompanyBlockProps> = ({ company, companyName }) => {
  const navigate = useNavigate();

  if (!company) {
    return (
      <div className="px-4">
        <div className="rounded-xl border border-dashed border-border p-3 text-center">
          <Building2 className="w-5 h-5 text-muted-foreground mx-auto mb-1 opacity-50" />
          <p className="text-xs text-muted-foreground">
            {companyName ?? 'Nenhuma empresa vinculada'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-foreground leading-snug">
              {company.nomeFantasia ?? company.razaoSocial}
            </p>
            {company.nomeFantasia && (
              <p className="text-[10px] text-muted-foreground">{company.razaoSocial}</p>
            )}
          </div>
          <button
            onClick={() => navigate('/crm/companies')}
            className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
            title="Ver empresa"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {company.segmento && (
            <span className="flex items-center gap-1">
              <BarChart2 className="w-3 h-3" />
              {company.segmento}
            </span>
          )}
          {company.porte && (
            <span className="px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
              {porteLabel[company.porte]}
            </span>
          )}
        </div>

        {company.website && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Globe className="w-3 h-3" />
            <span>{company.website}</span>
          </div>
        )}
      </div>
    </div>
  );
};
