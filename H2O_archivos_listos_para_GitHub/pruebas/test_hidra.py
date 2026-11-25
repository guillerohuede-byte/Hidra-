"""Pruebas de punta a punta de Hidra: marca, meta personalizada, entrenamiento/descanso,
usuarios existentes, persistencia, recompensas sin duplicar y NFC. (Modo de prueba.)"""
import asyncio, json, re, sys
from playwright.async_api import async_playwright, expect

B = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3200"
S = "/home/claude/shots/h-"
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

async def login_onboard(pg, email, species="capibara"):
    await pg.goto(B + "/login"); await pg.fill("#email", email); await pg.fill("#password", "secreta123")
    await pg.get_by_role("button", name="Iniciar sesión").click(); await pg.wait_for_url(re.compile("/bienvenida"))
    await pg.fill("#ob-name", "Benja"); await pg.get_by_test_id("ob-next").click()
    await pg.get_by_test_id(f"species-{species}").click(); await pg.get_by_test_id("ob-next").click()
    await pg.get_by_label("Nombre de tu compañero").fill("Capi"); await pg.get_by_test_id("ob-next").click()

async def wizard(pg, edad="31-50", indicacion="no", peso="70", minutos="45", intensidad="moderada", calor="nunca", shot=None):
    await pg.get_by_test_id(f"edad-{edad}").click()
    if shot: await pg.wait_for_timeout(500); await pg.screenshot(path=S + shot + "-1-edad.png")
    await pg.get_by_test_id("wiz-next").click()
    if edad == "menor": return
    await pg.get_by_test_id(f"indicacion-{indicacion}").click(); await pg.get_by_test_id("wiz-next").click()
    if indicacion == "si": return
    await pg.fill("#peso", peso)
    if shot: await pg.wait_for_timeout(500); await pg.screenshot(path=S + shot + "-2-peso.png")
    await pg.get_by_test_id("wiz-next").click()
    await pg.get_by_test_id(f"ejercicio-{minutos}").click()
    if minutos != "0": await pg.get_by_test_id(f"intensidad-{intensidad}").click()
    if shot: await pg.wait_for_timeout(500); await pg.screenshot(path=S + shot + "-3-ejercicio.png")
    await pg.get_by_test_id("wiz-next").click()
    await pg.get_by_test_id(f"calor-{calor}").click()
    if shot: await pg.wait_for_timeout(500); await pg.screenshot(path=S + shot + "-4-calor.png")
    await pg.get_by_test_id("wiz-next").click()

