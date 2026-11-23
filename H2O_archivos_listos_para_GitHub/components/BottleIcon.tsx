// Silueta de botella con el color de cada una (como en los mockups).
export default function BottleIcon({ color, size = 52 }: { color: string; size?: number }) {
  return (
    <svg width={(size * 34) / 52} height={size} viewBox="0 0 34 52" aria-hidden className="shrink-0">
      <rect x="11" y="1" width="12" height="7" rx="2" fill={color} opacity=".55" />
      <path d="M8 12c0-2 2-4 4-4h10c2 0 4 2 4 4l3 6v29a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V18l3-6Z" fill={color} opacity=".18" />
      <path d="M5 30h24v17a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V30Z" fill={color} />
    </svg>
  );
}
