import * as argon2 from 'argon2';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHashPromise: Promise<string> | null = null;

/** Runs a fake verify so "user not found" and "wrong password" take ~same time (avoid user enumeration) */
export async function dummyVerify(): Promise<void> {
  dummyHashPromise ??= argon2.hash('dummy-password-for-timing');
  const hash = await dummyHashPromise;
  await verifyPassword(hash, 'not-the-real-password');
}
