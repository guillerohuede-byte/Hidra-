// Validación del registro (también se prueba en lib/validation.test.ts)
export function validateSignup(v: { name: string; email: string; password: string; confirm: string }) {
  if (!v.name.trim()) return "¿Cómo te llamas?";
  if (v.name.trim().length > 40) return "El nombre puede tener hasta 40 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return "Revisa tu correo.";
  if (v.password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (v.password !== v.confirm) return "Las contraseñas no coinciden.";
  return null;
}
