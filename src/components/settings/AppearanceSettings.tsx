import React from 'react';
import { Sun, Moon, Palette, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeProvider';
import { PALETTES, type PaletteMeta } from '@/services/themeConfigService';
import { cn } from '@/lib/utils';
import { SettingsPanel, SettingsRow } from './SettingsPanel';

/** Neutrals shared by every palette — the swatch only varies the brand color. */
const SWATCH_NEUTRALS = {
  light: { wall: '#efeae2', in: '#ffffff', line: '#e9edef' },
  dark: { wall: '#0b141a', in: '#202c33', line: '#222d34' },
};

/**
 * One palette as a thumbnail of the chat it produces: a received bubble, a
 * sent bubble in the palette's tint and a send button in its brand color,
 * drawn in the user's current mode.
 */
const PaletteSwatch: React.FC<{ palette: PaletteMeta; mode: 'light' | 'dark'; selected: boolean; onSelect: () => void }> = ({
  palette, mode, selected, onSelect,
}) => {
  const n = SWATCH_NEUTRALS[mode];
  const primary = mode === 'dark' ? palette.dark.primary : palette.light.primary;
  const out = mode === 'dark' ? palette.dark.out : palette.light.out;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'group flex flex-col gap-2 rounded-lg p-1.5 text-left transition-colors focus-visible:ring-offset-0',
        selected ? 'bg-secondary' : 'hover:bg-accent',
      )}
    >
      <span
        className="relative flex h-[68px] flex-col justify-center gap-1.5 overflow-hidden rounded-md px-2.5"
        style={{ backgroundColor: n.wall, boxShadow: `inset 0 0 0 ${selected ? 2 : 1}px ${selected ? primary : n.line}` }}
        aria-hidden="true"
      >
        <span className="h-3 w-3/5 rounded-[4px]" style={{ backgroundColor: n.in }} />
        <span className="h-3 w-1/2 self-end rounded-[4px]" style={{ backgroundColor: out }} />
        <span className="absolute bottom-1.5 left-2.5 h-1 w-6 rounded-full" style={{ backgroundColor: primary }} />
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: primary }}>
            <Check className="h-3 w-3" strokeWidth={3} style={{ color: mode === 'dark' ? '#111b21' : '#ffffff' }} />
          </span>
        )}
      </span>
      <span className={cn('px-0.5 text-[13px] leading-4', selected ? 'font-medium text-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
        {palette.label}
      </span>
    </button>
  );
};

/**
 * Appearance controls, per user (saved on their account, see ThemeProvider):
 * light/dark mode and the brand palette used across the whole system.
 */
export const AppearanceSettings: React.FC = () => {
  const { mode, setMode, palette, setPalette } = useTheme();

  const option = (value: 'light' | 'dark', Icon: React.ElementType, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === value}
      onClick={() => setMode(value)}
      className={cn(
        'flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium transition-colors',
        mode === value
          ? 'bg-primary-subtle text-primary-subtle-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon className="w-4 h-4" aria-hidden="true" /> {label}
    </button>
  );

  const group = (id: PaletteMeta['group'], title: string) => (
    <div>
      <p id={`palettes-${id}`} className="mb-2 text-sm text-muted-foreground">{title}</p>
      <div role="radiogroup" aria-labelledby={`palettes-${id}`} className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-1">
        {PALETTES.filter((p) => p.group === id).map((p) => (
          <PaletteSwatch key={p.id} palette={p} mode={mode} selected={palette === p.id} onSelect={() => setPalette(p.id)} />
        ))}
      </div>
    </div>
  );

  const current = PALETTES.find((p) => p.id === palette);

  return (
    <SettingsPanel title="Aparência">
      <SettingsRow
        icon={mode === 'dark' ? Moon : Sun}
        title="Tema"
        subtitle="Vale só para você, em qualquer computador."
        trailing={
          <div role="radiogroup" aria-label="Tema" className="flex gap-1 flex-shrink-0">
            {option('light', Sun, 'Claro')}
            {option('dark', Moon, 'Escuro')}
          </div>
        }
      />
      <div className="border-t border-border">
        <SettingsRow
          icon={Palette}
          title="Paleta de cores"
          subtitle={<>Cor de destaque do sistema inteiro: menu, botões, abas, gráficos e balão enviado. Cores de alerta não mudam. Em uso: <span className="text-foreground">{current?.label}</span>.</>}
        />
        <div className="space-y-5 pb-5 pl-6 sm:pl-[64px] pr-6">
          {group('atual', 'Paletas')}
          {group('julho', 'Paletas de julho, com contraste ajustado')}
        </div>
      </div>
    </SettingsPanel>
  );
};
