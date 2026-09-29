import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ContactAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
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
export const ContactAvatar: React.FC<ContactAvatarProps> = ({ src, name, className }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && failedSrc !== src;

  return showImage ? (
    <img src={src} alt="" onError={() => setFailedSrc(src)} className={cn('rounded-full object-cover', className)} />
  ) : (
    <span
      aria-hidden
      className={cn('rounded-full bg-sky-500 text-white font-medium flex items-center justify-center select-none overflow-hidden', className)}
    >
      {initials(name)}
    </span>
  );
};
