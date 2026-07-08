import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { ConversationStatus, TagDefinition } from '../types';
import { useConversations } from '../hooks/useConversations';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useInstanceAccessGrants } from '@/hooks/useInstanceAccessGrants';
import { useAgentRuntime } from '@/ai/hooks/useAgentRuntime';
import { api } from '@/services/api';
import { toast } from 'sonner';
import {
  ConversationQueue,
  ConversationHeader,
  ConversationTimeline,
  MessageComposer,
  CustomerWorkspace,
  NewConversationDialog,
} from './workspace';

const ChatInterface: React.FC = () => {
  const { conversations, loading, sendMessage, sendMediaMessage, updateStatus, markAsRead, assignConversation, appendLocalMessage, refetch } = useConversations();
  const { sdrName, companyName } = useCompanySettings();
  const { simulateCustomerMessage } = useAgentRuntime({ appendLocalMessage, updateStatus });
  const { grantsByInstance } = useInstanceAccessGrants();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showCustomerWorkspace, setShowCustomerWorkspace] = useState(true);
  const [availableTags, setAvailableTags] = useState<TagDefinition[]>([]);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const activeChat = conversations.find(c => c.id === selectedChatId);

  // Only offer transfer/assign targets who can actually see this conversation:
  // admin/manager always, plus agents granted access to its WhatsApp instance.
  // Conversations with no tracked instance (legacy rows) stay unrestricted.
  const eligibleTeamMembers = useMemo(() => {
    const instance = activeChat?.instance;
    if (!instance) return teamMembers;
    const granted = grantsByInstance.get(instance);
    return teamMembers.filter((m) => m.role === 'admin' || m.role === 'manager' || (m.user_id && granted?.has(m.user_id)));
  }, [teamMembers, activeChat?.instance, grantsByInstance]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);

  useEffect(() => {
    api.fetchTagDefinitions().then(setAvailableTags).catch(console.error);
    api.fetchTeam().then(setTeamMembers).catch(console.error);
  }, []);

  // Seleção inicial única — depois que o usuário desseleciona (Esc), nenhuma
  // conversa deve voltar a ser selecionada automaticamente (como no WhatsApp Web).
  useEffect(() => {
    if (didInitRef.current || conversations.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const conversationParam = urlParams.get('conversation');
    const initialId = conversationParam && conversations.some(c => c.id === conversationParam)
      ? conversationParam
      : conversations[0].id;
    setSelectedChatId(initialId);
    didInitRef.current = true;
  }, [conversations]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isTagSelectorOpen) return;
      setSelectedChatId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTagSelectorOpen]);

  useEffect(() => {
    if (selectedChatId && (activeChat?.unreadCount ?? 0) > 0) {
      markAsRead(selectedChatId);
    }
  }, [selectedChatId, activeChat?.unreadCount, markAsRead]);

  useEffect(() => {
    if (activeChat) setNotesValue(activeChat.notes || '');
  }, [activeChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    try {
      await api.updateContactTags(activeChat.contactId, updated);
      toast.success('Tag atualizada');
    } catch {
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

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChat) return;
    const content = inputText.trim();
    setInputText('');
    await sendMessage(activeChat.id, content);
  };

  const handleSendMedia = async (file: File) => {
    if (!activeChat) return;
    // Any text in the composer rides along as the attachment's caption.
    const caption = inputText.trim();
    setInputText('');
    await sendMediaMessage(activeChat.id, file, caption || undefined);
  };

  const handleStatusChange = async (status: ConversationStatus) => {
    if (!activeChat) return;
    await updateStatus(activeChat.id, status);
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
      <div className="flex h-full bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Sincronizando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background overflow-hidden border-t border-l border-border">

      {/* Coluna 1 — Conversas */}
      <ConversationQueue
        conversations={conversations}
        selectedId={selectedChatId}
        onSelect={setSelectedChatId}
        loading={loading}
        sdrName={sdrName}
        onNewConversation={() => setNewConversationOpen(true)}
      />

      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        onConversationStarted={handleConversationStarted}
      />

      {/* Coluna 2 — Conversa */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
          <ConversationHeader
            conversation={activeChat}
            sdrName={sdrName}
            showCustomerPanel={showCustomerWorkspace}
            onStatusChange={handleStatusChange}
            onToggleCustomerPanel={() => setShowCustomerWorkspace(v => !v)}
            onSimulateCustomerMessage={handleSimulateCustomerMessage}
            teamMembers={eligibleTeamMembers}
            onTransfer={async (userId) => {
              try {
                await assignConversation(activeChat.id, userId);
                toast.success('Conversa transferida.');
              } catch {
                toast.error('Erro ao transferir conversa.');
              }
            }}
          />

          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar relative z-0">
            <ConversationTimeline
              messages={activeChat.messages}
              messagesEndRef={messagesEndRef}
              primaryChannel={activeChat.primaryChannel}
            />
          </div>

          <MessageComposer
            value={inputText}
            onChange={setInputText}
            onSend={handleSendMessage}
            onAttach={handleSendMedia}
            isNinaActive={activeChat.status === 'nina'}
            sdrName={sdrName}
          />
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-100/20 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center p-8 text-center max-w-sm">
            <div className="w-18 h-18 relative mb-6">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
              <div className="relative w-[72px] h-[72px] bg-card rounded-full flex items-center justify-center border border-border shadow-sm">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">{companyName} Workspace</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {conversations.length === 0
                ? 'Aguardando novas conversas.'
                : 'Selecione uma conversa para iniciar o atendimento.'}
            </p>
            <div className="mt-6 flex gap-3 text-xs text-muted-foreground bg-card px-4 py-2 rounded-lg border border-border">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {sdrName} Online
              </span>
              <span className="w-px h-4 bg-border" />
              <span>{conversations.length} conversa{conversations.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Coluna 3 — Workspace do Cliente */}
      {activeChat && showCustomerWorkspace && (
        <CustomerWorkspace
          conversation={activeChat}
          sdrName={sdrName}
          teamMembers={eligibleTeamMembers}
          availableTags={availableTags}
          isTagSelectorOpen={isTagSelectorOpen}
          setIsTagSelectorOpen={setIsTagSelectorOpen}
          notesValue={notesValue}
          setNotesValue={setNotesValue}
          isSavingNotes={isSavingNotes}
          onToggleTag={handleToggleTag}
          onCreateTag={handleCreateTag}
          onNotesBlur={handleNotesBlur}
          onInsertToComposer={(text) => setInputText(text)}
          onAssignUser={async (userId) => {
            try {
              await assignConversation(activeChat.id, userId);
              toast.success('Conversa atribuída.');
            } catch {
              toast.error('Erro ao atribuir conversa.');
            }
          }}
        />
      )}
    </div>
  );
};

export default ChatInterface;
