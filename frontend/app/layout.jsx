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
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
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
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
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

  return (
    <html lang="en">
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
