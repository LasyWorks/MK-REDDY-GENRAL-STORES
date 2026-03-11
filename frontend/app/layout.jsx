import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import CategoryNav from "@/components/layout/CategoryNav";
import Footer from "@/components/layout/footer";
import CartSidebar from "@/components/cart/CartSidebar";
import PublicShell from "@/components/layout/PublicShell";
import { LanguageProvider } from "@/context/LanguageContext";
import { CartProvider } from "@/context/CartContext";
import { PromotionProvider } from "@/context/PromotionContext";
import GoogleOAuthWrapper from "@/components/common/GoogleOAuthWrapper";
import { DialogProvider } from "@/context/DialogContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata = {
  title: "MK Reddy General Store - Grocery Shopping",
  description:
    "Shop for groceries, vegetables, fruits and more at MK Reddy General Store",
};

export const viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleOAuthWrapper clientId={googleClientId}>
          <LanguageProvider>
            <CartProvider>
              <PromotionProvider>
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
              </PromotionProvider>
            </CartProvider>
          </LanguageProvider>
        </GoogleOAuthWrapper>
      </body>
    </html>
  );
}
