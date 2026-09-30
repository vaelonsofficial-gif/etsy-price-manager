"use client";

import { useState } from "react";

export default function PaperNexaConnectPage() {
  const [keystring, setKeystring] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/papernexa/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keystring, sharedSecret }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bağlantı bilgileri kaydedilemedi.");
      window.location.href = "/api/papernexa/login";
    } catch (e) {
      setError(e.message || "Bağlantı başlatılamadı.");
      setBusy(false);
    }
  }

  const input = {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 15px",
    border: "1px solid #d7cec3",
    borderRadius: 12,
    fontSize: 16,
    background: "#fff",
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f7f2eb", padding: "40px 18px", fontFamily: "Arial, sans-serif", color: "#3e352f" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ fontSize: 13, letterSpacing: 2, fontWeight: 900, color: "#a08368" }}>PAPERNEXA</div>
        <h1 style={{ marginBottom: 8 }}>Etsy bağlantısını tamamla</h1>
        <p style={{ color: "#776d64", lineHeight: 1.6 }}>
          Etsy Developer → Your Apps bölümünde PaperNexa uygulamasını aç. Aşağıya Keystring ve Shared Secret değerlerini ayrı ayrı yapıştır.
        </p>

        <section style={{ background: "#fff", border: "1px solid #e4dbcf", borderRadius: 20, padding: 24, boxShadow: "0 16px 50px rgba(58,47,38,.07)" }}>
          <label style={{ display: "block", fontWeight: 800, marginBottom: 7 }}>Keystring</label>
          <input
            value={keystring}
            onChange={(e) => setKeystring(e.target.value.trim())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Etsy Keystring"
            style={input}
          />

          <label style={{ display: "block", fontWeight: 800, margin: "18px 0 7px" }}>Shared Secret</label>
          <input
            type="password"
            value={sharedSecret}
            onChange={(e) => setSharedSecret(e.target.value.trim())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Etsy Shared Secret"
            style={input}
          />

          <div style={{ marginTop: 16, padding: 13, borderRadius: 12, background: "#fff8e9", color: "#6e5a2f", fontSize: 13, lineHeight: 1.55 }}>
            Etsy uygulamasındaki Redirect URI tam olarak şu olmalı:<br />
            <strong>https://etsy-price-manager.vercel.app/api/etsy/callback</strong>
          </div>

          <button
            onClick={connect}
            disabled={busy || !keystring || !sharedSecret}
            style={{ width: "100%", marginTop: 18, padding: "14px 16px", border: 0, borderRadius: 11, fontWeight: 900, fontSize: 16, background: "#3e352f", color: "#fff", opacity: busy || !keystring || !sharedSecret ? .55 : 1 }}
          >
            {busy ? "Etsy'ye yönlendiriliyor…" : "PaperNexa Etsy'yi Bağla"}
          </button>

          {error && (
            <div style={{ marginTop: 14, padding: 13, borderRadius: 12, background: "#fff0f0", color: "#983131", lineHeight: 1.5 }}>
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
