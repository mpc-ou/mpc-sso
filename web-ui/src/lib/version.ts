export const APP_VERSION = __APP_VERSION__;
export const BUILD_DATE = __BUILD_DATE__;

export function formatBuildDate(locale = 'vi-VN'): string {
  return new Date(BUILD_DATE).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
