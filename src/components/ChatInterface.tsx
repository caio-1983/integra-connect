import React, { useState, useEffect } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { TagDefinition } from '../types';
import { useConversations } from '../hooks/useConversations';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { api } from '@/services/api';
import { toast } from 'sonner';
import ConversationList from './chat/ConversationList';
import ConversationWorkspace from './chat/ConversationWorkspace';

const ChatInterface: React.FC = () => {
  const { conversations, loading, sendMessage, updateStatus, markAsRead, assignConversation } = useConversations();
  const { sdrName, companyName } = useCompanySettings();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<TagDefinition[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const activeChat = conversations.find(c => c.id === selectedChatId);

  // Load tag definitions and team members
  useEffect(() => {
    api.fetchTagDefinitions().then(setAvailableTags).catch(err => {
      console.error('Error loading tags:', err);
      toast.error('Erro ao carregar tags');
    });

    api.fetchTeam().then(setTeamMembers).catch(err => {
      console.error('Error loading team members:', err);
    });
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

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedChatId && (activeChat?.unreadCount ?? 0) > 0) {
      markAsRead(selectedChatId);
    }
  }, [selectedChatId, activeChat?.unreadCount, markAsRead]);

  // Sync notes value with active chat
  useEffect(() => {
    if (activeChat) {
      setNotesValue(activeChat.notes || '');
    }
  }, [activeChat?.id]);

  const handleNotesBlur = async () => {
    if (!activeChat || notesValue === (activeChat.notes || '')) return;
    setIsSavingNotes(true);
    try {
      await api.updateContactNotes(activeChat.contactId, notesValue);
      toast.success('Notas salvas');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erro ao salvar notas');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleToggleTag = async (tagKey: string) => {
    if (!activeChat) return;
    const currentTags = activeChat.tags || [];
    const newTags = currentTags.includes(tagKey)
      ? currentTags.filter(t => t !== tagKey)
      : [...currentTags, tagKey];
    try {
      await api.updateContactTags(activeChat.contactId, newTags);
      toast.success('Tag atualizada');
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('Erro ao atualizar tag');
    }
  };

  const handleCreateTag = async (tag: { key: string; label: string; color: string; category: string }) => {
    try {
      const newTag = await api.createTagDefinition(tag);
      setAvailableTags(prev => [...prev, newTag]);
      toast.success('Tag criada com sucesso');
      if (activeChat) {
        await handleToggleTag(tag.key);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Erro ao criar tag');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeChat) return;
    await sendMessage(activeChat.id, content);
  };

  const handleStatusChange = async (status: 'nina' | 'human' | 'paused') => {
    if (!activeChat) return;
    await updateStatus(activeChat.id, status);
  };

  const handleAssign = (userId: string | null) => {
    if (!activeChat) return;
    assignConversation(activeChat.id, userId);
    toast.success('Conversa atribuída. Deal atualizado automaticamente.');
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
    <div className="flex h-full bg-slate-950 rounded-tl-2xl overflow-hidden border-t border-l border-slate-800/50 shadow-2xl">
      <ConversationList
        conversations={conversations}
        selectedChatId={selectedChatId}
        sdrName={sdrName}
        onSelectChat={setSelectedChatId}
      />

      {activeChat ? (
        <ConversationWorkspace
          activeChat={activeChat}
          sdrName={sdrName}
          teamMembers={teamMembers}
          availableTags={availableTags}
          notesValue={notesValue}
          isSavingNotes={isSavingNotes}
          onSendMessage={handleSendMessage}
          onStatusChange={handleStatusChange}
          onToggleTag={handleToggleTag}
          onCreateTag={handleCreateTag}
          onAssign={handleAssign}
          onNotesChange={setNotesValue}
          onNotesBlur={handleNotesBlur}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0E14] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 to-transparent" />
          <div className="relative z-10 flex flex-col items-center p-8 text-center max-w-md">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-slate-800 relative group">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl group-hover:bg-cyan-500/30 transition-all duration-1000" />
              <MessageSquare className="w-10 h-10 text-cyan-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{companyName} Workspace</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {conversations.length === 0
                ? 'Aguardando novas conversas. Configure o webhook do WhatsApp para começar a receber mensagens.'
                : 'Selecione uma conversa ao lado para iniciar o atendimento inteligente.'}
            </p>
            <div className="mt-8 flex gap-3 text-xs text-slate-500 font-mono bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800/50">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {sdrName} Online
              </span>
              <span className="w-px h-4 bg-slate-800" />
              <span>{conversations.length} conversas</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
