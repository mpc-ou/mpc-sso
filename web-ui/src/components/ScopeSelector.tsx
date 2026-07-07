import { Input } from '@/components/ui/input';

const STANDARD_SCOPES = ['openid', 'profile', 'email'] as const;

export interface ScopeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

/** Checkbox picker for the standard OIDC scopes + free-text field for anything custom, instead of a raw text input. */
export function ScopeSelector({ value, onChange }: ScopeSelectorProps) {
  const tokens = value.split(' ').filter(Boolean);
  const standardSelected = new Set(
    tokens.filter((t) => (STANDARD_SCOPES as readonly string[]).includes(t)),
  );
  standardSelected.add('openid'); // always required by /authorize — checkbox stays checked+disabled
  const customText = tokens
    .filter((t) => !(STANDARD_SCOPES as readonly string[]).includes(t))
    .join(' ');

  const compose = (standard: Set<string>, custom: string) => {
    const customTokens = custom.split(' ').filter(Boolean);
    onChange([...standard, ...customTokens].join(' '));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4">
        {STANDARD_SCOPES.map((scope) => (
          <label key={scope} className="flex items-center gap-1.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={standardSelected.has(scope)}
              disabled={scope === 'openid'}
              onChange={(e) => {
                const next = new Set(standardSelected);
                if (e.target.checked) next.add(scope);
                else next.delete(scope);
                compose(next, customText);
              }}
              className="h-4 w-4 rounded border-slate-300 disabled:opacity-60"
            />
            {scope}
            {scope === 'openid' && <span className="text-xs text-slate-400">(bắt buộc)</span>}
          </label>
        ))}
      </div>
      <Input
        placeholder="Scope tuỳ chỉnh khác, cách nhau bằng dấu cách (vd: admin.read)"
        value={customText}
        onChange={(e) => compose(standardSelected, e.target.value)}
      />
    </div>
  );
}
