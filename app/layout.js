import './globals.css';

export const metadata = {
  title: 'Night City Pixel',
  description: 'Night City Pixel running on Next.js with MongoDB saves and Zustand state.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
