// Ropa de la tienda dibujada sobre el esqueleto común (lib/pets/skeleton.ts).
// Cada prenda usa sus colores del catálogo; algunas tienen forma propia.
import type { ReactNode } from "react";
import { ITEMS_BY_ID } from "@/lib/game/catalog";
import { SK, SPECIES_OFFSETS } from "@/lib/pets/skeleton";

const B = SK.body;
const st = (c: string, w = 1.2) => ({ stroke: c, strokeWidth: w, strokeLinejoin: "round" as const });

/** Torso: forma base que siguen poleras, chaquetas y disfraces */
const torso = (inset = 0, top = 128) =>
  `M${B.cx - B.rx + 4 + inset} ${top + 14} Q${B.cx} ${top - 4} ${B.cx + B.rx - 4 - inset} ${top + 14}
   L${B.cx + B.rx - 2 - inset} ${B.cy + 14} Q${B.cx} ${B.cy + 30} ${B.cx - B.rx + 2 + inset} ${B.cy + 14} Z`;

export function Clothing({ itemId, slot, species }: { itemId: string; slot: string; species: string }): ReactNode {
  const it = ITEMS_BY_ID[itemId];
  if (!it) return null;
  const [c1, c2, c3 = c2] = it.colors;
  const lift = SPECIES_OFFSETS[species]?.hatLift ?? 0;

  switch (slot) {
    case "pants":
      return (
        <g data-slot="pants">
          <path
            d={`M${B.cx - B.rx + 6} ${B.cy + 6} H${B.cx + B.rx - 6} L${B.cx + 34} ${B.cy + 36} H${B.cx + 6} L${B.cx} ${B.cy + 24} L${B.cx - 6} ${B.cy + 36} H${B.cx - 34} Z`}
            fill={c1} {...st(c2)}
          />
          {itemId === "pantalon-balde" && <ellipse cx={B.cx} cy={B.cy + 30} rx={50} ry={10} fill={c1} {...st(c2)} />}
          {itemId === "short-splash" && [-18, 0, 18].map((x) => <circle key={x} cx={B.cx + x} cy={B.cy + 16} r={3.5} fill={c2} />)}
          {itemId === "buzo-gotafit" && <path d={`M${B.cx - 32} ${B.cy + 10} V${B.cy + 34} M${B.cx + 32} ${B.cy + 10} V${B.cy + 34}`} {...st(c2, 3)} />}
          <rect x={B.cx - B.rx + 6} y={B.cy + 4} width={(B.rx - 6) * 2} height={6} rx={3} fill={c2} />
        </g>
      );
    case "top": {
      const hoodie = itemId === "poleron-ola";
      return (
        <g data-slot="top">
          {hoodie && <path d={`M${B.cx - 30} 130 Q${B.cx} 112 ${B.cx + 30} 130`} fill={c3} />}
          <path d={torso(0)} fill={c1} {...st(c2)} />
          {itemId === "polera-glu" && <path d={`M${B.cx} 146 q-8 10 0 16 q8 -6 0 -16`} fill={c2} />}
          {itemId === "polera-gotafit" && <path d={`M${B.cx - 30} 150 L${B.cx + 30} 150`} {...st(c2, 5)} />}
          {itemId === "polera-drynt" && (
            <text x={B.cx} y={162} textAnchor="middle" fontSize={11} fontWeight={800} fill={c2}>SECO</text>
          )}
          {hoodie && (
            <>
              <path d={`M${B.cx - 36} 168 Q${B.cx} 180 ${B.cx + 36} 168`} {...st(c3, 3)} fill="none" />
              <path d={`M${B.cx - 6} 136 v14 M${B.cx + 6} 136 v14`} {...st(c2, 2)} />
            </>
          )}
          {itemId === "camisa-marea" && (
            <>
              {[148, 160, 172].map((y) => <path key={y} d={`M${B.cx - 34} ${y} H${B.cx + 34}`} {...st(c2, 3)} />)}
              <path d={`M${B.cx - 10} 128 L${B.cx} 140 L${B.cx + 10} 128`} fill={c3} />
            </>
          )}
        </g>
      );
    }
    case "jacket":
      return (
        <g data-slot="jacket">
          <path d={`M${B.cx - B.rx} 142 Q${B.cx - B.rx + 4} 126 ${B.cx - 8} 126 L${B.cx - 4} ${B.cy + 26} Q${B.cx - B.rx} ${B.cy + 22} ${B.cx - B.rx - 2} ${B.cy + 10} Z`} fill={c1} {...st(c2)} />
          <path d={`M${B.cx + B.rx} 142 Q${B.cx + B.rx - 4} 126 ${B.cx + 8} 126 L${B.cx + 4} ${B.cy + 26} Q${B.cx + B.rx} ${B.cy + 22} ${B.cx + B.rx + 2} ${B.cy + 10} Z`} fill={c1} {...st(c2)} />
          {itemId === "blazer-goutte" && (
            <>
              <path d={`M${B.cx - 8} 126 L${B.cx - 18} 150 L${B.cx - 6} 146 Z M${B.cx + 8} 126 L${B.cx + 18} 150 L${B.cx + 6} 146 Z`} fill={c2} />
              <circle cx={B.cx - 10} cy={170} r={2.5} fill={c3} />
            </>
          )}
          {itemId === "parka-charco" && <path d={`M${B.cx - 40} 134 Q${B.cx} 116 ${B.cx + 40} 134`} {...st(c3, 7)} fill="none" strokeLinecap="round" />}
          {itemId === "impermeable-charco" && [150, 166].map((y) => <circle key={y} cx={B.cx - 12} cy={y} r={2.5} fill={c2} />)}
          {itemId === "chaqueta-balde" && <path d={`M${B.cx - 46} 158 H${B.cx - 8} M${B.cx + 8} 158 H${B.cx + 46}`} {...st(c2, 4)} />}
        </g>
      );
    case "shoes":
      return (
        <g data-slot="shoes">
          {[-1, 1].map((s) => {
            const x = B.cx + s * SK.feet.dx;
            const big = itemId === "zapas-balde";
            return (
              <g key={s}>
                {itemId === "botas-charco" && <rect x={x - 11} y={SK.feet.y - 18} width={22} height={18} rx={5} fill={c1} {...st(c2)} />}
                <ellipse cx={x + s * 3} cy={SK.feet.y + 1} rx={big ? 21 : 17} ry={big ? 11 : 9} fill={c1} {...st(c2)} />
                <path d={`M${x - 12 + s * 3} ${SK.feet.y + 6} H${x + 14 + s * 3}`} {...st(c3 ?? c2, 3)} strokeLinecap="round" />
                {itemId !== "botas-charco" && <path d={`M${x - 5} ${SK.feet.y - 4} l8 4`} {...st(c2, 2)} />}
              </g>
            );
          })}
        </g>
      );
    case "hat": {
      const y = SK.hatBase - lift;
      switch (itemId) {
        case "jockey-ola":
          return (
            <g data-slot="hat">
              <path d={`M62 ${y} Q100 ${y - 46} 138 ${y} Z`} fill={c1} {...st(c2)} />
              <path d={`M128 ${y - 2} Q160 ${y - 4} 166 ${y + 6} Q140 ${y + 8} 124 ${y + 4} Z`} fill={c2} />
              <circle cx={100} cy={y - 22} r={3.5} fill={c2} />
            </g>
          );
        case "gorro-lana-marea":
          return (
            <g data-slot="hat">
              <path d={`M60 ${y + 2} Q100 ${y - 56} 140 ${y + 2} Z`} fill={c1} />
              <rect x={58} y={y - 6} width={84} height={14} rx={7} fill={c2} />
              <circle cx={100} cy={y - 34} r={9} fill={c2} />
            </g>
          );
        case "pescador-splash":
          return (
            <g data-slot="hat">
              <path d={`M70 ${y} Q72 ${y - 34} 100 ${y - 34} Q128 ${y - 34} 130 ${y} Z`} fill={c1} {...st(c2)} />
              <ellipse cx={100} cy={y + 2} rx={50} ry={9} fill={c1} {...st(c2)} />
              <path d={`M72 ${y - 6} H128`} {...st(c2, 4)} />
            </g>
          );
        case "boina-goutte":
          return (
            <g data-slot="hat">
              <ellipse cx={92} cy={y - 8} rx={46} ry={16} fill={c1} transform={`rotate(-8 92 ${y - 8})`} />
              <ellipse cx={100} cy={y + 2} rx={36} ry={6} fill={c2} />
              <circle cx={96} cy={y - 24} r={3} fill={c2} />
            </g>
          );
        case "sombrero-hidrolujo":
          return (
            <g data-slot="hat">
              <ellipse cx={100} cy={y + 2} rx={58} ry={10} fill={c1} />
              <rect x={72} y={y - 40} width={56} height={42} rx={6} fill={c1} />
              <rect x={72} y={y - 10} width={56} height={8} fill={c2} />
            </g>
          );
        case "corona-gotas":
          return (
            <g data-slot="hat">
              <path d={`M68 ${y + 2} L70 ${y - 22} L84 ${y - 8} L100 ${y - 30} L116 ${y - 8} L130 ${y - 22} L132 ${y + 2} Z`} fill={c3} {...st("#a16207")} />
              {[[70, -26], [100, -34], [130, -26]].map(([x, dy]) => (
                <path key={x} d={`M${x} ${y + dy - 10} q-6 8 0 12 q6 -4 0 -12`} fill={c1} {...st(c2, 1)} />
              ))}
            </g>
          );
        default:
          return null;
      }
    }
    case "glasses": {
      const ey = SK.eyes.y, dx = SK.eyes.dx;
      if (itemId === "antiparras")
        return (
          <g data-slot="glasses">
            <path d={`M44 ${ey} H156`} {...st(c2, 4)} />
            {[-1, 1].map((s) => <ellipse key={s} cx={100 + s * dx} cy={ey} rx={15} ry={12} fill={c1} fillOpacity={0.45} {...st(c2, 3)} />)}
          </g>
        );
      return (
        <g data-slot="glasses">
          {[-1, 1].map((s) => (
            <rect key={s} x={100 + s * dx - 14} y={ey - 10} width={28} height={20} rx={itemId === "lentes-hidrolujo" ? 10 : 6} fill={itemId === "lentes-hidrolujo" ? c2 : c1} fillOpacity={0.9} {...st(itemId === "lentes-hidrolujo" ? c1 : c2, 2.4)} />
          ))}
          <path d={`M${100 - dx + 14} ${ey - 2} Q100 ${ey - 8} ${100 + dx - 14} ${ey - 2}`} {...st(itemId === "lentes-hidrolujo" ? c1 : c2, 2.4)} fill="none" />
          <path d={`M${100 - dx - 6} ${ey - 6} l6 -2`} stroke="#ffffff" strokeWidth={2} opacity={0.7} />
        </g>
      );
    }
    case "accessory":
      switch (itemId) {
        case "bufanda-marejada":
          return (
            <g data-slot="accessory">
              <path d={`M60 ${SK.neck.y} Q100 ${SK.neck.y + 18} 140 ${SK.neck.y} L140 ${SK.neck.y + 10} Q100 ${SK.neck.y + 28} 60 ${SK.neck.y + 10} Z`} fill={c1} />
              <rect x={112} y={SK.neck.y + 10} width={14} height={34} rx={4} fill={c1} />
              {[0, 1, 2].map((i) => <path key={i} d={`M${70 + i * 24} ${SK.neck.y + 8} l10 0`} {...st(c2, 3)} />)}
            </g>
          );
        case "medalla-water-club":
          return (
            <g data-slot="accessory">
              <path d={`M84 ${SK.neck.y} L100 ${SK.neck.y + 24} L116 ${SK.neck.y}`} {...st(c2, 4)} fill="none" />
              <circle cx={100} cy={SK.neck.y + 30} r={10} fill={c1} {...st("#a16207")} />
              <path d={`M100 ${SK.neck.y + 24} q-5 7 0 10 q5 -3 0 -10`} fill={c2} />
            </g>
          );
        case "cadena-gota":
          return (
            <g data-slot="accessory">
              <path d={`M74 ${SK.neck.y + 2} Q100 ${SK.neck.y + 26} 126 ${SK.neck.y + 2}`} {...st(c1, 3)} fill="none" strokeDasharray="3 2" />
              <path d={`M100 ${SK.neck.y + 16} q-8 11 0 16 q8 -5 0 -16`} fill={c2} {...st(c1, 2)} />
            </g>
          );
        case "flotador-patito":
          return (
            <g data-slot="accessory">
              <ellipse cx={B.cx} cy={B.cy + 8} rx={56} ry={18} fill={c1} {...st(c2)} />
              <ellipse cx={B.cx} cy={B.cy + 4} rx={36} ry={9} fill="none" {...st(c2, 1)} opacity={0.5} />
              <circle cx={B.cx + 48} cy={B.cy - 8} r={10} fill={c1} {...st(c2)} />
              <path d={`M${B.cx + 56} ${B.cy - 8} l8 2 l-8 3 z`} fill={c2} />
              <circle cx={B.cx + 50} cy={B.cy - 11} r={1.8} fill="#1c2b4a" />
            </g>
          );
        case "bolso-goutte":
          return (
            <g data-slot="accessory">
              <path d={`M64 134 L142 196`} {...st(c2, 3)} />
              <rect x={134} y={184} width={28} height={22} rx={5} fill={c1} {...st(c2, 1.5)} />
              <path d={`M140 192 q8 -6 16 0`} {...st(c2, 2)} fill="none" />
            </g>
          );
        default:
          return null;
      }
    case "costume":
      switch (itemId) {
        case "disfraz-botella":
          return (
            <g data-slot="costume">
              <rect x={B.cx - 44} y={126} width={88} height={78} rx={20} fill={c1} fillOpacity={0.92} {...st(c3, 2)} />
              <rect x={B.cx - 44} y={156} width={88} height={22} fill={c2} />
              <path d={`M${B.cx - 30} 136 v54`} stroke="#ffffff" strokeWidth={4} opacity={0.6} strokeLinecap="round" />
            </g>
          );
        case "disfraz-gota":
          return (
            <g data-slot="costume">
              <path d={`M100 120 Q150 170 140 194 Q120 214 100 212 Q80 214 60 194 Q50 170 100 120 Z`} fill={c1} fillOpacity={0.9} {...st("#0369a1", 1.5)} />
              <path d={`M74 174 q2 -14 12 -24`} stroke={c2} strokeWidth={5} strokeLinecap="round" fill="none" />
            </g>
          );
        default:
          return null;
      }
    default:
      return null;
  }
}

