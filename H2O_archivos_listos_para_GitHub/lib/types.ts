// Modelos de datos de H2O.

export type Bottle = {
  id: string; // código único y estable (ej. "B7K3QX9M"). Irá dentro del link del sticker NFC.
  name: string;
  capacityMl: number; // capacidad total de la botella
  defaultAmountMl: number; // cantidad habitual que se propone al registrar
  color: string; // color de la silueta (se asigna automáticamente)
  createdAt: string; // ISO
  tagLinkedAt?: string; // ISO — se completará en el módulo NFC al vincular un sticker
};

export type IntakeEntry = {
  id: string; // identificador único
  amountMl: number;
  timestamp: string; // instante exacto (ISO), sirve para ordenar
  date: string; // fecha LOCAL del usuario, "2026-11-23": define a qué día pertenece
  time: string; // hora local, "14:05"
  source: "manual" | "nfc";
  bottleId?: string; // botella usada (los registros antiguos no lo tienen)
  bottleName?: string; // copia del nombre al momento de registrar: el historial no cambia si la botella se edita o elimina
};
