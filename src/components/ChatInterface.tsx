import React, { useState, useRef, useEffect } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { ConversationStatus, TagDefinition } from '../types';
import { useConversations } from '../hooks/useConversations';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { api } from '@/services/api';
import { toast } from 'sonner';
import {
  ConversationQueue,
  ConversationHeader,
  ConversationTimeline,
  MessageComposer,
  CustomerWorkspace,
} from './workspace';

const ChatInterface: React.FC = () => {
  const { conversations, loading, sendMessage, updateStatus, markAsRead, assignConversation } = useConversations();
  const { sdrName, companyName } = useCompanySettings();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showCustomerWorkspace, setShowCustomerWorkspace] = useState(true);
  const [availableTags, setAvailableTags] = useState<TagDefinition[]>([]);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const activeChat = conversations.find(c => c.id === selectedChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load tags and team on mount
  useEffect(() => {
    api.fetchTagDefinitions().then(setAvailableTags).catch(console.error);
    api.fetchTeam().then(setTeamMembers).catch(console.error);
  }, []);

  // Auto-select first conversation or from URL param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationParam = urlParams.get('conversation');
    if (conversationParam && conversations.some(c => c.id === conversationParam)) {
      setSelectedChatId(conversationParam);
    } else if (conversations.length > 0 && !selectedChatId) {
      setSelectedChatId(conversations[0].id);
    }
  }, [conversations, selectedChatId]);

  // Mark as read on selection
  useEffect(() => {
    if (selectedChatId && (activeChat?.unreadCount ?? 0) > 0) {
      markAsRead(selectedChatId);
    }
  }, [selectedChatId, activeChat?.unreadCount, markAsRead]);

  // Sync notes with active chat
  useEffect(() => {
    if (activeChat) setNotesValue(activeChat.notes || '');
  }, [activeChat?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, selectedChatId]);

  // Handlers
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

  const handleStatusChange = async (status: ConversationStatus) => {
    if (!activeChat) return;
    await updateStatus(activeChat.id, status);
  };

  if (loading) {
    return (
      <div className="flex h-full bg-slate-950 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-sm text-slate-500">Sincronizando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-950 rounded-tl-2xl overflow-hidden border-t border-l border-slate-800/50">

      {/* Coluna 1 — Fila Operacional */}
      <ConversationQueue
        conversations={conversations}
        selectedId={selectedChatId}
        onSelect={setSelectedChatId}
        loading={loading}
        sdrName={sdrName}
      />

      {/* Coluna 2 — Conversa */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#0B0E14] relative overflow-hidden">
          {/* Dot pattern ambient */}
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
          />

          <ConversationHeader
            conversation={activeChat}
            sdrName={sdrName}
            showCustomerPanel={showCustomerWorkspace}
            onStatusChange={handleStatusChange}
            onToggleCustomerPanel={() => setShowCustomerWorkspace(v => !v)}
          />

          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar relative z-0">
            <ConversationTimeline
              messages={activeChat.messages}
              messagesEndRef={messagesEndRef}
            />
          </div>

          <MessageComposer
            value={inputText}
            onChange={setInputText}
            onSend={handleSendMessage}
            isNinaActive={activeChat.status === 'nina'}
            sdrName={sdrName}
          />
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0E14] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center p-8 text-center max-w-sm">
            <div className="w-18 h-18 relative mb-6">
              <div className="absolute inset-0 bg-cyan-500/15 rounded-full blur-xl" />
              <div className="relative w-18 h-18 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 shadow-2xl w-[72px] h-[72px]">
                <MessageSquare className="w-8 h-8 text-cyan-500" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{companyName} Workspace</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {conversations.length === 0
                ? 'Aguardando novas conversas.'
                : 'Selecione uma conversa para iniciar o atendimento.'}
            </p>
            <div className="mt-6 flex gap-3 text-xs text-slate-500 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800/50">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {sdrName} Online
              </span>
              <span className="w-px h-4 bg-slate-800" />
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
          teamMembers={teamMembers}
          availableTags={availableTags}
          isTagSelectorOpen={isTagSelectorOpen}
          setIsTagSelectorOpen={setIsTagSelectorOpen}
          notesValue={notesValue}
          setNotesValue={setNotesValue}
          isSavingNotes={isSavingNotes}
          onToggleTag={handleToggleTag}
          onCreateTag={handleCreateTag}
          onNotesBlur={handleNotesBlur}
          onAssignUser={(userId) => {
            assignConversation(activeChat.id, userId);
            toast.success('Conversa atribuída.');
          }}
        />
      )}
    </div>
  );
};

export default ChatInterface;
