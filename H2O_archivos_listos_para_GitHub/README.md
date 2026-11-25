# Hidra — hidratación con tu compañero

App web (PWA) del Grupo 6 · TEI301 UAI. Registras el agua que tomas con tu botella de siempre;
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

Las pruebas de metas por día y del perfil de hidratación están en `supabase/tests/pruebas_meta.sql`.
Las pruebas de base de datos (RLS, premios, compras, rachas, NFC) están en `supabase/tests/pruebas_bd.sql`:
crean dos usuarios de prueba, verifican 45 reglas (incluidos intentos de trampa) y los borran al final.

## Variables de entorno

| Variable | Dónde | Valor |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (todas) | `https://kvchfntwgcprgndpomou.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel (todas) | clave *publishable* del proyecto (Supabase → Settings → API Keys) |
| `NEXT_PUBLIC_H2O_MOCK` | solo local | `1` activa el modo de prueba. En Vercel (producción y vistas previas) es imposible: el código de prueba ni siquiera se incluye en el build. |

Si las dos primeras faltan, la app usa los valores del proyecto que están en `lib/supabase/config.ts`
(la clave *publishable* es pública por diseño; los datos los protege RLS).
**Nunca** se usa la clave `service_role` / `secret` en la app ni en el repositorio.

## Configuración manual en Supabase (una vez)

1. **Authentication → URL Configuration**
   - Site URL: `https://hidra-wgjk.vercel.app`
   - Redirect URLs (con `/**`, porque el enlace lleva `?next=` para volver al sticker):
     - `https://hidra-wgjk.vercel.app/**`
     - `https://hidra-wgjk-git-*-zenvix4.vercel.app/**` (vistas previas de Vercel de cada rama, equipo `zenvix4`)
     - `http://localhost:3000/**`
2. **Authentication → Sign In / Providers → Email**: "Confirm email" activado.
3. **Correos (opcional pero recomendado)**: el correo integrado de Supabase permite muy pocos envíos por hora;
   para la demo con varias personas configura un SMTP propio (Authentication → Emails → SMTP), con *Sender name* `Hidra`.
   Las plantillas en español con la marca Hidra están en `supabase/templates/` (ver su LEEME).
4. Los enlaces de confirmación crean la sesión solo si se abren **en el mismo navegador** donde se creó la cuenta
   (flujo PKCE). En iPhone la app instalada y Safari no comparten sesión: si el enlace se abre en el otro, el correo
   igual queda confirmado y la app pide iniciar sesión (conservando el destino, p. ej. el sticker).
5. **Vistas previas de Vercel**: están protegidas con *Vercel Authentication*. Para probarlas en el iPhone hay que
   iniciar sesión en vercel.com en Safari con una cuenta del equipo, o desactivar la protección de vistas previas
   (Vercel → Settings → Deployment Protection).

## Base de datos

Migraciones en `supabase/migrations/` (ya aplicadas al proyecto):

1. `esquema_base` — tablas, RLS en todas, triggers (el servidor fija fecha/hora de cada registro)
2. `catalogo_tienda` — 36 artículos (generado desde `lib/game/catalog.ts` con `scripts/gen-catalog-sql.mjs`)
3. `reglas_del_juego` — `claim_rewards`, `game_summary`, `buy_item`, `import_local`, rachas y niveles
4. `permisos_explicitos` — permisos mínimos por tabla; sin `TRUNCATE` (que se salta RLS)
5. `cerrar_funciones_trigger` — funciones internas no expuestas en la API
6. `cierre_abusos` — la racha ignora registros importados; importación con límites; registro "con sticker" exige botella
7. `meta_personalizada` — `hydration_profiles`, `daily_goals` (meta guardada por día), ajuste de entrenamiento, `set_training_today()`

Los tipos TypeScript están en `lib/supabase/database.types.ts`.

## Meta personalizada y días de entrenamiento

- Cuestionario de 5 preguntas: edad, indicación profesional sobre líquidos, peso, ejercicio y calor.
- El cálculo es orientativo. Método, fuentes y límites en **[docs/meta-de-hidratacion.md](docs/meta-de-hidratacion.md)**; código en `lib/hydration/calc.ts`.
- Menores de 18 años o personas con una indicación profesional sobre líquidos usan una meta manual; no se aplica la fórmula.
- **Meta base** (todos los días) + **ajuste opcional para días de entrenamiento**. El botón «Hoy entreno» suma el ajuste **solo a hoy**.
- **Cada día guarda su meta** (`daily_goals`): cambiar la meta o marcar entrenamiento nunca altera días anteriores ni da premios retroactivos. La meta se premia una vez por día.
- Las respuestas se guardan en `hydration_profiles`, sin datos médicos, y se pueden borrar desde Perfil → Hidratación.
- A los usuarios existentes no se les cambia la meta: ven una invitación opcional.

## Reglas del juego (resumen)

- Bienvenida 50 Gotitas. Recompensa diaria 5. Cada registro 2 Gotitas + 10 XP, **máximo 6 al día**.
- Meta diaria cumplida: 20 Gotitas + 50 XP, **una vez por día** (tomar de más no da más).
- Borrar y volver a registrar no repite premios (libro de premios con clave única).
- Los registros importados de la versión sin cuenta no dan premios **ni cuentan para la racha** (solo historial).
- Racha = días con al menos un registro hecho en la app (la meta es un logro aparte). Hitos 3/7/14/30/60/100 días.
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
Ilustraciones y marcas originales de Hidra (ninguna marca real).

## Nombre técnico vs. marca

La app se llama **Hidra**. Algunos nombres internos conservan `h2o` a propósito, porque cambiarlos rompería compatibilidad o borraría datos guardados en los navegadores:
- la carpeta `H2O_archivos_listos_para_GitHub`;
- las claves `h2o:*` del navegador;
- `useH2O` y `NEXT_PUBLIC_H2O_MOCK`;
- el nombre del paquete.

El dominio `hidra-wgjk.vercel.app`, los códigos de botella y las URL `/nfc/CODIGO` de los stickers no cambian.

Hidra es una herramienta de hábitos; no reemplaza recomendaciones médicas.
