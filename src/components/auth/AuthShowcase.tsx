import {
  ArrowDownToLine,
  CheckCheck,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  EllipsisVertical,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Paperclip,
  Plus,
  Search,
  SendHorizontal,
  Settings,
  Smile,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { LaptopScene, STAGE_H, STAGE_W } from './AuthScene';
import { u } from './authUnit';

/**
 * Right-hand panel of the auth screen, laid out on the approved comp's grid
 * (1037×878 comp pixels): eyebrow, two-line headline and lede at the top, the
 * laptop mockup centred on a clean ground, three benefits along the bottom. The
 * laptop screen redraws the comp's inbox (rail, filters, conversation list,
 * open chat with Lu's suggestion) at a fixed 1000×560. Illustrative only:
 * names and messages are sample content, not data.
 */

const FILTERS = [
  { label: 'Todas', count: 12, active: true },
  { label: 'Não lidas', count: 5 },
  { label: 'Em atendimento', count: 3 },
  { label: 'Aguardando', count: 2 },
  { label: 'Fechadas' },
];

const ROWS = [
  { name: 'Marina Alves', preview: 'Oi! Vi o anúncio do trilho de LED…', time: '09:41', unread: 2, selected: true },
  { name: 'Rafael Costa', preview: 'Vocês entregam para Niterói?', time: '09:31', waiting: true },
  { name: 'Studio Arq Luz', preview: 'Proposta enviada', time: '09:12' },
  { name: 'Carla Menezes', preview: 'Obrigada, vou ver com o meu…', time: 'Ontem' },
  { name: 'João Ferreira', preview: 'Tem nas cores preto e branco?', time: 'Ontem' },
  { name: 'Arquiteta Paula', preview: 'Qual o prazo de entrega?', time: 'Ontem' },
  { name: 'Leandro Dias', preview: 'Consegue fazer um orçamento…', time: '26 set', tone: 'bg-[#7a5a9c]' },
];

/** Three outlined, rising bars (the comp's "Mais oportunidades" mark). */
function BarsIcon({ className, strokeWidth = 1.6, style }: { className?: string; strokeWidth?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={className} style={style}>
      <rect x="3" y="13" width="4.2" height="8" rx="1.3" />
      <rect x="9.9" y="8" width="4.2" height="13" rx="1.3" />
      <rect x="16.8" y="3" width="4.2" height="18" rx="1.3" />
    </svg>
  );
}

const BENEFITS = [
  { icon: MessagesSquare, title: 'Conversas organizadas', text: 'Todos os canais em um só lugar.' },
  { icon: BarsIcon, title: 'Mais oportunidades', text: 'Do primeiro contato até a venda.' },
  { icon: Sparkles, title: 'IA como copiloto', text: 'Respostas sugeridas para sua equipe.' },
];

function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-avatar font-medium text-foreground',
        className,
      )}
    >
      {initials}
    </span>
  );
}

