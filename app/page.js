export default function Home() {
  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "60px auto",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Etsy Price Manager</h1>

      <p>Rolled 13x18 Variation Price Manager</p>

      <p>
        Target Price: <strong>$89.00</strong>
      </p>

      <button
        style={{
          padding: "12px 20px",
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
        }}
      >
        System Ready
      </button>
    </main>
  );
}
