import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Lightweight, dependency-free emoji picker for the message composer. Curated
 * categories rendered as a tabbed grid — no keyword search (would need per-emoji
 * metadata) and no skin-tone/ZWJ sequences (kept to widely-rendering glyphs).
 * The picker closes on select and returns focus to the textarea (composer wires
 * `onCloseAutoFocus` prevention + a caret restore), so the operator can keep typing.
 */

interface EmojiCategory {
  id: string;
  icon: string;
  label: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys', icon: '😀', label: 'Rostos',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡'],
  },
  {
    id: 'gestures', icon: '👍', label: 'Gestos',
    emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄','💋'],
  },
  {
    id: 'hearts', icon: '❤️', label: 'Corações',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💯','💢','💥','💫','💦','💨','💬','🗨️','💭','🔥','⭐','🌟','✨','⚡','🎉','🎊'],
  },
  {
    id: 'animals', icon: '🐶', label: 'Animais',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐢','🐍','🐙','🦑','🦐','🦀','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐘','🐫','🦒','🐄','🐎','🌸','🌺','🌻','🌹','🌷','🌼','🌿','🍀','🍁','🍂','🌵','🌲','🌳','🌴'],
  },
  {
    id: 'food', icon: '🍔', label: 'Comida',
    emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🍞','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥗','🍜','🍝','🍲','🍣','🍱','🍙','🍚','🍛','🍦','🍰','🎂','🍫','🍬','🍭','🍩','🍪','☕','🍵','🍺','🍻','🥂','🍷','🥃','🍹','🧉','🥤'],
  },
  {
    id: 'activities', icon: '⚽', label: 'Atividades',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🥅','🏒','🏑','🏏','⛳','🏹','🎣','🥊','🥋','🎽','⛸️','🥌','🎿','⛷️','🏂','🏋️','🤸','⛹️','🤾','🏌️','🏇','🧘','🏄','🏊','🚣','🧗','🚴','🚵','🏆','🥇','🥈','🥉','🏅','🎖️','🎫','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🎲','♟️','🎯','🎳','🎮','🧩'],
  },
  {
    id: 'objects', icon: '💡', label: 'Objetos',
    emojis: ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🕹️','💽','💾','📀','📷','📸','📹','🎥','📞','☎️','📠','📺','📻','⏰','⏱️','⌛','⏳','🔋','🔌','💡','🔦','🕯️','🧯','💸','💵','💴','💶','💷','💰','💳','💎','⚖️','🔧','🔨','🛠️','🔩','⚙️','🧲','💊','💉','🩹','🩺','🔬','🔭','📡','📚','📖','📝','✏️','🖊️','🖌️','📌','📎','✂️','🔒','🔑','🗝️','🛎️','🎁','🎈','🎀'],
  },
  {
    id: 'symbols', icon: '🔣', label: 'Símbolos',
    emojis: ['✅','❌','❎','✔️','☑️','⭕','🚫','⛔','❓','❔','❗','❕','‼️','⁉️','⚠️','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','⬛','⬜','🔈','🔉','🔊','🔇','📣','📢','🔔','🔕','➕','➖','➗','✖️','♾️','💲','©️','®️','™️','🔟','🔢','#️⃣','*️⃣','⬆️','⬇️','⬅️','➡️','↔️','↕️','🔄','🔃','🆗','🆕','🆒','🆓','🆙','✳️','❇️'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  /** Extra classes for the trigger button, to match the composer's icon row. */
  triggerClassName?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, triggerClassName }) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);

  const category = EMOJI_CATEGORIES.find(c => c.id === activeCategory) ?? EMOJI_CATEGORIES[0];

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Inserir emoji"
          title="Emoji"
          className={cn(
            'p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            open && 'text-primary bg-muted',
            triggerClassName,
          )}
        >
          <Smile className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        // Let the composer's caret-restore win instead of Radix refocusing the trigger.
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-[320px] p-0 overflow-hidden"
      >
        {/* Category tabs */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border">
          {EMOJI_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              aria-label={cat.label}
              title={cat.label}
              className={cn(
                'flex-1 flex items-center justify-center h-8 rounded-md text-lg transition-colors',
                cat.id === activeCategory ? 'bg-muted' : 'hover:bg-muted/60 opacity-70 hover:opacity-100',
              )}
            >
              {cat.icon}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="px-2 py-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-1.5">
            {category.label}
          </p>
          <div className="grid grid-cols-8 gap-0.5 max-h-52 overflow-y-auto custom-scrollbar">
            {category.emojis.map((emoji, i) => (
              <button
                key={`${category.id}-${i}`}
                type="button"
                onClick={() => handleSelect(emoji)}
                aria-label={emoji}
                className="flex items-center justify-center h-9 rounded-md text-xl hover:bg-muted transition-colors active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
