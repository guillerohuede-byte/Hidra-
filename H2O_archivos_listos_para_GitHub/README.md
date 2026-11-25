# H2O — hidratación con tu compañero

App web (PWA) de Grupo 9 · TEI301 UAI. Registras el agua que tomas con tu botella de siempre;
un sticker NFC abre la app lista para confirmar con un toque. Una mascota celebra tus logros,
ganas Gotitas, mantienes rachas y vistes a tu compañero con ropa de marcas inventadas.

## Cómo correrla

```bash
npm install
npm run dev          # contra Supabase real
npm run dev:prueba   # modo de prueba: backend simulado en el navegador (no toca Supabase)
npm test             # pruebas unitarias (reglas del juego, zonas horarias, validaciones)
npm run lint && npm run build
npm run test:e2e     # 30 pruebas de punta a punta (requiere `npm run dev:prueba` corriendo y Playwright para Python)
```

Las pruebas de base de datos (RLS, premios, compras, rachas, NFC) están en `supabase/tests/pruebas_bd.sql`:
crean dos usuarios de prueba, verifican 40 reglas y los borran al final.

## Variables de entorno

| Variable | Dónde | Valor |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (todas) | `https://kvchfntwgcprgndpomou.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel (todas) | clave *publishable* del proyecto (Supabase → Settings → API Keys) |
| `NEXT_PUBLIC_H2O_MOCK` | solo local | `1` activa el modo de prueba. **Nunca** se activa en producción (se ignora si `VERCEL_ENV=production`). |

Si las dos primeras faltan, la app usa los valores del proyecto que están en `lib/supabase/config.ts`
(la clave *publishable* es pública por diseño; los datos los protege RLS).
**Nunca** se usa la clave `service_role` / `secret` en la app ni en el repositorio.

## Configuración manual en Supabase (una vez)

1. **Authentication → URL Configuration**
   - Site URL: `https://hidra-wgjk.vercel.app`
   - Redirect URLs:
     - `https://hidra-wgjk.vercel.app/auth/confirm`
     - `https://*-guillerohuede-byte.vercel.app/auth/confirm` (previsualizaciones de Vercel; ajusta al dominio de tu equipo)
     - `http://localhost:3000/auth/confirm`
2. **Authentication → Sign In / Providers → Email**: "Confirm email" activado.
3. **Correos (opcional pero recomendado)**: el correo integrado de Supabase permite muy pocos envíos por hora;
   para la demo con varias personas configura un SMTP propio (Authentication → Emails → SMTP).
4. Los enlaces de confirmación deben abrirse **en el mismo celular/navegador** donde se creó la cuenta
   (flujo PKCE). Si se quiere permitir abrirlos en otro equipo, cambiar las plantillas de correo a
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/` (la ruta ya lo soporta).

## Base de datos

Migraciones en `supabase/migrations/` (ya aplicadas al proyecto):

1. `esquema_base` — tablas, RLS en todas, triggers (el servidor fija fecha/hora de cada registro)
2. `catalogo_tienda` — 36 artículos (generado desde `lib/game/catalog.ts` con `scripts/gen-catalog-sql.mjs`)
3. `reglas_del_juego` — `claim_rewards`, `game_summary`, `buy_item`, `import_local`, rachas y niveles
4. `permisos_explicitos` — permisos mínimos por tabla; sin `TRUNCATE` (que se salta RLS)
5. `cerrar_funciones_trigger` — funciones internas no expuestas en la API

Los tipos TypeScript están en `lib/supabase/database.types.ts`.

## Reglas del juego (resumen)

- Bienvenida 50 Gotitas. Recompensa diaria 5. Cada registro 2 Gotitas + 10 XP, **máximo 6 al día**.
- Meta diaria cumplida: 20 Gotitas + 50 XP, **una vez por día** (tomar de más no da más).
- Borrar y volver a registrar no repite premios (libro de premios con clave única).
- Los registros importados de la versión sin cuenta no dan premios.
- Racha = días con al menos un registro (la meta es un logro aparte). Hitos 3/7/14/30/60/100 días.
- Escudo de Gota (máx. 3): protege automáticamente un día sin registro.
- Nivel L requiere 50·L·(L−1) XP. Nivel 5: Bufanda Marejada; nivel 10: Capa Tsunami.
- Todo lo decide el servidor; el navegador no puede escribirse Gotitas ni inventario.

## NFC

El sticker guarda `https://hidra-wgjk.vercel.app/nfc/CODIGO`. Al escanearlo:
- sin sesión → login → vuelve automáticamente al mismo link;
- la botella se busca **en la cuenta**, así que funciona igual en Safari y en la app instalada;
- nunca registra solo: hay que confirmar con un toque; doble toque o recargar no duplica.

En iPhone, iOS abre los links NFC en Safari: **no** hay forma soportada de forzar que abra la PWA instalada.
Por eso los datos viven en la cuenta y no en el navegador.

## Mascotas

12 especies (`lib/pets/species.ts`) sobre un esqueleto común (`lib/pets/skeleton.ts`), así toda la ropa
calza en todas. Para agregar una especie: entrada en `species.ts` + rasgos en `components/pet/SpeciesParts.tsx`.
Ilustraciones y marcas originales de H2O (ninguna marca real).

H2O es una herramienta de hábitos; no reemplaza recomendaciones médicas.
