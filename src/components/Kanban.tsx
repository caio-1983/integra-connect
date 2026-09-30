import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Loader2, CalendarClock, X, Building, CheckCircle2, Circle,
  FileText, Phone, Mail, CheckSquare, Calendar, Trash2, SlidersHorizontal, MessageSquare, Bot, CloudOff,
} from 'lucide-react';
import { Button } from './Button';
import { api } from '../services/api';
import { Deal, DealActivity, TeamMember, KanbanColumn } from '../types';
import { supabase } from '../integrations/supabase/client';
import { CreateDealModal } from './CreateDealModal';
import { LostReasonModal } from './LostReasonModal';
import { WonDealModal } from './WonDealModal';
import { formatCurrency, formatCurrencyExact } from '../lib/formatCurrency';
import { PipelineSettingsModal } from './PipelineSettingsModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { PageContainer, PageHeader } from '@/components/layout';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';
import { cn } from '@/lib/utils';

/** Stage colours are stored as `border-*-500` classes (PipelineSettingsModal); the dot uses the bg twin. */
const stageDot = (color: string) => color.replace('border-t-', 'bg-').replace('border-', 'bg-');

/** The API's fallback avatar is a generic "NA" placeholder — initials read better. */
const realAvatar = (url?: string) => (url && !url.includes('ui-avatars.com') ? url : undefined);

const PRIORITY = {
  high:   { label: 'Alta',  dot: 'bg-danger',  text: 'text-danger' },
  medium: { label: 'Média', dot: 'bg-warning', text: 'text-warning' },
  low:    { label: 'Baixa', dot: 'bg-icon',    text: 'text-muted-foreground' },
} as const;

const NEXT_ACTION: Record<string, string> = {
  qualify: 'Qualificar o lead',
  demo: 'Agendar demonstração',
  follow_up: 'Fazer follow-up',
};

const ACTIVITY_ICON: Record<DealActivity['type'], React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckSquare, note: FileText,
};

const COMPOSER_TABS = [
  { id: 'note', label: 'Nota', icon: FileText, placeholder: 'Escreva uma nota…' },
  { id: 'activity', label: 'Ligação', icon: Phone, placeholder: 'Como foi a ligação?' },
  { id: 'email', label: 'E-mail', icon: Mail, placeholder: 'Resumo do e-mail enviado…' },
] as const;

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm text-primary mb-3">{children}</h3>
);

