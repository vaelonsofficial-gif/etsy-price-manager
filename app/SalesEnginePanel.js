"use client";

import { useState } from "react";

export default function SalesEnginePanel({ styles }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("heroes");

  async function scan() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/etsy/sales-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingLimit: 500,
          heroLimit: 25
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Sales Engine taraması başarısız."
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err.message ||
        "Sales Engine taraması başarısız."
      );
    } finally {
      setLoading(false);
    }
  }

  const rows =
    view === "heroes"
      ? data?.hero_candidates || []
      : data?.listings || [];

  const counts = data?.action_counts || {};

  return (
    <section style={{ ...styles.card, marginTop: 18 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "flex-start",
        flexWrap: "wrap"
      }}>
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1.1,
            color: "#166534"
          }}>
            READ-ONLY · GÜVENLİ
          </div>

          <h2 style={{
            margin: "6px 0 8px",
            fontSize: 24
          }}>
            VAELONS Sales Engine
          </h2>

          <p style={{
            color: "#6b7280",
            lineHeight: 1.6,
            margin: "0 0 12px"
          }}>
            Aktif listingleri trafik, favori ilgisi, görsel/SEO kalitesi ve güven/teslimat sinyallerine göre 100 üzerinden puanlar. Fiyat, reklam, görsel veya listing değiştirmez.
          </p>
        </div>

        <div style={{
          padding: "9px 11px",
          borderRadius: 9,
          background: "#ecfdf5",
          color: "#166534",
          fontSize: 12,
          fontWeight: 700
        }}>
          Hedef: 3 satış/gün
        </div>
      </div>

      <button
        type="button"
        onClick={scan}
        disabled={loading}
        style={{
          ...styles.button,
          background: "#166534",
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading
          ? "Aktif listingler analiz ediliyor…"
          : "Satış Motorunu Tara"}
      </button>

      {error && (
        <div style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 10,
          background: "#fef2f2",
          color: "#991b1b"
        }}>
          {error}
        </div>
      )}

      {data && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(135px,1fr))",
            gap: 8,
            marginBottom: 12
          }}>
            <Metric
              label="Aktif listing"
              value={data.coverage?.active_listings || 0}
            />
            <Metric
              label="Hero adayları"
              value={data.hero_count || 0}
              positive
            />
            <Metric
              label="Toplam görüntülenme"
              value={Number(
                data.coverage?.total_views || 0
              ).toLocaleString("tr-TR")}
            />
            <Metric
              label="Favori oranı"
              value={`%${Number(
                data.coverage?.lifetime_favorite_rate_pct || 0
              ).toFixed(2)}`}
            />
          </div>

          <div style={{
            padding: 12,
            borderRadius: 10,
            background: "#fff7ed",
            color: "#9a3412",
            fontSize: 13,
            lineHeight: 1.55,
            marginBottom: 12
          }}>
            <strong>3 satış/gün matematiği:</strong>{" "}
            %1 dönüşümde yaklaşık 300, %1,5 dönüşümde
            yaklaşık 200, %2 dönüşümde yaklaşık 150
            nitelikli ziyaret/gün gerekir. Bu sürüm
            Ads harcaması veya listing bazlı sipariş
            verisi olmadan tahmin yapmaz.
          </div>

          <div style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12
          }}>
            <button
              type="button"
              onClick={() => setView("heroes")}
              style={{
                ...styles.button,
                width: "auto",
                padding: "9px 12px",
                background:
                  view === "heroes"
                    ? "#166534"
                    : "#6b7280"
              }}
            >
              Top 25 Hero
            </button>

            <button
              type="button"
              onClick={() => setView("all")}
              style={{
                ...styles.button,
                width: "auto",
                padding: "9px 12px",
                background:
                  view === "all"
                    ? "#111827"
                    : "#6b7280"
              }}
            >
              Tüm Listingler
            </button>
          </div>

          <div style={{
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 10
          }}>
            HERO {counts.HERO || 0} · Görünürlük{" "}
            {counts.VISIBILITY_FIX || 0} · Sayfa/İlgi{" "}
            {counts.ENGAGEMENT_FIX || 0} · Listing düzelt{" "}
            {counts.LISTING_FIX || 0} · İzle{" "}
            {counts.WATCH || 0} · Düşük öncelik{" "}
            {counts.LOW_PRIORITY || 0}
          </div>

          <div style={{ display: "grid", gap: 9 }}>
            {rows.map((row, index) => (
              <ListingCard
                key={row.listing_id}
                row={row}
                index={index}
              />
            ))}
          </div>

          <div style={{
            marginTop: 12,
            padding: 11,
            borderRadius: 9,
            background: "#f8fafc",
            fontSize: 12,
            color: "#6b7280",
            lineHeight: 1.55
          }}>
            <strong>Güvenlik sınırı:</strong> mevcut Etsy
            OAuth yetkileri değiştirilmedi. Bu sürüm
            impressions, listing bazlı sipariş ve Etsy Ads
            harcamasını kullanmıyor. Bu veriler ikinci bir
            Analytics katmanında, mevcut Price Manager
            bağlantısına zarar vermeden eklenebilir.
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, positive = false }) {
  return (
    <div style={{
      padding: 12,
      borderRadius: 10,
      background:
        positive ? "#f0fdf4" : "#f8fafc"
    }}>
      <div style={{
        fontSize: 12,
        color:
          positive ? "#166534" : "#6b7280"
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: 800,
        color:
          positive ? "#166534" : "#111827"
      }}>
        {value}
      </div>
    </div>
  );
}

