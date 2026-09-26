// appointments.type is stored in English; this is what the user sees.
const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  demo: 'Demo',
  meeting: 'Reunião',
  support: 'Suporte',
  followup: 'Follow-up',
};

export const appointmentTypeLabel = (type: string): string => APPOINTMENT_TYPE_LABEL[type] ?? type;
