import { Inter } from 'next/font/google'

import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ['latin'] })


export const metadata = {
  title: "NewsWorld - Your Global News Aggregator",
  description: "NewsWorld is a comprehensive global news aggregator providing real-time updates from diverse sources worldwide. Stay informed with personalized content on politics, technology, business, and more.",
  keywords: "news, global news, news aggregator, real-time news, world news, personalized news, news sources",
  openGraph: {
    title: "NewsWorld - Your Global News Aggregator",
    description: "Your one-stop destination for global news from multiple sources. Get real-time updates, personalized content, and comprehensive coverage of world events.",
    url: "https://newsworld.com",
    siteName: "NewsWorld",
    images: [
      {
        url: "/favicon/favicon.svg",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NewsWorld - Your Global News Aggregator",
    description: "Your one-stop destination for global news from multiple sources. Get real-time updates, personalized content, and comprehensive coverage of world events.",
    images: ["/favicon/favicon.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VL0BHL7LPW"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VL0BHL7LPW');
          `}
        </Script>
        
        {/* Bootstrap CSS */}
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css" />
      </head>
      <body className={`${inter.variable} ${inter.variable}`}>
        {children}
        
        {/* Bootstrap JS */}
        <Script 
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
