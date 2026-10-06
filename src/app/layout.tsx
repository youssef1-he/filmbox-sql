import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata = { title: 'FilmBox' };
const links = [['/', 'Home'], ['/films', 'Films'], ['/classements', 'Rankings'], ['/tableau-de-bord', 'Dashboard'], ['/membres/cinephile_92', 'Profile'], ['/bacon', 'Six degrees'], ['/recherche', 'Search'], ['/noter', 'Rate'], ['/diagnostic', 'Diagnostic']];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en"><body>
      <header>
        <b className="logo">FILM<span>BOX</span></b>
        <nav>{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      </header>
      <main>{children}</main>
    </body></html>
  );
}
