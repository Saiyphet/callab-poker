import { nameColor } from "../nameColor";

export function PlayerName({ name, empty = "ຍັງບໍ່ມີຊື່" }: { name: string; empty?: string }) {
  const clean = name.trim();
  const color = clean ? nameColor(clean) : undefined;
  return (
    <strong className="player-name" style={color ? { color } : undefined}>
      {clean || empty}
    </strong>
  );
}
