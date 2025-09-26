import { GpuProvider } from "@/providers/gpu-provider";
import { ThemeProvider } from "@/providers/theme-provider";

import "./globals.css";

export const metadata = { title: "WebGPU Compute Playground" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider enableSystem={false}>
          <GpuProvider>
            <main className="m-3 rounded border border-gray-300 p-3">
              <h1 className="text-4xl font-bold">
                Welcome to the WebGPU Playground
              </h1>
              <p>Explore the power of GPU computing in your browser.</p>
              {children}
            </main>
          </GpuProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
