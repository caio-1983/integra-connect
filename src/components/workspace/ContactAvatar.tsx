import React, { useState } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ContactAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  /** Clicking the photo opens it enlarged (only when there is a photo). */
  zoomable?: boolean;
}

/** First letter of the first two words; Array.from keeps emoji/fancy letters whole. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => Array.from(w)[0] ?? '')
    .join('')
    .toUpperCase() || '?';
}

/**
 * Contact photo with a local initials fallback — shown when the contact has no
 * picture (hidden in WhatsApp privacy, or not fetched yet) or the image fails
 * to load. Size and extra styling come from `className`.
 */
export const ContactAvatar: React.FC<ContactAvatarProps> = ({ src, name, className, zoomable }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const showImage = !!src && failedSrc !== src;

  if (!showImage) {
    return (
      <span
        aria-hidden
        className={cn('rounded-full bg-avatar text-avatar-foreground font-medium flex items-center justify-center select-none overflow-hidden', className)}
      >
        {/* Nameless contacts display as a phone number — "+5" isn't initials; show WhatsApp's silhouette. */}
        {/\p{L}/u.test(name)
          ? initials(name)
          : <UserRound className="w-[55%] h-[55%]" strokeWidth={1.75} />}
      </span>
    );
  }

  const image = <img src={src} alt="" onError={() => setFailedSrc(src)} className={cn('rounded-full object-cover', className)} />;
  if (!zoomable) return image;

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        title="Ver foto"
        aria-label={`Ver foto de ${name}`}
        className="flex rounded-full cursor-zoom-in shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {image}
      </button>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
          <DialogTitle className="px-4 py-3 text-sm font-medium truncate pr-10">{name}</DialogTitle>
          <img src={src} alt={`Foto de ${name}`} className="w-full aspect-square object-cover bg-muted" />
        </DialogContent>
      </Dialog>
    </>
  );
};
