export type ApiStoredError = { kind: 'api'; message: string; i18n?: { vi: string; en: string } | null };
export type KeyStoredError = { kind: 'key'; key: string };
export type StoredError = ApiStoredError | KeyStoredError | null;

export function renderError(
  err: StoredError,
  t: (key: string) => string,
  lang: string,
): string | null {
  if (!err) return null;
  if (err.kind === 'key') return t(err.key);
  if (err.i18n) {
    if (lang.startsWith('en')) return err.i18n.en;
    return err.i18n.vi;
  }
  return err.message;
}
