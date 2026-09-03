import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import QueryProvider from "@/components/QueryProvider";
import NavigationProgress from "@/components/NavigationProgress";

export const metadata = {
  title: "DrX - AI-Powered Doctor Platform",
  description: "Your AI-powered medical companion. Discover drugs, attend CME events, connect with peers, and stay ahead in your practice.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="antialiased bg-white min-h-screen">
        <ErrorBoundary>
          <QueryProvider>
            <NavigationProgress />
            {children}
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
