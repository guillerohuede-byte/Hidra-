// Genera la migración del catálogo desde lib/game/catalog.ts
// Uso: node scripts/gen-catalog-sql.mjs > supabase/migrations/20261125000002_catalogo_tienda.sql
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../lib/game/catalog.ts", import.meta.url), "utf8");
const brands = {};
for (const m of src.matchAll(/^\s+(\w+): \{ id: "(\w+)", name: "([^"]+)"/gm)) brands[m[1]] = m[3];
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const rows = [];
let sort = 0;
for (const m of src.matchAll(/\{ id: "([a-z0-9-]+)", slot: "(\w+)", brand: "(\w+)", name: "([^"]+)", price: (\d+), rarity: "(\w+)", purchasable: (true|false)/g)) {
  sort += 10;
  rows.push(`  (${q(m[1])}, ${q(m[2])}, ${q(brands[m[3]])}, ${q(m[4])}, ${m[5]}, ${q(m[6])}, ${m[7]}, ${sort})`);
}
console.log(`-- H2O · Migración 2: catálogo de la tienda (generado desde lib/game/catalog.ts)
insert into public.shop_items (id, slot, brand, name, price, rarity, purchasable, sort) values
${rows.join(",\n")}
on conflict (id) do update set slot = excluded.slot, brand = excluded.brand, name = excluded.name,
  price = excluded.price, rarity = excluded.rarity, purchasable = excluded.purchasable, sort = excluded.sort;`);
