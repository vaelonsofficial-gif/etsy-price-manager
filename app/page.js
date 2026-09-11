"use client";

import { useEffect, useMemo, useState } from "react";

function defaultLocalDateTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Home() {
  const [connected, setConnected] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [listingId, setListingId] = useState("");
  const [publishAt, setPublishAt] = useState(defaultLocalDateTime);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Yerel saat",
    []
  );

  const selectedDraft = drafts.find(
    (listing) => String(listing.listing_id) === String(listingId)
  );

  async function loadDrafts() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/etsy/drafts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setConnected(false);
        setDrafts([]);
        return;
      }
      setConnected(true);
      setDrafts(data.listings || []);
      if (!listingId && data.listings?.length) {
        setListingId(String(data.listings[0].listing_id));
      }
    } catch {
      setError("Manager Etsy taslaklarını yükleyemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  async function schedulePublish(event) {
    event.preventDefault();
    setScheduling(true);
    setMessage("");
    setError("");

    try {
      const publishDate = new Date(publishAt);
      const response = await fetch("/api/etsy/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          publishAt: publishDate.toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Planlama başarısız.");

      setMessage(
        `Planlandı. Listing #${data.listingId}, ${publishDate.toLocaleString("tr-TR")} tarihinde otomatik yayınlanacak.`
      );
    } catch (err) {
      setError(err.message || "Planlama başarısız.");
    } finally {
      setScheduling(false);
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
      padding: "13px 18px",
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
    <main style={{ maxWidth: 760, margin: "48px auto", padding: "0 20px 60px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.4, color: "#8a6b20" }}>VAELONS</div>
        <h1 style={{ margin: "8px 0", fontSize: 34 }}>Etsy Manager</h1>
        <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
          Taslak ürününü seç, tarih ve saati belirle. Manager zamanı geldiğinde Etsy’de otomatik yayınlar.
        </p>
      </div>

      <section style={styles.card}>
        {loading ? (
          <p style={{ margin: 0 }}>Etsy bağlantısı kontrol ediliyor…</p>
        ) : !connected ? (
          <div>
            <h2 style={{ marginTop: 0 }}>Etsy bağlantısı gerekli</h2>
            <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
              VAELONS hesabını bir kez bağla. Token ekranda gösterilmez; güvenli HttpOnly oturumunda tutulur.
            </p>
            <a href="/api/etsy/login" style={{ ...styles.button, display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              VAELONS Etsy Hesabını Bağla
            </a>
          </div>
        ) : (
          <form onSubmit={schedulePublish}>
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
              <>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Taslak ürün — sadece 1 ürün seç</label>
                <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                  {drafts.map((listing) => {
                    const selected = String(listingId) === String(listing.listing_id);
                    return (
                      <button
                        key={listing.listing_id}
                        type="button"
                        onClick={() => setListingId(String(listing.listing_id))}
                        aria-pressed={selected}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "13px 14px",
                          borderRadius: 10,
                          border: selected ? "2px solid #111827" : "1px solid #d1d5db",
                          background: selected ? "#f3f4f6" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 700, lineHeight: 1.4 }}>{listing.title}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                          #{listing.listing_id} {selected ? "• SEÇİLDİ" : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedDraft && (
                  <div style={{ marginBottom: 18, padding: "10px 12px", borderRadius: 9, background: "#ecfdf5", color: "#166534", fontSize: 13, lineHeight: 1.5 }}>
                    <strong>Seçili ürün:</strong> {selectedDraft.title}
                  </div>
                )}

                <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Yayınlama tarihi ve saati</label>
                <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} required style={styles.input} />
                <div style={{ fontSize: 12, color: "#6b7280", margin: "7px 0 20px" }}>Saat dilimi: {timezone}</div>

                <button type="submit" disabled={scheduling || !listingId} style={{ ...styles.button, opacity: scheduling || !listingId ? 0.6 : 1 }}>
                  {scheduling ? "Planlanıyor…" : "Planlı Yayınla"}
                </button>
              </>
            )}
          </form>
        )}

        {message && <div style={{ marginTop: 18, padding: 14, borderRadius: 10, background: "#ecfdf5", color: "#166534", lineHeight: 1.5 }}>{message}</div>}
        {error && <div style={{ marginTop: 18, padding: 14, borderRadius: 10, background: "#fef2f2", color: "#991b1b", lineHeight: 1.5 }}>{error}</div>}
      </section>

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 18 }}>
        Planlanan ürünler Manager kapalı olsa bile Vercel Workflow üzerinden yayınlanır.
      </p>
    </main>
  );
}
