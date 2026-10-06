import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function bridgeConfig() {
  const baseUrl = String(process.env.ETSY_BRIDGE_URL || "").replace(/\/$/, "");
  const token = String(process.env.VAELONS_BRIDGE_TOKEN || "").trim();
  return baseUrl && token ? { baseUrl, token } : null;
}

async function bridge(path, options = {}) {
  const config = bridgeConfig();
  if (!config) return { response: null, data: { error: "Seller Bridge yapılandırılmadı." } };
  const response = await fetch(`${config.baseUrl}/ops/seo${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
      ...(options.headers || {})
    },
    cache: "no-store"
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { response, data };
}

export async function GET(request) {
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 100)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const { response, data } = await bridge(`/listings?state=active&limit=${limit}&offset=${offset}`);
  if (!response) return NextResponse.json(data, { status: 503 });
  return NextResponse.json({ ...data, read_only: true, etsy_modified: false }, { status: response.status });
}


function words(v){return String(v||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(x=>x.length>2)}
function uniq(a){return [...new Set(a)]}
function proposalFromEvidence(title,tags,description,evidence){
  const stop=new Set(["with","and","the","for","from","this","that","print","poster","digital","download"]);
  const freq={}; for(const t of evidence){for(const w of words(t)){if(!stop.has(w))freq[w]=(freq[w]||0)+1}}
  const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  const own=uniq([...words(title),...(tags||[]).flatMap(words)]);
  const relevant=top.filter(w=>own.includes(w)||["canvas","wall","art","decor","home","gift","luxury","vintage","floral","abstract","painting"].includes(w));
  const tagPool=uniq([...(tags||[]),...relevant,...own]).map(x=>x.slice(0,20)).filter(x=>x.length>2).slice(0,13);
  while(tagPool.length<13)tagPool.push(["canvas wall art","home wall decor","canvas artwork","wall decoration","art gift","room decor","gallery wall","canvas print","interior decor","wall artwork","home decor art","living room art","decorative canvas"][tagPool.length]||("canvas art "+tagPool.length));
  const phrases=uniq([...relevant.slice(0,7),...own.slice(0,7)]).map(x=>x.replace(/^./,m=>m.toUpperCase()));
  let proposed=phrases.join(" ")+" Canvas Wall Art, "+tagPool.slice(0,3).join(", ");
  proposed=proposed.replace(/\s+/g," ").slice(0,140).replace(/[ ,]+$/,"");
  const desc=description||"";
  return {proposed_title:proposed,proposed_tags:tagPool.slice(0,13),proposed_description:desc,top_terms:relevant.slice(0,12)};
}
async function etsyMarketSearch(keywords){
  const key=String(process.env.ETSY_API_KEY||"").trim(); if(!key)return [];
  const u=new URL("https://openapi.etsy.com/v3/application/listings/active");
  u.searchParams.set("keywords",keywords.slice(0,250));u.searchParams.set("limit","50");
  const r=await fetch(u,{headers:{"x-api-key":key},cache:"no-store"});
  if(!r.ok)return []; const j=await r.json(); return Array.isArray(j.results)?j.results:[];
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (body.action === "market-research") {
    const title=String(body.title||"").trim(); const tags=Array.isArray(body.tags)?body.tags:[];
    const query=uniq([...words(title).slice(0,8),...tags.flatMap(words).slice(0,6)]).join(" ");
    const results=await etsyMarketSearch(query); const titles=results.map(x=>String(x.title||"")).filter(Boolean);
    if(!titles.length)return NextResponse.json({error:"Etsy marketplace örneklemi alınamadı; sahte öneri üretilmedi."},{status:503});
    const p=proposalFromEvidence(title,tags,body.description,titles); const oldScore=Math.min(100,Math.round((Math.min(tags.length,13)/13)*45+(Math.min(title.length,110)/110)*35+20));
    const coverage=p.top_terms.filter(w=>words(p.proposed_title+" "+p.proposed_tags.join(" ")).includes(w)).length; const newScore=Math.min(100,Math.round(55+Math.min(30,coverage*4)+(p.proposed_tags.length===13?10:0)+(p.proposed_title.length>=70?5:0)));
    return NextResponse.json({...p,old_score:oldScore,new_score:newScore,sample_count:titles.length,confidence:titles.length>=40?"Yüksek":titles.length>=20?"Orta":"Düşük",source:"Etsy Open API ranked active listings",query,etsy_modified:false});
  }
  if (body.action === "prepare") {
    const listingId = String(body.listing_id || "").trim();
    if (!/^\d+$/.test(listingId)) return NextResponse.json({ error: "Geçersiz listing ID.", etsy_modified: false }, { status: 400 });
    const { response, data } = await bridge(`/listings/${listingId}/prepare`, {
      method: "POST",
      body: JSON.stringify({
        proposed_title: body.proposed_title,
        proposed_tags: body.proposed_tags,
        proposed_description: body.proposed_description,
        reason: body.reason || "etsy_market_research_listing_specific"
      })
    });
    if (!response) return NextResponse.json(data, { status: 503 });
    return NextResponse.json({ ...data, publish_enabled: false, etsy_modified: false }, { status: response.status });
  }
  if (body.action === "publish") {
    const listingId = String(body.listing_id || "").trim();
    if (!/^\d+$/.test(listingId)) return NextResponse.json({ error: "Geçersiz listing ID.", etsy_modified: false }, { status: 400 });
    const { response, data } = await bridge(`/listings/${listingId}/publish`, { method: "POST", body: JSON.stringify({ preview_token: body.preview_token, approval: body.approval }) });
    if (!response) return NextResponse.json(data, { status: 503 });
    return NextResponse.json(data, { status: response.status });
  }
  if (body.action !== "scan") {
    return NextResponse.json({ error: "Desteklenmeyen SEO işlemi.", etsy_modified: false }, { status: 400 });
  }
  const { response, data } = await bridge("/scan", {
    method: "POST",
    body: JSON.stringify({ state: "active", limit: Number(body.limit || 100), offset: Number(body.offset || 0) })
  });
  if (!response) return NextResponse.json(data, { status: 503 });
  return NextResponse.json({ ...data, read_only: true, publish_enabled: false, etsy_modified: false }, { status: response.status });
}
