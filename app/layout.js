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
