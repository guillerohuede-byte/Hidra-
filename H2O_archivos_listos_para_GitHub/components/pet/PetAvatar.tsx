"use client";

// Mascota H2O en SVG por capas:
// cola/capa → cuerpo → ropa → brazos/pies → orejas → cabeza → cara → lentes → gorro.
// Animaciones en CSS (globals.css): respirar, parpadear, tomar agua, celebrar, reaccionar.
// Con "reducir movimiento" todo queda quieto.
import { useEffect, useState } from "react";
import { paletteFor, evolutionFor } from "@/lib/pets/species";
import { SK } from "@/lib/pets/skeleton";
import { speciesParts } from "./SpeciesParts";
import { Clothing, CostumeHood, CostumeBody, Cape } from "./Clothes";

export type Mood = "feliz" | "tranquilo" | "sediento" | "dormido" | "emocionado";
export type PetAnim = "drink" | "celebrate" | "reward" | "levelup" | "pet" | null;

type Props = {
  species: string;
  color: string;
  equipment?: Record<string, string>;
  mood?: Mood;
  anim?: PetAnim;
  animKey?: number; // cambia para repetir la animación
  level?: number;
  size?: number;
  className?: string;
  title?: string;
  onClick?: () => void;
};

const ORDER_BODY = ["pants", "top", "jacket"] as const;

