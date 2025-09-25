export const metadata = { title: "WebGPU Compute Playground" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif" }}>{children}</body>
    </html>
  );
}
