"use client";
import { useState } from "react";

export default function SeoManagerPanel() {
  const [data,setData]=useState(null), [loading,setLoading]=useState(false), [error,setError]=useState("");
  async function scan(){
    setLoading(true); setError("");
    try{
      let offset=0, all=[], total=0, needs=0;
      do{
        const r=await fetch("/api/etsy/seo-manager",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"scan",limit:100,offset})});
        const j=await r.json(); if(!r.ok) throw new Error(j.error||"SEO taraması başarısız.");
        total=j.total_count||total; needs+=j.needs_review_count||0; all.push(...(j.results||[])); offset=j.next_offset;
      }while(offset!==null && offset!==undefined);
      setData({total_count:total,needs_review_count:needs,results:all});
    }catch(e){setError(e.message||"SEO taraması başarısız.");}finally{setLoading(false);}
  }
  return <main style={{maxWidth:1050,margin:"32px auto",padding:"0 20px",fontFamily:"Arial,sans-serif"}}>
    <a href="/" style={{fontSize:13}}>← VAELONS Manager</a>
    <h1>VAELONS SEO Manager</h1>
    <p style={{color:"#6b7280",lineHeight:1.6}}>Aktif Etsy listinglerini tarar. Bu aşama yalnız analiz ve önizlemedir; fiyat, başlık, tag veya açıklamayı değiştirmez.</p>
    <button onClick={scan} disabled={loading} style={{padding:"12px 18px",border:0,borderRadius:10,background:"#111827",color:"#fff",fontWeight:700,cursor:"pointer"}}>{loading?"Etsy listingleri taranıyor…":"Tüm Aktif Listingleri Tara"}</button>
    {error&&<div style={{marginTop:14,padding:12,background:"#fef2f2",color:"#991b1b",borderRadius:10}}>{error}</div>}
    {data&&<><div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"18px 0"}}>
      <Metric label="Aktif listing" value={data.total_count}/><Metric label="SEO inceleme gerekli" value={data.needs_review_count}/>
    </div>
    <div style={{display:"grid",gap:10}}>{data.results.map(x=><div key={x.listing_id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:14}}>
      <div style={{fontSize:12,color:"#6b7280"}}>Listing {x.listing_id} · {x.structural_status==="needs_review"?"İnceleme gerekli":"Yapısal olarak uygun"}</div>
      <div style={{fontWeight:800,marginTop:4}}>{x.exact_title}</div>
      <div style={{fontSize:12,marginTop:8}}>Başlık: {x.title_length}/140 · Tag: {x.tag_count}/13</div>
      {!!x.issues?.length&&<div style={{fontSize:12,color:"#9a3412",marginTop:6}}>{x.issues.join(" · ")}</div>}
    </div>)}</div></>}
  </main>;
}
function Metric({label,value}){return <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 16px"}}><div style={{fontSize:12,color:"#6b7280"}}>{label}</div><div style={{fontSize:26,fontWeight:900}}>{value}</div></div>}
