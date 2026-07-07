import type { User } from '@prisma/client';

export function getFullName(user: User): string {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(' ');
  }
  return user.username;
}

export function stripPassword<T extends { password?: string | null }>(
  user: T,
): Omit<T, 'password'> {
  const { password: _password, ...safe } = user;
  return safe;
}
