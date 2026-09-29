"use client";

import { useEffect, useState } from "react";

export default function PaperNexaPage() {
  const [status, setStatus] = useState({ connected: null });
  const [productMode, setProductMode] = useState("full-set");
  const [packageFile, setPackageFile] = useState(null);
  const [price, setPrice] = useState("8.99");
  const [query, setQuery] = useState("planner");
  const [categories, setCategories] = useState([]);
  const [taxonomyId, setTaxonomyId] = useState("12476");
  const [busy, setBusy] = useState(false);
  const [businessBusy, setBusinessBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      const r = await fetch("/api/papernexa/status", { cache: "no-store" });
      const data = await r.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, error: "Bağlantı kontrolü yapılamadı." });
    }
  }

  async function searchCategory(q = query) {
    setSearching(true);
    setError("");
    try {
      const r = await fetch("/api/papernexa/taxonomy?q=" + encodeURIComponent(q), {
        cache: "no-store",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Kategori araması başarısız.");
      const results = data.results || [];
      setCategories(results);
      if (results.length === 1) setTaxonomyId(String(results[0].taxonomy_id));
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (status.connected && categories.length === 0) searchCategory("planner");
  }, [status.connected]);

  async function switchProductMode(nextMode) {
    setProductMode(nextMode);
    setMessage("");
    setError("");
    setCategories([]);
    if (nextMode === "business-os") {
      setPrice("14.90");
      setQuery("spreadsheet");
      setTaxonomyId("");
      if (status.connected) await searchCategory("spreadsheet");
    } else {
      setPrice("8.99");
      setQuery("planner");
      setTaxonomyId("12476");
      if (status.connected) await searchCategory("planner");
    }
  }

  async function submit(activate) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!packageFile) throw new Error("Yayın paketini seç.");
      if (!taxonomyId) throw new Error("Etsy kategorisini seç.");
      if (packageFile.size > 4.2 * 1024 * 1024) {
        throw new Error("Paket 4.2 MB sınırını aşıyor.");
      }

      const form = new FormData();
      form.append("package", packageFile);
      form.append("price", price);
      form.append("taxonomyId", taxonomyId);
      form.append("activate", activate ? "true" : "false");

      const r = await fetch("/api/papernexa/publish", { method: "POST", body: form });
      const data = await r.json();
      if (!r.ok) {
        const listing = data?.details?.listing_id ? ` • Etsy taslak #${data.details.listing_id}` : "";
        throw new Error((data.error || "İşlem başarısız.") + listing);
      }

      setMessage(
        activate
          ? `YAYINLANDI • Listing #${data.listing_id} • ${data.thumbnail_count} görsel • ${data.tag_count} tag`
          : `TASLAK HAZIR • Listing #${data.listing_id} • tüm dosyalar yüklendi`
      );
    } catch (e) {
      setError(e.message || "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  }

  async function runBusinessOs(mode) {
    setBusinessBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode !== "package" && !taxonomyId) {
        throw new Error("Business OS için uygun Etsy kategorisini seç.");
      }

      const r = await fetch("/api/papernexa/business-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          presetKey: "lawn-care",
          price,
          taxonomyId,
        }),
      });

      if (mode === "package") {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error || "Business OS paketi oluşturulamadı.");
        }
        const blob = await r.blob();
        const disposition = r.headers.get("content-disposition") || "";
        const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "PaperNexa_Lawn_Care_OS_Full_Set.zip";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setMessage("FULL SET HAZIR • XLSX + müşteri ZIP + SEO + 10 Etsy thumbnail oluşturuldu.");
        return;
      }

      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Business OS Etsy işlemi başarısız.");
      setMessage(
        mode === "publish"
          ? `BUSINESS OS YAYINLANDI • Listing #${data.listing_id} • ${data.thumbnail_count} görsel • ${data.tag_count} tag`
          : `BUSINESS OS TASLAĞI HAZIR • Listing #${data.listing_id} • ${data.customer_file}`
      );
    } catch (e) {
      setError(e.message || "Business OS işlemi başarısız.");
    } finally {
      setBusinessBusy(false);
    }
  }

  const card = {
    background: "#fff",
    border: "1px solid #e4dbcf",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 16px 50px rgba(58,47,38,.07)",
  };
  const input = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    border: "1px solid #d8cec2",
    borderRadius: 11,
    fontSize: 15,
    background: "#fff",
    color: "#3e352f",
  };
  const button = {
    padding: "14px 16px",
    border: 0,
    borderRadius: 11,
    fontWeight: 800,
    cursor: "pointer",
    background: "#3e352f",
    color: "#fff",
    fontSize: 15,
  };
  const selectedCategory = categories.find((x) => String(x.taxonomy_id) === String(taxonomyId));

  return (
    <main style={{ minHeight: "100vh", background: "#f7f2eb", padding: "42px 18px 70px", fontFamily: "Arial, sans-serif", color: "#3e352f" }}>
      <div style={{ maxWidth: 940, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, letterSpacing: 2, fontWeight: 900, color: "#a08368" }}>PAPERNEXA</div>
          <h1 style={{ fontSize: 38, margin: "8px 0 6px" }}>Product Factory & Etsy Publisher</h1>
          <p style={{ margin: 0, color: "#776d64", lineHeight: 1.6 }}>
            Frame TV / planner full setleri ile yeni Business OS ürünlerini aynı PaperNexa mağazasından yönet.
          </p>
        </div>

        <section style={card}>
          {status.connected === null ? (
            <strong>Mevcut Etsy bağlantısı kontrol ediliyor…</strong>
          ) : status.connected ? (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#24734d", fontWeight: 900, fontSize: 17 }}>● PaperNexa Etsy bağlı</div>
                <div style={{ color: "#776d64", marginTop: 6 }}>
                  {status.shop?.shop_name} • Shop #{status.shop?.shop_id}
                </div>
                <div style={{ color: "#9b8e81", fontSize: 12, marginTop: 4 }}>Mevcut bağlantı kullanılıyor.</div>
              </div>
              <button onClick={loadStatus} style={{ ...button, background: "#847467" }}>Kontrol Et</button>
            </div>
          ) : (
            <div>
              <div style={{ color: "#9a3030", fontWeight: 900 }}>Bu tarayıcıdaki eski Etsy oturumu bulunamadı.</div>
              <p style={{ color: "#776d64", lineHeight: 1.6 }}>
                Yeni key veya secret istemiyorum. Önce aynı tarayıcıda mevcut Etsy oturumunu yeniden algılamayı dene.
              </p>
              <button onClick={loadStatus} style={button}>Mevcut Bağlantıyı Tekrar Kontrol Et</button>
              {status.error && <div style={{ fontSize: 12, color: "#9a3030", marginTop: 10 }}>{status.error}</div>}
            </div>
          )}
        </section>

        {status.connected && (
          <>
            <section style={{ ...card, marginTop: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  onClick={() => switchProductMode("full-set")}
                  style={{ ...button, background: productMode === "full-set" ? "#3e352f" : "#d9d0c6", color: productMode === "full-set" ? "#fff" : "#574d45" }}
                >
                  Frame TV / Hazır Full Set
                </button>
                <button
                  onClick={() => switchProductMode("business-os")}
                  style={{ ...button, background: productMode === "business-os" ? "#2f5a43" : "#d9d0c6", color: productMode === "business-os" ? "#fff" : "#574d45" }}
                >
                  Business OS Factory • YENİ
                </button>
              </div>
            </section>

            <section style={{ ...card, marginTop: 18 }}>
              <h2 style={{ marginTop: 0 }}>1. Etsy kategorisi</h2>
              {productMode === "full-set" ? (
                <div style={{ padding: "12px 14px", borderRadius: 11, background: "#edf6ef", color: "#285c3c", fontWeight: 800, marginBottom: 12 }}>
                  Varsayılan: Paper & Party Supplies → Stationery → Design & Templates → Templates → Planner Templates (#12476)
                </div>
              ) : (
                <div style={{ padding: "12px 14px", borderRadius: 11, background: "#eef4ef", color: "#315c43", fontWeight: 800, marginBottom: 12 }}>
                  Business OS için “spreadsheet / business template” araması yap ve en uygun dijital şablon kategorisini seç.
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                <input value={query} onChange={(e) => setQuery(e.target.value)} style={input} />
                <button onClick={() => searchCategory(query)} disabled={searching} style={button}>
                  {searching ? "Aranıyor…" : "Kategori Ara"}
                </button>
              </div>
              {categories.length > 0 && (
                <select value={taxonomyId} onChange={(e) => setTaxonomyId(e.target.value)} style={{ ...input, marginTop: 12 }}>
                  <option value="">Uygun kategoriyi seç…</option>
                  {categories.map((x) => (
                    <option key={x.taxonomy_id} value={x.taxonomy_id}>
                      {x.path} — #{x.taxonomy_id}
                    </option>
                  ))}
                </select>
              )}
              {taxonomyId && (
                <div style={{ marginTop: 9, fontSize: 12, color: "#776d64" }}>
                  Seçili kategori: {selectedCategory?.path || `#${taxonomyId}`}
                </div>
              )}
            </section>

            {productMode === "full-set" ? (
              <section style={{ ...card, marginTop: 18 }}>
                <h2 style={{ marginTop: 0 }}>2. Hazır full set</h2>
                <p style={{ color: "#776d64", lineHeight: 1.55 }}>
                  ZIP içinden başlık, açıklama, 13 tag, thumbnail'ler ve müşteri indirme dosyası otomatik alınır.
                </p>
                <div style={{ display: "grid", gap: 14 }}>
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    onChange={(e) => setPackageFile(e.target.files?.[0] || null)}
                    style={input}
                  />
                  {packageFile && (
                    <div style={{ fontSize: 12, color: "#776d64" }}>
                      {packageFile.name} • {(packageFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                  <div>
                    <label style={{ display: "block", fontWeight: 800, marginBottom: 7 }}>Fiyat (USD)</label>
                    <input type="number" min="0.2" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} style={input} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <button onClick={() => submit(false)} disabled={busy} style={{ ...button, background: "#847467", opacity: busy ? .55 : 1 }}>
                      {busy ? "İşleniyor…" : "Önce Taslak Oluştur"}
                    </button>
                    <button onClick={() => submit(true)} disabled={busy} style={{ ...button, opacity: busy ? .55 : 1 }}>
                      {busy ? "Yayınlanıyor…" : "Etsy'de Yayınla"}
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section style={{ ...card, marginTop: 18, borderColor: "#b9cbbf" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "inline-block", padding: "6px 10px", borderRadius: 999, background: "#e3eee7", color: "#315c43", fontWeight: 900, fontSize: 12 }}>İLK TEST ÜRÜNÜ</div>
                    <h2 style={{ margin: "12px 0 6px" }}>Lawn Care Business Operating System</h2>
                    <p style={{ color: "#776d64", lineHeight: 1.55, marginTop: 0 }}>
                      Sistem ürünü sıfırdan hazırlar: gerçek XLSX çalışma kitabı + müşteri ZIP'i + SEO + 13 tag + 10 Etsy satış görseli.
                    </p>
                  </div>
                  <div style={{ minWidth: 180 }}>
                    <label style={{ display: "block", fontWeight: 800, marginBottom: 7 }}>Lansman fiyatı (USD)</label>
                    <input type="number" min="0.2" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} style={input} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginTop: 18 }}>
                  {["Business Dashboard", "Customer CRM", "Job Tracker", "Recurring Schedule", "Quote Calculator", "Route Planner", "Payment Tracker", "Expense Tracker", "Profit Overview", "Quick Start Guide"].map((item) => (
                    <div key={item} style={{ padding: 12, borderRadius: 11, background: "#f6f8f6", border: "1px solid #dce6df", fontWeight: 800, fontSize: 13 }}>
                      ✓ {item}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "#fff8e9", color: "#6e5a2f", lineHeight: 1.5, fontSize: 13 }}>
                  İlk aşamada Etsy'ye direkt canlı basmak yerine “Taslak Oluştur” kullan. Başlık, kategori, thumbnail ve dosyaları Etsy'de kontrol ettikten sonra yayınla.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 18 }}>
                  <button onClick={() => runBusinessOs("package")} disabled={businessBusy} style={{ ...button, background: "#847467", opacity: businessBusy ? .55 : 1 }}>
                    {businessBusy ? "Hazırlanıyor…" : "Full Set ZIP İndir"}
                  </button>
                  <button onClick={() => runBusinessOs("draft")} disabled={businessBusy} style={{ ...button, background: "#2f5a43", opacity: businessBusy ? .55 : 1 }}>
                    {businessBusy ? "Hazırlanıyor…" : "Etsy Taslağı Oluştur"}
                  </button>
                  <button onClick={() => runBusinessOs("publish")} disabled={businessBusy} style={{ ...button, background: "#3e352f", opacity: businessBusy ? .55 : 1 }}>
                    {businessBusy ? "Yayınlanıyor…" : "Etsy'de Yayınla"}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {message && (
          <div style={{ marginTop: 18, padding: 17, borderRadius: 12, background: "#ebf7ef", color: "#23633f", fontWeight: 900 }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 18, padding: 17, borderRadius: 12, background: "#fff0f0", color: "#983131", lineHeight: 1.55 }}>
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
