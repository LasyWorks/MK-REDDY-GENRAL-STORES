import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import CategoryNav from "@/components/layout/CategoryNav";
import Footer from "@/components/layout/Footer";
import CartSidebar from "@/components/cart/CartSidebar";
import { LanguageProvider } from "@/context/LanguageContext";
import { CartProvider } from "@/context/CartContext";
import { PromotionProvider } from "@/context/PromotionContext";
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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <CartProvider>
            <PromotionProvider>
              <Navbar />
              <CategoryNav />
              {children}
              <Footer />
              <CartSidebar />
            </PromotionProvider>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
