"use client";

import { useEffect, useState } from "react";

export default function PaperNexaPage() {
  const [status, setStatus] = useState({ connected: null });
  const [packageFile, setPackageFile] = useState(null);
  const [price, setPrice] = useState("8.99");
  const [query, setQuery] = useState("planner");
  const [categories, setCategories] = useState([]);
  const [taxonomyId, setTaxonomyId] = useState("12476");
  const [busy, setBusy] = useState(false);
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

  return (
    <main style={{ minHeight: "100vh", background: "#f7f2eb", padding: "42px 18px 70px", fontFamily: "Arial, sans-serif", color: "#3e352f" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, letterSpacing: 2, fontWeight: 900, color: "#a08368" }}>PAPERNEXA</div>
          <h1 style={{ fontSize: 38, margin: "8px 0 6px" }}>Etsy Publisher</h1>
          <p style={{ margin: 0, color: "#776d64", lineHeight: 1.6 }}>
            Mevcut PaperNexa Etsy bağlantısını kullanır. Yeniden API anahtarı veya Developer kurulumu istemez.
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
                <div style={{ color: "#9b8e81", fontSize: 12, marginTop: 4 }}>
                  Mevcut bağlantı kullanılıyor.
                </div>
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
              <h2 style={{ marginTop: 0 }}>1. Etsy kategorisi</h2><div style={{ padding: "12px 14px", borderRadius: 11, background: "#edf6ef", color: "#285c3c", fontWeight: 800, marginBottom: 12 }}>Seçili: Paper & Party Supplies → Stationery → Design & Templates → Templates → Planner Templates (#12476)</div>
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
            </section>

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
