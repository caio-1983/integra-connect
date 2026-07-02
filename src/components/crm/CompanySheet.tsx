import React from 'react';
import { MapPin, Globe, FileText, User, Building2, BarChart2, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Company } from '@/types';
import { MOCK_DEALS, MOCK_PEOPLE } from '@/constants';

interface CompanySheetProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const porteLabel: Record<string, string> = {
  mei: 'MEI', pequena: 'Pequena', media: 'Média', grande: 'Grande', enterprise: 'Enterprise',
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export const CompanySheet: React.FC<CompanySheetProps> = ({ company, open, onOpenChange }) => {
  if (!company) return null;

  const contacts = MOCK_PEOPLE.filter(p => company.contactIds?.includes(p.id));
  const deals = MOCK_DEALS.filter(d => company.dealIds?.includes(d.id));
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-background border-border overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Empresa: {company.nomeFantasia ?? company.razaoSocial}</SheetTitle>
        </SheetHeader>

        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-lg font-bold text-amber-700 flex-shrink-0">
              {initials(company.nomeFantasia ?? company.razaoSocial)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {company.nomeFantasia ?? company.razaoSocial}
              </h2>
              {company.nomeFantasia && (
                <p className="text-sm text-muted-foreground">{company.razaoSocial}</p>
              )}
              {company.segmento && (
                <span className="inline-flex text-[10px] mt-1 font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                  {company.segmento}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Contatos', value: contacts.length },
              { label: 'Negócios', value: deals.length },
              { label: 'Valor Total', value: totalValue > 0
                ? totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                : 'R$ 0' },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-base font-bold text-foreground">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Dados da empresa */}
          <section>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Dados da Empresa</h3>
            <div className="space-y-2 text-sm">
              {company.cnpj && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  CNPJ: {company.cnpj}
                </div>
              )}
              {company.porte && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BarChart2 className="w-4 h-4 flex-shrink-0" />
                  Porte: {porteLabel[company.porte]}
                </div>
              )}
              {(company.city || company.state) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  {[company.city, company.state].filter(Boolean).join(', ')}
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  {company.website}
                </div>
              )}
              {company.ownerName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4 flex-shrink-0" />
                  Responsável: {company.ownerName}
                </div>
              )}
            </div>
          </section>

          {/* Contatos */}
          <section>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
              Contatos ({contacts.length})
            </h3>
            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum contato vinculado.</p>
            ) : (
              <div className="space-y-2">
                {contacts.map(p => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {initials(p.name)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.whatsapp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Negócios */}
          <section>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
              Negócios ({deals.length})
            </h3>
            {deals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum negócio vinculado.</p>
            ) : (
              <div className="space-y-2">
                {deals.map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{d.title}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {d.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                      {d.stage}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Observações */}
          {company.notes && (
            <section>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Observações</h3>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted rounded-xl p-3">
                {company.notes}
              </p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
