# Build Parts Price Board

A single-page web app that compares prices for PC parts across six retailers: eBay, Newegg, Alibaba, Micro Center, Amazon and Best Buy. I built it to plan my own PC build. It compares 32GB DDR4 and DDR5 memory kits, NVIDIA RTX 3070 / 4060 / 4060 Ti graphics cards, and AMD Ryzen 7 5700X / 5 7600 / 7 7700 processors.

**Live demo:** _add your GitHub Pages link here_

## What it does

- **Top 3 deals.** Ranks the biggest savings by delivered price (item + shipping) against the average new retail price. Each deal shows the price with and without shipping, the delivery estimate, the shipping method and the return policy. Delivery time is shown but doesn't affect the ranking.
- **Platform cost totals.** Adds up an AM4 build (5700X + DDR4) and two AM5 builds (7600 or 7700 + DDR5), since the CPU decides which kind of RAM you can use.
- **Head-to-head spec cards.** Each part has its specs, a performance-per-dollar score, and a strip showing where every store's price falls. Each category gets "Best value" and "Cheapest" badges.
- **Price matrix.** Every part at every store in one table, with the lowest delivered price highlighted.
- **Per-store tabs.** Listings, shipping, returns, warranty and a risk rating for each retailer.
- **Filters.** Switch between part categories, include or hide used/refurbished parts, and include or hide Alibaba. Settings are remembered in the browser.
- **Direct product links.** Each listing links to the exact product page at that store.
- **Live price refresh (optional).** When the page is published as a Claude Artifact and opened in the Claude desktop app, a "Refresh live prices" button appears. It opens each product page in Claude's built-in browser, uses Claude to read the price, shipping, stock and delivery estimate, and saves the results to `prices.json`.

## How it's built

- Plain HTML, CSS and JavaScript in one file (`index.html`). No framework and no build step.
- Prices live in `prices.json`, which the page loads at startup. The same data is also built into the page, so it still works if the file can't be loaded.
- Product images are inline SVG drawings generated in code. For example, the RAM sticks show the notch in different places for DDR4 and DDR5, as on the real parts.
- Light and dark themes follow your system setting. The layout works down to phone width.

## Run it locally

Open `index.html` in a browser. To load `prices.json` too, serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## About the prices

The starting prices are typical prices I collected on October 5, 2026 from public price trackers and store search results. Store prices change often, so use the product links to check the current price before buying. The live refresh only works inside the Claude desktop app. On GitHub Pages the page shows the saved prices.

## Publish it as a Claude Artifact (with live refresh)

1. Open this folder in Claude Code.
2. Ask Claude:

   > Publish index.html as a new Artifact, with prices.json alongside it at the path "prices.json". Declare these capabilities exactly:
   > `{"mcp": {"servers": [{"server": "host:claude_browser", "tools": ["navigate", "get_page_text"]}]}, "sample": {}, "artifact": {}}`

3. Open the link in a Cowork session of the Claude desktop app and click **Refresh live prices**. Only the artifact's owner can use the refresh, and it uses the owner's own Claude usage.
