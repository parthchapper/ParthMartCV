# Parth Mart

A portfolio site shaped like a pixel supermarket. Projects are products on shelves, the back of each pack proves the claims, and the checkout page prints a receipt sorted by hours spent. Plain HTML, CSS and JavaScript: no framework, no build step.

## Change a link in 30 seconds

Every link on the site lives in one place: the `"links"` block at the top of `products.json`.

```json
"links": {
  "github": "https://github.com/your-name",
  "lagrange-repo": "https://github.com/your-name/lagrange-points",
  "stark-shop": "https://instagram.com/stark3d",
  ...
}
```

On GitHub:

1. Open your repository and click `products.json`.
2. Click the pencil icon (Edit this file).
3. Paste the address between the quotes next to the right name. Keep the quotes and the comma at the end of the line.
4. Click **Commit changes**. The live site updates in about a minute.

An empty link (`""`) simply hides that link. To use a document as proof, upload it into the `proof` folder (open the folder on GitHub, then **Add file → Upload files**) and set the link to `"proof/your-file.jpg"`.

If you break the file by accident (a missing quote or comma), the shelves show a message saying where the mistake is. Fix that spot and commit again.

## Editing everything else (all in `products.json`)

| Part | What to edit |
|---|---|
| `"draft": true` | Shows dashed "add …" markers wherever something is missing. The browser console (F12) lists them too. Set to `false` before launch: missing things then disappear instead of showing markers. |
| `"achievements"` | The rolling boxes at the top. Each has a `value` (big text), `text`, an `icon` and an optional `proof` (a name from the links block). |
| `"featured"` | The `id` of the product on the entrance end-cap. |
| `"aisles"` | Aisle names, colours, order and icons. |
| `"products"` | One block per product. `hours` is a number like `600`. `headline` is `{ "value": "$100K", "label": "…" }` or `{ "text": "…" }`. |
| `"facts"` (inside a product) | The Nutrition Facts panel, which is the proof: `{ "label": "Customers", "value": "~1,000", "proof": "stark-shop" }`. Leave out `"proof"` for facts that don't need it. |
| `"preorders"` | The Pre-order now section. `ships` is free text like `"September 2027"`; leave it empty for "Coming soon". `link` is a name from the links block. |
| `"store"` | Store name on the sign, your name on the receipt, city, and the "How this store was built" note. |

The hero name and one-line description are in `index.html` (so they appear instantly), next to the page title and link-preview text.

Icon names for `icon`: satellite, orbit, checklist, printer, car, seed, thruster, rocket, terminal, wrench, flask, star, rosette, scroll. The pixel art itself is in `sprites.js` as text grids you can edit.

A product's label can be linked directly: `your-domain/#p-stark-3d` opens that label.

## Putting it online (GitHub Pages)

**1. Create the repository**
1. Sign in at github.com, click **+** (top right) → **New repository**.
2. Name it, for example `parth-mart`. Choose **Public**. Leave every other box unticked. Click **Create repository**.

**2. Upload the files**
1. On the new, empty repository page, click the link **uploading an existing file**.
2. Unzip `parth-mart-site.zip` on your computer and open the `parth-mart` folder.
3. Select **everything inside** that folder (not the folder itself) and drag it onto the GitHub page. Folders like `fonts`, `img` and `proof` upload with it.
4. Wait until every file is listed, then click **Commit changes**.

Check: `index.html` must sit at the top level of the repository, not inside a `parth-mart` folder.

**3. Switch on GitHub Pages**
1. In the repository, click **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**, branch **main**, folder **/ (root)**. Click **Save**.
3. After a minute or two, the page shows your site's address: `https://<your-username>.github.io/parth-mart/`. Open it and click around.

**4. Add your custom domain**
1. Still in **Settings → Pages**, type your domain under **Custom domain** (for example `www.yourdomain.com`) and click **Save**.
2. At the company where you bought the domain, add DNS records:
   - for `www.yourdomain.com`: a **CNAME** record named `www` pointing to `<your-username>.github.io`
   - for the bare `yourdomain.com`: four **A** records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`
3. DNS can take from a few minutes to a day. When GitHub shows the check as done, tick **Enforce HTTPS**.
4. Edit `index.html` and `checkout.html` on GitHub and replace `YOUR-DOMAIN` with your domain, so link previews show the right image.

GitHub's own guide: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## Trying it on your computer first

Browsers block a page from reading `products.json` when it is opened as a plain file, so run a small local server from inside the folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## What's in the folder

| File | What it does |
|---|---|
| `index.html` | The store: rolling highlights, storefront, aisles, Pre-order now |
| `checkout.html` | The checkout page: Parth at the till and the receipt |
| `products.json` | All content and all links. Edit this, not the code |
| `style.css` | Colours, fonts, layout, phone layout, list view, print |
| `site.js` | Shared by both pages: loading content, links, the top bar, the label |
| `store.js` | Store page: ticker, shelves, walking shopper, pre-orders |
| `checkout.js` | Checkout page: till, cashier and receipt |
| `cart.js` | Cart and pre-orders, the ding (Web Audio, no sound file), the add-to-cart arc, the receipt |
| `sprites.js` | All pixel art as text grids |
| `proof/` | Documents linked as proof |
| `fonts/` | Press Start 2P and Libre Franklin, self-hosted (SIL Open Font License) |
| `img/` | Favicon and the 1200×630 link-preview image |
| `404.html` | "Aisle not found" page |
| `CLAIMS-AUDIT.md` | Every claim on the site and its source. Clear the 🔴 items before launch |

## Launch checklist

Checked while building (re-run after big edits):

- [x] Lighthouse on both pages: accessibility 100, performance 90+ on mobile
- [x] Click to label under 0.6 s; a second click skips the walk; reduced motion teleports and stops the ticker
- [x] The ticker pauses with its button, on hover and on keyboard focus
- [x] Express checkout fills the basket and opens the receipt page in one click
- [x] Keyboard: Tab order, Enter opens a label, Esc closes it and returns focus
- [x] No horizontal scrolling at phone width on either page; no console errors
- [x] Every text colour pair passes WCAG AA

Still to do:

- [ ] Clear every 🔴 item in `CLAIMS-AUDIT.md`
- [ ] Fill the links block, add hours, set `"draft": false`
- [ ] Replace `YOUR-DOMAIN` in `index.html` and `checkout.html`
- [ ] 5-second test with 3–5 people who haven't seen it: can they say whose site it is and what he builds?
- [ ] Can a tester find a named project in under 30 seconds? Does anyone ask "what do I click?"
- [ ] Ding judged pleasant; mute and pause buttons found without help
- [ ] Test in Chrome, Safari, Firefox, on an iPhone and an Android phone
- [ ] Share the link in a chat app and check the preview image and title
- [ ] Every proof link opens
- [ ] Final check from a different device and network before submitting
