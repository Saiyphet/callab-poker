const storageKey = "collab-name-colors";

type SavedColors = {
  next: number;
  byName: Record<string, number>;
};

function nameKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function load(): SavedColors {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "") as SavedColors;
    if (typeof parsed.next === "number" && parsed.byName && typeof parsed.byName === "object") return parsed;
  } catch {
    // Start a new palette the first time this browser shows a name.
  }
  return { next: 0, byName: {} };
}

function save(colors: SavedColors) {
  localStorage.setItem(storageKey, JSON.stringify(colors));
}

export function nameColor(name: string): string | undefined {
  const key = nameKey(name);
  if (!key) return undefined;
  const colors = load();
  let index = colors.byName[key];
  if (index == null) {
    index = colors.next;
    const taken = new Set(Object.values(colors.byName));
    while (taken.has(index)) index += 1;
    colors.byName[key] = index;
    colors.next = index + 1;
    save(colors);
  }
  const hue = Math.round((index * 137.508) % 360);
  const light = 62 + (index % 3) * 7;
  return `hsl(${hue} 78% ${light}%)`;
}
