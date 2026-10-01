import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { remindersApi, toAppNotification } from '@/services/remindersApi';
import { isPending, whenLabel, type AppNotification } from '@/lib/reminders';

export type DesktopPermission = NotificationPermission | 'unsupported';

interface NotificationsContextValue {
  notifications: AppNotification[];
  loaded: boolean;
  /** Avisos não lidos de algo que ainda não aconteceu (o número do sino). */
  pendingCount: number;
  /** Relógio de minuto em minuto, para rótulos como "Em 25 min". */
  now: Date;
  /** Marca como lido e leva até o que o aviso lembra. */
  open: (n: AppNotification) => void;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  desktopPermission: DesktopPermission;
  requestDesktopPermission: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const desktopSupported = () => typeof window !== 'undefined' && 'Notification' in window;
const currentPermission = (): DesktopPermission => (desktopSupported() ? Notification.permission : 'unsupported');

const describe = (n: AppNotification) => [n.eventAt ? whenLabel(n.eventAt) : null, n.body].filter(Boolean).join(' · ');

/**
 * Caixa de avisos da pessoa logada. Montado uma vez no layout do app: o
 * rodapé da sidebar renderiza duas vezes (desktop e mobile), então toast e
 * aviso do Windows nascem aqui, nunca no sino.
 */
export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [desktopPermission, setDesktopPermission] = useState<DesktopPermission>(currentPermission);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setNotifications(await remindersApi.fetchNotifications(userId));
    } catch (error) {
      console.error('[Notifications] Error loading notifications:', error);
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const readAt = new Date().toISOString();
    setNotifications(prev => prev.map(n => (ids.includes(n.id) && !n.readAt ? { ...n, readAt } : n)));
    try {
      await remindersApi.markNotificationsRead(ids);
    } catch (error) {
      console.error('[Notifications] Error marking as read:', error);
      void refresh();
    }
  }, [refresh]);

  const open = useCallback((n: AppNotification) => {
    if (!n.readAt) void markRead([n.id]);
    if (n.link) navigate(n.link);
  }, [markRead, navigate]);

  // A função mais recente, para o callback do realtime não prender versões velhas.
  const openRef = useRef(open);
  openRef.current = open;

  const announce = useCallback((n: AppNotification) => {
    const description = describe(n);
    toast(`Lembrete: ${n.title}`, {
      id: n.id,
      description: description || undefined,
      duration: 15000,
      action: n.link ? { label: 'Abrir', onClick: () => openRef.current(n) } : undefined,
      actionButtonStyle: { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: 9999, paddingInline: 12 },
    });

    // Aviso do Windows só quando a pessoa não está olhando para o Integra.
    if (!desktopSupported() || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible' && document.hasFocus()) return;
    try {
      // tag = id: várias abas abertas trocam o mesmo aviso em vez de empilhar.
      const desktop = new Notification(`Lembrete: ${n.title}`, { body: description, tag: n.id, icon: '/favicon.ico' });
      desktop.onclick = () => { window.focus(); openRef.current(n); desktop.close(); };
    } catch (error) {
      // Alguns navegadores (Chrome no Android) só aceitam aviso vindo de service worker.
      console.warn('[Notifications] Desktop notification failed:', error);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoaded(false);
    void refresh();

    const upsert = (n: AppNotification) =>
      setNotifications(prev => [n, ...prev.filter(p => p.id !== n.id)]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const n = toAppNotification(payload.new as Parameters<typeof toAppNotification>[0]);
        upsert(n);
        announce(n);
      })
      // Lido em outra aba, ou aposentado pelo banco ao remarcar ou cancelar.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        upsert(toAppNotification(payload.new as Parameters<typeof toAppNotification>[0]));
      })
      .subscribe();

    // O realtime cai quando o notebook dorme; voltar para a aba recarrega.
    const onVisible = () => { if (document.visibilityState === 'visible') { setNow(new Date()); void refresh(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh, announce]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const markAllRead = useCallback(
    () => markRead(notifications.filter(n => !n.readAt).map(n => n.id)),
    [markRead, notifications],
  );

  const requestDesktopPermission = useCallback(async () => {
    if (!desktopSupported()) return;
    try {
      setDesktopPermission(await Notification.requestPermission());
    } catch {
      setDesktopPermission(currentPermission());
    }
  }, []);

  const pendingCount = useMemo(() => notifications.filter(n => isPending(n, now)).length, [notifications, now]);

  const value = useMemo<NotificationsContextValue>(() => ({
    notifications, loaded, pendingCount, now, open, markRead, markAllRead, desktopPermission, requestDesktopPermission,
  }), [notifications, loaded, pendingCount, now, open, markRead, markAllRead, desktopPermission, requestDesktopPermission]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
