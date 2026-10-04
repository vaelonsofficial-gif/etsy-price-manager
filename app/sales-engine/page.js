import SalesEnginePanel from "../SalesEnginePanel";

export const dynamic = "force-dynamic";

export default function SalesEnginePage() {
  const styles = {
    card: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 18,
      padding: 24,
      boxShadow: "0 10px 30px rgba(0,0,0,.05)",
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
    <main
      style={{
        maxWidth: 920,
        margin: "28px auto 48px",
        padding: "0 20px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <SalesEnginePanel styles={styles} />
    </main>
  );
}
