export type RoleCode = 'admin' | 'therapist' | 'patient';

export const ROLE_DISPLAY: Record<RoleCode, string> = {
  admin: 'Administrador',
  therapist: 'Terapeuta',
  patient: 'Paciente',
};
