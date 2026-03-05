"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from "@heroicons/react/24/solid";

const NAV_ITEMS = [
  {
    name: "Home",
    href: "/",
    Icon: HomeIcon,
    ActiveIcon: HomeIconSolid,
  },
  {
    name: "Categories",
    href: "/categories",
    Icon: Squares2X2Icon,
    ActiveIcon: Squares2X2IconSolid,
  },
  {
    name: "Search",
    href: "/search",
    Icon: MagnifyingGlassIcon,
    ActiveIcon: MagnifyingGlassIconSolid,
  },
  {
    name: "Orders",
    href: "/orders",
    Icon: ClipboardDocumentListIcon,
    ActiveIcon: ClipboardDocumentListIconSolid,
  },
  {
    name: "Profile",
    href: "/profile",
    Icon: UserCircleIcon,
    ActiveIcon: UserCircleIconSolid,
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Spacer so content doesn't hide behind nav */}
      <div className="h-16 md:hidden print:hidden" aria-hidden="true" />

      {/* Bottom navigation bar */}
      <nav
        className="md:hidden print:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 rounded-t-2xl shadow-[0_-2px_16px_rgba(0,0,0,0.08)]"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(({ name, href, Icon, ActiveIcon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            const Ico = isActive ? ActiveIcon : Icon;

            return (
              <Link
                key={name}
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full
                  active:scale-90 transition-transform duration-150 select-none
                  min-h-[44px]"
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={`transition-colors duration-200 ${
                    isActive ? "text-[#16A34A]" : "text-gray-400"
                  }`}
                >
                  <Ico className="w-6 h-6" />
                </span>

                <span
                  className={`text-[10px] font-semibold leading-tight transition-colors duration-200 ${
                    isActive ? "text-[#16A34A]" : "text-gray-400"
                  }`}
                >
                  {name}
                </span>

                {/* Active dot indicator */}
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#16A34A]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
