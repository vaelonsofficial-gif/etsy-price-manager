"use client";

import { useEffect, useMemo, useState } from "react";

function defaultLocalDateTime(offsetMinutes = 60) {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  date.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ManagerClient({ initialConnected = false }) {
  const [connected, setConnected] = useState(initialConnected ? true : null);
  const [drafts, setDrafts] = useState([]);
  const [scheduleTimes, setScheduleTimes] = useState({});
  const [loading, setLoading] = useState(true);
  const [schedulingId, setSchedulingId] = useState("");
  const [messages, setMessages] = useState({});
  const [errors, setErrors] = useState({});
  const [gptKey, setGptKey] = useState("");
  const [gptLoading, setGptLoading] = useState(false);
  const [gptError, setGptError] = useState("");
  const [copied, setCopied] = useState(false);
  const [priceListingId, setPriceListingId] = useState("");
  const [priceInventory, setPriceInventory] = useState(null);
  const [priceInputs, setPriceInputs] = useState({});
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceMessage, setPriceMessage] = useState("");
  const [priceError, setPriceError] = useState("");
  const [globalVariations, setGlobalVariations] = useState([]);
  const [globalListingCount, setGlobalListingCount] = useState(0);
  const [referenceListing, setReferenceListing] = useState(null);
  const [variationSearch, setVariationSearch] = useState("");
  const [globalPrices, setGlobalPrices] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(null);
  const [bridgeConfigured, setBridgeConfigured] = useState(false);
  const [marketSettings, setMarketSettings] = useState({
    minMarginPct: 20,
    marketAdjustmentPct: 0,
    maxStepPct: 5,
    etsyNetRatioPct: 80.32,
    buyerCountry: "US"
  });
  const [marketAnalyses, setMarketAnalyses] = useState({});
  const [marketLoadingKey, setMarketLoadingKey] = useState("");
  const [marketError, setMarketError] = useState("");

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Yerel saat",
    []
  );

  async function loadDrafts() {
    setLoading(true);
    try {
      const response = await fetch("/api/etsy/drafts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setConnected(false);
        setDrafts([]);
        return;
      }

      const listings = Array.isArray(data.listings) ? data.listings : [];
      setConnected(data?.connected !== false);
      setDrafts(listings);
      setScheduleTimes((current) => {
        const next = { ...current };
        listings.forEach((listing, index) => {
          const id = String(listing.listing_id);
          if (!next[id]) next[id] = defaultLocalDateTime(60 + index * 15);
        });
        return next;
      });
    } catch {
      setErrors({ general: "Manager Etsy taslaklarını yükleyemedi." });
    } finally {
      setLoading(false);
    }
  }

  async function loadApiKeyStatus() {
    try {
      const response = await fetch("/api/etsy/key", { cache: "no-store" });
      const data = await response.json();
      setApiKeyConfigured(Boolean(data?.configured));
      setBridgeConfigured(Boolean(data?.bridge_configured));
    } catch {
      setApiKeyConfigured(false);
      setBridgeConfigured(false);
    }
  }


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("etsy") === "connected") {
      setConnected(true);
      setLoading(false);
      try { sessionStorage.removeItem("vaelons_etsy_oauth_started"); } catch {}
    }

    loadApiKeyStatus();
    loadDrafts();
  }, []);

  useEffect(() => {
    if (connected === true) {
      try { sessionStorage.removeItem("vaelons_etsy_oauth_started"); } catch {}
      return;
    }

    if (connected !== false || apiKeyConfigured !== true || bridgeConfigured) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("etsy") === "error") return;

    try {
      if (sessionStorage.getItem("vaelons_etsy_oauth_started") === "1") return;
      sessionStorage.setItem("vaelons_etsy_oauth_started", "1");
    } catch {}

    window.location.assign("/api/etsy/login");
  }, [connected, apiKeyConfigured, bridgeConfigured]);

  function setListingTime(listingId, value) {
    const id = String(listingId);
    setScheduleTimes((current) => ({ ...current, [id]: value }));
    setMessages((current) => ({ ...current, [id]: "" }));
    setErrors((current) => ({ ...current, [id]: "" }));
  }

  async function scheduleListing(listing) {
    const id = String(listing.listing_id);
    const localValue = scheduleTimes[id];

    setSchedulingId(id);
    setMessages((current) => ({ ...current, [id]: "" }));
    setErrors((current) => ({ ...current, [id]: "" }));

    try {
      if (!localValue) throw new Error("Önce yayınlama tarihi ve saati seç.");
      const publishDate = new Date(localValue);
      if (Number.isNaN(publishDate.getTime())) throw new Error("Geçerli bir tarih ve saat seç.");

      const response = await fetch("/api/etsy/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: id,
          publishAt: publishDate.toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Planlama başarısız.");

      setMessages((current) => ({
        ...current,
        [id]: `Planlandı: ${publishDate.toLocaleString("tr-TR")} tarihinde otomatik yayınlanacak.`,
      }));
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [id]: err.message || "Planlama başarısız.",
      }));
    } finally {
      setSchedulingId("");
    }
  }


  async function scanGlobalPrices() {
    setGlobalLoading(true); setGlobalError(""); setGlobalMessage("");
    try { const response=await fetch("/api/etsy/global-prices",{cache:"no-store"}); const data=await response.json(); if(!response.ok) throw new Error(data.error||"Varyasyonlar taranamadı."); setGlobalVariations(data.variations||[]); setReferenceListing(data.reference_listing||null); setGlobalListingCount(Number(data.active_listing_count||0)); setGlobalMessage(`${Number(data.active_listing_count||0)} aktif listing hedefe alındı. Mevcut fiyatlar eşleştirmede dikkate alınmayacak.`); }
    catch(err){setGlobalError(err.message||"Varyasyonlar taranamadı.");} finally{setGlobalLoading(false);}
  }
  async function analyzeMarketPrice(v) {
    const currentPrice = Number(v.current_price);
    if (!(currentPrice > 0)) {
      setMarketError("Bu varyasyonun mevcut fiyatı okunamadı.");
      return;
    }

    setMarketLoadingKey(v.key);
    setMarketError("");

    try {
      const response = await fetch("/api/etsy/market-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variationKey: v.key,
          label: v.label,
          currentPrice,
          minMarginPct: Number(marketSettings.minMarginPct),
          marketAdjustmentPct: Number(marketSettings.marketAdjustmentPct),
          maxStepPct: Number(marketSettings.maxStepPct),
          etsyNetRatio: Number(marketSettings.etsyNetRatioPct) / 100,
          buyerCountry: marketSettings.buyerCountry
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Piyasa fiyat analizi başarısız.");
      }

      setMarketAnalyses((current) => ({
        ...current,
        [v.key]: data
      }));

      const recommended = Number(data?.recommendation?.next_price);
      if (recommended > 0) {
        setGlobalPrices((current) => ({
          ...current,
          [v.key]: recommended.toFixed(2)
        }));
      }
    } catch (error) {
      setMarketError(error.message || "Piyasa fiyat analizi başarısız.");
    } finally {
      setMarketLoadingKey("");
    }
  }

  async function applyGlobalPrice(v) {
    const value=Number(globalPrices[v.key]); if(!Number.isFinite(value)||value<=0) return setGlobalError("Geçerli bir yeni fiyat gir.");
    setGlobalLoading(true); setGlobalError(""); setGlobalMessage("Tüm aktif listingler taranıyor; mevcut fiyatlar dikkate alınmıyor…");
    try {
      const previewResponse=await fetch("/api/etsy/global-prices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({variationKey:v.key,preview:true})});
      const preview=await previewResponse.json(); if(!previewResponse.ok) throw new Error(preview.error||"Önizleme başarısız.");
      if(!preview.matched_listing_count) throw new Error("Bu varyasyonla eşleşen aktif listing bulunamadı.");

      if(!window.confirm(`${v.label}\n\n${preview.active_listings_scanned} aktif listing tarandı; ${preview.matched_listing_count} listing bu varyasyonla eşleşti. Mevcut fiyatları ne olursa olsun eşleşenlerin tamamına ${value} uygulanacak. Devam edilsin mi?`)) {
        setGlobalMessage("İşlem iptal edildi; fiyat değiştirilmedi.");
        return;
      }

      const ids=(preview.matched||[]).map((item)=>String(item.listing_id));
      const batches=[];
      for(let i=0;i<ids.length;i+=25) batches.push(ids.slice(i,i+25));

      let changed=0;
      let verified=0;
      for(let index=0;index<batches.length;index++){
        setGlobalMessage(`Fiyat uygulanıyor: ${changed}/${ids.length} tamamlandı · paket ${index+1}/${batches.length}`);
        let lastError=null;
        let data=null;
        for(let attempt=0;attempt<3;attempt++){
          try{
            const response=await fetch("/api/etsy/global-prices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({variationKey:v.key,price:value,confirm:true,listingIds:batches[index]})});
            data=await response.json();
            if(!response.ok) throw new Error(data.error||"Toplu güncelleme başarısız.");
            lastError=null;
            break;
          }catch(error){
            lastError=error;
            if(attempt<2) await new Promise((resolve)=>setTimeout(resolve,3000*(attempt+1)));
          }
        }
        if(lastError) throw new Error(`${changed}/${ids.length} listing tamamlandı. Kalan paket durdu: ${lastError.message}`);
        changed+=Number(data?.listings_changed||0);
        verified+=Number(data?.listings_verified||0);
      }

      setGlobalMessage(`Başarılı: ${changed}/${ids.length} eşleşen aktif listing güncellendi; ${verified} listing Etsy'den geri okunarak doğrulandı. Mevcut eski fiyatlar eşleştirmede kullanılmadı.`);
    } catch(err){setGlobalError(err.message||"Toplu güncelleme başarısız.");} finally{setGlobalLoading(false);}
  }

  async function loadPrices() {
    const id = priceListingId.trim();
    if (!id) return setPriceError("Önce Etsy Listing ID gir.");
    setPriceLoading(true); setPriceError(""); setPriceMessage("");
    try {
      const response = await fetch(`/api/etsy/prices?listingId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Fiyatlar alınamadı.");
      setPriceInventory(data);
      setPriceInputs({});
    } catch (err) { setPriceInventory(null); setPriceError(err.message || "Fiyatlar alınamadı."); }
    finally { setPriceLoading(false); }
  }

  function propertyLabel(product) {
    const values = product.property_values || [];
    if (!values.length) return product.sku || `Product #${product.product_id}`;
    return values.map((p) => {
      const vals = p.values || p.value_ids || [];
      return `${p.property_name || "Varyasyon"}: ${Array.isArray(vals) ? vals.join(", ") : vals}`;
    }).join(" · ");
  }

  async function savePrice(product) {
    const key=String(product.product_id);
    const value=Number(priceInputs[key]);
    if (!Number.isFinite(value) || value <= 0) return setPriceError("Geçerli bir yeni fiyat gir.");
    const old=product.offerings?.[0]?.price;
    if (!window.confirm(`${propertyLabel(product)} fiyatı ${old} → ${value} olarak değiştirilsin mi? Diğer varyasyonlara dokunulmayacak.`)) return;
    setPriceLoading(true); setPriceError(""); setPriceMessage("");
    try {
      const response=await fetch("/api/etsy/prices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({listingId:priceListingId.trim(),updates:[{productId:key,price:value}],confirm:true})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Fiyat güncellenemedi.");
      setPriceMessage(`Fiyat güncellendi: ${old} → ${value}. Etsy inventory yeniden yükleniyor…`);
      await loadPrices();
      setPriceMessage(`Başarılı: yalnız seçilen varyasyon ${old} → ${value} olarak güncellendi.`);
    } catch(err){setPriceError(err.message||"Fiyat güncellenemedi.");}
    finally{setPriceLoading(false);}
  }

  async function generateGptKey() {
    setGptLoading(true);
    setGptError("");
    setCopied(false);
    try {
      const response = await fetch("/api/gpt/token", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "GPT Action anahtarı üretilemedi.");
      setGptKey(data.apiKey || "");
    } catch (err) {
      setGptError(err.message || "GPT Action anahtarı üretilemedi.");
    } finally {
      setGptLoading(false);
    }
  }

  async function copyGptKey() {
    if (!gptKey) return;
    try {
      await navigator.clipboard.writeText(gptKey);
      setCopied(true);
    } catch {
      setGptError("Anahtar otomatik kopyalanamadı. Metin alanından manuel kopyala.");
    }
  }

  const styles = {
    card: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 18,
      padding: 24,
      boxShadow: "0 10px 30px rgba(0,0,0,.05)",
    },
    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 14px",
      border: "1px solid #d1d5db",
      borderRadius: 10,
      fontSize: 15,
      background: "#fff",
    },
    button: {
      width: "100%",
      padding: "12px 16px",
      background: "#111827",
      color: "#fff",
      border: 0,
      borderRadius: 10,
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
    },
  };

  return (
    <main style={{ maxWidth: 820, margin: "48px auto", padding: "0 20px 60px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.4, color: "#8a6b20" }}>VAELONS</div>
        <h1 style={{ margin: "8px 0", fontSize: 34 }}>Etsy Manager</h1>
        <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
          Her taslak ürün için ayrı yayınlama tarihi ve saati belirle. Manager zamanı geldiğinde Etsy’de otomatik yayınlar.
        </p>
      </div>

      <div style={{
        marginBottom: 16,
        padding: "12px 14px",
        borderRadius: 10,
        fontWeight: 700,
        background: connected === true ? "#ecfdf5" : "#f9fafb",
        color: connected === true ? "#166534" : "#6b7280"
      }}>
        {connected === true ? "● Etsy bağlı" : connected === false ? "○ Etsy bağlantısı gerekli" : "Etsy bağlantısı kontrol ediliyor…"}
      </div>

      <section style={styles.card}>
        {loading ? (
          <p style={{ margin: 0 }}>Etsy bağlantısı kontrol ediliyor…</p>
        ) : !connected ? (
          <div>
            <h2 style={{ marginTop: 0 }}>Etsy bağlantısı gerekli</h2>
            {apiKeyConfigured === null ? (
              <p style={{ color: "#6b7280", lineHeight: 1.6 }}>Etsy bağlantı katmanı kontrol ediliyor…</p>
            ) : bridgeConfigured ? (
              <div style={{ padding: 14, borderRadius: 10, background: "#ecfdf5", color: "#166534", lineHeight: 1.55 }}>
                <strong>Seller Bridge hazır.</strong><br />
                Global varyasyon fiyat yönetimi için keystring veya shared secret girmen gerekmez. Aşağıdaki Global Varyasyon Fiyatları bölümünü doğrudan kullanabilirsin.
              </div>
            ) : apiKeyConfigured ? (
              <>
                <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
                  Sunucu kimliği hazır. Anahtar girmen gerekmez; yalnız Etsy hesabında izin ver.
                </p>
                <a href="/api/etsy/login" style={{ ...styles.button, display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  Tek Tıkla VAELONS Etsy'ye Bağlan
                </a>
              </>
            ) : (
              <div style={{ padding: 14, borderRadius: 10, background: "#fff7ed", color: "#9a3412", lineHeight: 1.55 }}>
                Etsy bağlantı katmanı henüz hazır değil. Bu panel kullanıcıdan keystring veya shared secret istemez.
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 20 }}>
              <div>
                <strong style={{ color: "#166534" }}>● Etsy bağlı</strong>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{drafts.length} taslak bulundu</div>
              </div>
              <button type="button" onClick={loadDrafts} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 9, padding: "9px 12px", cursor: "pointer" }}>
                Yenile
              </button>
            </div>

            {drafts.length === 0 ? (
              <div style={{ padding: 16, background: "#f9fafb", borderRadius: 10, color: "#4b5563" }}>
                Etsy’de yayınlanmayı bekleyen taslak ürün bulunamadı.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {drafts.map((listing) => {
                  const id = String(listing.listing_id);
                  const busy = schedulingId === id;
                  return (
                    <div
                      key={id}
                      style={{
                        border: "1px solid #d1d5db",
                        borderRadius: 14,
                        padding: 16,
                        background: "#fff",
                      }}
                    >
                      <div style={{ fontWeight: 700, lineHeight: 1.45, marginBottom: 4 }}>{listing.title}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>Listing #{id}</div>

                      <label htmlFor={`publish-${id}`} style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 7 }}>
                        Bu ürünün yayınlama tarihi ve saati
                      </label>
                      <input
                        id={`publish-${id}`}
                        type="datetime-local"
                        value={scheduleTimes[id] || ""}
                        onChange={(e) => setListingTime(id, e.target.value)}
                        style={{ ...styles.input, marginBottom: 7 }}
                      />
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Saat dilimi: {timezone}</div>

                      <button
                        type="button"
                        onClick={() => scheduleListing(listing)}
                        disabled={busy}
                        style={{ ...styles.button, opacity: busy ? 0.6 : 1 }}
                      >
                        {busy ? "Planlanıyor…" : "Bu Ürünü Planla"}
                      </button>

                      {messages[id] && (
                        <div style={{ marginTop: 12, padding: 11, borderRadius: 9, background: "#ecfdf5", color: "#166534", fontSize: 13, lineHeight: 1.5 }}>
                          {messages[id]}
                        </div>
                      )}
                      {errors[id] && (
                        <div style={{ marginTop: 12, padding: 11, borderRadius: 9, background: "#fef2f2", color: "#991b1b", fontSize: 13, lineHeight: 1.5 }}>
                          {errors[id]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {errors.general && (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 10, background: "#fef2f2", color: "#991b1b", lineHeight: 1.5 }}>
            {errors.general}
          </div>
        )}
      </section>


      {(connected || bridgeConfigured) && (
        <section style={{ ...styles.card, marginTop: 18 }}>
          <h2 style={{marginTop:0,marginBottom:8,fontSize:22}}>Global Varyasyon Fiyatları</h2>
          {bridgeConfigured && <div style={{marginBottom:12,padding:10,borderRadius:9,background:"#ecfdf5",color:"#166534",fontSize:13}}>● VAELONS Seller Bridge bağlı · keystring girişi gerekmez</div>}
          <p style={{color:"#6b7280",lineHeight:1.6,marginTop:0}}>Önce piyasayı tara ve önerilen fiyatı gör. Fiyat ancak sen onaylarsan mevcut güvenli toplu güncelleme sistemiyle uygulanır.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:8,marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:700}}>Min. kâr %
              <input type="number" min="0" max="70" step="1" value={marketSettings.minMarginPct} onChange={e=>setMarketSettings(x=>({...x,minMarginPct:e.target.value}))} style={{...styles.input,marginTop:5}}/>
            </label>
            <label style={{fontSize:12,fontWeight:700}}>Piyasa konumu %
              <input type="number" min="-30" max="50" step="1" value={marketSettings.marketAdjustmentPct} onChange={e=>setMarketSettings(x=>({...x,marketAdjustmentPct:e.target.value}))} style={{...styles.input,marginTop:5}}/>
            </label>
            <label style={{fontSize:12,fontWeight:700}}>Maks. adım %
              <input type="number" min="1" max="30" step="1" value={marketSettings.maxStepPct} onChange={e=>setMarketSettings(x=>({...x,maxStepPct:e.target.value}))} style={{...styles.input,marginTop:5}}/>
            </label>
            <label style={{fontSize:12,fontWeight:700}}>Etsy sonrası kalan %
              <input type="number" min="1" max="100" step="0.01" value={marketSettings.etsyNetRatioPct} onChange={e=>setMarketSettings(x=>({...x,etsyNetRatioPct:e.target.value}))} style={{...styles.input,marginTop:5}}/>
            </label>
          </div>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>Varsayılan: minimum %20 gerçek kâr · piyasa konumu %0 · tek seferde en fazla %5 fiyat adımı · Etsy net oranı gerçek $249 → $200 siparişinden %80,32.</div>
          <button type="button" onClick={scanGlobalPrices} disabled={globalLoading} style={{...styles.button,opacity:globalLoading?.6:1}}>{globalLoading?"VAELONS taranıyor…":"Varyasyonları Getir"}</button>
          {globalVariations.length>0&&<div style={{marginTop:16}}>
            <div style={{fontSize:13,color:"#6b7280",marginBottom:12}}>Referans: <strong>{referenceListing?.title || "VAELONS listing"}</strong> · <strong>{globalVariations.length}</strong> varyasyon · <strong>{globalListingCount}</strong> aktif listing</div><input type="search" placeholder="Varyasyon ara: rolled, canvas, 13×18..." value={variationSearch} onChange={e=>setVariationSearch(e.target.value)} style={{...styles.input,marginBottom:12}} />
            <div style={{display:"grid",gap:10}}>{globalVariations.filter(v => `${v.label} ${v.key}`.toLocaleLowerCase("tr-TR").includes(variationSearch.trim().toLocaleLowerCase("tr-TR"))).map(v=><div key={v.key} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:14}}>
              <div style={{fontWeight:700,lineHeight:1.5}}>{v.label}</div>
              <div style={{fontSize:13,color:"#6b7280",margin:"5px 0 10px"}}>Mevcut referans fiyat: <strong>{Number(v.current_price)>0?`${Number(v.current_price).toFixed(2)}`:"okunamadı"}</strong></div>
              <button type="button" onClick={()=>analyzeMarketPrice(v)} disabled={marketLoadingKey===v.key||globalLoading} style={{...styles.button,marginBottom:10,background:"#1f4e78",opacity:marketLoadingKey===v.key?.6:1}}>{marketLoadingKey===v.key?"Etsy piyasası taranıyor…":"Piyasayı Tara ve Öneri Al"}</button>
              {marketAnalyses[v.key]&&(()=>{
                const a=marketAnalyses[v.key];
                const m=a.market||{};
                const rec=a.recommendation||{};
                const c=a.cost||{};
                return <div style={{marginBottom:10,padding:12,borderRadius:10,background:"#f8fafc",fontSize:13,lineHeight:1.65}}>
                  <div><strong>Maliyet:</strong> ${Number(c.cost_usd||0).toFixed(2)} <span style={{color:"#6b7280"}}>({c.confidence==="confirmed"?"doğrulandı":"Excel"})</span></div>
                  <div><strong>Etsy piyasa referansı:</strong> {Number(m.reference_price)>0?`${Number(m.reference_price).toFixed(2)}`:"yetersiz veri"} · {m.exact_reference_count||0} tam varyasyon referansı · güven {m.confidence||"LOW"}</div>
                  <div><strong>Min. kâr tabanı:</strong> ${Number(rec.profit_floor_price||0).toFixed(2)}</div>
                  <div><strong>Önerilen fiyat:</strong> <span style={{fontSize:16,fontWeight:800,color:"#166534"}}>${Number(rec.next_price||0).toFixed(2)}</span></div>
                  <div><strong>Değişim:</strong> {Number(rec.change_pct||0)>=0?"+":""}{Number(rec.change_pct||0).toFixed(2)}% · tahmini kâr marjı %{Number(rec.estimated_margin_pct||0).toFixed(2)}</div>
                  <div style={{color:"#6b7280"}}>Not: Etsy rakiplerinin gerçek satış fiyatı halka açık değildir; piyasa referansı aktif listing/varyasyon fiyatlarından hesaplanır.</div>
                </div>;
              })()}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}><input type="number" min="0.01" step="0.01" placeholder="Yeni fiyat" value={globalPrices[v.key]||""} onChange={e=>setGlobalPrices(x=>({...x,[v.key]:e.target.value}))} style={styles.input}/><button type="button" onClick={()=>applyGlobalPrice(v)} disabled={globalLoading} style={{...styles.button,width:"auto",background:"#8a6b20"}}>Önizle + Tümüne Uygula</button></div>
            </div>)}</div>
          </div>}
          {globalMessage&&<div style={{marginTop:14,padding:12,borderRadius:10,background:"#ecfdf5",color:"#166534"}}>{globalMessage}</div>}
          {globalError&&<div style={{marginTop:14,padding:12,borderRadius:10,background:"#fef2f2",color:"#991b1b"}}>{globalError}</div>}
          {marketError&&<div style={{marginTop:14,padding:12,borderRadius:10,background:"#fff7ed",color:"#9a3412"}}>{marketError}</div>}
        </section>
      )}

      {connected && (
        <section style={{ ...styles.card, marginTop: 18 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 22 }}>GPT İçinden Kullanım</h2>
          <p style={{ color: "#6b7280", lineHeight: 1.6, marginTop: 0 }}>
            VAELONS Etsy Manager GPT’nin taslakları görmesi ve ürünleri farklı saatlere planlaması için güvenli bir Action anahtarı oluştur.
          </p>

          <button
            type="button"
            onClick={generateGptKey}
            disabled={gptLoading}
            style={{ ...styles.button, opacity: gptLoading ? 0.6 : 1 }}
          >
            {gptLoading ? "Anahtar oluşturuluyor…" : "GPT Action Anahtarı Oluştur"}
          </button>

          {gptKey && (
            <div style={{ marginTop: 16 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 7 }}>GPT Action API Key</label>
              <textarea
                readOnly
                value={gptKey}
                rows={4}
                style={{ ...styles.input, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              />
              <button
                type="button"
                onClick={copyGptKey}
                style={{ ...styles.button, marginTop: 10, background: copied ? "#166534" : "#374151" }}
              >
                {copied ? "Kopyalandı" : "Anahtarı Kopyala"}
              </button>
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fffbeb", color: "#92400e", fontSize: 13, lineHeight: 1.55 }}>
                Bu anahtarı normal sohbete gönderme. Yalnızca GPT Builder → Actions → Authentication alanındaki gizli API key bölümüne yapıştır.
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: "#4b5563", lineHeight: 1.6 }}>
                <strong>OpenAPI Schema URL:</strong><br />
                https://etsy-price-manager.vercel.app/api/gpt/openapi
              </div>
            </div>
          )}

          {gptError && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#fef2f2", color: "#991b1b", lineHeight: 1.5 }}>
              {gptError}
            </div>
          )}
        </section>
      )}

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 18 }}>
        Her ürün bağımsız planlanır. Manager kapalı olsa bile Vercel Workflow zamanı geldiğinde ürünü yayınlar.
      </p>
    </main>
  );
}
