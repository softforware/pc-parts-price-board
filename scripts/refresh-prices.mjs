// Refreshes prices.json from store APIs. Run by .github/workflows/refresh-prices.yml once a day.
// Stores without an API key configured are skipped and keep their previous prices.
//
//   EBAY_CLIENT_ID, EBAY_CLIENT_SECRET  eBay Browse API (developer.ebay.com, production keyset)
//   BESTBUY_API_KEY                     Best Buy Products API (developer.bestbuy.com)

import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../prices.json", import.meta.url);
const data = JSON.parse(await readFile(FILE, "utf8"));
data.checked ||= {};
const now = new Date().toISOString();
let changed = 0;

// Words that mark a listing as something other than a working, complete part
const JUNK = /box only|empty box|for parts|not working|broken|untested|damaged|as[- ]is|read desc|lot of|bundle|combo|motherboard|laptop|notebook|mobile|cooler only|heatsink only|shroud|backplate|bracket|fan replacement|replacement fan|\bcase\b/i;

// eBay search per part: query, category, words that must appear, words that rule a listing out
const EBAY = {
  lpx:      { q: "Corsair Vengeance LPX 32GB 2x16GB DDR4 3200 CL16", cat: 170083, must: ["vengeance", "lpx", "32gb", "3200"] },
  rjv:      { q: "G.Skill Ripjaws V 32GB 2x16GB DDR4 3600 CL18",     cat: 170083, must: ["ripjaws", "32gb", "3600"] },
  vlz:      { q: "TeamGroup T-Force Vulcan Z 32GB 2x16GB DDR4 3200", cat: 170083, must: ["vulcan", "32gb", "3200"] },
  cv5:      { q: "Corsair Vengeance 32GB 2x16GB DDR5 6000 CL30",     cat: 170083, must: ["vengeance", "32gb", "ddr5", "6000"] },
  fx5:      { q: "G.Skill Flare X5 32GB 2x16GB DDR5 6000 CL30",      cat: 170083, must: ["flare", "32gb", "6000"] },
  kfb:      { q: "Kingston Fury Beast 32GB 2x16GB DDR5 5600",        cat: 170083, must: ["fury", "beast", "32gb", "5600"] },
  pvv:      { q: "Patriot Viper Venom 32GB 2x16GB DDR5 6000 CL30",   cat: 170083, must: ["venom", "32gb", "6000"] },
  "3070":   { q: "RTX 3070 8GB graphics card",    cat: 27386, must: ["3070"],               not: /3070\s*ti/i },
  "4060":   { q: "RTX 4060 8GB graphics card",    cat: 27386, must: ["4060"],               not: /4060\s*ti/i },
  "4060ti8":  { q: "RTX 4060 Ti 8GB graphics card",  cat: 27386, must: ["4060", "ti", "8gb"], not: /16\s*gb/i },
  "4060ti16": { q: "RTX 4060 Ti 16GB graphics card", cat: 27386, must: ["4060", "ti", "16gb"] },
  "5700x":  { q: "AMD Ryzen 7 5700X CPU", cat: 164, must: ["5700x"], not: /x3d/i },
  "7600":   { q: "AMD Ryzen 5 7600 CPU",  cat: 164, must: ["7600"],  not: /7600x|x3d|radeon|rx\s*7600/i },
  "7700":   { q: "AMD Ryzen 7 7700 CPU",  cat: 164, must: ["7700"],  not: /7700x|x3d|radeon|rx\s*7700/i },
};

// Best Buy SKUs (only parts whose Best Buy page uses a numeric SKU)
const BESTBUY = { "4060": 6548653, "5700x": 6510770, "7600": 6530445, "7700": 6530447 };

const norm = t => " " + t.toLowerCase().replace(/(\d)\s+gb/g, "$1gb").replace(/[^a-z0-9.]+/g, " ") + " ";
const condName = c => /open box/i.test(c) ? "Open-box" : /refurb/i.test(c) ? "Refurb" : /^new/i.test(c) ? "New" : "Used";

