import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeProvider';
import { cn } from '@/lib/utils';
import { SettingsPanel, SettingsRow } from './SettingsPanel';

/**
 * Appearance controls (per-user, stored in localStorage via ThemeProvider):
 * a light/dark mode switch. Every user can set their own — it's a device UI
 * preference, not an admin-gated company setting.
 */
export const AppearanceSettings: React.FC = () => {
  const { mode, setMode } = useTheme();

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

  return (
    <SettingsPanel title="Aparência">
      <SettingsRow
        icon={mode === 'dark' ? Moon : Sun}
        title="Tema"
        subtitle="Vale só para você, neste navegador."
        trailing={
          <div role="radiogroup" aria-label="Tema" className="flex gap-1 flex-shrink-0">
            {option('light', Sun, 'Claro')}
            {option('dark', Moon, 'Escuro')}
          </div>
        }
      />
    </SettingsPanel>
  );
};
