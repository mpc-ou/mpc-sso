import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SimpleSelectOption {
  value: string;
  label: string;
}

export interface SimpleSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SimpleSelectOption[];
  placeholder?: string;
  className?: string;
}

/** Thin adapter over shadcn's compound Select for the common "value + static option list" case. */
export function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: SimpleSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : undefined;

  return (
    <Select value={value} onValueChange={(next) => next !== null && onValueChange(next)}>
      <SelectTrigger className={className ?? 'w-full'}>
        <SelectValue placeholder={placeholder}>{displayLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
