import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { UIConversation, ConversationStatus, TagDefinition } from '@/types';
import ConversationHeader from './ConversationHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ContactWorkspacePanel from './ContactWorkspacePanel';

interface ConversationWorkspaceProps {
  activeChat: UIConversation;
  sdrName: string;
  teamMembers: any[];
  availableTags: TagDefinition[];
  notesValue: string;
  isSavingNotes: boolean;
  onSendMessage: (content: string) => void;
  onStatusChange: (status: ConversationStatus) => void;
  onToggleTag: (tagKey: string) => void;
  onCreateTag: (tag: { key: string; label: string; color: string; category: string }) => void;
  onAssign: (userId: string | null) => void;
  onNotesChange: (value: string) => void;
  onNotesBlur: () => void;
}

const ConversationWorkspace: React.FC<ConversationWorkspaceProps> = ({
  activeChat,
  sdrName,
  teamMembers,
  availableTags,
  notesValue,
  isSavingNotes,
  onSendMessage,
  onStatusChange,
  onToggleTag,
  onCreateTag,
  onAssign,
  onNotesChange,
  onNotesBlur,
}) => {
  const [showProfileInfo, setShowProfileInfo] = useState(true);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat.messages]);

  const handleTogglePlay = (msgId: string) => {
    const audio = audioRefs.current[msgId];
    if (!audio) return;
    if (playingAudioId === msgId) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      Object.values(audioRefs.current).forEach(a => a.pause());
      audio.play();
      setPlayingAudioId(msgId);
    }
  };

  const handleSeek = (msgId: string, percent: number) => {
    const audio = audioRefs.current[msgId];
    const duration = audioDurations[msgId];
    if (!audio || !duration) return;
    audio.currentTime = percent * duration;
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0B0E14]">
      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}
        />

        <ConversationHeader
          activeChat={activeChat}
          sdrName={sdrName}
          showProfileInfo={showProfileInfo}
          onToggleProfile={() => setShowProfileInfo(v => !v)}
          onStatusChange={onStatusChange}
        />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-0">
          {activeChat.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs mt-1 opacity-70">Envie uma mensagem para iniciar a conversa</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center my-6">
                <span className="px-4 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-medium rounded-full shadow-sm backdrop-blur-sm">
                  Hoje
                </span>
              </div>
              {activeChat.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isPlaying={playingAudioId === msg.id}
                  duration={audioDurations[msg.id] || 0}
                  progress={audioProgress[msg.id] || 0}
                  onTogglePlay={() => handleTogglePlay(msg.id)}
                  onSeek={(percent) => handleSeek(msg.id, percent)}
                  onAudioRef={(el) => {
                    if (el) audioRefs.current[msg.id] = el;
                    else delete audioRefs.current[msg.id];
                  }}
                  onAudioLoaded={(duration) =>
                    setAudioDurations(prev => ({ ...prev, [msg.id]: duration }))
                  }
                  onAudioTimeUpdate={(currentTime) =>
                    setAudioProgress(prev => ({ ...prev, [msg.id]: currentTime }))
                  }
                  onAudioEnded={() => setPlayingAudioId(null)}
                />
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <MessageInput
          isAIMode={activeChat.status === 'nina'}
          sdrName={sdrName}
          onSendMessage={onSendMessage}
        />
      </div>

      {/* Right Profile Panel — CSS transition preserves show/hide animation */}
      <div
        className={`${showProfileInfo ? 'w-80 border-l border-slate-800 opacity-100' : 'w-0 opacity-0 border-none'} transition-all duration-300 ease-in-out bg-slate-900/95 flex-shrink-0 flex flex-col overflow-hidden`}
      >
        <ContactWorkspacePanel
          activeChat={activeChat}
          teamMembers={teamMembers}
          availableTags={availableTags}
          notesValue={notesValue}
          isSavingNotes={isSavingNotes}
          sdrName={sdrName}
          onClose={() => setShowProfileInfo(false)}
          onToggleTag={onToggleTag}
          onCreateTag={onCreateTag}
          onAssign={onAssign}
          onNotesChange={onNotesChange}
          onNotesBlur={onNotesBlur}
        />
      </div>
    </div>
  );
};

export default ConversationWorkspace;
