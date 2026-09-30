import React, { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Users, MessageSquare, CloudOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageContainer, PageHeader } from '@/components/layout';
import { Contact } from '../types';
import { cn, contactDisplayName, formatPhone } from '@/lib/utils';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';

type ContactFilter = 'all' | 'lead';

function formatLastContact(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR');
}

/** Section letter, WhatsApp-style: A–Z by display name, "#" for numbers/symbols. */
function sectionOf(name: string): string {
  const first = name.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ContactFilter>('all');
  const navigate = useNavigate();

  useEffect(() => {
    api.fetchContacts()
      .then(setContacts)
      .catch((error) => { console.error('Erro ao carregar contatos', error); setFailed(true); })
      .finally(() => setLoading(false));
  }, []);

  const leadCount = useMemo(() => contacts.filter(c => c.status === 'lead').length, [contacts]);

  // Alphabetical sections, like WhatsApp's contact list.
  const sections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    const visible = contacts.filter(c => {
      if (filter === 'lead' && c.status !== 'lead') return false;
      if (!term) return true;
      return (
        (c.name?.toLowerCase() || '').includes(term) ||
        (!!digits && (c.phone || '').includes(digits)) ||
        (c.email?.toLowerCase() || '').includes(term)
      );
    });
    const named = visible
      .map(c => ({ contact: c, label: contactDisplayName(c.name, c.phone) }))
      .sort((a, b) => {
        const sa = sectionOf(a.label), sb = sectionOf(b.label);
        if (sa !== sb) return sa === '#' ? 1 : sb === '#' ? -1 : sa.localeCompare(sb);
        return a.label.localeCompare(b.label, 'pt-BR');
      });
    const groups: Array<{ letter: string; items: typeof named }> = [];
    for (const item of named) {
      const letter = sectionOf(item.label);
      const last = groups[groups.length - 1];
      if (last?.letter === letter) last.items.push(item); else groups.push({ letter, items: [item] });
    }
    return { groups, total: visible.length };
  }, [contacts, searchTerm, filter]);

  const openConversation = (contact: Contact) => {
    navigate(`/chat?contact=${encodeURIComponent(contact.phone)}`);
  };

  const chip = (value: ContactFilter, label: string, count?: number) => (
    <button
      type="button"
      aria-pressed={filter === value}
      onClick={() => setFilter(value)}
      className={cn(
        'flex flex-shrink-0 items-center gap-1.5 px-3 h-8 rounded-full text-sm whitespace-nowrap transition-colors',
        filter === value
          ? 'bg-primary-subtle text-primary-subtle-foreground font-medium'
          : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn('text-[11px] font-semibold min-w-4 h-4 px-1 flex items-center justify-center rounded-full tabular-nums',
          filter === value ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground')}>
          {count > 999 ? '999+' : count}
        </span>
      )}
    </button>
  );

  return (
    <PageContainer>
      {/* Reading column centred in the page; the header aligns with the list. */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <PageHeader
        title="Contatos"
        description={loading ? 'Carregando…' : `${contacts.length.toLocaleString('pt-BR')} contatos · ${leadCount.toLocaleString('pt-BR')} leads`}
      />

      <div className="w-full rounded-lg bg-card border border-border overflow-hidden flex flex-col min-h-[400px]">
        <div className="px-3 pt-3 pb-2 flex flex-col gap-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-icon pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              aria-label="Pesquisar contatos"
              placeholder="Pesquisar nome, telefone ou e-mail"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 h-10 bg-secondary border-0 rounded-full text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
            />
          </div>
          <div className="flex items-center gap-2">
            {chip('all', 'Todos')}
            {chip('lead', 'Leads', leadCount)}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-80 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">Carregando contatos…</span>
          </div>
        ) : failed ? (
          <div className="flex flex-col items-center justify-center h-80 gap-2 px-6 text-center">
            <CloudOff className="w-10 h-10 text-icon/40" aria-hidden="true" />
            <p className="text-base text-foreground">Não foi possível carregar os contatos</p>
            <p className="text-sm text-muted-foreground">Recarregue a página para tentar de novo.</p>
          </div>
        ) : sections.total === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 gap-2 px-6 text-center">
            <Users className="w-10 h-10 text-icon/40" aria-hidden="true" />
            <p className="text-base text-foreground">Nenhum contato encontrado</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filter !== 'all'
                ? 'Tente outro termo ou troque o filtro.'
                : 'Os contatos aparecem aqui quando alguém manda mensagem ou é importado.'}
            </p>
          </div>
        ) : (
          <div role="list" aria-label="Contatos">
            {sections.groups.map(({ letter, items }) => (
              <section key={letter} aria-label={letter}>
                <h3 className="px-6 pt-5 pb-2 text-base text-primary">{letter}</h3>
                {items.map(({ contact, label }) => {
                  const last = formatLastContact(contact.lastContact);
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      role="listitem"
                      onClick={() => openConversation(contact)}
                      title="Abrir conversa"
                      className="group w-full flex items-center gap-3 pl-3 pr-4 text-left hover:bg-accent transition-colors focus-visible:ring-inset focus-visible:ring-offset-0"
                    >
                      <ContactAvatar src={contact.avatar} name={label} className="w-[49px] h-[49px] text-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0 py-3 border-b border-border flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[17px] leading-[21px] text-foreground truncate">{label}</span>
                            {contact.status === 'lead' && (
                              <span className="flex-shrink-0 px-1.5 h-[18px] rounded-full text-[11px] font-medium flex items-center bg-primary-subtle text-primary-subtle-foreground">
                                Lead
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground truncate tabular-nums">
                            {formatPhone(contact.phone)}{contact.email ? ` · ${contact.email}` : ''}
                          </p>
                        </div>
                        {last && <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">{last}</span>}
                        <MessageSquare className="w-5 h-5 flex-shrink-0 text-icon opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden="true" />
                      </div>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>
      </div>
    </PageContainer>
  );
};

export default Contacts;
