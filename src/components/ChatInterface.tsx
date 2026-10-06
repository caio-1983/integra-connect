import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { MessageType, TagDefinition, UIMessage } from '../types';
import { messageAuthor, messagePreview } from './workspace/ConversationTimeline';
import { useConversations } from '../hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useInstanceAccessGrants } from '@/hooks/useInstanceAccessGrants';
import { useAgentRuntime } from '@/ai/hooks/useAgentRuntime';
import { useConversationInsight } from '@/ai/hooks/useConversationInsight';
import { useMyTasks } from '@/hooks/useMyTasks';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { api } from '@/services/api';
import { transcribeConversationAudio } from '@/services/whatsappConnectionService';
import { toast } from 'sonner';
import { ContactFormDialog, type ContactFormValues } from './contact/ContactFormDialog';
import {
  ConversationQueue,
  ConversationHeader,
  ConversationTimeline,
  MessageComposer,
  EditMessageDialog,
  CustomerWorkspace,
  NewConversationDialog,
  LuSuggestionCard,
  ChatHome,
} from './workspace';
import type { QueueFilter } from './workspace';

/** WhatsApp accepts an edit only within 15 minutes of sending. */
const EDIT_WINDOW_MS = 15 * 60 * 1000;

const ChatInterface: React.FC = () => {
  const { conversations, loading, sendMessage, sendMediaMessage, sendPixMessage, editMessage, updateStatus, markAsRead, markAsUnread, setArchived, setPinned, assignConversation, appendLocalMessage, setConversationTags, setContactInfo, loadTaggedConversations, refetch, hasMore, loadingMore, loadMore } = useConversations();
  const { sdrName } = useCompanySettings();
  const { simulateCustomerMessage } = useAgentRuntime({ appendLocalMessage, updateStatus });
  const { grantsByInstance } = useInstanceAccessGrants();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  // Search to pre-fill when the dialog opens from a /chat?contact= deep link.
  const [newConversationSearch, setNewConversationSearch] = useState<string | undefined>();
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const { tasks: myTasks, setDone: setTaskDone, badgeByContact } = useMyTasks();
  const [inputText, setInputText] = useState('');
  const [showCustomerWorkspace, setShowCustomerWorkspace] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagDefinition[]>([]);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [replyingTo, setReplyingTo] = useState<UIMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<UIMessage | null>(null);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const { user } = useAuth();

  // Same rules the backend enforces: your own WhatsApp text, still in the window.
  const canEditMessage = useCallback((msg: UIMessage) =>
    !!user?.id
    && msg.fromType === 'human'
    && msg.sentBy === user.id
    && msg.type === MessageType.TEXT
    && !msg.mediaUrl
    && !msg.pix
    && !!msg.whatsappMessageId
    && (msg.channel ?? 'whatsapp') === 'whatsapp'
    && !!msg.sentAt
    && Date.now() - new Date(msg.sentAt).getTime() < EDIT_WINDOW_MS,
  [user?.id]);

  const activeChat = conversations.find(c => c.id === selectedChatId);
  // Recomputed only on open/contact change so a realtime refresh doesn't wipe what is being typed.
  const contactFormInitial = useMemo<ContactFormValues>(() => ({
    name: activeChat?.contactRawName ?? '',
    call_name: activeChat?.contactCallName ?? '',
    email: activeChat?.contactEmail ?? '',
  }), [activeChat?.contactId, contactFormOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const { insight, loading: insightLoading, error: insightError, regenerate } = useConversationInsight(activeChat);

  // Only offer transfer/assign targets who can actually see this conversation:
  // access now applies to every role (admin/manager included), so a target is
  // eligible only if granted access to this WhatsApp instance.
  // Conversations with no tracked instance (legacy rows) stay unrestricted.
  const eligibleTeamMembers = useMemo(() => {
    const instance = activeChat?.instance;
    if (!instance) return teamMembers;
    const granted = grantsByInstance.get(instance);
    return teamMembers.filter((m) => m.user_id && granted?.has(m.user_id));
  }, [teamMembers, activeChat?.instance, grantsByInstance]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);
  const isMobile = useIsMobile();

  // Celular: um painel por vez. Abrir uma conversa empilha uma entrada no
  // histórico para que o "voltar" do Android/iPhone volte à lista.
  const pushedHistoryRef = useRef(false);
  useEffect(() => {
    if (!isMobile) return;
    if (selectedChatId && !pushedHistoryRef.current) {
      window.history.pushState({ ...window.history.state, chatOpen: true }, '');
      pushedHistoryRef.current = true;
    } else if (!selectedChatId && pushedHistoryRef.current) {
      pushedHistoryRef.current = false;
      window.history.back();
    }
  }, [isMobile, selectedChatId]);
  useEffect(() => {
    if (!isMobile) return;
    const onPop = () => {
      if (!pushedHistoryRef.current) return;
      pushedHistoryRef.current = false;
      setSelectedChatId(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isMobile]);

  useEffect(() => {
    api.fetchTagDefinitions().then(setAvailableTags).catch(console.error);
    api.fetchTeam().then(setTeamMembers).catch(console.error);
  }, []);

  // Seleção inicial única — a página abre sem nenhuma conversa selecionada,
  // a menos que a URL aponte para uma específica (deep link). Depois que o
  // usuário desseleciona (Esc), nenhuma conversa deve voltar a ser
  // selecionada automaticamente (como no WhatsApp Web).
  useEffect(() => {
    if (didInitRef.current || conversations.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const conversationParam = urlParams.get('conversation');
    const contactDigits = (urlParams.get('contact') ?? '').replace(/\D/g, '');
    if (conversationParam && conversations.some(c => c.id === conversationParam)) {
      setSelectedChatId(conversationParam);
    } else if (contactDigits) {
      const match = conversations.find(c => c.contactPhone.replace(/\D/g, '') === contactDigits);
      if (match) {
        setSelectedChatId(match.id);
      } else {
        setNewConversationSearch(contactDigits);
        setNewConversationOpen(true);
      }
    }
    didInitRef.current = true;
  }, [conversations]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc in the edit dialog closes only the dialog, not the conversation.
      if (e.key !== 'Escape' || isTagSelectorOpen || editingMessage) return;
      setSelectedChatId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTagSelectorOpen, editingMessage]);

  // Holds a conversationId to skip the next auto-mark-as-read for — set right
  // before a manual "mark as unread" call so the effect below doesn't
  // immediately undo it while that conversation stays selected.
  const skipAutoMarkReadRef = useRef<string | null>(null);

  const handleMarkAsUnread = React.useCallback((conversationId: string) => {
    // Only the open conversation needs the skip — flagging a background row
    // from the list must still be marked read once the user opens it.
    if (conversationId === selectedChatId) skipAutoMarkReadRef.current = conversationId;
    markAsUnread(conversationId);
  }, [markAsUnread, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId || (activeChat?.unreadCount ?? 0) === 0) return;
    if (skipAutoMarkReadRef.current === selectedChatId) {
      skipAutoMarkReadRef.current = null;
      return;
    }
    markAsRead(selectedChatId);
  }, [selectedChatId, activeChat?.unreadCount, markAsRead]);

  useEffect(() => {
    if (activeChat) setNotesValue(activeChat.notes || '');
    setReplyingTo(null); // a pending reply belongs to the conversation it was started in
    setEditingMessage(null);
    setShowCustomerWorkspace(false); // each conversation opens with Detalhes closed
  }, [activeChat?.id]);

  useEffect(() => {
    // Rola só a timeline: scrollIntoView também rolaria os ancestrais (até os
    // overflow-hidden), o que no celular empurrava o cabeçalho para fora da tela.
    const el = timelineScrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [activeChat?.messages, selectedChatId]);

  const handleNotesBlur = async () => {
    if (!activeChat || notesValue === (activeChat.notes || '')) return;
    setIsSavingNotes(true);
    try {
      await api.updateContactNotes(activeChat.contactId, notesValue);
      toast.success('Notas salvas');
    } catch {
      toast.error('Erro ao salvar notas');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleToggleTag = async (tagKey: string) => {
    if (!activeChat) return;
    const current = activeChat.tags || [];
    const updated = current.includes(tagKey)
      ? current.filter(t => t !== tagKey)
      : [...current, tagKey];
    setConversationTags(activeChat.id, updated); // optimistic
    try {
      await api.updateContactTags(activeChat.contactId, updated);
      toast.success('Tag atualizada');
    } catch {
      setConversationTags(activeChat.id, current); // revert
      toast.error('Erro ao atualizar tag');
    }
  };

  const handleCreateTag = async (tag: { key: string; label: string; color: string; category: string }) => {
    try {
      const newTag = await api.createTagDefinition(tag);
      setAvailableTags(prev => [...prev, newTag]);
      toast.success('Tag criada com sucesso');
      if (activeChat) await handleToggleTag(tag.key);
    } catch {
      toast.error('Erro ao criar tag');
    }
  };

  const handleSubmitContact = async (values: ContactFormValues) => {
    if (!activeChat) return;
    const fields = { name: values.name, call_name: values.call_name, email: values.email };
    try {
      if (activeChat.contactSaved) await api.updateContact(activeChat.contactId, fields);
      else await api.saveContact(activeChat.contactId, fields);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Erro ao salvar contato');
      return;
    }
    setContactInfo(activeChat.contactId, {
      name: values.name.trim() || null,
      callName: values.call_name.trim() || values.name.trim().split(/\s+/)[0] || null,
      email: values.email.trim() || null,
      saved: true,
    });
    setContactFormOpen(false);
    toast.success(activeChat.contactSaved ? 'Contato atualizado' : 'Contato salvo');
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChat) return;
    const content = inputText.trim();
    const replyToId = replyingTo?.id;
    setInputText('');
    setReplyingTo(null);
    await sendMessage(activeChat.id, content, replyToId);
  };

  const handleSendMedia = async (file: File) => {
    if (!activeChat) return;
    // Any text in the composer rides along as the attachment's caption.
    const caption = inputText.trim();
    setInputText('');
    await sendMediaMessage(activeChat.id, file, caption || undefined);
  };

  const handleSendPix = async () => {
    if (!activeChat) return;
    await sendPixMessage(activeChat.id);
  };


  const handleSimulateCustomerMessage = async (content: string) => {
    if (!activeChat) return;
    await simulateCustomerMessage(activeChat, content);
  };

  const handleConversationStarted = async (conversationId: string) => {
    await refetch();
    setSelectedChatId(conversationId);
  };

  if (loading) {
    return (
      <div className="flex h-full bg-card items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Sincronizando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-card overflow-hidden">

      {/* Coluna 1 — Conversas (no celular, só quando nenhuma está aberta) */}
      {!(isMobile && activeChat) && (
      <ConversationQueue
        conversations={conversations}
        selectedId={selectedChatId}
        onSelect={setSelectedChatId}
        loading={loading}
        sdrName={sdrName}
        onNewConversation={() => setNewConversationOpen(true)}
        teamMembers={teamMembers}
        onMarkAsUnread={handleMarkAsUnread}
        onMarkAsRead={markAsRead}
        onSetArchived={setArchived}
        onSetPinned={setPinned}
        activeFilter={queueFilter}
        onFilterChange={setQueueFilter}
        taskBadgeByContact={badgeByContact}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        tagDefinitions={availableTags}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        onLoadTagged={loadTaggedConversations}
      />
      )}

      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={(open) => { setNewConversationOpen(open); if (!open) setNewConversationSearch(undefined); }}
        onConversationStarted={handleConversationStarted}
        initialSearch={newConversationSearch}
      />

      {/* Coluna 2 — Conversa */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-w-0 bg-card relative overflow-hidden">
          <ConversationHeader
            conversation={activeChat}
            sdrName={sdrName}
            showCustomerPanel={showCustomerWorkspace}
            onToggleCustomerPanel={() => setShowCustomerWorkspace(v => !v)}
            onSimulateCustomerMessage={handleSimulateCustomerMessage}
            onMarkAsUnread={handleMarkAsUnread}
            onBack={isMobile ? () => setSelectedChatId(null) : undefined}
            teamMembers={eligibleTeamMembers}
            onTransfer={async (userId) => {
              try {
                await assignConversation(activeChat.id, userId);
                toast.success('Conversa transferida.');
              } catch {
                toast.error('Erro ao transferir conversa.');
              }
            }}
            onChangeAttendant={async (teamMemberId) => {
              try {
                await assignConversation(activeChat.id, teamMemberId);
                toast.success(teamMemberId ? 'Atendente alterado.' : 'Atendente removido.');
              } catch {
                toast.error('Erro ao alterar atendente.');
              }
            }}
          />

          <div className="chat-wall flex-1 min-h-0 z-0">
          <div ref={timelineScrollRef} className="absolute inset-0 overflow-y-auto overscroll-contain px-3 md:px-6 lg:px-12 xl:px-16 py-4 custom-scrollbar">
            <ConversationTimeline
              messages={activeChat.messages}
              messagesEndRef={messagesEndRef}
              primaryChannel={activeChat.primaryChannel}
              isGroup={activeChat.isGroup}
              contactName={activeChat.contactName}
              onReply={setReplyingTo}
              onEdit={setEditingMessage}
              canEdit={canEditMessage}
              onTranscribe={async (msg) => {
                try {
                  const status = await transcribeConversationAudio(activeChat.id, msg.id);
                  if (status === 'failed') toast.error('Não foi possível transcrever o áudio.');
                  if (status === 'skipped') toast.info('Áudio longo demais para transcrever.');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erro ao transcrever o áudio.');
                }
              }}
              luNote={insight && insight.annotation ? {
                messageId: insight.basedOnMessageId,
                text: insight.annotation,
                onOpen: () => setShowCustomerWorkspace(true),
              } : null}
            />
          </div>
          </div>

          <LuSuggestionCard
            insight={insight}
            loading={insightLoading}
            error={insightError}
            onSend={(text) => sendMessage(activeChat.id, text)}
            onEdit={(text) => setInputText(text)}
            onRegenerate={regenerate}
          />

          <MessageComposer
            value={inputText}
            onChange={setInputText}
            onSend={handleSendMessage}
            onAttach={handleSendMedia}
            onSendPix={handleSendPix}
            isNinaActive={activeChat.status === 'nina'}
            sdrName={sdrName}
            replyingTo={replyingTo && {
              author: messageAuthor(replyingTo, activeChat.contactName, activeChat.isGroup),
              preview: messagePreview(replyingTo),
            }}
            onCancelReply={() => setReplyingTo(null)}
          />

          <EditMessageDialog
            message={editingMessage}
            onClose={() => setEditingMessage(null)}
            onSave={(msg, text) => editMessage(activeChat.id, msg, text)}
          />
        </div>
      ) : isMobile ? null : (
        /* Início: o que fazer em seguida (próximo da fila, atalhos, Lu, números) */
        <ChatHome
          conversations={conversations}
          sdrName={sdrName}
          onOpenConversation={setSelectedChatId}
          // A home shortcut ("Aguardando", "Minhas") means the whole queue, not one tag.
          onApplyFilter={(filter) => { setQueueFilter(filter); setTagFilter(null); }}
          onNewConversation={() => setNewConversationOpen(true)}
          tasks={myTasks}
          onToggleTask={setTaskDone}
        />
      )}

      {/* Coluna 3 — Workspace do Cliente */}
      {activeChat && showCustomerWorkspace && (() => {
        const workspace = (
        <CustomerWorkspace
          conversation={activeChat}
          sdrName={sdrName}
          teamMembers={eligibleTeamMembers}
          allTeamMembers={teamMembers}
          availableTags={availableTags}
          isTagSelectorOpen={isTagSelectorOpen}
          setIsTagSelectorOpen={setIsTagSelectorOpen}
          notesValue={notesValue}
          setNotesValue={setNotesValue}
          isSavingNotes={isSavingNotes}
          onToggleTag={handleToggleTag}
          onCreateTag={handleCreateTag}
          onNotesBlur={handleNotesBlur}
          insight={insight}
          insightLoading={insightLoading}
          onClose={() => setShowCustomerWorkspace(false)}
          onEditContact={() => setContactFormOpen(true)}
          onAssignUser={async (userId) => {
            try {
              await assignConversation(activeChat.id, userId);
              toast.success('Conversa atribuída.');
            } catch {
              toast.error('Erro ao atribuir conversa.');
            }
          }}
          className={isMobile ? 'w-full xl:w-full border-l-0 h-full' : undefined}
        />
        );
        // Celular: os detalhes cobrem a tela num Sheet em vez de virar coluna.
        return isMobile ? (
          <Sheet open onOpenChange={(open) => { if (!open) setShowCustomerWorkspace(false); }}>
            <SheetContent side="right" className="w-full sm:max-w-full p-0 [&>button]:hidden">
              {workspace}
            </SheetContent>
          </Sheet>
        ) : workspace;
      })()}

      {activeChat && (
        <ContactFormDialog
          open={contactFormOpen}
          onOpenChange={setContactFormOpen}
          mode={activeChat.contactSaved ? 'edit' : 'save'}
          phone={activeChat.contactPhone}
          initial={contactFormInitial}
          onSubmit={handleSubmitContact}
        />
      )}
    </div>
  );
};

export default ChatInterface;