export default function PetAvatar({
  species, color, equipment = {}, mood = "tranquilo", anim = null, animKey = 0, level = 1, size = 200, className = "", title, onClick,
}: Props) {
  const p = paletteFor(species, color);
  const parts = speciesParts(species, p);
  const tier = evolutionFor(level).tier;
  const [playing, setPlaying] = useState<PetAnim>(null);

  useEffect(() => {
    if (!anim) return;
    setPlaying(anim);
    const t = window.setTimeout(() => setPlaying(null), anim === "levelup" ? 1800 : 1300);
    return () => window.clearTimeout(t);
  }, [anim, animKey]);

  const costume = equipment.costume;
  const fullCostume = costume === "disfraz-botella" || costume === "disfraz-gota";
  const accessory = equipment.accessory;
  const hasHat = !!equipment.hat || costume === "disfraz-tiburon";
  const expression: Mood | "celebra" = playing === "celebrate" || playing === "levelup" || playing === "reward" || playing === "pet" ? "celebra" : mood;
  const { head: H, body: B, eyes: E } = SK;
  const arm = parts.armColor ?? p.body;
  const foot = parts.footColor ?? p.dark;

  return (
    <svg
      viewBox={`0 0 ${SK.W} ${SK.H}`}
      width={size}
      height={(size * SK.H) / SK.W}
      className={`pet ${playing ? `pet-${playing}` : ""} ${className}`}
      role="img"
      aria-label={title ?? "Tu mascota"}
      onClick={onClick}
      data-species={species}
    >
      {/* Sombra */}
      <ellipse cx={100} cy={214} rx={52} ry={8} fill="#1c2b4a" opacity={0.1} className="pet-shadow" />

      {/* Brillo de evolución (desde nivel 5) */}
      {tier >= 1 && (
        <g className="pet-aura" opacity={0.5 + tier * 0.12}>
          <circle cx={100} cy={110} r={96} fill="url(#aura)" />
        </g>
      )}
      <defs>
        <radialGradient id="aura">
          <stop offset="55%" stopColor="#7dd3fc" stopOpacity={0} />
          <stop offset="100%" stopColor={tier >= 3 ? "#facc15" : "#7dd3fc"} stopOpacity={0.5} />
        </radialGradient>
      </defs>

      <g className="pet-bounce">
        <g className="pet-breathe">
          {parts.back}
          <Cape itemId={accessory} />

          {/* Cuerpo */}
          <ellipse cx={B.cx} cy={B.cy} rx={B.rx} ry={B.ry} fill={p.body} />
          {parts.belly}
          <CostumeBody itemId={costume} />
          {!fullCostume && ORDER_BODY.map((s) => equipment[s] && <Clothing key={s} itemId={equipment[s]} slot={s} species={species} />)}

          {/* Brazos */}
          <g className="pet-arms">
            <g transform={`rotate(${SK.arms.tilt} ${B.cx - SK.arms.dx} ${SK.arms.y})`}><ellipse className="pet-arm-l" cx={B.cx - SK.arms.dx} cy={SK.arms.y} rx={SK.arms.rx} ry={SK.arms.ry} fill={arm} /></g>
            <g transform={`rotate(${-SK.arms.tilt} ${B.cx + SK.arms.dx} ${SK.arms.y})`}><ellipse className="pet-arm-r" cx={B.cx + SK.arms.dx} cy={SK.arms.y} rx={SK.arms.rx} ry={SK.arms.ry} fill={arm} /></g>
          </g>
          {/* Pies */}
          {[-1, 1].map((s) => (
            <ellipse key={s} cx={B.cx + s * SK.feet.dx} cy={SK.feet.y} rx={SK.feet.rx} ry={SK.feet.ry} fill={foot} />
          ))}
          {equipment.shoes && <Clothing itemId={equipment.shoes} slot="shoes" species={species} />}
          {fullCostume && <Clothing itemId={costume!} slot="costume" species={species} />}
          {accessory && accessory !== "capa-tsunami" && <Clothing itemId={accessory} slot="accessory" species={species} />}

          {/* Cabeza */}
          <g className="pet-head">
            {parts.earsBack}
            <ellipse cx={H.cx} cy={H.cy} rx={H.rx} ry={H.ry} fill={p.body} />
            {parts.headOverlay}

            {/* Ojos */}
            <g className="pet-eyes">
              {[-1, 1].map((s) => {
                const x = 100 + s * E.dx;
                if (expression === "celebra" || expression === "feliz")
                  return <path key={s} d={`M${x - 7} ${E.y + 2} Q${x} ${E.y - 8} ${x + 7} ${E.y + 2}`} stroke="#1c2b4a" strokeWidth={3.4} fill="none" strokeLinecap="round" />;
                if (expression === "dormido")
                  return <path key={s} d={`M${x - 7} ${E.y} Q${x} ${E.y + 5} ${x + 7} ${E.y}`} stroke="#1c2b4a" strokeWidth={3} fill="none" strokeLinecap="round" />;
                return (
                  <g key={s} className="pet-eye">
                    <ellipse cx={x} cy={E.y} rx={E.r} ry={E.r + (expression === "emocionado" ? 1.5 : 0.5)} fill="#1c2b4a" />
                    <circle cx={x + 2.5} cy={E.y - 3} r={2.6} fill="#ffffff" />
                    <circle cx={x - 2.5} cy={E.y + 2.5} r={1.1} fill="#ffffff" opacity={0.8} />
                  </g>
                );
              })}
              {expression === "sediento" && (
                <path d="M128 66 q-5 7 0 10 q5 -3 0 -10" fill="#7dd3fc" className="pet-sweat" />
              )}
            </g>

            {/* Mejillas */}
            {[-1, 1].map((s) => (
              <ellipse key={s} cx={100 + s * SK.cheeks.dx} cy={SK.cheeks.y} rx={8} ry={5} fill="#fb7185" opacity={expression === "celebra" ? 0.55 : 0.32} />
            ))}

            {parts.muzzle}
            {/* Boca */}
            {parts.mouth === "smile" && (
              expression === "celebra" || expression === "emocionado"
                ? <path d={`M88 ${SK.mouth.y - 2} Q100 ${SK.mouth.y + 14} 112 ${SK.mouth.y - 2} Z`} fill="#9f1239" stroke="#1c2b4a" strokeWidth={2} strokeLinejoin="round" />
                : <path d={`M90 ${SK.mouth.y} Q100 ${SK.mouth.y + (expression === "sediento" ? 2 : 9)} 110 ${SK.mouth.y}`} stroke="#1c2b4a" strokeWidth={3} fill="none" strokeLinecap="round" />
            )}
            {parts.mouth === "cat" && (
              <path d={`M92 ${SK.mouth.y} Q96 ${SK.mouth.y + 6} 100 ${SK.mouth.y} Q104 ${SK.mouth.y + 6} 108 ${SK.mouth.y}`} stroke="#1c2b4a" strokeWidth={2.4} fill={expression === "celebra" ? "#fda4af" : "none"} strokeLinecap="round" />
            )}
            {parts.whiskers && (
              <g stroke={p.dark} strokeWidth={1.4} opacity={0.5} strokeLinecap="round">
                <path d="M56 102 h-16 M57 108 l-15 4 M144 102 h16 M143 108 l15 4" />
              </g>
            )}

            {equipment.glasses && expression !== "dormido" && <Clothing itemId={equipment.glasses} slot="glasses" species={species} />}
            <CostumeHood itemId={costume} />
            {equipment.hat && costume !== "disfraz-tiburon" && <Clothing itemId={equipment.hat} slot="hat" species={species} />}
            {!hasHat && parts.top}
            {tier >= 2 && !hasHat && (
              <path d="M100 18 l3 6 l6 1 l-5 4 l2 6 l-6 -3 l-6 3 l2 -6 l-5 -4 l6 -1 z" fill="#facc15" className="pet-star" />
            )}
          </g>
        </g>
      </g>

      {/* Efectos: gota al tomar agua, chispas al celebrar */}
      {playing === "drink" && (
        <g className="pet-fx-drop">
          <path d="M100 0 q-10 14 0 20 q10 -6 0 -20" fill="#38bdf8" />
        </g>
      )}
      {(playing === "celebrate" || playing === "levelup" || playing === "reward") && (
        <g className="pet-fx-sparkles">
          {[[30, 40], [170, 50], [24, 120], [176, 130], [100, 6]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 7} l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z`} fill={i % 2 ? "#facc15" : "#38bdf8"} style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </g>
      )}
      {playing === "pet" && (
        <g className="pet-fx-sparkles">
          <path d="M150 40 c-4 -6 -12 -2 -8 4 l8 8 l8 -8 c4 -6 -4 -10 -8 -4" fill="#fb7185" />
        </g>
      )}
    </svg>
  );
}
