"""Pruebas de punta a punta de H2O gamificado (modo de prueba: NEXT_PUBLIC_H2O_MOCK=1).
Cubre: login → volver al link del sticker, onboarding, premios, NFC sin duplicados,
compras sin doble cobro, armario, misiones/racha, importación de datos viejos y logout."""
import asyncio, json, re, sys
from playwright.async_api import async_playwright, expect

B = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100"
S = "/home/claude/shots/g-"
results = []

def ok(n, name, cond, detail=""):
    results.append((n, name, bool(cond)))
    print(("PASA " if cond else "FALLA"), n, name, "|", detail)

async def db(pg):
    return json.loads(await pg.evaluate("localStorage.getItem('h2o:mock:db')") or "null")

async def dismiss(pg):
    c = pg.get_by_test_id("celebration")
    if await c.count() and await c.is_visible():
        await c.get_by_role("button", name="¡Genial!").click()
        await expect(c).to_be_hidden()

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                   timezone_id="America/Santiago", locale="es-CL")
        # Datos de la versión anterior (sin cuenta) en este navegador
        await ctx.add_init_script("""
          if (!localStorage.getItem('h2o:v1:bottles')) {
            localStorage.setItem('h2o:v1:bottles', JSON.stringify([{id:'BLEGACY2',name:'Botella antigua',capacityMl:750,defaultAmountMl:250,color:'#1f78ee',createdAt:'2026-11-01T12:00:00Z'}]));
            localStorage.setItem('h2o:v1:entries', JSON.stringify([
              {id:'old1',amountMl:250,timestamp:'2026-11-20T14:00:00Z',date:'2026-11-20',time:'11:00',source:'manual'},
              {id:'old2',amountMl:500,timestamp:'2026-11-21T14:00:00Z',date:'2026-11-21',time:'11:00',source:'nfc',bottleId:'BLEGACY2'}]));
            localStorage.setItem('h2o:v1:goal', '2500');
          }""")
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        # (Playwright inyecta caret-color al sacar capturas: eso genera un aviso de hidratación que no es de la app)
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "favicon" not in m.text and "caret-color" not in m.text and "hydrated but some attributes" not in m.text else None)

        # 1. Sticker sin sesión → login que recuerda el link
        await pg.goto(B + "/nfc/BLEGACY2")
        await pg.wait_for_url(re.compile(r"/login\?next="), timeout=10000)
        ok(1, "Sin sesión, el sticker pide iniciar sesión", await pg.get_by_test_id("login-from-nfc").is_visible(), pg.url)
        await pg.screenshot(path=S + "01-login-desde-nfc.png")

        # 2. Error de contraseña amable
        await pg.fill("#email", "benja@uai.cl"); await pg.fill("#password", "123")
        await pg.get_by_role("button", name="Iniciar sesión").click()
        await expect(pg.get_by_role("alert").filter(has_text="incorrectos")).to_be_visible()
        ok(2, "Contraseña incorrecta muestra mensaje en español", True)

        # 3. Login → onboarding (conservando el destino)
        await pg.fill("#password", "secreta123")
        await pg.get_by_role("button", name="Iniciar sesión").click()
        await pg.wait_for_url(re.compile(r"/bienvenida"), timeout=10000)
        ok(3, "Cuenta nueva va al onboarding y guarda el destino", "next=%2Fnfc%2FBLEGACY2" in pg.url, pg.url)
        await pg.fill("#ob-name", "Benja"); await pg.screenshot(path=S + "02-onboarding-nombre.png")
        await pg.get_by_test_id("ob-next").click()
        await pg.get_by_role("button", name="2.500 ml").click(); await pg.screenshot(path=S + "03-onboarding-meta.png")
        await pg.get_by_test_id("ob-next").click()
        await pg.get_by_test_id("species-ajolote").click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path=S + "04-onboarding-mascota.png")
        await pg.get_by_test_id("ob-next").click()
        await pg.get_by_label("Nombre de tu compañero").fill("Glu")
        await pg.get_by_role("radio", name="Celeste").click()
        await pg.screenshot(path=S + "05-onboarding-nombre-mascota.png")
        await pg.get_by_test_id("ob-next").click()

        # 4. Vuelve al sticker: la botella vieja aún no está en la cuenta → no registra nada
        await pg.wait_for_url(re.compile(r"/nfc/BLEGACY2"), timeout=10000)
        await expect(pg.get_by_test_id("nfc-error")).to_be_visible(timeout=8000)
        ok(4, "Tras el login vuelve al link original del sticker", True, pg.url)
        await expect(pg.get_by_test_id("celebration")).to_be_visible()
        d = await db(pg)
        ok(5, "Bienvenida: 50 Gotitas de regalo (con celebración)", any(r["kind"] == "bienvenida" and r["gotitas"] == 50 for r in d["rewards"]))
        await pg.screenshot(path=S + "06-bienvenida-premio.png")
        await dismiss(pg)
        d = await db(pg)
        ok(6, "Sticker de otra cuenta/no importado no registra", len(d["entries"]) == 0)
        await pg.screenshot(path=S + "07-nfc-no-en-cuenta.png")

        # 5. Importar datos del navegador (con confirmación, sin borrar originales, sin duplicar)
        await pg.goto(B + "/"); await expect(pg.get_by_test_id("import-banner")).to_be_visible(timeout=8000)
        await pg.screenshot(path=S + "08-importar.png")
        await pg.get_by_test_id("import-confirm").click()
        await expect(pg.get_by_test_id("import-result")).to_be_visible()
        d = await db(pg)
        orig = await pg.evaluate("localStorage.getItem('h2o:v1:entries')")
        ok(7, "Importa 1 botella y 2 registros", len([b for b in d["bottles"] if b["id"] == "BLEGACY2"]) == 1 and len(d["entries"]) == 2)
        ok(8, "No borra los datos originales", orig is not None and "old1" in orig)
        g0 = (await db(pg))
        await pg.goto(B + "/perfil"); await pg.get_by_role("button", name="Revisar e importar").click()
        await pg.get_by_test_id("import-confirm").click(); await expect(pg.get_by_test_id("import-result")).to_be_visible()
        d = await db(pg)
        ok(9, "Importar dos veces no duplica", len(d["entries"]) == 2 and len(d["bottles"]) == 1)
        ok(10, "Lo importado no da Gotitas", not any(r["kind"] == "registro" for r in d["rewards"]))

        # 6. Ahora el sticker funciona (datos de la cuenta)
        await pg.goto(B + "/nfc/BLEGACY2")
        await expect(pg.get_by_test_id("nfc-bottle")).to_have_text("Botella antigua", timeout=8000)
        await pg.screenshot(path=S + "09-nfc-confirmar.png")
        btn = pg.get_by_role("button", name=re.compile("^Registrar 250 ml"))
        await btn.dblclick()
        await expect(pg.get_by_test_id("nfc-done")).to_be_visible()
        await pg.wait_for_timeout(500)
        d = await db(pg)
        today_nfc = [e for e in d["entries"] if e["source"] == "nfc" and not e.get("imported")]
        ok(11, "Doble toque = un solo registro", len(today_nfc) == 1, str(len(today_nfc)))
        ok(12, "Registro NFC muestra premio", await pg.get_by_test_id("nfc-reward").is_visible())
        await dismiss(pg)
        await pg.screenshot(path=S + "10-nfc-listo.png")
        await pg.reload(); await expect(pg.get_by_test_id("nfc-done")).to_contain_text("Ya registraste", timeout=8000)
        d = await db(pg)
        ok(13, "Recargar no repite el registro", len([e for e in d["entries"] if e["source"] == "nfc" and not e.get("imported")]) == 1)

        # 7. Dashboard con mascota + registro manual (premio limitado)
        await pg.goto(B + "/"); await dismiss(pg)
        await expect(pg.get_by_test_id("pet-line")).to_be_visible()
        for i in range(10):
            await pg.get_by_role("button", name="Registrar agua").click()
            await pg.get_by_role("dialog").get_by_role("button", name=re.compile("^Registrar")).click()
            await pg.wait_for_timeout(700); await dismiss(pg)
        d = await db(pg)
        drink = [r for r in d["rewards"] if r["kind"] == "registro"]
        ok(14, "Gotitas por registro topadas en 6 al día", len(drink) == 6, f"{len(drink)} premios de 11 registros")
        goal = [r for r in d["rewards"] if r["kind"] == "meta"]
        ok(15, "Meta premiada una sola vez", len(goal) == 1)
        m3 = [r for r in d["rewards"] if r["key"].startswith("m:d:registro3")]
        ok(16, "Misión diaria 'registra 3 veces' completada", len(m3) == 1)
        await pg.screenshot(path=S + "11-inicio.png", full_page=True)

        # 8. Borrar y volver a registrar no da premio extra
        before = len(d["rewards"])
        await pg.goto(B + "/historial"); await pg.wait_for_timeout(400)
        await pg.get_by_role("button", name=re.compile("Eliminar")).first.click()
        await pg.get_by_role("alertdialog").get_by_role("button", name="Eliminar").click(); await pg.wait_for_timeout(500)
        await pg.goto(B + "/"); await pg.get_by_role("button", name="Registrar agua").click()
        await pg.get_by_role("dialog").get_by_role("button", name=re.compile("^Registrar")).click(); await pg.wait_for_timeout(800)
        d = await db(pg)
        ok(17, "Borrar y re-registrar no suma premios", len(d["rewards"]) == before, f"{before} → {len(d['rewards'])}")

        # 9. Tienda: compra con confirmación, sin doble cobro, equipar
        await pg.goto(B + "/tienda"); await dismiss(pg)
        bal0 = int(re.sub(r"\D", "", await pg.get_by_test_id("shop-balance").inner_text()))
        await pg.screenshot(path=S + "12-tienda.png")
        await pg.get_by_test_id("item-jockey-ola").click()
        await pg.get_by_test_id("buy-btn").click()
        await pg.screenshot(path=S + "13-tienda-confirmar.png")
        await pg.get_by_test_id("buy-confirm").dblclick(); await pg.wait_for_timeout(800)
        await dismiss(pg)
        bal1 = int(re.sub(r"\D", "", await pg.get_by_test_id("shop-balance").inner_text()))
        d = await db(pg)
        ok(18, "Compra descuenta el precio una sola vez", bal0 - bal1 in (40, 30), f"{bal0} → {bal1} (incluye +10 del logro)")
        ok(19, "Queda en el inventario", any(i["itemId"] == "jockey-ola" for i in d["inventory"]))
        sheet = pg.get_by_test_id("item-sheet")
        if not await sheet.count(): await pg.get_by_test_id("item-jockey-ola").click()
        await pg.get_by_test_id("equip-btn").click(); await pg.wait_for_timeout(400)
        await pg.get_by_test_id("item-gorro-lana-marea").click()
        ok(20, "Vista previa sobre la mascota en la ficha", await pg.get_by_test_id("item-sheet").locator('[data-slot="hat"]').count() > 0)
        await pg.screenshot(path=S + "14-tienda-vista-previa.png")
        await pg.get_by_label("Cerrar").first.click()
        caro = pg.get_by_test_id("item-disfraz-gota"); await caro.click()
        ok(21, "Sin saldo no deja comprar", await pg.get_by_test_id("buy-btn").is_disabled())
        await pg.get_by_label("Cerrar").first.click()

        # 10. Compañero con ropa puesta
        await pg.goto(B + "/companero"); await pg.wait_for_timeout(500)
        ok(22, "La mascota lleva el jockey", await pg.locator('main svg[data-species="ajolote"] [data-slot="hat"]').count() > 0)
        await pg.screenshot(path=S + "15-companero.png", full_page=True)

        # 11. Misiones y racha
        await pg.goto(B + "/misiones"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=S + "16-misiones.png", full_page=True)
        await pg.get_by_role("tab", name="racha").click()
        ok(23, "Racha actual 1 (hoy)", (await pg.get_by_test_id("streak-current").inner_text()).strip().startswith(("1", "")) and "1" in await pg.get_by_test_id("streak-current").inner_text())
        await pg.screenshot(path=S + "17-racha.png", full_page=True)
        await pg.get_by_role("tab", name="logros").click(); await pg.screenshot(path=S + "18-logros.png", full_page=True)

        # 12. Las 12 especies se dibujan
        await pg.goto(B + "/companero"); await pg.get_by_role("button", name="Editar").click()
        await pg.get_by_text("Cambiar de especie").click(); await pg.wait_for_timeout(300)
        n = await pg.locator("details svg[data-species]").count()
        ok(24, "12 especies disponibles", n == 12, str(n))
        await pg.locator("details").screenshot(path=S + "19-especies.png")

        # 13. Reducir movimiento y logout
        await pg.goto(B + "/perfil"); await pg.get_by_test_id("reduce-motion").check(); await pg.wait_for_timeout(300)
        ok(25, "Reducir animaciones aplica la clase", await pg.evaluate("document.documentElement.classList.contains('reduce-motion')"))
        await pg.screenshot(path=S + "20-perfil.png", full_page=True)
        await pg.get_by_test_id("logout").click(); await pg.wait_for_url(re.compile("/login"))
        await pg.goto(B + "/historial"); await pg.wait_for_url(re.compile(r"/login\?next=%2Fhistorial"))
        ok(26, "Tras cerrar sesión las pantallas piden login", True)

        # 14. Registro y recuperación
        await pg.goto(B + "/registro"); await pg.screenshot(path=S + "21-registro.png")
        await pg.fill("#name", "Ana"); await pg.fill("#email", "ana@uai.cl"); await pg.fill("#password", "12345678"); await pg.fill("#confirm", "1234")
        await pg.get_by_role("button", name="Crear cuenta").click()
        ok(27, "Registro valida contraseñas", await pg.get_by_role("alert").filter(has_text="coinciden").is_visible())
        await pg.fill("#confirm", "12345678"); await pg.get_by_role("button", name="Crear cuenta").click()
        await expect(pg.get_by_test_id("signup-sent")).to_be_visible()
        ok(28, "Registro pide verificar el correo", True)
        await pg.goto(B + "/recuperar"); await pg.fill("#email", "ana@uai.cl"); await pg.get_by_role("button", name="Enviar enlace").click()
        await expect(pg.get_by_test_id("reset-sent")).to_be_visible()
        ok(29, "Recuperar contraseña envía enlace", True)

        # 15. Sin errores ni desbordes
        await pg.goto(B + "/login")
        ok(30, "Sin errores en consola", not errs, "; ".join(errs[:3]))
        await br.close()

    passed = sum(1 for r in results if r[2])
    print(f"\n{passed}/{len(results)} pruebas pasaron")
    sys.exit(0 if passed == len(results) else 1)

asyncio.run(main())
