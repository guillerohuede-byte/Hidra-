import { describe, expect, it } from "vitest";
import { safeNext } from "./safeNext";

describe("safeNext (volver al link del sticker tras iniciar sesión)", () => {
  it("acepta rutas internas con query", () => {
    expect(safeNext("/nfc/BABCDEFG")).toBe("/nfc/BABCDEFG");
    expect(safeNext("/historial?x=1")).toBe("/historial?x=1");
  });
  it("rechaza destinos externos o raros", () => {
    for (const bad of ["https://malo.com", "//malo.com", "/\\malo.com", "javascript:alert(1)", "", null, undefined])
      expect(safeNext(bad as string)).toBe("/");
  });
  it("no vuelve a las pantallas de acceso", () => {
    expect(safeNext("/login?next=/x")).toBe("/");
    expect(safeNext("/auth/confirm")).toBe("/");
  });
});
