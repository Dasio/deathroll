import { Input } from "@/components/ui/Input";

export interface RangeSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      <Input
        type="number"
        min={2}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-40 text-center"
      />
    </div>
  );
}
