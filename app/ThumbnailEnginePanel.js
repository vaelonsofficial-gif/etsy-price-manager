"use client";
import {useState} from "react";
const presets=[
["floor_large","Yerde Büyük","Büyük canvas zeminde duvara yaslı; artwork tam görünür, gerçekçi perspektif ve ölçek."],
["wall_large","Duvarda Büyük","Büyük statement canvas ana duvarda; artwork tam görünür, oda sade ve premium."],
["living_room","Salon Lifestyle","Modern premium salonda büyük canvas; ürün odak noktası."],
["bedroom","Yatak Odası","Sakin premium yatak odasında büyük canvas; ölçek net."],
["detail","Detay","Canvas yüzeyi/kenarı ve baskı detayını yakın planda göster."],
["scale","Ölçek","Mobilya referansıyla ürünün büyük ölçüsünü anlaşılır göster."]
];
export default function ThumbnailEnginePanel(){
 const [artwork,setArtwork]=useState(""),[preset,setPreset]=useState("floor_large"),[count,setCount]=useState(10);
 return <main style={{maxWidth:1050,margin:"32px auto",padding:"0 20px",fontFamily:"Arial,sans-serif"}}>
 <h1>VAELONS Thumbnail Engine</h1>
 <p style={{color:"#6b7280",lineHeight:1.6}}>Artwork'u bozmadan satış odaklı Etsy görsel seti planlar. Canlı Etsy'ye otomatik yükleme kapalıdır; önce üretim ve önizleme gerekir.</p>
 <section style={box}><b>Artwork kaynağı</b><input value={artwork} onChange={e=>setArtwork(e.target.value)} placeholder="Listing ID / artwork asset ID" style={input}/><small>Kaynak artwork değiştirilemez: crop, yeniden çizim, renk değiştirme ve beyaz kenar ekleme yasak.</small></section>
 <section style={box}><b>Mockup preset</b><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:12}}>{presets.map(([id,n,d])=><button key={id} onClick={()=>setPreset(id)} style={{...card,border:preset===id?"2px solid #111827":"1px solid #e5e7eb"}}><strong>{n}</strong><span style={{fontSize:12,color:"#6b7280"}}>{d}</span></button>)}</div></section>
 <section style={box}><b>Set boyutu</b><select value={count} onChange={e=>setCount(Number(e.target.value))} style={input}><option>1</option><option>5</option><option>10</option></select><div style={{marginTop:10,fontSize:13}}>Seçili: <b>{presets.find(x=>x[0]===preset)?.[1]}</b> · {count} çıktı · hedef kısa kenar ≥2000px.</div></section>
 <div style={{padding:14,borderRadius:12,background:"#fffbeb",color:"#92400e",fontSize:13,lineHeight:1.5}}>Güvenlik: Bu panel üretim sözleşmesini hazırlar. Görsel üretim sağlayıcısı bağlanmadan sahte çıktı üretmez; Etsy yükleme/yayınlama ayrıca önizleme ve onay kapısından geçer.</div>
 </main>
}
const box={background:"#fff",border:"1px solid #e5e7eb",borderRadius:14,padding:16,margin:"14px 0",display:"grid",gap:8};
const input={padding:11,border:"1px solid #d1d5db",borderRadius:9};
const card={padding:14,borderRadius:12,background:"#fff",textAlign:"left",display:"grid",gap:6,cursor:"pointer"};