export const PLATFORM_PHASE: 1 | 2 =
  Number(import.meta.env.VITE_PLATFORM_PHASE) === 2 ? 2 : 1;

const PHASE_MODULES: Record<1 | 2, string[]> = {
  1: ['operacao', 'administracao'],
  2: ['operacao', 'administracao', 'crm', 'ia'],
};

export function isModuleEnabled(moduleId: string): boolean {
  return PHASE_MODULES[PLATFORM_PHASE].includes(moduleId);
}
