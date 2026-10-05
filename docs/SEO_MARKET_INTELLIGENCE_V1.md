# VAELONS SEO Market Intelligence v1

## Purpose
Generate listing-specific SEO proposals from Etsy market evidence without changing Etsy until explicit approval.

## Evidence inputs
- Current VAELONS listing title, tags, description and product attributes.
- Ranked Etsy search samples for queries derived from the listing subject/style/product type.
- Repeated phrases and tags from relevant physical canvas competitors.
- VAELONS listing performance signals when available.

## Relevance gates
1. Physical canvas results only for VAELONS physical canvas listings.
2. Reject digital/Frame TV/mockup/template results.
3. Do not copy competitor titles or descriptions.
4. A candidate phrase must describe the actual artwork/product.
5. Product + subject/style + room/use-intent phrases outrank generic phrases.
6. Avoid unsupported personalization, framing, shipping, material, size or ready-to-hang claims.

## Scoring (0-100)
- Etsy ranked-market evidence: 30
- Product/listing semantic relevance: 30
- Buyer purchase intent: 20
- Phrase specificity / long-tail usefulness: 10
- Listing performance fit: 10

## SEO output contract
- proposed_title: <= 140 characters, buyer-readable, strongest relevant phrase early.
- proposed_tags: exactly 13 unique tags, each <= 20 characters.
- proposed_description: preserve factual product/shipping/variation claims; improve first paragraph and natural keyword coverage only when supported.
- score_before / score_after: 0-100 with reasons.
- evidence_summary: market phrases used and rejected phrases with reasons.
- changed_fields: title/tags/description.
- preview only until approval.

## Safety
Flow: scan -> market research -> proposal -> deterministic QA -> preview token -> ONAYLIYORUM -> PATCH -> verify.
Price, inventory, variations, images, shipping profiles and scheduler are outside SEO scope and must never be changed by SEO Manager.
