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
        maxWidth: 1180,
        margin: "28px auto 48px",
        padding: "0 20px",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
      }}
    >
      <section style={{padding:"28px",borderRadius:22,background:"linear-gradient(135deg,#07111f,#172033)",color:"#fff",marginBottom:18,boxShadow:"0 22px 55px rgba(15,23,42,.18)"}}><div style={{fontSize:11,fontWeight:900,letterSpacing:"1.5px",color:"#94a3b8"}}>VAELONS · REVENUE INTELLIGENCE</div><h1 style={{fontSize:"clamp(30px,5vw,44px)",margin:"7px 0"}}>Sales Command Center</h1><p style={{color:"#cbd5e1",maxWidth:720,lineHeight:1.6,margin:0}}>Mağaza performansını tek merkezden analiz et; güçlü ürünleri, darboğazları ve aksiyon alanlarını görünür hale getir.</p></section><SalesEnginePanel styles={styles} />
    </main>
  );
}
