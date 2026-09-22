"use client";

import { useEffect, useState } from "react";

export default function PaperNexaPage() {
  const [status, setStatus] = useState({ configured: null, connected: null });
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [packageFile, setPackageFile] = useState(null);
  const [price, setPrice] = useState("8.99");
  const [query, setQuery] = useState("planner");
  const [categories, setCategories] = useState([]);
  const [taxonomyId, setTaxonomyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      const r = await fetch("/api/papernexa/status", { cache: "no-store" });
      const data = await r.json();
      setStatus(data);
    } catch {
      setStatus({ configured: false, connected: false });
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function saveAndConnect() {
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/papernexa/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "API anahtarı kaydedilemedi.");
      window.location.href = "/api/papernexa/login";
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  async function searchCategory() {
    setError("");
    const r = await fetch("/api/papernexa/taxonomy?q=" + encodeURIComponent(query), {
      cache: "no-store",
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error || "Kategori araması başarısız.");
      return;
    }
    setCategories(data.results || []);
    if ((data.results || []).length === 1) {
      setTaxonomyId(String(data.results[0].taxonomy_id));
    }
  }

  async function submit(activate) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!packageFile) throw new Error("Full seller package ZIP seç.");
      if (!taxonomyId) throw new Error("Önce Etsy kategorisini seç.");
      if (packageFile.size > 4.2 * 1024 * 1024) {
        throw new Error("Full seller ZIP 4.2 MB altında olmalı.");
      }

      const form = new FormData();
      form.append("package", packageFile);
      form.append("price", price);
      form.append("taxonomyId", taxonomyId);
      form.append("activate", activate ? "true" : "false");

      const r = await fetch("/api/papernexa/publish", {
        method: "POST",
        body: form,
      });
      const data = await r.json();
      if (!r.ok) {
        const details = data?.details?.listing_id
          ? ` Etsy taslak ID: ${data.details.listing_id}`
          : "";
        throw new Error((data.error || "İşlem başarısız.") + details);
      }

      setMessage(
        activate
          ? `Yayınlandı. Listing #${data.listing_id} • ${data.thumbnail_count} thumbnail • ${data.tag_count} tag`
          : `Taslak oluşturuldu. Listing #${data.listing_id} • dosyalar yüklendi.`
      );
    } catch (e) {
      setError(e.message || "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  }

  const card = {
    background: "#fff",
    border: "1px solid #e7e1d8",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 12px 36px rgba(58,47,38,.06)",
  };
  const input = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #d8d0c6",
    borderRadius: 10,
    fontSize: 15,
    background: "#fff",
  };
  const primary = {
    padding: "12px 16px",
    border: 0,
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
    background: "#3e352f",
    color: "#fff",
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f8f4ee", padding: "44px 20px 70px", fontFamily: "Arial, sans-serif", color: "#3e352f" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, letterSpacing: 1.5, fontWeight: 800, color: "#a08368" }}>PAPERNEXA</div>
          <h1 style={{ fontSize: 36, margin: "8px 0 6px" }}>Etsy Full Set Publisher</h1>
          <p style={{ color: "#776d64", lineHeight: 1.6, margin: 0 }}>
            PaperNexa full seller ZIP'ini seç. Manager SEO dosyasını, 10 thumbnail'i ve müşteri ZIP'ini otomatik okuyup Etsy listingine yükler.
          </p>
        </div>

        <section style={card}>
          {status.configured === null ? (
            <p>Bağlantı kontrol ediliyor…</p>
          ) : !status.configured ? (
            <>
              <h2 style={{ marginTop: 0 }}>1. PaperNexa Etsy API'yi bağla</h2>
              <p style={{ color: "#776d64", lineHeight: 1.6 }}>
                PaperNexa Etsy Developer uygulamasındaki <strong>keystring:shared_secret</strong> değerini bir kez gir. Anahtar tarayıcıya açık biçimde geri gösterilmez; güvenli HttpOnly cookie içinde şifreli tutulur.
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="keystring:shared_secret"
                style={input}
              />
              <button onClick={saveAndConnect} disabled={saving} style={{ ...primary, width: "100%", marginTop: 12, opacity: saving ? .6 : 1 }}>
                {saving ? "Kaydediliyor…" : "Kaydet ve PaperNexa Etsy'yi Bağla"}
              </button>
              <p style={{ fontSize: 12, color: "#8b8178", lineHeight: 1.5 }}>
                Etsy Developer uygulamasında izin verilen redirect URL: https://etsy-price-manager.vercel.app/api/etsy/callback
              </p>
            </>
          ) : !status.connected ? (
            <>
              <h2 style={{ marginTop: 0 }}>2. Etsy yetkilendirmesi gerekli</h2>
              <p style={{ color: "#776d64" }}>API anahtarı kayıtlı. Şimdi PaperNexa Etsy hesabına izin ver.</p>
              <a href="/api/papernexa/login" style={{ ...primary, display: "block", textDecoration: "none", textAlign: "center" }}>
                PaperNexa Etsy Hesabını Bağla
              </a>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong style={{ color: "#26734d" }}>● Etsy bağlı</strong>
                  <div style={{ color: "#776d64", fontSize: 13, marginTop: 4 }}>
                    {status.shop?.shop_name || "PaperNexa"} • Shop #{status.shop?.shop_id}
                  </div>
                </div>
                <button onClick={loadStatus} style={{ ...primary, background: "#7e7268" }}>Bağlantıyı Yenile</button>
              </div>
            </>
          )}
        </section>

        {status.connected && (
          <>
            <section style={{ ...card, marginTop: 18 }}>
              <h2 style={{ marginTop: 0 }}>Etsy kategorisini seç</h2>
              <p style={{ color: "#776d64", lineHeight: 1.5 }}>
                Planner ürünlerinde “planner”, Frame TV ürünlerinde “digital art” gibi arama yap. Seçilen gerçek Etsy taxonomy ID yayın sırasında kullanılır.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                <input value={query} onChange={(e) => setQuery(e.target.value)} style={input} />
                <button onClick={searchCategory} style={primary}>Kategori Ara</button>
              </div>
              {categories.length > 0 && (
                <select value={taxonomyId} onChange={(e) => setTaxonomyId(e.target.value)} style={{ ...input, marginTop: 12 }}>
                  <option value="">Kategori seç…</option>
                  {categories.map((x) => (
                    <option key={x.taxonomy_id} value={x.taxonomy_id}>
                      {x.path} — #{x.taxonomy_id}
                    </option>
                  ))}
                </select>
              )}
            </section>

            <section style={{ ...card, marginTop: 18 }}>
              <h2 style={{ marginTop: 0 }}>Full set yükle</h2>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontWeight: 800, marginBottom: 7 }}>Full Seller Package ZIP</label>
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    onChange={(e) => setPackageFile(e.target.files?.[0] || null)}
                    style={input}
                  />
                  {packageFile && (
                    <div style={{ fontSize: 12, color: "#776d64", marginTop: 6 }}>
                      {packageFile.name} • {(packageFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 800, marginBottom: 7 }}>Etsy fiyatı (USD)</label>
                  <input type="number" min="0.2" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} style={input} />
                </div>

                <div style={{ padding: 14, borderRadius: 12, background: "#fff8ea", color: "#795b2f", lineHeight: 1.55, fontSize: 13 }}>
                  Paket standardı: Etsy SEO TXT + ETSY_THUMBNAILS klasörü + Customer_Download ZIP. Full seller ZIP bu yayınlayıcıda 4.2 MB altında olmalı; müşteri ZIP'i Etsy için 20 MB altında olmalı.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <button disabled={busy} onClick={() => submit(false)} style={{ ...primary, background: "#7e7268", opacity: busy ? .6 : 1 }}>
                    {busy ? "İşleniyor…" : "Taslak Oluştur"}
                  </button>
                  <button disabled={busy} onClick={() => submit(true)} style={{ ...primary, opacity: busy ? .6 : 1 }}>
                    {busy ? "Yayınlanıyor…" : "Şimdi Etsy'de Yayınla"}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {message && (
          <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: "#ecf8f0", color: "#23633f", fontWeight: 700 }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: "#fff0f0", color: "#9a3030", lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <p style={{ textAlign: "center", color: "#9a9087", fontSize: 12, marginTop: 24 }}>
          “Şimdi Etsy'de Yayınla” listingi active yapar ve Etsy'nin normal listing ücretleri uygulanabilir.
        </p>
      </div>
    </main>
  );
}