function ListingCard({ row, index }) {
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 13,
      background: "#fff"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "flex-start"
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 12,
            color: "#6b7280"
          }}>
            #{index + 1} · Listing {row.listing_id}
          </div>

          <div style={{
            fontWeight: 800,
            lineHeight: 1.45,
            marginTop: 3
          }}>
            {row.title}
          </div>
        </div>

        <div style={{
          minWidth: 66,
          textAlign: "center",
          padding: "8px 9px",
          borderRadius: 10,
          background:
            row.sales_score >= 75
              ? "#dcfce7"
              : "#f3f4f6",
          color:
            row.sales_score >= 75
              ? "#166534"
              : "#111827"
        }}>
          <div style={{
            fontSize: 21,
            fontWeight: 900
          }}>
            {Number(row.sales_score || 0).toFixed(0)}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 700
          }}>
            /100
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 9,
        fontSize: 13,
        lineHeight: 1.6
      }}>
        <strong>{row.action?.label}</strong>
        {" — "}
        {row.action?.reason}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit,minmax(110px,1fr))",
        gap: 6,
        marginTop: 9,
        fontSize: 12
      }}>
        <div>
          Görüntülenme/gün:{" "}
          <strong>
            {Number(row.views_per_day || 0).toFixed(2)}
          </strong>
        </div>
        <div>
          Favori oranı:{" "}
          <strong>
            %{Number(
              row.favorite_rate_pct || 0
            ).toFixed(2)}
          </strong>
        </div>
        <div>
          Görsel:{" "}
          <strong>
            {row.listing_health?.image_count || 0}/10
          </strong>
        </div>
        <div>
          Tag:{" "}
          <strong>
            {row.listing_health?.tag_count || 0}/13
          </strong>
        </div>
        <div>
          Talep:{" "}
          <strong>
            {Number(row.scores?.demand || 0).toFixed(1)}/30
          </strong>
        </div>
        <div>
          İlgi:{" "}
          <strong>
            {Number(row.scores?.interest || 0).toFixed(1)}/20
          </strong>
        </div>
        <div>
          Kalite:{" "}
          <strong>
            {Number(row.scores?.quality || 0).toFixed(1)}/30
          </strong>
        </div>
        <div>
          Güven:{" "}
          <strong>
            {Number(row.scores?.trust || 0).toFixed(1)}/20
          </strong>
        </div>
      </div>

      {row.url && (
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            marginTop: 8,
            fontSize: 12
          }}
        >
          Etsy listingini aç
        </a>
      )}
    </div>
  );
}
