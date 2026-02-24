// Admin section gets its own layout — no public Navbar, CategoryNav or CartSidebar.
export const metadata = {
  title: "Admin Dashboard – MK Reddy General Store",
};

export default function AdminLayout({ children }) {
  return <>{children}</>;
}
