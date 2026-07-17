import React from 'react';

export const metadata = {
  title: 'Mesa Next.js Savings App',
  description: 'Mesa Savings Protocol Integration Example',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#0d1117', color: '#c9d1d9', fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
