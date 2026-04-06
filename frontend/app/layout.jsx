import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import CategoryNav from "@/components/layout/CategoryNav";
import Footer from "@/components/layout/Footer";
import CartSidebar from "@/components/cart/CartSidebar";
import PublicShell from "@/components/layout/PublicShell";
import OfflineGate from "@/components/common/OfflineGate";
import { LanguageProvider } from "@/context/LanguageContext";
import { CartProvider } from "@/context/CartContext";
import { PromotionProvider } from "@/context/PromotionContext";
import { CategoryProvider } from "@/context/CategoryContext";
import GoogleOAuthWrapper from "@/components/common/GoogleOAuthWrapper";
import { DialogProvider } from "@/context/DialogContext";
import { getMetadataBase, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { generateOrganization, generateSearchActionSchema } from "@/lib/structured-data";
import { SchemaScript } from "@/components/common/SchemaMarkup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
export const metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "grocery delivery",
    "online grocery store",
    "fresh vegetables",
    "daily essentials",
    "kirana store",
    "MK Reddy General Stores",
    "Telugu grocery shopping",
    "buy groceries online",
    "grocery shopping India",
    "local kirana online",
    "fresh produce delivery",
    "household essentials",
    "affordable groceries",
  ],
  alternates: {
    canonical: "/",
    languages: {
      en: "/en",
      te: "/te",
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}og-image.png`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}twitter-image.png`],
    creator: "@MKReddy",
  },
  verification: {
    google: "_trkSgcfuUr9gyQaGjH5E1wIkz5Ta6aorA0AzHdOSq4",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const organizationSchema = generateOrganization();
  const searchSchema = generateSearchActionSchema();

  return (
    <html lang="en">
      <head>
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="revisit-after" content="7 days" />
        <meta name="author" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_IN" />
        <meta name="language" content="English" />
        <link rel="canonical" href={SITE_URL} />
        <link rel="sitemap" href="/sitemap.xml" />
        <link rel="alternate" hrefLang="en" href={SITE_URL} />
        <link rel="alternate" hrefLang="te" href={`${SITE_URL}te/`} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="/favicon-16x16.png" sizes="16x16" />
        <meta name="theme-color" content="#ffffff" />
        <SchemaScript schema={organizationSchema} />
        <SchemaScript schema={searchSchema} />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        <OfflineGate />
        <GoogleOAuthWrapper clientId={googleClientId}>
          <LanguageProvider>
            <CartProvider>
              <PromotionProvider>
                <CategoryProvider>
                  <DialogProvider>
                    {/* Public navigation - hidden on admin pages */}
                    <PublicShell>
                      <Navbar />
                      <CategoryNav />
                      <MobileHeader />
                      <CartSidebar />
                    </PublicShell>
                    {children}
                    <PublicShell>
                      <Footer />
                      <MobileBottomNav />
                    </PublicShell>
                  </DialogProvider>
                </CategoryProvider>
              </PromotionProvider>
            </CartProvider>
          </LanguageProvider>
        </GoogleOAuthWrapper>
      </body>
    </html>
  );
}
