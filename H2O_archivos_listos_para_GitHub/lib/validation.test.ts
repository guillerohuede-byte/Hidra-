import { describe, expect, it } from "vitest";
import { validateSignup } from "./validation";

const ok = { name: "Benja", email: "b@uai.cl", password: "12345678", confirm: "12345678" };
describe("validateSignup", () => {
  it("acepta datos correctos", () => expect(validateSignup(ok)).toBeNull());
  it("pide nombre, correo válido, 8 caracteres y que coincidan", () => {
    expect(validateSignup({ ...ok, name: " " })).toMatch(/llamas/);
    expect(validateSignup({ ...ok, email: "malo" })).toMatch(/correo/);
    expect(validateSignup({ ...ok, password: "123", confirm: "123" })).toMatch(/8/);
    expect(validateSignup({ ...ok, confirm: "otra-cosa" })).toMatch(/coinciden/);
  });
});
