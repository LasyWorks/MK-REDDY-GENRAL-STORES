import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import CategoryNav from "@/components/layout/CategoryNav";
import Footer from "@/components/layout/footer";
import CartSidebar from "@/components/cart/CartSidebar";
import { LanguageProvider } from "@/context/LanguageContext";
import { CartProvider } from "@/context/CartContext";
import { PromotionProvider } from "@/context/PromotionContext";
import GoogleOAuthWrapper from '@/components/common/GoogleOAuthWrapper';

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
                <Navbar />
                <CategoryNav />
                <CartSidebar />
                {children}
                <Footer />
              </PromotionProvider>
            </CartProvider>
          </LanguageProvider>
        </GoogleOAuthWrapper>
      </body>
    </html>
  );
}