/** Capas del disfraz que van sobre la cabeza (capucha) */
export function CostumeHood({ itemId }: { itemId?: string }) {
  if (itemId === "disfraz-tiburon") {
    const it = ITEMS_BY_ID[itemId];
    const [c1, c2] = it.colors;
    return (
      <g data-slot="costume">
        <path d="M40 92 Q42 26 100 24 Q158 26 160 92 Q156 60 100 58 Q44 60 40 92 Z" fill={c1} />
        <path d="M92 26 L104 -2 L116 28 Z" fill={c1} />
        <path d="M48 90 l6 8 l6 -8 l6 8 l6 -8 M128 90 l6 8 l6 -8 l6 8 l6 -8" fill={c2} stroke={c2} strokeWidth={1} />
      </g>
    );
  }
  return null;
}

/** Cuerpo del disfraz de tiburón (debajo de la cabeza) */
export function CostumeBody({ itemId }: { itemId?: string }) {
  if (itemId !== "disfraz-tiburon") return null;
  const [c1, c2] = ITEMS_BY_ID[itemId].colors;
  return (
    <g data-slot="costume">
      <ellipse cx={B.cx} cy={B.cy} rx={B.rx + 4} ry={B.ry + 2} fill={c1} />
      <ellipse cx={B.cx} cy={B.cy + 6} rx={26} ry={26} fill={c2} />
      <path d={`M${B.cx + 40} ${B.cy + 10} q24 -4 22 -26 q-12 6 -22 14 z`} fill={c1} />
    </g>
  );
}

/** Capa Tsunami: va detrás del cuerpo */
export function Cape({ itemId }: { itemId?: string }) {
  if (itemId !== "capa-tsunami") return null;
  const [c1, c2] = ITEMS_BY_ID[itemId].colors;
  return (
    <g data-slot="accessory">
      <path d={`M62 ${SK.neck.y} Q40 190 46 214 Q70 206 100 214 Q130 206 154 214 Q160 190 138 ${SK.neck.y} Z`} fill={c1} />
      <path d={`M52 206 q12 -10 24 0 q12 -10 24 0 q12 -10 24 0 q12 -10 24 0`} stroke={c2} strokeWidth={4} fill="none" strokeLinecap="round" />
    </g>
  );
}
