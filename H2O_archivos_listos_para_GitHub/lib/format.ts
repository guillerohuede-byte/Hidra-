// Formato chileno: 1.250 ml, 2 L, etc.
const nf = new Intl.NumberFormat("es-CL");

export const ml = (n: number) => `${nf.format(n)} ml`;

export const liters = (n: number) =>
  `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n / 1000)} L`;
