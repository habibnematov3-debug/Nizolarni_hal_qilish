import { CabinetType, RegistryStatus } from '@prisma/client';

export interface CabinetResolutionResult {
  cabinetType: CabinetType;
  primaryRole: string;
  roles: string[];
}

const AUTHORITY_ROLES = ['MINISTRY_STAFF', 'REGIONAL_STAFF', 'COMMISSION'];
const SPECIALIST_ROLES = ['MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR', 'MEDIATOR_APPLICANT'];

export function resolveUserCabinetAndRoles(
  userRoles: string[],
  registryStatus: RegistryStatus,
): CabinetResolutionResult {
  const rolesSet = new Set(userRoles);

  if (rolesSet.has('ADMIN')) {
    return { cabinetType: CabinetType.ADMIN, primaryRole: 'ADMIN', roles: [...rolesSet] };
  }

  if (rolesSet.has('OPERATOR')) {
    // Operators use the administrator cabinet shell but keep a distinct role and its restricted permissions.
    return { cabinetType: CabinetType.ADMIN, primaryRole: 'OPERATOR', roles: [...rolesSet] };
  }

  if (AUTHORITY_ROLES.some((role) => rolesSet.has(role))) {
    const primaryRole = AUTHORITY_ROLES.find((role) => rolesSet.has(role))!;
    return { cabinetType: CabinetType.PUBLIC_AUTHORITY, primaryRole, roles: [...rolesSet] };
  }

  const registryRole = {
    [RegistryStatus.MEDIATOR]: 'MEDIATOR',
    [RegistryStatus.ARBITRATION_JUDGE]: 'ARBITRATION_JUDGE',
    [RegistryStatus.ARBITRATOR]: 'ARBITRATOR',
    [RegistryStatus.NONE]: undefined,
  }[registryStatus];
  if (registryRole) rolesSet.add(registryRole);

  if (SPECIALIST_ROLES.some((role) => rolesSet.has(role))) {
    const primaryRole = registryRole || SPECIALIST_ROLES.find((role) => rolesSet.has(role))!;
    return { cabinetType: CabinetType.SPECIALIST, primaryRole, roles: [...rolesSet] };
  }

  // A new OneID/E-IMZO account receives the shared citizen/business cabinet.
  rolesSet.add('TALABGOR');
  return { cabinetType: CabinetType.PARTY, primaryRole: 'TALABGOR', roles: [...rolesSet] };
}