const Kanban: React.FC = () => {
  const { sdrName } = useCompanySettings();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<'note' | 'activity' | 'email'>('note');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDescription, setNewActivityDescription] = useState('');
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const dragItem = useRef<string | null>(null);

  const handleDealCreated = async () => {
    const data = await api.fetchPipeline();
    setDeals(data);
  };

  useEffect(() => {
    const loadStages = async () => {
      try {
        const data = await api.fetchPipelineStages();
        setStages(data);
      } catch (error) {
        console.error("Erro ao carregar etapas", error);
        setLoadFailed(true);
      }
    };
    loadStages();

    const loadPipeline = async () => {
      try {
        const data = await api.fetchPipeline();
        setDeals(data);
      } catch (error) {
        console.error("Erro ao carregar pipeline", error);
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    };
    loadPipeline();

    const loadTeamMembers = async () => {
      try {
        const members = await api.fetchTeam();
        setTeamMembers(members);
      } catch (error) {
        console.error("Erro ao carregar membros da equipe", error);
      }
    };
    loadTeamMembers();

    const dealsChannel = supabase
      .channel('deals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, async () => {
        const data = await api.fetchPipeline();
        setDeals(data);
      })
      .subscribe();

    const stagesChannel = supabase
      .channel('pipeline-stages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline_stages' }, async () => {
        const data = await api.fetchPipelineStages();
        setStages(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dealsChannel);
      supabase.removeChannel(stagesChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedDeal) loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeal?.id]);

  useEffect(() => {
    if (selectedDeal?.conversationId) {
      loadConversationMessages();
    } else {
      setConversationMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeal?.conversationId]);

  // Esc closes the details panel, like every other side panel in the app.
  useEffect(() => {
    if (!selectedDeal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isWonModalOpen && !isLostModalOpen) setSelectedDeal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedDeal, isWonModalOpen, isLostModalOpen]);

  const loadConversationMessages = async () => {
    if (!selectedDeal?.conversationId) return;
    setLoadingMessages(true);
    try {
      const messages = await api.fetchConversationMessages(selectedDeal.conversationId, 15);
      setConversationMessages(messages);
    } catch (error) {
      console.error("Erro ao carregar mensagens", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadActivities = async () => {
    if (!selectedDeal) return;
    setLoadingActivities(true);
    try {
      const data = await api.fetchDealActivities(selectedDeal.id);
      setActivities(data);
    } catch (error) {
      console.error("Erro ao carregar atividades", error);
    } finally {
      setLoadingActivities(false);
    }
  };

  /** Both "won" entry points (the action button and the stage progress bar) go
   *  through WonDealModal so the closed value is always captured — see
   *  api.markDealWon. */
  const handleMarkWon = async (value: number) => {
    if (!selectedDeal) return;
    try {
      await api.markDealWon(selectedDeal.id, value);
      toast.success("Negócio marcado como ganho.");
      setSelectedDeal(null);
    } catch (error) {
      console.error("Erro ao marcar deal como ganho", error);
      toast.error("Não foi possível marcar como ganho");
    }
  };

  const handleMarkLost = async (reasonCode: string, detail?: string) => {
    if (!selectedDeal) return;
    try {
      await api.markDealLost(selectedDeal.id, reasonCode, detail);
      toast.success("Negócio marcado como perdido. Motivo registrado.");
      setSelectedDeal(null);
    } catch (error) {
      console.error("Erro ao marcar deal como perdido", error);
      toast.error("Não foi possível marcar como perdido");
    }
  };

  const handleOwnerChange = async (ownerId: string) => {
    if (!selectedDeal) return;
    try {
      await api.updateDealOwner(selectedDeal.id, ownerId);
      const member = teamMembers.find(m => m.id === ownerId);
      setSelectedDeal({ ...selectedDeal, ownerId, ownerName: member?.name });
      toast.success("Responsável atualizado");
    } catch (error) {
      console.error("Erro ao atualizar proprietário", error);
      toast.error("Não foi possível atualizar o responsável");
    }
  };

  const handleCreateActivity = async () => {
    if (!selectedDeal || !newActivityTitle.trim()) return;
    try {
      await api.createDealActivity({
        dealId: selectedDeal.id,
        type: activeTab === 'activity' ? 'call' : activeTab === 'email' ? 'email' : 'note',
        title: newActivityTitle,
        description: newActivityDescription,
      });
      setNewActivityTitle('');
      setNewActivityDescription('');
      loadActivities();
      toast.success("Atividade registrada");
    } catch (error) {
      console.error("Erro ao criar atividade", error);
      toast.error("Não foi possível registrar a atividade");
    }
  };

  const handleToggleActivityComplete = async (activityId: string, isCompleted: boolean) => {
    try {
      await api.updateDealActivity(activityId, { isCompleted: !isCompleted });
      loadActivities();
    } catch (error) {
      console.error("Erro ao atualizar atividade", error);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      await api.deleteDealActivity(activityId);
      loadActivities();
      toast.success("Atividade excluída");
    } catch (error) {
      console.error("Erro ao excluir atividade", error);
    }
  };

  const onDragStart = (e: React.DragEvent, dealId: string) => {
    dragItem.current = dealId;
    e.dataTransfer.effectAllowed = "move";
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const onDragEnd = (e: React.DragEvent) => {
    dragItem.current = null;
    setDropTarget(null);
    (e.target as HTMLElement).style.opacity = '1';
  };

  const onDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dropTarget !== stageId) setDropTarget(stageId);
  };

  const onDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDropTarget(null);
    const dealId = dragItem.current;
    if (!dealId) return;
    const updatedDeals = deals.map(deal =>
      deal.id === dealId ? { ...deal, stageId: targetStageId } : deal
    );
    setDeals(updatedDeals);
    try {
      await api.moveDealStage(dealId, targetStageId);
    } catch (error) {
      console.error('Error moving deal:', error);
      toast.error('Não foi possível mover o negócio');
      const data = await api.fetchPipeline();
      setDeals(data);
    }
  };

  const moveSelectedTo = async (col: KanbanColumn) => {
    if (!selectedDeal) return;
    if (col.title === 'Ganho') { setIsWonModalOpen(true); return; }
    if (col.title === 'Perdido') { setIsLostModalOpen(true); return; }
    setDeals(deals.map(d => d.id === selectedDeal.id ? { ...d, stageId: col.id } : d));
    setSelectedDeal({ ...selectedDeal, stageId: col.id });
    try {
      await api.moveDealStage(selectedDeal.id, col.id);
    } catch (error) {
      console.error('Error moving deal:', error);
      toast.error('Não foi possível mudar a etapa');
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredDeals = deals.filter(deal =>
    deal.title.toLowerCase().includes(q) || deal.company.toLowerCase().includes(q)
  );

  const openDeals = deals.filter(d => !d.wonAt && !d.lostAt);
  const openValue = openDeals.reduce((acc, d) => acc + d.value, 0);

  if (loading) {
    return (
      <PageContainer className="flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando negócios" />
      </PageContainer>
    );
  }

  const tab = COMPOSER_TABS.find(t => t.id === activeTab)!;

  return (
    <PageContainer scrollable={false} className="gap-4">
      <PageHeader
        title="Vendas"
        description={`${openDeals.length} ${openDeals.length === 1 ? 'negócio aberto' : 'negócios abertos'} · ${formatCurrency(openValue)} em andamento`}
        actions={
          <>
            <Button variant="outline" onClick={() => setIsSettingsModalOpen(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" aria-hidden="true" />
              Etapas
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Novo negócio
            </Button>
          </>
        }
      />

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-icon pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          aria-label="Buscar negócio"
          placeholder="Buscar negócio ou empresa"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 h-10 bg-card border border-border rounded-full text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
        />
      </div>

      {loadFailed && deals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <CloudOff className="w-10 h-10 text-icon/40" aria-hidden="true" />
          <p className="text-base text-foreground">Não foi possível carregar o funil</p>
          <p className="text-sm text-muted-foreground">Recarregue a página para tentar de novo.</p>
        </div>
      ) : (
      /* Board */
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full gap-3 min-w-max">
          {stages.map((column) => {
            const columnDeals = filteredDeals.filter(d => d.stageId === column.id);
            const totalValue = columnDeals.reduce((acc, curr) => acc + curr.value, 0);
            const isWonColumn = column.title === 'Ganho';
            const isLostColumn = column.title === 'Perdido';
            const dot = isWonColumn ? 'bg-success' : isLostColumn ? 'bg-danger' : stageDot(column.color);

            return (
              <section
                key={column.id}
                aria-label={column.title}
                className={cn(
                  'w-[300px] flex flex-col h-full rounded-lg bg-border/70 dark:bg-muted transition-shadow',
                  dropTarget === column.id && 'ring-2 ring-primary ring-inset',
                )}
                onDragOver={(e) => onDragOver(e, column.id)}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
                onDrop={(e) => onDrop(e, column.id)}
              >
                {/* Column Header */}
                <header className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dot)} aria-hidden="true" />
                    <h2 className="text-[15px] font-medium text-foreground truncate">{column.title}</h2>
                    {column.isAiManaged && (
                      <Bot className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-label="A Lu move negócios para esta etapa" />
                    )}
                    <span className="ml-auto min-w-[22px] h-[22px] px-1.5 rounded-full bg-card text-xs font-medium text-muted-foreground tabular-nums flex items-center justify-center">
                      {columnDeals.length}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-[18px] text-xs text-muted-foreground tabular-nums">{formatCurrency(totalValue)}</p>
                </header>

                {/* Column Body */}
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  {columnDeals.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">Arraste um negócio para cá</p>
                  )}
                  {columnDeals.map((deal) => {
                    const pr = PRIORITY[deal.priority] ?? PRIORITY.low;
                    return (
                      <div
                        key={deal.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(e) => onDragStart(e, deal.id)}
                        onDragEnd={onDragEnd}
                        onClick={() => setSelectedDeal(deal)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDeal(deal); } }}
                        className={cn(
                          'bg-card rounded-lg p-3 shadow-wa-bubble cursor-grab active:cursor-grabbing transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0',
                          selectedDeal?.id === deal.id && 'ring-2 ring-primary',
                        )}
                      >
                        <p className="text-[15px] leading-5 text-foreground">{deal.title}</p>
                        {deal.company && <p className="mt-0.5 text-[13px] text-muted-foreground truncate">{deal.company}</p>}

                        {deal.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {deal.tags.map(tag => (
                              <span key={tag} className="text-[11px] text-secondary-foreground bg-secondary px-2 h-5 rounded-full flex items-center">{tag}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(deal.value)}</span>
                          {deal.priority !== 'low' && (
                            <span className={cn('flex items-center gap-1 text-xs', pr.text)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', pr.dot)} aria-hidden="true" />
                              {pr.label}
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-2">
                            {deal.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums" title="Previsão de fechamento">
                                <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                                {new Date(deal.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                            <span title={deal.ownerName || 'Sem responsável'}>
                              <ContactAvatar src={realAvatar(deal.ownerAvatar)} name={deal.ownerName || '?'} className="w-6 h-6 text-[10px]" />
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      )}

      {/* Backdrop */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedDeal(null)} aria-hidden="true" />
      )}

      {/* Details panel */}
      <aside
        aria-label="Detalhes do negócio"
        aria-hidden={!selectedDeal}
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-xl bg-background shadow-wa-menu z-50 transform transition-transform duration-300 ease-out flex flex-col',
          selectedDeal ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {selectedDeal && (() => {
          const currentStageIndex = stages.findIndex(c => c.id === selectedDeal.stageId);
          const mem = selectedDeal.clientMemory;
          return (
            <>
              {/* Header bar */}
              <div className="flex-shrink-0 h-[60px] px-4 flex items-center gap-4 bg-muted">
                <button
                  type="button"
                  onClick={() => setSelectedDeal(null)}
                  aria-label="Fechar"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-icon hover:bg-accent"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-base text-foreground">Detalhes do negócio</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Identity */}
                <div className="bg-card px-6 pt-6 pb-5">
                  <h2 className="text-[22px] leading-tight text-foreground break-words">{selectedDeal.title}</h2>
                  <p className="mt-1 text-lg text-foreground tabular-nums">{formatCurrencyExact(selectedDeal.value)}</p>
                  {selectedDeal.company && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building className="w-4 h-4" aria-hidden="true" /> {selectedDeal.company}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Select value={selectedDeal.ownerId || ''} onValueChange={handleOwnerChange}>
                      <SelectTrigger aria-label="Responsável" className="w-auto min-w-[200px] h-9 rounded-full bg-secondary border-0 text-sm">
                        <SelectValue placeholder="Sem responsável">
                          <span className="flex items-center gap-2">
                            <ContactAvatar src={realAvatar(selectedDeal.ownerAvatar)} name={selectedDeal.ownerName || '?'} className="w-5 h-5 text-[9px]" />
                            {selectedDeal.ownerName || 'Sem responsável'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map(member => (
                          <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="flex-1" />
                    <Button size="sm" onClick={() => setIsWonModalOpen(true)} className="bg-success-subtle text-success hover:bg-success-subtle/70 border-0">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" aria-hidden="true" /> Ganho
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setIsLostModalOpen(true)} className="border-0">
                      <X className="w-4 h-4 mr-1.5" aria-hidden="true" /> Perdido
                    </Button>
                  </div>
                </div>

                {/* Stage */}
                <div className="h-2" aria-hidden="true" />
                <div className="bg-card px-6 py-5">
                  <SectionTitle>Etapa</SectionTitle>
                  <div role="radiogroup" aria-label="Etapa do negócio" className="flex flex-wrap gap-1.5">
                    {stages.map((col, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isActive = idx === currentStageIndex;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => moveSelectedTo(col)}
                          className={cn(
                            'px-3 h-8 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5',
                            isActive ? 'bg-primary text-primary-foreground font-medium'
                              : isCompleted ? 'bg-primary-subtle text-primary-subtle-foreground hover:bg-primary-subtle/70'
                              : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
                          )}
                        >
                          {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                          {col.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Composer */}
                <div className="h-2" aria-hidden="true" />
                <div className="bg-card px-6 py-5">
                  <SectionTitle>Registrar</SectionTitle>
                  <div role="tablist" aria-label="Tipo de registro" className="flex gap-1.5 mb-3">
                    {COMPOSER_TABS.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                          'px-3 h-8 rounded-full text-sm flex items-center gap-1.5 transition-colors',
                          activeTab === t.id ? 'bg-primary-subtle text-primary-subtle-foreground font-medium' : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        <t.icon className="w-4 h-4" aria-hidden="true" /> {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-lg bg-secondary overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                    <input
                      type="text"
                      aria-label="Título"
                      className="w-full bg-transparent px-4 pt-3 pb-1 text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="Título"
                      value={newActivityTitle}
                      onChange={(e) => setNewActivityTitle(e.target.value)}
                    />
                    <textarea
                      aria-label="Descrição"
                      className="w-full bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[72px] focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder={tab.placeholder}
                      value={newActivityDescription}
                      onChange={(e) => setNewActivityDescription(e.target.value)}
                    />
                    <div className="px-3 pb-3 flex justify-end">
                      <Button size="sm" onClick={handleCreateActivity} disabled={!newActivityTitle.trim()}>Salvar</Button>
                    </div>
                  </div>
                </div>

                {/* Activities */}
                <div className="h-2" aria-hidden="true" />
                <div className="bg-card py-5">
                  <div className="px-6"><SectionTitle>Atividades{activities.length > 0 ? ` · ${activities.length}` : ''}</SectionTitle></div>
                  {loadingActivities ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" aria-label="Carregando atividades" /></div>
                  ) : activities.length === 0 ? (
                    <p className="px-6 text-sm text-muted-foreground">Nada registrado ainda. Use o campo acima para anotar o que aconteceu.</p>
                  ) : (
                    <ul>
                      {activities.map(activity => {
                        const Icon = ACTIVITY_ICON[activity.type] ?? FileText;
                        return (
                          <li key={activity.id} className="group/li flex items-start gap-4 pl-6 pr-4 hover:bg-accent transition-colors">
                            <button
                              type="button"
                              onClick={() => handleToggleActivityComplete(activity.id, activity.isCompleted)}
                              aria-label={activity.isCompleted ? 'Marcar como pendente' : 'Marcar como feita'}
                              className="mt-3 text-icon hover:text-success flex-shrink-0"
                            >
                              {activity.isCompleted ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5" />}
                            </button>
                            <div className="flex-1 min-w-0 py-3 border-b border-border group-last/li:border-b-0 flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className={cn('flex items-center gap-1.5 text-[15px]', activity.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground')}>
                                  <Icon className="w-4 h-4 text-icon flex-shrink-0" aria-hidden="true" />
                                  <span className="break-words">{activity.title}</span>
                                </p>
                                {activity.description && <p className="mt-0.5 text-sm text-muted-foreground whitespace-pre-wrap break-words">{activity.description}</p>}
                                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                                  {new Date(activity.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {activity.createdByName && ` · ${activity.createdByName}`}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteActivity(activity.id)}
                                aria-label="Excluir atividade"
                                className="sm:opacity-0 group-hover/li:opacity-100 focus-visible:opacity-100 w-8 h-8 rounded-full flex items-center justify-center text-icon hover:bg-danger-subtle hover:text-danger transition-opacity flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Lu insights */}
                {mem && (
                  <>
                    <div className="h-2" aria-hidden="true" />
                    <div className="bg-card px-6 py-5 space-y-4">
                      <SectionTitle>Perfil do cliente, segundo {sdrName || 'a IA'}</SectionTitle>
                      <div>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="text-muted-foreground">Qualificação</span>
                          <span className="text-foreground tabular-nums">{mem.lead_profile.qualification_score || 0}%</span>
                        </div>
                        <div className="mt-1.5 w-full bg-secondary rounded-full h-1.5" role="progressbar" aria-valuenow={mem.lead_profile.qualification_score || 0} aria-valuemin={0} aria-valuemax={100} aria-label="Qualificação">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${mem.lead_profile.qualification_score || 0}%` }} />
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Próximo passo sugerido</span>
                        <p className="mt-0.5 text-[15px] text-foreground">
                          {NEXT_ACTION[mem.sales_intelligence.next_best_action] ?? mem.sales_intelligence.next_best_action}
                        </p>
                      </div>
                      {mem.lead_profile.interests.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Interesses</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {mem.lead_profile.interests.map((interest, idx) => (
                              <span key={idx} className="px-2.5 h-6 rounded-full bg-success-subtle text-success text-xs flex items-center">{interest}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {mem.sales_intelligence.pain_points.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Dores</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {mem.sales_intelligence.pain_points.map((pain, idx) => (
                              <span key={idx} className="px-2.5 h-6 rounded-full bg-danger-subtle text-danger text-xs flex items-center">{pain}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Orçamento</span>
                          <p className="mt-0.5 text-[15px] text-foreground">
                            {mem.sales_intelligence.budget_indication === 'unknown' ? 'Não informado' : mem.sales_intelligence.budget_indication}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prazo de decisão</span>
                          <p className="mt-0.5 text-[15px] text-foreground">
                            {mem.sales_intelligence.decision_timeline === 'unknown' ? 'Não definido' : mem.sales_intelligence.decision_timeline}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Conversation */}
                {selectedDeal.conversationId && (
                  <>
                    <div className="h-2" aria-hidden="true" />
                    <div className="bg-card px-6 py-5">
                      <SectionTitle>Últimas mensagens</SectionTitle>
                      {loadingMessages ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" aria-label="Carregando mensagens" /></div>
                      ) : conversationMessages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma mensagem nesta conversa.</p>
                      ) : (
                        <div className="chat-wall rounded-lg overflow-hidden" /* pattern on a non-scrolling wrapper, see index.css */>
                        <div className="relative p-3 space-y-1.5 max-h-72 overflow-y-auto">
                          {conversationMessages.map(msg => {
                            const incoming = msg.from_type === 'user';
                            return (
                              <div key={msg.id} className={cn('flex', incoming ? 'justify-start' : 'justify-end')}>
                                <div
                                  className={cn(
                                    'max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm shadow-wa-bubble text-[color:var(--wa-text)]',
                                    incoming ? 'bg-[var(--wa-in)]' : 'bg-[var(--wa-out)]',
                                  )}
                                >
                                  {!incoming && (
                                    <p className="text-xs font-medium text-primary">{msg.from_type === 'nina' ? sdrName || 'Lu' : 'Equipe'}</p>
                                  )}
                                  <p className="leading-snug line-clamp-4 whitespace-pre-wrap break-words">{msg.content || 'Mídia'}</p>
                                  <p className="text-[11px] text-right text-[color:var(--wa-meta)] tabular-nums">
                                    {new Date(msg.sent_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="w-full mt-3"
                        onClick={() => navigate(`/chat?conversation=${selectedDeal.conversationId}`)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" />
                        Abrir conversa
                      </Button>
                    </div>
                  </>
                )}
                <div className="h-6" aria-hidden="true" />
              </div>
            </>
          );
        })()}
      </aside>

      <CreateDealModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onDealCreated={handleDealCreated}
      />

      <LostReasonModal
        open={isLostModalOpen}
        onOpenChange={setIsLostModalOpen}
        onConfirm={handleMarkLost}
        dealTitle={selectedDeal?.title || ''}
      />

      <WonDealModal
        open={isWonModalOpen}
        onOpenChange={setIsWonModalOpen}
        onConfirm={handleMarkWon}
        dealTitle={selectedDeal?.title || ''}
        currentValue={selectedDeal?.value ?? 0}
      />

      <PipelineSettingsModal
        open={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={async () => {
          const data = await api.fetchPipelineStages();
          setStages(data);
        }}
      />
    </PageContainer>
  );
};

export default Kanban;