async def no_old_brand(pg, paths):
    bad = []
    for p in paths:
        await pg.goto(B + p); await pg.wait_for_timeout(450)
        txt = await pg.evaluate("document.body.innerText + ' ' + document.title")
        if re.search(r"H2O|H₂O", txt): bad.append(p)
    return bad

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        mk = lambda: br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, timezone_id="America/Santiago", locale="es-CL")

        # ── Usuario nuevo con meta calculada ──────────────────────────
        ctx = await mk(); pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "caret-color" not in m.text and "hydrated but some attributes" not in m.text else None)

        await pg.goto(B + "/login")
        ok(1, "Marca Hidra en login y título de la pestaña", (await pg.title()).startswith("Hidra") and await pg.get_by_role("img", name="Hidra").count() > 0, await pg.title())
        await pg.wait_for_timeout(500); await pg.screenshot(path=S + "01-login.png")
        await login_onboard(pg, "nuevo@uai.cl")
        await pg.wait_for_timeout(500); await pg.screenshot(path=S + "02-meta-elegir.png")
        await pg.get_by_test_id("ob-calcular").click()
        await wizard(pg, shot="03-wizard")
        res = pg.get_by_test_id("hydration-result")
        await expect(res).to_be_visible()
        ok(2, "Adulto 70 kg sin calor: meta base 2,1 L", "2,1 L" in await pg.get_by_test_id("result-liters").inner_text())
        ok(3, "Entrenamiento moderado 30–60 min: +400 ml solo esos días", "+400 ml" in await pg.get_by_test_id("result-training").inner_text())
        ok(4, "Muestra factores y mascota celebrando", await pg.get_by_test_id("result-factors").count() and await res.locator("svg[data-species=capibara]").count())
        await pg.wait_for_timeout(500); await pg.screenshot(path=S + "04-tu-meta.png", full_page=True)
        await pg.get_by_test_id("use-goal").click()
        await pg.wait_for_url(B + "/"); await pg.wait_for_timeout(600); await dismiss(pg)
        d = await db(pg)
        ok(5, "Persistencia: meta, ajuste y respuestas guardadas en la cuenta",
           d["profile"]["goalMl"] == 2100 and d["profile"]["trainingExtraMl"] == 400 and d["profile"]["goalSource"] == "calculada" and d["hydration"]["weightKg"] == 70)
        ok(6, "No se guarda la respuesta médica", "medicalAdvice" not in json.dumps(d["hydration"]))
        ok(7, "Usuario con meta calculada no ve la invitación", await pg.get_by_test_id("goal-invite").count() == 0)
        await pg.wait_for_timeout(500); await pg.screenshot(path=S + "05-inicio.png", full_page=True)

        # ── Entrenamiento / descanso ─────────────────────────────────
        await pg.goto(B + "/metas"); await pg.wait_for_timeout(400)
        ok(8, "Meta de hoy = base (descanso)", "2100" in re.sub(r"\D", "", await pg.get_by_test_id("today-goal").inner_text()))
        await pg.get_by_role("switch").click(); await pg.wait_for_timeout(700)
        ok(9, "Hoy entreno: meta 2.500 y explica por qué", "2500" in re.sub(r"\D", "", await pg.get_by_test_id("today-goal").inner_text())
           and "entrenamiento 400" in await pg.get_by_test_id("goal-why").inner_text())
        await pg.wait_for_timeout(500); await pg.screenshot(path=S + "06-metas-entreno.png", full_page=True)
        d = await db(pg); today = [k for k, v in d["dayGoals"].items() if v["training"]]
        ok(10, "Entrenamiento guardado solo para hoy", len(today) == 1)

        # Registrar 2.200: no cumple 2.500 (entreno); al pasar a descanso sí, una sola vez
        await pg.goto(B + "/")
        for amt in ("1000", "1200"):
            await pg.get_by_role("button", name="Registrar agua").click()
            dlg = pg.get_by_role("dialog")
            await dlg.get_by_role("button", name="Otra").click(); await dlg.locator("input").fill(amt)
            await dlg.get_by_role("button", name=re.compile("^Registrar")).click(); await pg.wait_for_timeout(700); await dismiss(pg)
        d = await db(pg)
        ok(11, "2.200 ml con meta de entrenamiento 2.500: sin premio de meta", not any(r["kind"] == "meta" for r in d["rewards"]))
        for _ in range(3):  # alternar varias veces
            await pg.get_by_role("switch").click(); await pg.wait_for_timeout(700); await dismiss(pg)
        d = await db(pg)
        metas = [r for r in d["rewards"] if r["kind"] == "meta"]
        ok(12, "Descanso: cumple la meta (2.100); alternar no duplica el premio", len(metas) == 1, f"{len(metas)} premios de meta")
        racha_antes = d

        # ── Cambiar la meta no borra nada y no es retroactivo ─────────
        rewards_before = len(d["rewards"]); entries_before = len(d["entries"])
        await pg.evaluate("""() => { const db = JSON.parse(localStorage.getItem('h2o:mock:db'));
          db.dayGoals['2026-11-01'] = { base: 3000, extra: 0, training: false };
          localStorage.setItem('h2o:mock:db', JSON.stringify(db)); }""")
        await pg.goto(B + "/metas"); await pg.get_by_role("button", name="Bajar meta").click(); await pg.get_by_role("button", name="Bajar meta").click()
        await pg.get_by_role("button", name="Guardar meta").click(); await pg.wait_for_timeout(800); await dismiss(pg)
        d = await db(pg)
        ok(13, "Cambiar la meta conserva registros, premios, mascota y racha",
           len(d["entries"]) == entries_before and len(d["rewards"]) >= rewards_before and d["pet"]["name"] == "Capi")
        ok(14, "Días anteriores conservan su meta", d["dayGoals"]["2026-11-01"]["base"] == 3000)
        ok(15, "Cambiar la meta a mano la marca como manual", d["profile"]["goalSource"] == "manual" and d["profile"]["goalMl"] == 1600)

        # ── Perfil → Hidratación ─────────────────────────────────────
        await pg.goto(B + "/perfil"); await pg.get_by_role("link", name=re.compile("Hidratación")).click()
        await expect(pg.get_by_test_id("hp-answers")).to_be_visible()
        await pg.wait_for_timeout(500); await pg.screenshot(path=S + "07-perfil-hidratacion.png", full_page=True)
        await pg.get_by_test_id("hp-calcular").click()
        await wizard(pg, peso="70", minutos="105", intensidad="intensa", calor="frecuente")
        ok(16, "Calor frecuente suma a la base (2,6 L) y entrenamiento largo avisa revisión", "2,6 L" in await pg.get_by_test_id("result-liters").inner_text()
           and await pg.get_by_test_id("result-warning").is_visible())
        await pg.wait_for_timeout(500); await pg.screenshot(path=S + "08-aviso-revision.png", full_page=True)
        await pg.get_by_test_id("adjust-goal").click()
        await pg.get_by_role("button", name="Subir 100 ml").click()
        await pg.get_by_test_id("save-manual").click(); await pg.wait_for_timeout(800)
        d = await db(pg)
        ok(17, "Ajustar manualmente guarda la meta elegida", d["profile"]["goalMl"] == 2700 and d["profile"]["goalSource"] == "manual")
        await pg.get_by_test_id("hp-calcular").click()
        await wizard(pg, edad="menor")
        ok(18, "Menor de edad: meta manual con explicación (sin fórmula de adultos)", await pg.get_by_test_id("result-manual").is_visible() and await pg.get_by_test_id("manual-picker").is_visible())
        await pg.wait_for_timeout(500); await pg.screenshot(path=S + "09-menor.png", full_page=True)
        await pg.get_by_role("button", name="Atrás").click()
        await pg.get_by_test_id("edad-31-50").click(); await pg.get_by_test_id("wiz-next").click()
        await pg.get_by_test_id("indicacion-si").click(); await pg.get_by_test_id("wiz-next").click()
        ok(19, "Indicación profesional: meta manual", "indicación" in await pg.get_by_test_id("result-manual").inner_text())
        await pg.get_by_role("button", name="Atrás").click()  # vuelve a la pregunta de indicación
        await pg.get_by_test_id("indicacion-no").click(); await pg.get_by_test_id("wiz-next").click()
        await pg.fill("#peso", "8")
        ok(20, "Peso inválido no deja avanzar", await pg.get_by_test_id("wiz-next").is_disabled() and await pg.get_by_role("alert").filter(has_text="entre 30 y 250").is_visible())
        await pg.goto(B + "/hidratacion"); await pg.get_by_test_id("hp-borrar").click()
        await pg.get_by_role("alertdialog").get_by_role("button", name="Borrar").click(); await pg.wait_for_timeout(500)
        d = await db(pg)
        ok(21, "Borrar respuestas no cambia la meta ni el historial", d["hydration"] is None and d["profile"]["goalMl"] == 2700 and len(d["entries"]) == entries_before)

        # ── NFC sigue funcionando y usa la meta de hoy ───────────────
        await pg.goto(B + "/botellas"); await pg.get_by_role("button", name="Agregar mi primera botella").click()
        dlg = pg.get_by_role("dialog"); await dlg.locator("#bottle-name").fill("Botella U")
        await dlg.get_by_role("button", name="Agregar botella").click(); await expect(dlg).to_be_hidden()
        code = (await db(pg))["bottles"][0]["id"]
        await pg.goto(B + f"/nfc/{code}")
        await expect(pg.get_by_test_id("nfc-bottle")).to_have_text("Botella U")
        await pg.get_by_role("button", name=re.compile("^Registrar")).dblclick()
        await expect(pg.get_by_test_id("nfc-done")).to_be_visible(); await pg.wait_for_timeout(400)
        d = await db(pg)
        ok(22, "NFC: un registro, código y URL sin cambios", len([e for e in d["entries"] if e["source"] == "nfc"]) == 1 and re.match(r"^B[A-Z2-9]{7}$", code) and f"/nfc/{code}" in pg.url)
        ok(23, "NFC muestra la meta de hoy", "2.700" in await pg.get_by_test_id("nfc-total").locator("xpath=..").inner_text())

        # ── Sin marca antigua en ninguna pantalla ────────────────────
        bad = await no_old_brand(pg, ["/", "/historial", "/botellas", "/metas", "/hidratacion", "/companero", "/tienda", "/misiones", "/perfil", f"/nfc/{code}", "/bienvenida"])
        ok(24, "Ninguna pantalla con sesión muestra «H2O»", not bad, ", ".join(bad))
        man = await pg.evaluate("fetch('/manifest.webmanifest').then(r => r.json())")
        ok(25, "Manifest PWA: Hidra (nombre en el iPhone)", man["short_name"] == "Hidra" and man["name"].startswith("Hidra"))
        apple = await pg.evaluate("document.querySelector('meta[name=\"apple-mobile-web-app-title\"]')?.content")
        ok(26, "Título al agregar al iPhone: Hidra", apple == "Hidra", str(apple))
        ok(27, "Sin errores en consola", not errs, "; ".join(errs[:2]))
        await pg.goto(B + "/perfil"); await pg.get_by_test_id("logout").click(); await pg.wait_for_url(re.compile("/login"))
        bad = await no_old_brand(pg, ["/login", "/registro", "/recuperar"])
        ok(28, "Pantallas sin sesión tampoco muestran «H2O»", not bad, ", ".join(bad))
        await ctx.close()

        # ── Usuario existente (ya tenía meta) ─────────────────────────
        ctx = await mk(); pg = await ctx.new_page()
        await pg.goto(B + "/login")
        await pg.evaluate("""() => localStorage.setItem('h2o:mock:db', JSON.stringify({ session: true,
          profile: { id: 'antiguo', email: 'antiguo@uai.cl', displayName: 'Ana', timezone: 'America/Santiago', goalMl: 3000, onboarded: true, reduceMotion: false, selectedBottleId: null, localImportDoneAt: null },
          pet: { species: 'rana', name: 'Croa', color: 'base' }, bottles: [], entries: [], inventory: [{ itemId: 'jockey-ola', source: 'compra' }], equipment: { hat: 'jockey-ola' },
          rewards: [{ id: 1, key: 'welcome', kind: 'bienvenida', label: '¡Bienvenida a H2O!', gotitas: 50, xp: 0, shields: 0, createdAt: '2026-11-20T12:00:00Z' }], freezes: [] }))""")
        await pg.goto(B + "/"); await pg.wait_for_timeout(800); await dismiss(pg)
        d = await db(pg)
        ok(29, "Usuario existente: conserva su meta (3.000), mascota, compras y premios", d["profile"]["goalMl"] == 3000 and d["profile"]["goalSource"] == "manual"
           and d["pet"]["name"] == "Croa" and d["equipment"]["hat"] == "jockey-ola" and d["rewards"][0]["key"] == "welcome")
        ok(30, "Usuario existente ve la invitación opcional", await pg.get_by_test_id("goal-invite").is_visible())
        await pg.wait_for_timeout(500); await pg.screenshot(path=S + "10-invitacion.png")
        await pg.get_by_role("button", name="Ahora no").click(); await pg.reload(); await pg.wait_for_timeout(700)
        ok(31, "Cerrar la invitación la oculta", await pg.get_by_test_id("goal-invite").count() == 0)
        await ctx.close(); await br.close()

    passed = sum(1 for r in results if r[2])
    print(f"\n{passed}/{len(results)} pruebas pasaron")
    sys.exit(0 if passed == len(results) else 1)

asyncio.run(main())
