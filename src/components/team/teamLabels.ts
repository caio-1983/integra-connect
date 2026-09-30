import type { TeamMember } from '@/types';

/** Same names as the role pill in Configurações. */
export const ROLE_LABEL: Record<TeamMember['role'], string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  agent: 'Atendente',
};

export const STATUS_LABEL: Record<TeamMember['status'], string> = {
  active: 'Ativo',
  invited: 'Pendente',
  disabled: 'Inativo',
};
