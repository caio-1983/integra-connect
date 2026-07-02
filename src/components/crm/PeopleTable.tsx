import React, { useState, useMemo } from 'react';
import {
  Search, Filter, UserPlus, MessageSquare, Phone, Mail,
  ChevronRight, Users, Building2, TrendingUp,
} from 'lucide-react';
import { Person } from '@/types';
import { Button } from '@/components/Button';
import { PersonSheet } from './PersonSheet';
import { useNavigate } from 'react-router-dom';

interface PeopleTableProps {
  people: Person[];
}

const statusConfig = {
  lead:     { label: 'Lead',          color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  customer: { label: 'Cliente Ativo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  churned:  { label: 'Churned',       color: 'bg-muted text-muted-foreground border-border' },
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export const PeopleTable: React.FC<PeopleTableProps> = ({ people }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lead' | 'customer' | 'churned'>('all');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return people.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        p.whatsapp.includes(term) ||
        p.phones.some(ph => ph.includes(term)) ||
        (p.company?.toLowerCase() ?? '').includes(term);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [people, search, statusFilter]);

  const openSheet = (person: Person) => {
    setSelectedPerson(person);
    setSheetOpen(true);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, email, WhatsApp ou empresa"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex gap-1.5">
          {(['all', 'lead', 'customer', 'churned'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'lead' ? 'Leads' : s === 'customer' ? 'Clientes' : 'Churned'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
            <Users className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-base font-medium text-foreground">Nenhuma pessoa encontrada</p>
            <p className="text-sm mt-1">
              {search ? 'Tente buscar por outro termo' : 'As pessoas aparecerão aqui'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Pessoa</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(person => {
                  const st = statusConfig[person.status] ?? statusConfig['lead'];
                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-muted/40 transition-colors group cursor-pointer"
                      onClick={() => openSheet(person)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {initials(person.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {person.name}
                            </p>
                            {person.origin && (
                              <p className="text-[10px] text-muted-foreground">{person.origin}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border ${st.color}`}>
                          {st.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {person.company ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                            {person.company}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {person.whatsapp}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {person.email}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs text-muted-foreground">
                          {person.ownerName ?? '—'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <Button
                            size="sm"
                            variant="primary"
                            className="h-8 w-8 p-0 rounded-lg shadow-none"
                            title="Iniciar Conversa"
                            onClick={() => navigate(`/chat`)}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg"
                            title="Ver detalhes"
                            onClick={() => openSheet(person)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PersonSheet person={selectedPerson} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
};
