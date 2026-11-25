// Ícono de la app: gota con carita (para ImageResponse)
export function IconArt({ size, pad = 0 }: { size: number; pad?: number }) {
  const inner = size - pad * 2;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #4aa3ff 0%, #1f78ee 60%, #1c2b4a 100%)" }}>
      <svg width={inner * 0.72} height={inner * 0.72} viewBox="0 0 24 24">
        <path d="M12 1.8C8.6 6.8 4.6 10.6 4.6 15a7.4 7.4 0 0 0 14.8 0C19.4 10.6 15.4 6.8 12 1.8Z" fill="#ffffff" />
        <circle cx="9.4" cy="14.2" r="1.05" fill="#1c2b4a" />
        <circle cx="14.6" cy="14.2" r="1.05" fill="#1c2b4a" />
        <path d="M10 16.8q2 1.6 4 0" stroke="#1c2b4a" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        <ellipse cx="7.8" cy="16" rx="1" ry="0.6" fill="#fb7185" opacity="0.5" />
        <ellipse cx="16.2" cy="16" rx="1" ry="0.6" fill="#fb7185" opacity="0.5" />
      </svg>
    </div>
  );
}
