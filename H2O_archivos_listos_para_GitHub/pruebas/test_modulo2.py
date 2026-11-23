"""Pruebas del Módulo 2 de H2O (navegador real, pantalla de celular)."""
import asyncio, re
from playwright.async_api import async_playwright, expect

B = "http://localhost:3000"
S = "/home/claude/shots/m2-"
results = []

def ok(n, name, cond, detail=""):
    results.append((n, name, cond, detail))
    print(("PASA " if cond else "FALLA"), n, name, detail)

async def txt(pg, tid):
    return (await pg.get_by_test_id(tid).inner_text()).strip()

async def register(pg, amount=None, custom=None, double=False):
    await pg.get_by_role("button", name="Registrar agua").click()
    dlg = pg.get_by_role("dialog", name="Registrar agua")
    if custom is not None:
        await dlg.get_by_role("button", name=re.compile("^Otra")).click()
        await dlg.locator("#custom-ml").fill(str(custom))
    else:
        await dlg.get_by_role("button", name=re.compile(rf"^{amount}\s*ml$")).click()
    btn = dlg.get_by_role("button", name=re.compile("^(Registrar|¡Registrado)"))
    if double:
        await btn.dblclick()
    else:
        await btn.click()
    await expect(dlg).to_be_hidden()

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                   is_mobile=True, has_touch=True, timezone_id="America/Santiago", locale="es-CL")
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

        # Reloj controlado: 22/11 a las 23:58 (para probar el cambio de día)
        await pg.clock.install(time="2026-11-22T23:58:00-03:00")
        await pg.goto(B + "/")
        await pg.wait_for_timeout(500)
        ok(0, "Estado inicial vacío", await txt(pg, "total") == "0", await txt(pg, "total"))
        await pg.screenshot(path=S + "1-vacio.png")

        # Registro "ayer" a las 23:58
        await register(pg, 500)
        ayer_total = await txt(pg, "total")

        # Pasa la medianoche SIN recargar
        await pg.clock.run_for("03:00")
        await pg.wait_for_timeout(300)
        t = await txt(pg, "total")
        ok(7, "Registros de ayer no se suman a hoy (cambio de día sin recargar)", ayer_total == "500" and t == "0",
           f"ayer={ayer_total}, hoy tras medianoche={t}")

        # Prueba 1
        await register(pg, 250)
        ok(1, "Registrar 250 ml aumenta el consumo", await txt(pg, "total") == "250", await txt(pg, "total"))
        await pg.screenshot(path=S + "2-toast.png")
        fecha = await pg.locator("h1 + p").first.inner_text()
        ok("7b", "La fecha del encabezado cambia sola a medianoche", "23 de noviembre" in fecha, fecha)

        # Prueba 2 y 3
        await register(pg, 500)
        total, pct = await txt(pg, "total"), await txt(pg, "pct")
        ok(2, "250 + 500 = 750 ml", total == "750", total)
        ok(3, "Progreso con meta 2.000 = 37,5%", pct == "37,5%" and await txt(pg, "goal") == "2.000 ml",
           f"{pct} / {await txt(pg, 'goal')}")
        rem = await txt(pg, "remaining")
        ok("3b", "Restante = 1.250 ml", "1.250 ml" in rem, rem)

        # Prueba 4: recarga
        await pg.reload(); await pg.wait_for_timeout(500)
        ok(4, "Los registros permanecen al recargar",
           await txt(pg, "total") == "750" and await txt(pg, "count") == "2",
           f"total={await txt(pg,'total')} registros={await txt(pg,'count')}")

        # Doble toque rápido no duplica
        await register(pg, 150, double=True)
        ok("4b", "Doble toque rápido registra una sola vez",
           await txt(pg, "total") == "900" and await txt(pg, "count") == "3",
           f"total={await txt(pg,'total')} registros={await txt(pg,'count')}")

        # Cantidad inválida bloqueada
        await pg.get_by_role("button", name="Registrar agua").click()
        dlg = pg.get_by_role("dialog", name="Registrar agua")
        await dlg.get_by_role("button", name=re.compile("^Otra")).click()
        await dlg.locator("#custom-ml").fill("5000")
        disabled = await dlg.get_by_role("button", name=re.compile("^Registrar")).is_disabled()
        await pg.screenshot(path=S + "3-otra-invalida.png")
        await dlg.locator("#custom-ml").fill("330")
        await pg.screenshot(path=S + "3b-otra.png")
        await dlg.get_by_label("Cerrar").click()
        ok("4c", "Cantidad fuera de rango no se puede registrar; cerrar sin confirmar no guarda",
           disabled and await txt(pg, "total") == "900", f"botón desactivado={disabled}, total={await txt(pg,'total')}")

        # Prueba 5: eliminar con confirmación
        await pg.locator("nav.fixed").get_by_role("link", name="Historial").click()
        await pg.wait_for_timeout(500)
        entries = pg.get_by_test_id("entry")
        first_time = await entries.first.inner_text()
        order_ok = "150 ml" in first_time  # el más reciente arriba
        await pg.get_by_role("button", name=re.compile("Eliminar registro de 250 ml")).click()
        await pg.screenshot(path=S + "4-confirmar-eliminar.png")
        await pg.get_by_role("alertdialog").get_by_role("button", name="Cancelar").click()
        still = await txt(pg, "hist-total")
        await pg.get_by_role("button", name=re.compile("Eliminar registro de 250 ml")).click()
        await pg.get_by_role("alertdialog").get_by_role("button", name="Eliminar").click()
        await pg.wait_for_timeout(300)
        after = await txt(pg, "hist-total")
        await pg.screenshot(path=S + "5-historial.png")
        await pg.locator("nav.fixed").get_by_role("link", name="Inicio").click(); await pg.wait_for_timeout(400)
        ok(5, "Eliminar recalcula el total (900 − 250 = 650); Cancelar no borra; orden más reciente primero",
           still == "900 ml" and after == "650 ml" and await txt(pg, "total") == "650" and order_ok,
           f"tras cancelar={still}, tras eliminar={after}, dashboard={await txt(pg,'total')}, orden_ok={order_ok}")

        # Prueba 6: superar la meta
        await register(pg, custom=3000)
        total, pct = await txt(pg, "total"), await txt(pg, "pct")
        width = await pg.get_by_test_id("bar").evaluate("e => e.style.width")
        rem = await txt(pg, "remaining")
        ok(6, "Superar la meta: total sigue sumando, barra topa en 100%, sin errores",
           total == "3.650" and pct == "182,5%" and width == "100%" and "1.650 ml" in rem and not errs,
           f"total={total}, pct={pct}, barra={width}, '{rem}'")
        await pg.wait_for_timeout(100)
        await pg.clock.run_for(3000)  # deja que el aviso desaparezca
        await pg.screenshot(path=S + "6-meta-superada.png", full_page=True)

        # Meta configurable y persistente
        await pg.locator("nav.fixed").get_by_role("link", name="Metas").click(); await pg.wait_for_timeout(400)
        await pg.get_by_role("button", name="2,5 L").click()
        await pg.get_by_role("button", name="Guardar meta").click()
        await pg.reload(); await pg.wait_for_timeout(400)
        await pg.locator("nav.fixed").get_by_role("link", name="Inicio").click(); await pg.wait_for_timeout(400)
        ok("6b", "Meta configurable y guardada (2.500 ml tras recargar)",
           await txt(pg, "goal") == "2.500 ml" and await txt(pg, "pct") == "146%",
           f"{await txt(pg,'goal')} {await txt(pg,'pct')}")

        # Prueba 8: móvil sin desborde horizontal
        overflow = await pg.evaluate("document.documentElement.scrollWidth > 390")
        small = await br.new_context(viewport={"width": 320, "height": 640}, is_mobile=True, has_touch=True)
        sp = await small.new_page(); await sp.goto(B + "/"); await sp.wait_for_timeout(400)
        overflow_small = await sp.evaluate("document.documentElement.scrollWidth > 320")
        ok(8, "Pantalla móvil (390 px y 320 px) sin desborde ni errores de consola",
           not overflow and not overflow_small and not errs, f"desborde={overflow}/{overflow_small}, errores={errs}")

        # Datos guardados (para mostrar la estructura)
        raw = await pg.evaluate("localStorage.getItem('h2o:v1:entries')")
        print("\nEJEMPLO DE REGISTRO GUARDADO:", raw[:260], "...")

        # Captura escritorio
        d = await br.new_context(viewport={"width": 1366, "height": 860}, timezone_id="America/Santiago")
        dp = await d.new_page(); await dp.goto(B + "/"); await dp.wait_for_timeout(400)
        await register(dp, 250); await dp.wait_for_timeout(200)
        await dp.screenshot(path=S + "7-escritorio.png")
        await br.close()

    passed = sum(1 for r in results if r[2])
    print(f"\n{passed}/{len(results)} pruebas pasaron")

asyncio.run(main())
