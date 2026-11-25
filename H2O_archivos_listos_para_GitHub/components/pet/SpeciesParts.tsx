// Rasgos propios de cada especie, dibujados sobre el esqueleto común (lib/pets/skeleton.ts).
// Ilustraciones originales de H2O: formas simples, redondeadas y expresivas.
import type { ReactNode } from "react";
import type { Palette } from "@/lib/pets/species";
import { SK } from "@/lib/pets/skeleton";

export type Parts = {
  back?: ReactNode; // detrás de todo (colas, caparazón)
  earsBack?: ReactNode; // detrás de la cabeza
  headOverlay?: ReactNode; // sobre la cabeza, bajo la cara (manchas, mejillas)
  muzzle?: ReactNode; // hocico / pico (sobre la cara)
  belly?: ReactNode; // panza
  top?: ReactNode; // sobre la cabeza cuando no hay gorro (ej. naranja de la capibara)
  armColor?: string;
  footColor?: string;
  mouth: "smile" | "beak" | "cat" | "none"; // cómo se dibuja la boca
  whiskers?: boolean;
};

const { head: H, body: B } = SK;

export function speciesParts(id: string, p: Palette): Parts {
  switch (id) {
    case "capibara":
      return {
        earsBack: (
          <>
            <ellipse cx={58} cy={46} rx={11} ry={9} fill={p.accent} />
            <ellipse cx={142} cy={46} rx={11} ry={9} fill={p.accent} />
          </>
        ),
        muzzle: (
          <>
            <rect x={70} y={92} width={60} height={30} rx={15} fill={p.belly} />
            <ellipse cx={90} cy={100} rx={3} ry={4} fill={p.dark} />
            <ellipse cx={110} cy={100} rx={3} ry={4} fill={p.dark} />
            <path d="M93 112 Q100 117 107 112" stroke={p.dark} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          </>
        ),
        top: (
          <g>
            <circle cx={100} cy={30} r={11} fill="#fb923c" />
            <path d="M100 19 q4 -6 9 -4 q-3 5 -9 4" fill="#4ade80" />
          </g>
        ),
        mouth: "none",
      };
    case "ajolote":
      return {
        earsBack: (
          <>
            {[-1, 1].map((s) => (
              <g key={s} fill={p.accent}>
                {[0, 1, 2].map((i) => (
                  <ellipse key={i} cx={100 + s * (50 + (i === 1 ? 6 : 2))} cy={58 + i * 17} rx={15} ry={5.5} transform={`rotate(${s * (-32 + i * 32)} ${100 + s * (50 + (i === 1 ? 6 : 2))} ${58 + i * 17})`} />
                ))}
              </g>
            ))}
          </>
        ),
        back: <path d="M136 186 q40 -4 44 -34 q-22 10 -42 16 z" fill={p.accent} opacity={0.8} />,
        belly: <ellipse cx={B.cx} cy={B.cy + 6} rx={26} ry={24} fill={p.belly} />,
        mouth: "smile",
      };
    case "rana":
      return {
        earsBack: (
          <>
            {[-1, 1].map((s) => (
              <g key={s}>
                <circle cx={100 + s * 26} cy={44} r={20} fill={p.body} />
                <circle cx={100 + s * 26} cy={44} r={13} fill="#ffffff" />
              </g>
            ))}
          </>
        ),
        belly: <ellipse cx={B.cx} cy={B.cy + 6} rx={30} ry={26} fill={p.belly} />,
        headOverlay: (
          <>
            <circle cx={78} cy={68} r={3} fill={p.accent} opacity={0.6} />
            <circle cx={128} cy={62} r={4} fill={p.accent} opacity={0.6} />
          </>
        ),
        mouth: "smile",
      };
    case "pinguino":
      return {
        headOverlay: <path d="M60 92 Q62 52 100 54 Q138 52 140 92 Q140 128 100 130 Q60 128 60 92 Z" fill={p.belly} />,
        belly: <ellipse cx={B.cx} cy={B.cy + 4} rx={30} ry={32} fill={p.belly} />,
        muzzle: <path d="M90 100 L110 100 L100 112 Z" fill={p.accent} stroke={p.dark} strokeWidth={0.8} strokeLinejoin="round" />,
        footColor: p.accent,
        mouth: "none",
      };
    case "nutria":
      return {
        earsBack: (
          <>
            <circle cx={56} cy={56} r={10} fill={p.accent} />
            <circle cx={144} cy={56} r={10} fill={p.accent} />
          </>
        ),
        back: <path d="M128 192 q46 2 50 -26 q-6 -8 -16 -2 q-6 16 -36 16 z" fill={p.accent} />,
        muzzle: (
          <>
            <ellipse cx={100} cy={106} rx={24} ry={15} fill={p.belly} />
            <ellipse cx={100} cy={99} rx={6} ry={4} fill={p.dark} />
          </>
        ),
        belly: <ellipse cx={B.cx} cy={B.cy + 4} rx={28} ry={26} fill={p.belly} />,
        whiskers: true,
        mouth: "cat",
      };
    case "gato":
      return {
        earsBack: (
          <>
            {[-1, 1].map((s) => (
              <g key={s}>
                <path d={`M${100 + s * 52} 64 L${100 + s * 40} 20 L${100 + s * 16} 44 Z`} fill={p.body} stroke={p.body} strokeWidth={6} strokeLinejoin="round" />
                <path d={`M${100 + s * 43} 54 L${100 + s * 38} 30 L${100 + s * 24} 44 Z`} fill={p.accent} />
              </g>
            ))}
          </>
        ),
        back: <path d="M134 188 q36 6 36 -26 q0 -14 -10 -18 q-6 4 0 12 q4 20 -26 22 z" fill={p.body} stroke={p.dark} strokeWidth={0.5} />,
        headOverlay: (
          <>
            <path d="M92 40 q8 6 16 0" stroke={p.dark} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.45} />
            <path d="M88 50 q12 6 24 0" stroke={p.dark} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.35} />
          </>
        ),
        muzzle: <path d="M95 99 L105 99 L100 105 Z" fill={p.accent} />,
        belly: <ellipse cx={B.cx} cy={B.cy + 6} rx={24} ry={24} fill={p.belly} />,
        whiskers: true,
        mouth: "cat",
      };
    case "perro":
      return {
        earsBack: (
          <>
            <ellipse cx={50} cy={84} rx={15} ry={30} fill={p.accent} transform="rotate(18 50 84)" />
            <ellipse cx={150} cy={84} rx={15} ry={30} fill={p.accent} transform="rotate(-18 150 84)" />
          </>
        ),
        headOverlay: <ellipse cx={124} cy={76} rx={14} ry={12} fill={p.accent} opacity={0.35} />,
        muzzle: (
          <>
            <ellipse cx={100} cy={106} rx={22} ry={15} fill={p.belly} />
            <ellipse cx={100} cy={98} rx={8} ry={5.5} fill={p.dark} />
          </>
        ),
        belly: <ellipse cx={B.cx} cy={B.cy + 6} rx={26} ry={24} fill={p.belly} />,
        back: <path d="M136 168 q24 -10 22 -32 q-10 2 -10 12 q-2 10 -16 12 z" fill={p.body} />,
        mouth: "cat",
      };
    case "zorro":
      return {
        earsBack: (
          <>
            {[-1, 1].map((s) => (
              <g key={s}>
                <path d={`M${100 + s * 54} 70 L${100 + s * 46} 12 L${100 + s * 14} 46 Z`} fill={p.body} stroke={p.body} strokeWidth={5} strokeLinejoin="round" />
                <path d={`M${100 + s * 47} 22 L${100 + s * 44} 14 L${100 + s * 32} 28 Z`} fill={p.accent} />
              </g>
            ))}
          </>
        ),
        back: (
          <g>
            <path d="M132 190 q52 4 46 -44 q-14 0 -18 14 q-4 22 -30 24 z" fill={p.body} />
            <path d="M170 152 q10 -4 8 -10 q-10 0 -14 6 z" fill={p.belly} />
          </g>
        ),
        headOverlay: <path d="M48 92 Q70 96 86 124 Q60 122 48 92 Z M152 92 Q130 96 114 124 Q140 122 152 92 Z" fill={p.belly} />,
        muzzle: <ellipse cx={100} cy={100} rx={6} ry={4.5} fill={p.dark} />,
        belly: <ellipse cx={B.cx} cy={B.cy + 6} rx={26} ry={26} fill={p.belly} />,
        mouth: "cat",
      };
    case "panda":
      return {
        earsBack: (
          <>
            <circle cx={58} cy={42} r={16} fill={p.accent} />
            <circle cx={142} cy={42} r={16} fill={p.accent} />
          </>
        ),
        headOverlay: (
          <>
            <ellipse cx={79} cy={90} rx={14} ry={17} fill={p.accent} transform="rotate(-20 79 90)" />
            <ellipse cx={121} cy={90} rx={14} ry={17} fill={p.accent} transform="rotate(20 121 90)" />
          </>
        ),
        muzzle: <ellipse cx={100} cy={103} rx={7} ry={5} fill={p.dark} />,
        armColor: p.accent,
        footColor: p.accent,
        mouth: "cat",
      };
    case "pato":
      return {
        top: <path d="M96 36 q2 -14 10 -12 q-2 6 -4 12 q6 -8 12 -6 q-6 6 -12 8 z" fill={p.body} />,
        muzzle: (
          <>
            <ellipse cx={100} cy={106} rx={22} ry={10} fill={p.accent} />
            <path d="M80 106 Q100 110 120 106" stroke={p.dark} strokeWidth={1.4} fill="none" opacity={0.5} />
          </>
        ),
        belly: <ellipse cx={B.cx} cy={B.cy + 6} rx={28} ry={26} fill={p.belly} />,
        footColor: p.accent,
        mouth: "none",
      };
    case "tortuga":
      return {
        back: (
          <g>
            <ellipse cx={B.cx} cy={B.cy - 2} rx={B.rx + 14} ry={B.ry + 8} fill={p.accent} />
            {[[-24, -14], [24, -14], [0, -24], [-30, 10], [30, 10], [0, 24]].map(([x, y], i) => (
              <circle key={i} cx={B.cx + x} cy={B.cy + y} r={9} fill={p.dark} opacity={0.35} />
            ))}
          </g>
        ),
        belly: (
          <g>
            <ellipse cx={B.cx} cy={B.cy + 4} rx={28} ry={28} fill={p.belly} />
            <path d={`M${B.cx - 26} ${B.cy} H${B.cx + 26} M${B.cx - 22} ${B.cy + 14} H${B.cx + 22} M${B.cx} ${B.cy - 22} V${B.cy + 30}`} stroke={p.dark} strokeWidth={1.4} opacity={0.25} />
          </g>
        ),
        mouth: "smile",
      };
    case "conejo":
      return {
        earsBack: (
          <>
            {[-1, 1].map((s) => (
              <g key={s} transform={`rotate(${s * 10} ${100 + s * 22} 40)`}>
                <ellipse cx={100 + s * 22} cy={10} rx={13} ry={36} fill={p.body} stroke={p.dark} strokeWidth={0.6} />
                <ellipse cx={100 + s * 22} cy={12} rx={6.5} ry={26} fill={p.accent} />
              </g>
            ))}
          </>
        ),
        back: <circle cx={140} cy={182} r={12} fill="#ffffff" stroke={p.dark} strokeWidth={0.6} />,
        muzzle: (
          <>
            <path d="M95 99 L105 99 L100 104 Z" fill={p.accent} />
            <rect x={95} y={110} width={10} height={9} rx={2} fill="#ffffff" stroke={p.dark} strokeWidth={0.8} />
            <line x1={100} y1={110} x2={100} y2={119} stroke={p.dark} strokeWidth={0.8} />
          </>
        ),
        belly: <ellipse cx={B.cx} cy={B.cy + 6} rx={24} ry={24} fill={p.belly} />,
        whiskers: true,
        mouth: "cat",
      };
    default:
      return { mouth: "smile" };
  }
}

export { H as HEAD };
