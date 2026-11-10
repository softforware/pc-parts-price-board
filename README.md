# Build Parts Price Board

A single-page web app that compares prices for PC parts across six retailers: eBay, Newegg, Alibaba, Micro Center, Amazon and Best Buy. I built it to plan my own PC build. It compares 32GB DDR4 and DDR5 memory kits, NVIDIA RTX 3070 / 4060 / 4060 Ti graphics cards, and AMD Ryzen 7 5700X / 5 7600 / 7 7700 processors.

**Live demo:** https://softforware.github.io/pc-parts-price-board/

## What it does

- **Top 3 deals.** Ranks the biggest savings by delivered price (item + shipping) against the average new retail price. Each deal shows the price with and without shipping, the delivery estimate, the shipping method and the return policy. Delivery time is shown but doesn't affect the ranking.
- **Platform cost totals.** Adds up an AM4 build (5700X + DDR4) and two AM5 builds (7600 or 7700 + DDR5), since the CPU decides which kind of RAM you can use.
- **Head-to-head spec cards.** Each part has its specs, a performance-per-dollar score, and a strip showing where every store's price falls. Each category gets "Best value" and "Cheapest" badges.
- **Price matrix.** Every part at every store in one table, with the lowest delivered price highlighted.
- **Per-store tabs.** Listings, shipping, returns, warranty and a risk rating for each retailer.
- **Filters.** Switch between part categories, include or hide used/refurbished parts, and include or hide Alibaba. Settings are remembered in the browser.
- **Direct product links.** Each listing links to the exact product page at that store.

## Daily price refresh

A GitHub Action ([`.github/workflows/refresh-prices.yml`](.github/workflows/refresh-prices.yml)) runs [`scripts/refresh-prices.mjs`](scripts/refresh-prices.mjs) every morning. It pulls current prices from the **eBay Browse API** and the **Best Buy Products API**, then commits the new `prices.json`, and GitHub Pages republishes the site. The page header names which stores were refreshed and when. Amazon, Newegg, Micro Center and Alibaba have no free price API, so their prices stay labeled as estimates from October 5, 2026.

For eBay, the script filters out listings that aren't a working, complete part ("box only", "for parts", the wrong model and so on) and ignores prices far outside the expected range. It then takes the cheapest remaining listing, or the second cheapest when there are several, because the very cheapest is often a scam.

To turn it on in your own copy, add these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|---|---|
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | [developer.ebay.com](https://developer.ebay.com): create an application and copy its **Production** keyset |
| `BESTBUY_API_KEY` | [developer.bestbuy.com](https://developer.bestbuy.com) |

A store without a key is skipped and keeps its saved prices. To run a refresh right away, go to the Actions tab, choose "Refresh prices", then "Run workflow".

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

The starting prices are typical prices I collected on October 5, 2026 from public price trackers and store search results. eBay and Best Buy prices are refreshed every morning (see above). The other stores are estimates, so use the product links to check their current prices.
