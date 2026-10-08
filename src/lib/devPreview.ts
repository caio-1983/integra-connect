import { useAuth } from '@/hooks/useAuth';

/**
 * Features still in validation, visible only to the developer accounts below
 * (auth.users ids — the repo is public, so no e-mails here). To release a
 * feature to everyone, drop its id from DEV_PREVIEW_FEATURES.
 *
 * This only hides UI: the backend routes behind these features authenticate
 * with the shared gateway key and carry no user identity.
 */
const DEV_PREVIEW_USER_IDS = new Set<string>([
  '0d37d2a5-8295-4949-a7ee-7863565e0eb8', // conta de manutenção (desenvolvedor)
]);

const DEV_PREVIEW_FEATURES = new Set<string>([
  // 'projects' (Projetos luminotécnicos) liberado para todos em 2026-10-08
]);

export function isDevPreviewFeature(feature: string): boolean {
  return DEV_PREVIEW_FEATURES.has(feature);
}

/** Whether the signed-in user sees features still in dev preview. */
export function useIsDevPreviewUser(): boolean {
  const { user } = useAuth();
  return !!user && DEV_PREVIEW_USER_IDS.has(user.id);
}

/** Whether the signed-in user can see `feature` (always true once released). */
export function useFeatureVisible(feature: string): boolean {
  const devUser = useIsDevPreviewUser();
  return !DEV_PREVIEW_FEATURES.has(feature) || devUser;
}
