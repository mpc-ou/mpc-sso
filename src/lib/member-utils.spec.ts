import {
  computeCurrentDepartment,
  computeClassOf,
  checkIsAlumni,
} from './member-utils';

describe('member-utils', () => {
  describe('computeCurrentDepartment', () => {
    it('should return null when clubRoles is empty or null', () => {
      expect(computeCurrentDepartment(null)).toBeNull();
      expect(computeCurrentDepartment([])).toBeNull();
    });

    it('should return department code with latest startAt', () => {
      const roles = [
        {
          startAt: '2021-05-01T00:00:00.000Z',
          department: { code: 'DESIGN' },
        },
        {
          startAt: '2022-10-01T00:00:00.000Z',
          department: { code: 'PROGRAMMING' },
        },
        {
          startAt: '2020-09-01T00:00:00.000Z',
          department: { code: 'MEDIA' },
        },
      ];

      expect(computeCurrentDepartment(roles)).toBe('PROGRAMMING');
    });

    it('should skip roles without a department and use the latest one that has one', () => {
      const roles = [
        {
          startAt: '2023-01-01T00:00:00.000Z',
          department: null,
        },
        {
          startAt: '2021-05-01T00:00:00.000Z',
          department: { code: 'DESIGN' },
        },
      ];

      expect(computeCurrentDepartment(roles)).toBe('DESIGN');
    });

    it('should return null when no role has a department', () => {
      const roles = [
        {
          startAt: '2023-01-01T00:00:00.000Z',
          department: null,
        },
      ];

      expect(computeCurrentDepartment(roles)).toBeNull();
    });
  });

  describe('computeClassOf', () => {
    it('should return null when clubRoles is empty or null', () => {
      expect(computeClassOf(null)).toBeNull();
      expect(computeClassOf([])).toBeNull();
    });

    it('should prioritize term of the oldest role when term is present', () => {
      const roles = [
        {
          startAt: '2022-10-01T00:00:00.000Z',
          term: 2022,
        },
        {
          startAt: '2020-09-01T00:00:00.000Z',
          term: 2020,
        },
      ];

      expect(computeClassOf(roles)).toBe(2020);
    });

    it('should fallback to year of oldest startAt when term is null', () => {
      const roles = [
        {
          startAt: '2022-10-01T00:00:00.000Z',
          term: null,
        },
        {
          startAt: '2021-05-01T00:00:00.000Z',
          term: null,
        },
      ];

      expect(computeClassOf(roles)).toBe(2021);
    });
  });

  describe('checkIsAlumni', () => {
    it('should return false if no roles or roles have endAt', () => {
      expect(checkIsAlumni(null)).toBe(false);
      expect(
        checkIsAlumni([
          {
            position: 'DEPARTMENT_MEMBER',
            startAt: '2015-01-01T00:00:00.000Z',
            endAt: '2020-01-01T00:00:00.000Z',
          },
        ]),
      ).toBe(false);
    });

    it('should return true if DEPARTMENT_MEMBER with no endAt and > 4 years', () => {
      expect(
        checkIsAlumni([
          {
            position: 'DEPARTMENT_MEMBER',
            startAt: '2018-01-01T00:00:00.000Z',
            endAt: null,
          },
        ]),
      ).toBe(true);
    });
  });
});
