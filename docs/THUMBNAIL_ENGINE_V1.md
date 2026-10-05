# VAELONS Thumbnail Engine v1
## Mandatory source-of-truth rule
- Every thumbnail job MUST start from an Etsy listing ID.
- Fetch that listing's existing images through the Seller Bridge.
- IMAGE RANK 1 / the listing's first artwork image is the immutable SOURCE ARTWORK.
- Never choose another artwork, invent a replacement artwork, or generate a thumbnail unrelated to source artwork.
- If rank-1 image cannot be fetched or verified, FAIL CLOSED: do not generate thumbnails.
- All FLOOR_LARGE, WALL_LARGE, lifestyle, detail and scale outputs must visibly use the same source artwork.
- Before preview, run source-artwork integrity QA; reject outputs with changed composition, colors, missing edges, extra borders, crop/stretch, invented objects inside the artwork, or artwork replacement.

## Non-negotiable
- Preserve source artwork exactly: no redraw, recolor, crop, stretch, added borders, missing edges or invented details.
- Primary presets: FLOOR_LARGE and WALL_LARGE. Canvas must read as large/statement scale with believable room perspective.
- Output target: Etsy-ready, shortest side >=2000 px, composition safe for multiple Etsy crops.
- First thumbnail: clean, single-product focus, no collage, minimal/no overlay text.
- Set may include floor large, wall large, living-room lifestyle, bedroom lifestyle, detail and scale-reference images.
- Physical-product representation must remain accurate; mockup eligibility must follow Etsy policy and the shop's production model.

## Workflow
Etsy listing ID -> Seller Bridge listing images -> lock rank-1 source artwork -> preset -> generation provider -> source-artwork integrity QA -> resolution/crop QA -> preview -> human approval -> optional Etsy image upload.

## Safety boundary
No automatic Etsy upload or image reordering in v1. Never mutate price, inventory, variations, SEO, shipping or OAuth from Thumbnail Engine.
