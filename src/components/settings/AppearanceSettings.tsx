import React from 'react';
import { Palette, Sun, Moon, Check } from 'lucide-react';
import { SectionBlock } from '@/components/layout';
import { useTheme } from '@/contexts/ThemeProvider';
import { PALETTES } from '@/services/themeConfigService';
import { cn } from '@/lib/utils';

/**
 * Appearance controls (per-user, stored in localStorage via ThemeProvider):
 * a light/dark mode switch and a color-palette picker. Every user can set their
 * own — it's a device UI preference, not an admin-gated company setting.
 */
export const AppearanceSettings: React.FC = () => {
  const { palette, mode, setPalette, setMode } = useTheme();

  return (
    <SectionBlock
      title="Aparência"
      icon={Palette}
      description="Escolha a paleta de cores e o modo claro ou escuro do sistema."
    >
      <div className="rounded-2xl border border-border bg-card p-5 space-y-6">
        {/* Light / dark */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modo</span>
          <div className="inline-flex rounded-lg border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setMode('light')}
              aria-pressed={mode === 'light'}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                mode === 'light' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Sun className="w-4 h-4" /> Claro
            </button>
            <button
              type="button"
              onClick={() => setMode('dark')}
              aria-pressed={mode === 'dark'}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                mode === 'dark' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Moon className="w-4 h-4" /> Escuro
            </button>
          </div>
        </div>

        {/* Palette */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paleta de cores</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PALETTES.map((p) => {
              const selected = p.id === palette;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPalette(p.id)}
                  aria-pressed={selected}
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                    selected ? 'border-primary ring-2 ring-ring/40' : 'border-border hover:border-foreground/30',
                  )}
                >
                  <span className="flex -space-x-1.5 shrink-0">
                    <span className="w-6 h-6 rounded-full border-2 border-card" style={{ background: p.swatch.primary }} />
                    <span className="w-6 h-6 rounded-full border-2 border-card" style={{ background: p.swatch.accent }} />
                  </span>
                  <span className="text-sm font-medium text-foreground flex-1">{p.label}</span>
                  {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </SectionBlock>
  );
};
