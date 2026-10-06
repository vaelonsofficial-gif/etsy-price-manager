import ManagerNav from "./ManagerNav";
export const metadata={title:"VAELONS Manager",description:"VAELONS Etsy Sales Engine, SEO Manager and Price Manager"};
export default function RootLayout({children}){return <html lang="tr"><body style={{margin:0,background:"#f7f7f7",color:"#111"}}><ManagerNav/>{children}</body></html>}