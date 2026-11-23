"""Pruebas del Módulo 3 de H2O — Mis botellas (navegador real, pantalla de celular)."""
import asyncio, json, re
from playwright.async_api import async_playwright, expect

B = "http://localhost:3000"
S = "/home/claude/shots/m3-"
results = []

def ok(n, name, cond, detail=""):
    results.append((n, name, cond))
    print(("PASA " if cond else "FALLA"), n, name, "|", detail)

async def txt(pg, tid):
    return (await pg.get_by_test_id(tid).first.inner_text()).strip()

async def go(pg, name):
    await pg.locator("nav.fixed").get_by_role("link", name=name).click()
    await pg.wait_for_timeout(400)

async def fill_bottle(pg, name, cap, amt, shot=None):
    dlg = pg.get_by_role("dialog")
    await dlg.locator("#bottle-name").fill(name)
    if isinstance(cap, int) and cap in (350, 500, 600, 750, 1000):
        await dlg.get_by_role("button", name=re.compile(rf"^{cap:,}".replace(",", ".") + r" ml$")).click()
    else:
        await dlg.get_by_role("button", name="Otra").first.click()
        await dlg.get_by_label("Capacidad personalizada en ml").fill(str(cap))
    if amt in (150, 250, 500):
        await dlg.get_by_role("button", name=re.compile(rf"^{amt} ml$")).last.click()
    else:
        await dlg.get_by_role("button", name="Otra").last.click()
        await dlg.get_by_label("Cantidad habitual personalizada en ml").fill(str(amt))
    if shot:
        await pg.screenshot(path=S + shot)
    await dlg.get_by_role("button", name=re.compile("^(Agregar botella|Guardar cambios)$")).click()

async def open_sheet(pg):
    await pg.get_by_role("button", name="Registrar agua").click()
    return pg.get_by_role("dialog", name="Registrar agua")

async def confirm_sheet(dlg):
    await dlg.get_by_role("button", name=re.compile("^Registrar ")).click()
    await expect(dlg).to_be_hidden()

