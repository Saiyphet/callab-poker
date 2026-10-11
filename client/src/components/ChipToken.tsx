import { DENOM_META } from "../chips";

export function ChipToken({ value, size = 42 }: { value: number; size?: number }) {
  const meta = DENOM_META[value] ?? DENOM_META[1];
  return (
    <span
      className="chip"
      style={{ width: size, height: size, backgroundColor: meta.color, color: meta.ink, fontSize: size < 36 ? 9 : 11 }}
      aria-hidden="true"
    >
      <span>{meta.label}</span>
    </span>
  );
}

export function ChipRow({ values, size = 42 }: { values: number[]; size?: number }) {
  if (values.length === 0) return <span className="chip-empty">ຍັງບໍ່ມີຊິບ</span>;
  return (
    <span className="chip-row">
      {values.map((value, index) => (
        <ChipToken key={`${value}-${index}`} value={value} size={size} />
      ))}
    </span>
  );
}
