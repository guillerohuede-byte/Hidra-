"""Pruebas del Módulo 4 de H2O — Registro por NFC (enlace del sticker).
Simula lo que hace el celular al leer el sticker: abrir el enlace directamente."""
import asyncio, json, re
from playwright.async_api import async_playwright, expect

B = "http://localhost:3000"
S = "/home/claude/shots/m4-"
results = []

def ok(n, name, cond, detail=""):
    results.append((n, name, cond))
    print(("PASA " if cond else "FALLA"), n, name, "|", detail)

async def stored(pg, key):
    return json.loads(await pg.evaluate(f"localStorage.getItem('{key}')") or "null")

async def add_bottle(pg, name, cap, amt):
    btn = pg.get_by_role("button", name=re.compile("^(Agregar mi primera botella|Agregar)$")).first
    await btn.click()
    dlg = pg.get_by_role("dialog")
    await dlg.locator("#bottle-name").fill(name)
    await dlg.get_by_role("button", name=re.compile(rf"^{cap:,}".replace(",", ".") + r" ml$")).first.click()
    await dlg.get_by_role("button", name=re.compile(rf"^{amt} ml$")).last.click()
    await dlg.get_by_role("button", name="Agregar botella").click()
    await expect(dlg).to_be_hidden()

async def nfc_panel(pg, name):
    await pg.get_by_role("button", name=f"Configurar NFC de {name}").click()
    dlg = pg.get_by_role("dialog", name="Configurar NFC")
    code = (await dlg.get_by_test_id("nfc-code").inner_text()).strip()
    url = (await dlg.get_by_test_id("nfc-url").inner_text()).strip()
    return dlg, code, url

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True,
                                   has_touch=True, timezone_id="America/Santiago", locale="es-CL",
                                   permissions=["clipboard-read", "clipboard-write"])
        pg = await ctx.new_page()
        errs = []
        def watch(page):
            page.on("pageerror", lambda e: errs.append(str(e)))
            page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        watch(pg)

        await pg.goto(B + "/botellas"); await pg.wait_for_timeout(400)
        await add_bottle(pg, "Mi botella de la U", 600, 250)
        await add_bottle(pg, "Botella del gym", 1000, 500)
        await pg.wait_for_timeout(300)

        # 1. Identificador estable y único
        dlg, code1, url1 = await nfc_panel(pg, "Mi botella de la U")
        warn = await dlg.get_by_text("Todavía no grabes este enlace").is_visible()
        await pg.screenshot(path=S + "1-configurar.png")
        await dlg.get_by_label("Cerrar").click()
        dlg, code1b, url1b = await nfc_panel(pg, "Mi botella de la U")
        await dlg.get_by_label("Cerrar").click()
        await pg.reload(); await pg.wait_for_timeout(400)
        dlg, code1c, _ = await nfc_panel(pg, "Mi botella de la U")
        await dlg.get_by_label("Cerrar").click()
        dlg, code2, url2 = await nfc_panel(pg, "Botella del gym")
        await dlg.get_by_label("Cerrar").click()
        ok(1, "Identificador estable (no cambia al reabrir ni al recargar) y único por botella",
           code1 == code1b == code1c and code1 != code2 and url1 == f"{B}/nfc/{code1}" and re.fullmatch(r"B[A-Z2-9]{7}", code1),
           f"U={code1} (x3), gym={code2}, enlace={url1}")
        ok("1b", "Advierte que un enlace de localhost/HTTP no sirve para grabar", warn, f"advertencia visible={warn}")

        # 2. Copiar
        dlg, _, _ = await nfc_panel(pg, "Mi botella de la U")
        await dlg.get_by_role("button", name="Copiar enlace").click()
        await expect(dlg.get_by_role("button", name="¡Copiado!")).to_be_visible()
        clip = await pg.evaluate("navigator.clipboard.readText()")
        await dlg.get_by_label("Cerrar").click()
        ok(2, "El enlace se copia al portapapeles", clip == url1, f"portapapeles={clip}")

        # 3. Abrir la dirección directamente (como hace el sticker)
        n0 = len(await stored(pg, "h2o:v1:entries") or [])
        scan = await ctx.new_page(); watch(scan)
        await scan.goto(url1); await scan.wait_for_timeout(500)
        name = (await scan.get_by_test_id("nfc-bottle").inner_text()).strip()
        has_nav = await scan.locator("nav.fixed").count()
        n_open = len(await stored(scan, "h2o:v1:entries") or [])
        ok(3, "Abrir el enlace directamente reconoce la botella (sin menús) y NO registra solo",
           name == "Mi botella de la U" and has_nav == 0 and n_open == n0, f"botella='{name}', registros al abrir={n_open - n0}")

        # 4. Cantidad predeterminada
        btn = scan.get_by_role("button", name=re.compile(r"^Registrar"))
        label4 = (await btn.inner_text()).strip()
        await scan.screenshot(path=S + "2-confirmar.png")
        ok(4, "Muestra la cantidad habitual correcta preseleccionada", label4 == "Registrar 250 ml", label4)

        # 5. Modificar la cantidad (y rechazar cantidades inválidas)
        await scan.get_by_role("button", name=re.compile("^Otra")).click()
        await scan.locator("#custom-ml").fill("0")
        dis0 = await btn.is_disabled()
        await scan.locator("#custom-ml").fill("5000")
        dis5 = await btn.is_disabled()
        await scan.locator("#custom-ml").fill("330")
        label5 = (await btn.inner_text()).strip()
        await scan.screenshot(path=S + "3-modificar.png")
        ok(5, "Se puede cambiar la cantidad; 0 y 5.000 ml quedan bloqueados", dis0 and dis5 and label5 == "Registrar 330 ml",
           f"0→bloqueado={dis0}, 5000→bloqueado={dis5}, 330→'{label5}'")

        # 9. Doble toque rápido = un solo registro
        await btn.dblclick()
        await expect(scan.get_by_test_id("nfc-done")).to_be_visible()
        await scan.wait_for_timeout(200)
        still_here = "/nfc/" in scan.url
        entries = await stored(scan, "h2o:v1:entries")
        nfc_entries = [e for e in entries if e.get("source") == "nfc"]
        await scan.wait_for_timeout(700)
        await scan.screenshot(path=S + "4-listo.png")
        ok(9, "Doble toque en 'Registrar' guarda un solo consumo (y no navega por accidente)",
           len(entries) == n0 + 1 and still_here, f"registros nuevos={len(entries) - n0}, sigue en pantalla NFC={still_here}")

        # 6. Registro real, asociado a la botella, y dashboard actualizado
        e = nfc_entries[-1] if nfc_entries else {}
        done_txt = (await scan.get_by_test_id("nfc-done").inner_text()).strip()
        await scan.get_by_role("link", name="Ir al inicio", exact=True).last.click(); await scan.wait_for_timeout(500)
        total = (await scan.get_by_test_id("total").inner_text()).strip()
        await scan.screenshot(path=S + "5-dashboard.png")
        ok(6, "Confirmar guarda un registro NFC asociado a la botella y actualiza el dashboard",
           e.get("source") == "nfc" and e.get("bottleId") == code1 and e.get("bottleName") == "Mi botella de la U"
           and e.get("amountMl") == 330 and total == "330" and "330 ml" in done_txt,
           f"registro={ {k: e.get(k) for k in ('amountMl', 'source', 'bottleId', 'bottleName')} }, dashboard={total}")

        # 7. Persistencia + recargar la pantalla NFC no repite
        await scan.reload(); await scan.wait_for_timeout(400)
        total_r = (await scan.get_by_test_id("total").inner_text()).strip()
        p2 = await ctx.new_page(); watch(p2)
        await p2.goto(url1); await btn_wait(p2)
        await p2.get_by_role("button", name="Registrar 250 ml").click()
        await expect(p2.get_by_test_id("nfc-done")).to_be_visible()
        n_before_reload = len(await stored(p2, "h2o:v1:entries"))
        await p2.reload(); await p2.wait_for_timeout(500)
        reload_txt = (await p2.get_by_test_id("nfc-done").inner_text()).strip()
        await p2.screenshot(path=S + "6-recarga.png")
        n_after_reload = len(await stored(p2, "h2o:v1:entries"))
        # escaneo nuevo (navegación nueva, no recarga) sí permite registrar otra vez
        await p2.goto(url1); await p2.wait_for_timeout(500)
        new_scan_ready = await p2.get_by_role("button", name="Registrar 250 ml").is_visible()
        ok(7, "Datos persisten; recargar tras registrar NO duplica; un escaneo nuevo sí permite registrar",
           total_r == "330" and reload_txt.startswith("Ya registraste 250 ml") and n_after_reload == n_before_reload and new_scan_ready,
           f"dashboard tras recargar={total_r}, recarga muestra '{reload_txt}', nuevo escaneo listo={new_scan_ready}")

        # 8. URLs incorrectas → nunca registran
        n_pre = len(await stored(p2, "h2o:v1:entries"))
        msgs = {}
        for label, path in [("inválida", "/nfc/hola-mundo"), ("inexistente", "/nfc/BZZZZZZZ"), ("corta", "/nfc/B12"), ("símbolos", "/nfc/B7JT%3Cscript%3E")]:
            await p2.goto(B + path); await p2.wait_for_timeout(400)
            msgs[label] = (await p2.get_by_test_id("nfc-error").inner_text()).strip()
        await p2.screenshot(path=S + "7-error.png")
        # minúsculas (por si NFC Tools cambia mayúsculas) → se reconoce igual
        await p2.goto(f"{B}/nfc/{code1.lower()}"); await p2.wait_for_timeout(400)
        lower_ok = (await p2.get_by_test_id("nfc-bottle").inner_text()).strip() == "Mi botella de la U"
        # botella eliminada
        await p2.goto(B + "/botellas"); await p2.wait_for_timeout(400)
        await p2.get_by_role("button", name="Eliminar Botella del gym").click()
        await p2.get_by_role("alertdialog").get_by_role("button", name="Eliminar").click()
        await p2.goto(url2); await p2.wait_for_timeout(400)
        msgs["eliminada"] = (await p2.get_by_test_id("nfc-error").inner_text()).strip()
        await p2.screenshot(path=S + "8-eliminada.png")
        # otro navegador / dispositivo sin datos
        other = await br.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        op = await other.new_page(); await op.goto(url1); await op.wait_for_timeout(400)
        msgs["otro navegador"] = (await op.get_by_test_id("nfc-error").inner_text()).strip()
        o_entries = await op.evaluate("localStorage.getItem('h2o:v1:entries')")
        n_post = len(await stored(p2, "h2o:v1:entries"))
        ok(8, "URLs incorrectas, botella eliminada u otro navegador: mensaje claro y CERO registros",
           n_post == n_pre and o_entries is None and msgs["inválida"] == "Este enlace no es válido"
           and msgs["inexistente"] == "No encontramos esta botella" and msgs["eliminada"] == "Esta botella fue eliminada"
           and msgs["otro navegador"] == "No encontramos esta botella" and msgs["corta"] == msgs["símbolos"] == "Este enlace no es válido" and lower_ok,
           f"{msgs}; minúsculas reconocidas={lower_ok}")

        # Pantalla NFC en celular chico
        small = await br.new_context(viewport={"width": 320, "height": 640}, is_mobile=True, has_touch=True)
        sp = await small.new_page()
        await sp.goto(B + "/botellas")
        await sp.evaluate(f"localStorage.setItem('h2o:v1:bottles', JSON.stringify([{{id:'{code1}',name:'Botella con un nombre bien largo',capacityMl:750,defaultAmountMl:330,color:'#1f78ee',createdAt:''}}]))")
        await sp.goto(f"{B}/nfc/{code1}"); await sp.wait_for_timeout(400)
        w = await sp.evaluate("document.documentElement.scrollWidth")
        ok("UI", "Pantalla NFC sin desborde a 320 px y sin errores de consola", w <= 320 and not errs, f"ancho={w}, errores={errs}")

        await br.close()
    print(f"\n{sum(1 for r in results if r[2])}/{len(results)} pruebas pasaron")

async def btn_wait(page):
    await page.get_by_role("button", name=re.compile(r"^Registrar")).wait_for()

asyncio.run(main())
