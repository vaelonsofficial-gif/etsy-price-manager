export const metadata = {
  title: "VAELONS Etsy Manager",
  description: "VAELONS Etsy price manager and sales engine",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          background: "#f7f7f7",
          color: "#111",
        }}
      >
        <nav
          style={{
            maxWidth: 920,
            margin: "0 auto",
            padding: "14px 20px 0",
            fontFamily: "Arial, sans-serif",
            display: "flex",
            gap: 10,
            flexWrap: "wrap"
          }}
        >
          <a
            href="/"
            style={{
              textDecoration: "none",
              color: "#111827",
              fontWeight: 800,
              padding: "9px 12px",
              borderRadius: 9,
              background: "#fff",
              border: "1px solid #e5e7eb"
            }}
          >
            Price Manager
          </a>
          <a
            href="/sales-engine"
            style={{
              textDecoration: "none",
              color: "#166534",
              fontWeight: 800,
              padding: "9px 12px",
              borderRadius: 9,
              background: "#ecfdf5",
              border: "1px solid #bbf7d0"
            }}
          >
            Sales Engine
          </a>
        </nav>
        {children}
      </body>
    </html>
  );
}
