"use client";

import { useEffect, useMemo, useState } from "react";

function defaultLocalDateTime(offsetMinutes = 60) {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  date.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Home() {
  const [connected, setConnected] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [scheduleTimes, setScheduleTimes] = useState({});
  const [loading, setLoading] = useState(true);
  const [schedulingId, setSchedulingId] = useState("");
  const [messages, setMessages] = useState({});
  const [errors, setErrors] = useState({});

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

      const listings = data.listings || [];
      setConnected(true);
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

  useEffect(() => {
    loadDrafts();
  }, []);

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

      <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 18 }}>
        Her ürün bağımsız planlanır. Manager kapalı olsa bile Vercel Workflow zamanı geldiğinde ürünü yayınlar.
      </p>
    </main>
  );
}
