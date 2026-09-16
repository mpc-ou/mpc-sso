export interface DepartmentItem {
  id?: string;
  name?: string;
  code?: string | null;
}

export interface ClubRoleCalculationItem {
  position?: string;
  term?: number | null;
  startAt: Date | string;
  endAt?: Date | string | null;
  department?: DepartmentItem | null;
}

/**
 * Returns the department code of the user's latest club role that has a department
 * (sorted by startAt descending). Roles without a department (e.g. club-wide leadership
 * positions like PRESIDENT/VICE_PRESIDENT) are ignored when determining the current department.
 * E.g., 'PROGRAMMING'
 */
export function computeCurrentDepartment(
  clubRoles?: ClubRoleCalculationItem[] | null,
): string | null {
  if (!clubRoles || clubRoles.length === 0) return null;

  const withDepartment = clubRoles.filter((role) => role.department?.code);
  if (withDepartment.length === 0) return null;

  const sorted = [...withDepartment].sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
  );

  return sorted[0]?.department?.code ?? null;
}

/**
 * Computes classOf (year, e.g. 2021) based on club roles:
 * Priority 1: `term` of the oldest club role (sorted by startAt ascending)
 * Priority 2: year of `startAt` of the oldest club role
 */
export function computeClassOf(
  clubRoles?: ClubRoleCalculationItem[] | null,
): number | null {
  if (!clubRoles || clubRoles.length === 0) return null;

  const sorted = [...clubRoles].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  const oldest = sorted[0];
  if (!oldest) return null;

  if (oldest.term != null && !Number.isNaN(Number(oldest.term))) {
    return Number(oldest.term);
  }

  const date = new Date(oldest.startAt);
  const year = date.getFullYear();
  return Number.isNaN(year) ? null : year;
}

/**
 * Checks if a member is considered alumni (DEPARTMENT_MEMBER with no endAt and startAt > 4 years ago)
 */
export function checkIsAlumni(
  clubRoles?: ClubRoleCalculationItem[] | null,
): boolean {
  if (!clubRoles) return false;
  const fourYearsInMs = 4 * 365.25 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return clubRoles.some((role) => {
    if (role.position !== 'DEPARTMENT_MEMBER') return false;
    if (role.endAt) return false;
    const start = new Date(role.startAt).getTime();
    return now - start > fourYearsInMs;
  });
}

export function computeIsLeave(
  clubRoles?: ClubRoleCalculationItem[] | null,
): boolean {
  if (!clubRoles || clubRoles.length === 0) return false;
  return clubRoles.some(
    (role) =>
      (role.position === 'DEPARTMENT_MEMBER' ||
        role.position === 'COLLABORATOR') &&
      role.endAt != null,
  );
}
