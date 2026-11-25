// Modelos de datos de H2O (forma que usan las pantallas).

export type Bottle = {
  id: string; // código único y permanente (ej. "B7K3QX9M"): va dentro del link del sticker NFC
  name: string;
  capacityMl: number;
  defaultAmountMl: number; // cantidad habitual que se propone al registrar
  color: string;
  createdAt: string;
  tagLinkedAt?: string | null; // primer uso exitoso del sticker
  deletedAt?: string | null; // botella eliminada (el código queda reservado)
};

export type IntakeEntry = {
  id: string;
  amountMl: number;
  timestamp: string; // instante exacto (ISO)
  date: string; // día LOCAL del usuario "2026-11-23" (lo fija el servidor según su zona horaria)
  time: string; // hora local "14:05"
  source: "manual" | "nfc";
  imported?: boolean;
  bottleId?: string | null;
  bottleName?: string | null; // copia del nombre: el historial no cambia si la botella se edita o elimina
  pending?: boolean; // aún guardándose
};
