"""Revisión móvil de producción: desbordes, restos de desarrollo, zoom de iOS, botones pequeños, errores."""
import asyncio, re, sys
from playwright.async_api import async_playwright

B = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3200"
PAGES = ["/login", "/registro", "/recuperar", "/", "/historial", "/botellas", "/metas", "/companero", "/tienda", "/misiones", "/perfil", "/nfc/BNOEXIS2"]
CHECK = """() => {
  const doc = document.documentElement;
  const overflow = doc.scrollWidth > doc.clientWidth + 1;
  const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > doc.clientWidth + 1) && getComputedStyle(e).position !== 'fixed' && !e.closest('[class*=overflow-x-auto]'); }).slice(0,3).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className).toString().slice(0,40));
  const dev = !!document.querySelector('nextjs-portal, [data-nextjs-toast], [data-next-badge], #__next-build-watcher');
  const zoom = [...document.querySelectorAll('input:not([type=checkbox]):not([type=range]), select, textarea')].filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id || e.name || e.tagName);
  const small = [...document.querySelectorAll('button, a')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 28 || r.width < 28) && getComputedStyle(e).visibility !== 'hidden'; }).map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0,25));
  const mock = document.body.innerText.match(/modo de prueba|mock|DEMO/i);
  return { overflow, wide, dev, zoom, small, mock: mock && mock[0] };
}"""

async def main():
    problems = 0
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for w, h in [(320, 640), (375, 667), (390, 844)]:
            ctx = await br.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="es-CL", timezone_id="America/Santiago")
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            # cuenta nueva con mascota y algo de ropa
            await pg.goto(B + "/login"); await pg.fill("#email", f"r{w}@uai.cl"); await pg.fill("#password", "secreta123")
            await pg.get_by_role("button", name="Iniciar sesión").click(); await pg.wait_for_url(re.compile("/bienvenida"))
            await pg.fill("#ob-name", "Benjamín Alejandro"); await pg.get_by_test_id("ob-next").click(); await pg.get_by_test_id("ob-next").click()
            await pg.get_by_test_id("species-conejo").click(); await pg.get_by_test_id("ob-next").click()
            await pg.get_by_label("Nombre de tu compañero").fill("Saltarín Veloz"); await pg.get_by_test_id("ob-next").click()
            await pg.wait_for_url(B + "/"); await pg.wait_for_timeout(600)
            c = pg.get_by_test_id("celebration")
            if await c.count(): await c.get_by_role("button", name="¡Genial!").click()
            for path in PAGES:
                # las pantallas de acceso se revisan sin sesión al final
                if path in ("/login", "/registro", "/recuperar"): continue
                await pg.goto(B + path); await pg.wait_for_timeout(500)
                r = await pg.evaluate(CHECK)
                bad = r["overflow"] or r["dev"] or r["zoom"] or r["mock"]
                if bad or r["small"]:
                    print(f"{w}px {path}: {r}")
                problems += bool(bad)
                if w == 320: await pg.screenshot(path=f"/home/claude/shots/m320{path.replace('/','_') or '_inicio'}.png", full_page=True)
            await pg.goto(B + "/perfil"); await pg.get_by_test_id("logout").click(); await pg.wait_for_url(re.compile("/login"))
            for path in ("/login", "/registro", "/recuperar"):
                await pg.goto(B + path); await pg.wait_for_timeout(400)
                r = await pg.evaluate(CHECK)
                bad = r["overflow"] or r["dev"] or r["zoom"] or r["mock"]
                if bad or r["small"]: print(f"{w}px {path}: {r}")
                problems += bool(bad)
            errs = [e for e in errs if "caret-color" not in e and "hydrated but some attributes" not in e]
            if errs: print(f"{w}px errores:", errs[:3]); problems += 1
            await ctx.close()
        await br.close()
    print("PROBLEMAS GRAVES:", problems)

asyncio.run(main())
