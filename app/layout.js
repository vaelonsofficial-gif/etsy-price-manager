export const metadata = {
  title: "Etsy Price Manager",
  description: "VAELONS Etsy variation price manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#f7f7f7",
          color: "#111",
        }}
      >
        {children}
      </body>
    </html>
  );
}
