import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Dokter Ban — Dashboard Bengkel',description:'Stok, penjualan, dan kas bengkel dalam satu ruang kerja.',icons:{icon:'/dokter-ban.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
