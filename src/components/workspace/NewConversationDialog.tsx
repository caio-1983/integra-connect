import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, Search, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/Button';
import { api } from '@/services/api';
import { startConversation } from '@/services/whatsappConnectionService';
import { useWhatsappInstances } from '@/hooks/useWhatsappInstances';
import { Contact } from '@/types';
import { toast } from 'sonner';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the conversation exists — parent selects it in the queue. */
  onConversationStarted: (conversationId: string) => void;
}

export const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  open, onOpenChange, onConversationStarted,
}) => {
  const { instances } = useWhatsappInstances();
  const connectedInstances = useMemo(() => instances.filter((i) => i.connected), [instances]);

  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [search, setSearch] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedInstance((prev) => prev || connectedInstances[0]?.name || '');
  }, [open, connectedInstances]);

  useEffect(() => {
    if (!open) return;
    setLoadingContacts(true);
    api.fetchContacts().then(setContacts).catch(console.error).finally(() => setLoadingContacts(false));
  }, [open]);

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (c.name?.toLowerCase() || '').includes(q) || (c.phone || '').includes(q);
  });

  const handleStart = async (phone: string, name?: string) => {
    if (!selectedInstance) {
      toast.error('Nenhum WhatsApp conectado para iniciar a conversa.');
      return;
    }
    setStarting(true);
    try {
      const result = await startConversation(selectedInstance, phone, name);
      onConversationStarted(result.conversationId);
      onOpenChange(false);
      setNewPhone('');
      setNewName('');
      setSearch('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar conversa');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
          <DialogDescription>
            {connectedInstances.length === 0
              ? 'Nenhum WhatsApp conectado — conecte um número em Gestão de Canais primeiro.'
              : connectedInstances.length === 1
                ? `Enviando via ${connectedInstances[0].name}`
                : 'Escolha o número de origem e o destinatário.'}
          </DialogDescription>
        </DialogHeader>

        {connectedInstances.length > 1 && (
          <select
            value={selectedInstance}
            onChange={(e) => setSelectedInstance(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          >
            {connectedInstances.map((i) => (
              <option key={i.name} value={i.name}>{i.name}{i.number ? ` — ${i.number}` : ''}</option>
            ))}
          </select>
        )}

        <Tabs defaultValue="existing">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Contato existente</TabsTrigger>
            <TabsTrigger value="new">Novo número</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border/60">
              {loadingContacts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum contato encontrado</p>
              ) : (
                filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    disabled={starting || connectedInstances.length === 0}
                    onClick={() => handleStart(c.phone, c.name)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{c.name || 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Telefone (formato internacional)</label>
              <Input
                placeholder="+55 21 99999-9999"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Nome (opcional)</label>
              <Input
                placeholder="Nome do contato"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={starting || !newPhone.trim() || connectedInstances.length === 0}
              onClick={() => handleStart(newPhone, newName.trim() || undefined)}
            >
              {starting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Iniciando...</>
              ) : (
                <><MessageSquare className="w-4 h-4 mr-2" />Iniciar Conversa</>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