function save(pid, sid, price, ship, cond, eta = null) {
  data.prices[pid][sid] = [Math.round(price * 100) / 100, Math.round(ship * 100) / 100, cond, eta];
  (data.checked[pid] ||= {})[sid] = { at: now, ok: true };
  changed++;
  console.log(`  ${pid} @ ${sid}: $${price} + $${ship} ship (${cond})`);
}

async function refreshEbay() {
  const { EBAY_CLIENT_ID: id, EBAY_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) return console.log("eBay: skipped (no EBAY_CLIENT_ID / EBAY_CLIENT_SECRET)");
  console.log("eBay:");
  const tok = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  }).then(r => r.json());
  if (!tok.access_token) throw new Error("eBay sign-in failed: " + JSON.stringify(tok));

  for (const [pid, rule] of Object.entries(EBAY)) {
    const prev = data.prices[pid]?.ebay;
    if (!prev) continue;
    const ref = prev[0] ?? data.prices[pid].newegg?.[0] ?? 100;   // sanity range around the last known price
    const params = new URLSearchParams({
      q: rule.q, category_ids: String(rule.cat), limit: "50", sort: "price",
      filter: "buyingOptions:{FIXED_PRICE},priceCurrency:USD,deliveryCountry:US,conditionIds:{1000|1500|2000|2010|2500|3000}",
    });
    try {
      const res = await fetch("https://api.ebay.com/buy/browse/v1/item_summary/search?" + params, {
        headers: { Authorization: "Bearer " + tok.access_token, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
      }).then(r => r.json());
      const items = (res.itemSummaries || []).map(it => ({
        title: it.title, cond: it.condition || "Used",
        price: Number(it.price?.value),
        ship: Number(it.shippingOptions?.[0]?.shippingCost?.value ?? 0),
      })).filter(it => {
        const t = norm(it.title);
        return it.price > 0
          && rule.must.every(w => t.includes(w))
          && !JUNK.test(it.title) && !(rule.not && rule.not.test(it.title))
          && it.price + it.ship >= ref * 0.45 && it.price + it.ship <= ref * 2.5;
      }).sort((a, b) => (a.price + a.ship) - (b.price + b.ship));
      // Skip the single cheapest listing when there are several: it is often a scam or mislabeled part
      const pick = items.length >= 4 ? items[1] : items[0];
      if (pick) save(pid, "ebay", pick.price, pick.ship, condName(pick.cond));
      else console.log(`  ${pid}: no matching listing, kept previous price`);
    } catch (e) { console.log(`  ${pid}: ${e.message}, kept previous price`); }
  }
}

async function refreshBestBuy() {
  const key = process.env.BESTBUY_API_KEY;
  if (!key) return console.log("Best Buy: skipped (no BESTBUY_API_KEY)");
  console.log("Best Buy:");
  const skus = Object.values(BESTBUY).join(",");
  const url = `https://api.bestbuy.com/v1/products(sku in(${skus}))?apiKey=${key}&show=sku,salePrice,onlineAvailability,freeShipping,shippingCost&format=json&pageSize=20`;
  const res = await fetch(url).then(r => r.json());
  if (!res.products) throw new Error("Best Buy request failed: " + JSON.stringify(res).slice(0, 300));
  for (const [pid, sku] of Object.entries(BESTBUY)) {
    const p = res.products.find(x => x.sku === sku);
    if (!p || !data.prices[pid]?.bestbuy) { console.log(`  ${pid}: not found, kept previous price`); continue; }
    if (!p.onlineAvailability) {
      data.prices[pid].bestbuy = [null, 0, "New", null];
      (data.checked[pid] ||= {}).bestbuy = { at: now, ok: true };
      changed++; console.log(`  ${pid} @ bestbuy: out of stock`); continue;
    }
    save(pid, "bestbuy", p.salePrice, p.freeShipping ? 0 : Number(p.shippingCost || 0), "New");
  }
}

for (const step of [refreshEbay, refreshBestBuy]) {
  try { await step(); } catch (e) { console.log(e.message); }   // one store failing never blocks the other
}

if (changed) {
  data.updatedAt = now;
  await writeFile(FILE, JSON.stringify(data));
  console.log(`Updated ${changed} prices.`);
} else {
  console.log("No prices changed.");
}
