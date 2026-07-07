import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi';

  const toggle = () => {
    const next = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(next);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="absolute top-4 right-4 z-10"
      type="button"
    >
      {currentLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
    </Button>
  );
}