function ProductScreen() {
  return (
    <div className="dark flex h-full w-full bg-card text-foreground">
      {/* Trilho de navegação */}
      <div className="flex w-[74px] shrink-0 flex-col items-center pb-5 pt-5">
        <MessageCircle className="h-8 w-8 fill-primary text-primary" />
        <span className="mt-6 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
          <MessageSquare className="h-[22px] w-[22px] fill-primary text-primary" />
        </span>
        <UserRound className="mt-6 h-[22px] w-[22px] text-icon" />
        <ArrowDownToLine className="mt-8 h-[22px] w-[22px] text-icon" />
        <Settings className="mt-auto h-[22px] w-[22px] text-icon" />
        <Avatar name="Maria Antunes" className="mt-6 h-10 w-10 text-[14px]" />
      </div>

      {/* Filtros */}
      <div className="w-[160px] shrink-0 border-l border-border px-3">
        <div className="flex h-[70px] items-center text-[15px] font-semibold">Integra Connect</div>
        <div className="flex h-9 items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg bg-muted px-2.5 text-[11.5px] text-muted-foreground">
          <Search className="h-3.5 w-3.5 text-icon" />
          Buscar conversas…
        </div>
        <ul className="mt-5 flex flex-col items-start gap-3 whitespace-nowrap text-[12.5px]">
          {FILTERS.map((f) => (
            <li
              key={f.label}
              className={cn(
                'flex h-[34px] items-center gap-1.5 rounded-lg px-2.5',
                f.active ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-foreground/85 ring-1 ring-border',
              )}
            >
              {f.label}
              {f.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] leading-[18px]',
                    f.active ? 'bg-black/25 text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  {f.count}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Lista de conversas */}
      <ul className="w-[271px] shrink-0 border-l border-border px-1.5 pt-[66px]">
        {ROWS.map((r) => (
          <li
            key={r.name}
            className={cn('flex h-[67px] items-center gap-3 rounded-xl px-2.5', r.selected && 'bg-secondary')}
          >
            <Avatar name={r.name} className={cn('h-11 w-11 text-[14px]', r.tone)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[15px]">{r.name}</span>
                <span className={cn('shrink-0 text-[12px] tabular-nums', r.unread ? 'text-primary' : 'text-muted-foreground')}>
                  {r.time}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="truncate text-[12.5px] text-muted-foreground">{r.preview}</span>
                {r.waiting && (
                  <span className="shrink-0 rounded-md bg-warning-subtle px-1.5 text-[11px] leading-[18px] text-warning">
                    Aguardando
                  </span>
                )}
                {r.unread && (
                  <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                    {r.unread}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Conversa aberta */}
      <div className="flex min-w-0 flex-1 flex-col border-l border-border">
        <div className="flex h-[88px] shrink-0 items-center gap-3 px-6">
          <Avatar name="Marina Alves" className="h-11 w-11 text-[14px]" />
          <div className="min-w-0 flex-1">
            <div className="text-[17px]">Marina Alves</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Online
            </div>
          </div>
          <span className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-info-subtle px-3 text-[13px] text-info">
            <Megaphone className="h-4 w-4" />
            Anúncio Meta
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
          <EllipsisVertical className="h-5 w-5 text-icon" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pt-4">
          <div className="max-w-[80%] self-start rounded-lg bg-muted px-3.5 py-2.5 text-[15px] leading-[22px]">
            Oi! Vi o anúncio do trilho de LED. Serve pra sala com pé-direito alto?
            <span className="float-right ml-3 mt-1 text-[11px] text-muted-foreground">09:41</span>
          </div>
          <div className="max-w-[80%] self-end rounded-lg bg-[#005c4b] px-3.5 py-2.5 text-[15px] leading-[22px]">
            Oi, Marina! Qual a altura do teto?
            <span className="ml-3 inline-flex items-center gap-0.5 align-bottom text-[11px] text-foreground/60">
              09:41 <CheckCheck className="h-3.5 w-3.5 text-read-receipt" />
            </span>
          </div>
          <div className="self-start rounded-lg bg-muted px-3.5 py-2.5 text-[15px] leading-[22px]">
            Uns 3,5 m
            <span className="ml-4 align-bottom text-[11px] text-muted-foreground">09:42</span>
          </div>

          <div className="mt-2 rounded-2xl bg-muted/50 p-5 ring-1 ring-border animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500 fill-mode-both motion-reduce:animate-none">
            <div className="flex items-center gap-2 text-[15px] font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Lu sugere
            </div>
            <p className="mt-2 text-[14px] leading-[22px]">
              Serve sim! Para 3,5 m indico spots de facho fechado no trilho. Quer que eu monte uma proposta com as medidas da sala?
            </p>
            <div className="mt-4 flex gap-2.5">
              <span className="inline-flex h-10 items-center rounded-full bg-primary px-6 text-[14px] font-medium text-primary-foreground">
                Enviar resposta
              </span>
              <span className="inline-flex h-10 items-center rounded-full border border-border px-6 text-[14px] font-medium text-primary">
                Editar antes
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-[66px] shrink-0 items-center gap-3 px-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground/80">
            <Plus className="h-5 w-5" />
          </span>
          <div className="flex h-11 flex-1 items-center gap-3 rounded-full bg-muted px-4 text-[15px] text-muted-foreground">
            <span className="flex-1">Digite uma mensagem…</span>
            <Smile className="h-5 w-5 text-icon" />
            <Paperclip className="h-5 w-5 text-icon" />
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <SendHorizontal className="h-5 w-5" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden style={{ margin: `0 ${u(16, 8)}` }}>
      ·
    </span>
  );
}

export function AuthShowcase() {
  return (
    <aside aria-hidden className="auth-scene relative isolate hidden overflow-hidden lg:block">
      <div
        className="relative mx-auto flex min-h-screen flex-col"
        style={{ width: u(1037), paddingTop: u(60), paddingBottom: u(46) }}
      >
        <div style={{ marginLeft: u(164) }}>
          <p
            className="font-medium uppercase leading-none tracking-[0.24em] text-foreground/60"
            style={{ fontSize: u(12, 9) }}
          >
            Atendimento
            <Dot />
            Oportunidades
            <Dot />
            Mais vendas
          </p>
          <h2
            className="font-bold leading-[0.94] tracking-[-0.03em] text-foreground"
            style={{ fontSize: u(56, 28), marginTop: u(36, 16) }}
          >
            Atendimento e CRM
            <br />
            no mesmo fluxo.
          </h2>
          <p
            className="hidden text-foreground/80 [text-wrap:pretty] xl:block"
            style={{ fontSize: u(19), lineHeight: u(27), marginTop: u(12), maxWidth: u(530) }}
          >
            Cada conversa do WhatsApp chega com o histórico do cliente, a origem do anúncio e uma resposta sugerida pela Lu.
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center" style={{ paddingTop: u(6), paddingBottom: u(18) }}>
          <div style={{ width: `min(${u(900)}, calc((100vh - ${u(374)}) * ${STAGE_W / STAGE_H}))` }}>
            <LaptopScene>
              <ProductScreen />
            </LaptopScene>
          </div>
        </div>

        <ul
          className="relative grid"
          style={{ marginLeft: u(76), gridTemplateColumns: `${u(279)} ${u(321)} ${u(310)}` }}
        >
          {BENEFITS.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className={cn('flex items-start', i > 0 && 'border-l border-foreground/15')}
              style={{ gap: u(20, 10), paddingLeft: i > 0 ? u(39, 14) : 0 }}
            >
              <Icon className="shrink-0 text-primary" strokeWidth={1.6} style={{ width: u(36, 20), height: u(36, 20) }} />
              <div className="min-w-0">
                <div className="font-semibold text-foreground" style={{ fontSize: u(16, 12) }}>
                  {title}
                </div>
                <div className="hidden whitespace-nowrap text-foreground/60 xl:block" style={{ fontSize: u(14), marginTop: u(4) }}>
                  {text}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