async def stored(pg, key):
    return json.loads(await pg.evaluate(f"localStorage.getItem('{key}')") or "null")

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True,
                                   has_touch=True, timezone_id="America/Santiago", locale="es-CL")
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.clock.install(time="2026-11-23T10:00:00-03:00")

        # Datos "antiguos" del Módulo 2 (sin botella) para comprobar que no se pierden
        await pg.goto(B + "/")
        legacy = [{"id": "legacy-1", "amountMl": 300, "timestamp": "2026-11-23T11:00:00.000Z",
                   "date": "2026-11-23", "time": "08:00", "source": "manual"}]
        await pg.evaluate(f"localStorage.setItem('h2o:v1:entries', JSON.stringify({json.dumps(legacy)}))")
        await pg.reload(); await pg.wait_for_timeout(400)
        ok(0, "Registros antiguos (sin botella) siguen contando", await txt(pg, "total") == "300", await txt(pg, "total"))

        # Pantalla vacía
        await go(pg, "Mis botellas")
        empty = await pg.get_by_role("button", name="Agregar mi primera botella").is_visible()
        await pg.screenshot(path=S + "1-vacio.png")

        # 1 y 2: botella de 600 ml con 250 ml habituales
        await pg.get_by_role("button", name="Agregar mi primera botella").click()
        await fill_bottle(pg, "Botella de la U", 600, 250, shot="2-formulario.png")
        await pg.wait_for_timeout(300)
        card = pg.get_by_test_id("bottle-card").first
        ctext = await card.inner_text()
        ok("1-2", "Crear botella 600 ml con cantidad habitual 250 ml (queda en uso)",
           empty and "Capacidad 600 ml" in ctext and "250 ml" in ctext and "En uso" in ctext, ctext.replace("\n", " · "))

        # Validaciones del formulario
        await pg.get_by_role("button", name="Agregar", exact=True).click()
        dlg = pg.get_by_role("dialog")
        await dlg.locator("#bottle-name").fill("Prueba")
        await dlg.get_by_role("button", name="350 ml").click()
        await dlg.get_by_role("button", name="Otra").last.click()
        await dlg.get_by_label("Cantidad habitual personalizada en ml").fill("500")
        await dlg.get_by_role("button", name="Agregar botella").click()
        e1 = await dlg.get_by_role("alert").inner_text()
        await pg.screenshot(path=S + "3-validacion.png")
        await dlg.locator("#bottle-name").fill("botella de la u")
        await dlg.get_by_label("Cantidad habitual personalizada en ml").fill("200")
        e2 = await dlg.get_by_role("alert").inner_text()
        await dlg.locator("#bottle-name").fill("")
        e3 = await dlg.get_by_role("alert").inner_text()
        await dlg.get_by_label("Cantidad habitual personalizada en ml").fill("-5")
        await dlg.locator("#bottle-name").fill("Algo")
        e4 = await dlg.get_by_role("alert").inner_text()
        await dlg.get_by_label("Cerrar").click()
        n_after = len(await stored(pg, "h2o:v1:bottles"))
        ok("val", "Validación: habitual > capacidad, nombre repetido, nombre vacío y negativos se rechazan",
           "mayor que la capacidad" in e1 and "ese nombre" in e2 and "nombre" in e3 and "positivo" in e4 and n_after == 1,
           f"'{e1}' / '{e2}' / '{e3}' / '{e4}' / botellas={n_after}")

        # 3: segunda botella 1.000 ml (habitual 500)
        await pg.get_by_role("button", name="Agregar", exact=True).click()
        await fill_bottle(pg, "Botella del gym", 1000, 500)
        await pg.wait_for_timeout(300)
        bottles = await stored(pg, "h2o:v1:bottles")
        ids = [b["id"] for b in bottles]
        ok(3, "Crear segunda botella de 1.000 ml; ids únicos y estables",
           len(bottles) == 2 and len(set(ids)) == 2 and all(re.fullmatch(r"B[A-Z2-9]{7}", i) for i in ids)
           and bottles[1]["capacityMl"] == 1000, f"ids={ids}")

        # 4: cambiar entre botellas
        await pg.get_by_role("button", name="Usar Botella del gym").click()
        await pg.wait_for_timeout(300)
        gym_sel = await pg.get_by_role("button", name="Usar Botella del gym").get_attribute("aria-pressed")
        u_sel = await pg.get_by_role("button", name="Usar Botella de la U").get_attribute("aria-pressed")
        await pg.screenshot(path=S + "4-lista.png")
        await go(pg, "Inicio")
        cur = await txt(pg, "current-bottle")
        ok(4, "Cambiar de botella: queda una sola 'En uso' y el dashboard la muestra",
           gym_sel == "true" and u_sel == "false" and cur == "Botella del gym", f"gym={gym_sel}, U={u_sel}, dashboard={cur}")

        # 5: registrar con la cantidad habitual de cada una
        dlg = await open_sheet(pg)
        sb = await dlg.get_by_test_id("sheet-bottle").inner_text()
        btn = await dlg.get_by_role("button", name=re.compile("^Registrar ")).inner_text()
        await pg.screenshot(path=S + "5-registrar-gym.png")
        await confirm_sheet(dlg)
        t_gym = await txt(pg, "total")
        await go(pg, "Mis botellas")
        await pg.get_by_role("button", name="Usar Botella de la U").click()
        await go(pg, "Inicio")
        dlg = await open_sheet(pg)
        btn2 = await dlg.get_by_role("button", name=re.compile("^Registrar ")).inner_text()
        await confirm_sheet(dlg)
        t_u = await txt(pg, "total")
        # Modificar la cantidad antes de confirmar
        dlg = await open_sheet(pg)
        await dlg.get_by_role("button", name=re.compile("^Otra")).click()
        await dlg.locator("#custom-ml").fill("100")
        await confirm_sheet(dlg)
        t_mod = await txt(pg, "total")
        ok(5, "Registrar usando la cantidad habitual de cada botella (y poder cambiarla)",
           "Botella del gym" in sb and "500 ml" in btn and t_gym == "800" and "250 ml" in btn2 and t_u == "1.050"
           and t_mod == "1.150", f"gym→'{btn.strip()}' total {t_gym}; U→'{btn2.strip()}' total {t_u}; +100 manual → {t_mod}")

        # 6: dashboard acumula todo
        entries = await stored(pg, "h2o:v1:entries")
        names = [e.get("bottleName") for e in entries]
        ok(6, "El dashboard acumula todos los consumos y cada registro sabe de qué botella viene",
           await txt(pg, "total") == "1.150" and await txt(pg, "count") == "4"
           and names == [None, "Botella del gym", "Botella de la U", "Botella de la U"], f"botellas por registro={names}")
        await pg.screenshot(path=S + "6-dashboard.png")

        # 7: recargar
        await pg.reload(); await pg.wait_for_timeout(500)
        cur = await txt(pg, "current-bottle")
        await go(pg, "Mis botellas")
        n_cards = await pg.get_by_test_id("bottle-card").count()
        ok(7, "Tras recargar se mantienen botellas, configuración, selección y registros",
           cur == "Botella de la U" and n_cards == 2 and len(await stored(pg, "h2o:v1:entries")) == 4,
           f"en uso={cur}, botellas={n_cards}")

        # 8: editar sin alterar registros anteriores
        id_before = (await stored(pg, "h2o:v1:bottles"))[0]["id"]
        await pg.get_by_role("button", name="Editar Botella de la U").click()
        dlg = pg.get_by_role("dialog")
        prefill = (await dlg.locator("#bottle-name").input_value(),
                   await dlg.get_by_role("button", name="600 ml").get_attribute("aria-pressed"))
        await fill_bottle(pg, "Botella U (nueva)", 750, 330)
        await pg.wait_for_timeout(300)
        b0 = (await stored(pg, "h2o:v1:bottles"))[0]
        entries2 = await stored(pg, "h2o:v1:entries")
        await go(pg, "Historial")
        hist = await pg.locator("main").inner_text()
        ok(8, "Editar botella: formulario precargado, mismo id, registros anteriores intactos",
           prefill == ("Botella de la U", "true") and b0["id"] == id_before and b0["name"] == "Botella U (nueva)"
           and b0["capacityMl"] == 750 and b0["defaultAmountMl"] == 330 and entries2 == entries
           and "Botella de la U" in hist and await txt(pg, "hist-total") == "1.150 ml",
           f"id {id_before}→{b0['id']}, precarga={prefill}")
        await go(pg, "Inicio")
        dlg = await open_sheet(pg)
        btn3 = await dlg.get_by_role("button", name=re.compile("^Registrar ")).inner_text()
        await pg.screenshot(path=S + "7-habitual-330.png")
        await dlg.get_by_label("Cerrar").click()
        ok("8b", "La nueva cantidad habitual (330, fuera de los atajos) aparece preseleccionada", "330 ml" in btn3, btn3.strip())

        # 9: eliminar botellas sin borrar historial
        await go(pg, "Mis botellas")
        await pg.get_by_role("button", name="Eliminar Botella U (nueva)").click()
        await pg.screenshot(path=S + "8-eliminar.png")
        await pg.get_by_role("alertdialog").get_by_role("button", name="Eliminar").click()
        await pg.wait_for_timeout(300)
        gym_now = await pg.get_by_role("button", name="Usar Botella del gym").get_attribute("aria-pressed")
        await pg.get_by_role("button", name="Eliminar Botella del gym").click()
        await pg.get_by_role("alertdialog").get_by_role("button", name="Eliminar").click()
        await pg.wait_for_timeout(300)
        empty_again = await pg.get_by_role("button", name="Agregar mi primera botella").is_visible()
        entries3 = await stored(pg, "h2o:v1:entries")
        await go(pg, "Historial")
        hist = await pg.locator("main").inner_text()
        await pg.screenshot(path=S + "9-historial.png")
        await go(pg, "Inicio")
        dlg = await open_sheet(pg)
        no_bottle = "Sin botella seleccionada" in await dlg.inner_text()
        await dlg.get_by_label("Cerrar").click()
        ok(9, "Eliminar botellas no borra historial; si se elimina la que está en uso, pasa a la otra / a ninguna",
           gym_now == "true" and empty_again and entries3 == entries and "Botella del gym" in hist
           and "Botella de la U" in hist and await txt(pg, "total") == "1.150" and no_bottle,
           f"tras borrar la en uso, gym en uso={gym_now}; registros intactos={entries3 == entries}")

        # 10: móvil
        overflow = await pg.evaluate("document.documentElement.scrollWidth > 390")
        small = await br.new_context(viewport={"width": 320, "height": 640}, is_mobile=True, has_touch=True)
        sp = await small.new_page()
        await sp.goto(B + "/botellas"); await sp.wait_for_timeout(300)
        await sp.get_by_role("button", name="Agregar mi primera botella").click()
        await fill_bottle(sp, "Botella con un nombre bien largo", 750, 250)
        await sp.wait_for_timeout(300)
        o2 = await sp.evaluate("document.documentElement.scrollWidth > 320")
        await sp.screenshot(path=S + "10-320px.png")
        ok(10, "Diseño móvil (390 px y 320 px, nombre largo) sin desborde ni errores de consola",
           not overflow and not o2 and not errs, f"desborde={overflow}/{o2}, errores={errs}")

        # Escritorio
        d = await br.new_context(viewport={"width": 1366, "height": 860})
        dp = await d.new_page(); await dp.goto(B + "/botellas"); await dp.wait_for_timeout(300)
        for nm, cap, amt in [("Botella de la U", 600, 250), ("Botella del gym", 1000, 500), ("Vaso oficina", 350, 150)]:
            await dp.get_by_role("button", name=re.compile("^(Agregar mi primera botella|Agregar)$")).first.click()
            await fill_bottle(dp, nm, cap, amt)
            await dp.wait_for_timeout(250)
        await dp.wait_for_timeout(2500)
        await dp.screenshot(path=S + "11-escritorio.png")
        await br.close()

    print(f"\n{sum(1 for r in results if r[2])}/{len(results)} pruebas pasaron")

asyncio.run(main())
