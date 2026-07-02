import React, { useState, useMemo } from 'react';
import { Search, Building2, MapPin, ChevronRight, User, BarChart2 } from 'lucide-react';
import { Company } from '@/types';
import { Button } from '@/components/Button';
import { CompanySheet } from './CompanySheet';

interface CompanyTableProps {
  companies: Company[];
}

const porteLabel: Record<string, string> = {
  mei: 'MEI', pequena: 'Pequena', media: 'Média', grande: 'Grande', enterprise: 'Enterprise',
};
const porteBadge: Record<string, string> = {
  mei:        'bg-slate-50 text-slate-600 border-slate-200',
  pequena:    'bg-cyan-50 text-cyan-700 border-cyan-200',
  media:      'bg-violet-50 text-violet-700 border-violet-200',
  grande:     'bg-amber-50 text-amber-700 border-amber-200',
  enterprise: 'bg-red-50 text-red-700 border-red-200',
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export const CompanyTable: React.FC<CompanyTableProps> = ({ companies }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Company | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return companies.filter(c =>
      c.razaoSocial.toLowerCase().includes(term) ||
      (c.nomeFantasia?.toLowerCase() ?? '').includes(term) ||
      (c.cnpj ?? '').includes(term) ||
      (c.segmento?.toLowerCase() ?? '').includes(term) ||
      (c.city?.toLowerCase() ?? '').includes(term)
    );
  }, [companies, search]);

  const open = (c: Company) => { setSelected(c); setSheetOpen(true); };

  return (
    <>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por razão social, CNPJ, segmento ou cidade"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
            <Building2 className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-base font-medium text-foreground">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">CNPJ</th>
                  <th className="px-6 py-4">Segmento</th>
                  <th className="px-6 py-4">Porte</th>
                  <th className="px-6 py-4">Localização</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(company => (
                  <tr
                    key={company.id}
                    className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => open(company)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-bold text-amber-700 flex-shrink-0">
                          {initials(company.nomeFantasia ?? company.razaoSocial)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {company.nomeFantasia ?? company.razaoSocial}
                          </p>
                          {company.nomeFantasia && (
                            <p className="text-[10px] text-muted-foreground">{company.razaoSocial}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {company.cnpj ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {company.segmento ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      {company.porte ? (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${porteBadge[company.porte]}`}>
                          {porteLabel[company.porte]}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {(company.city || company.state) ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {[company.city, company.state].filter(Boolean).join(', ')}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {company.ownerName ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => open(company)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CompanySheet company={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
};
