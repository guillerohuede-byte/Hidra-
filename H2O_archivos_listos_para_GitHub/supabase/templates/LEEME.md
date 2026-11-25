# Correos de Hidra (Supabase Auth)

Supabase no permite cambiar estas plantillas desde el código; se pegan a mano:

**Supabase → Authentication → Emails → Templates**

| Plantilla en Supabase | Asunto sugerido | Archivo |
|---|---|---|
| Confirm signup | `Confirma tu cuenta de Hidra` | `confirmar-cuenta.html` |
| Reset password | `Tu nueva contraseña de Hidra` | `recuperar-contrasena.html` |
| Change email address | `Confirma tu nuevo correo en Hidra` | `cambiar-correo.html` |

Usan `{{ .ConfirmationURL }}`, compatible con la configuración actual (la app recibe el enlace en `/auth/confirm`).

**Nombre del remitente:** con el correo integrado de Supabase el remitente es fijo ("Supabase Auth").
Para que diga **Hidra**, hay que configurar un SMTP propio en
**Authentication → Emails → SMTP Settings** → *Sender name*: `Hidra`.
