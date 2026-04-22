import { useAdminLanguage, useCustomerLanguage } from '../utils/i18n';

const buttonBaseClass = 'px-2.5 py-1 text-xs font-semibold rounded-full transition-colors';

const LanguageToggle = ({ scope, className = '' }) => {
  const { language, setLanguage } = scope === 'admin' ? useAdminLanguage() : useCustomerLanguage();

  return (
    <div className={`inline-flex items-center rounded-full border border-border bg-muted/80 p-1 ${className}`}>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`${buttonBaseClass} ${language === 'en' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('my')}
        className={`${buttonBaseClass} ${language === 'my' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
      >
        မြန်မာ
      </button>
    </div>
  );
};

export default LanguageToggle;
