
"use client";

import { Navbar, NavBody, NavItems, MobileNav, MobileNavHeader, MobileNavMenu, MobileNavToggle, NavbarLogo, NavbarButton } from "../components/ui/resizable-navbar";
import { useState } from "react";

export default function Nav() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navItems = [
    { name: "Home", link: "/" },
    { name: "About", link: "/about" },
    { name: "Services", link: "/services" },
    { name: "Contact", link: "/contact" },
  ];

  return (
    <Navbar className="fixed top-0 w-full">
      <NavBody>
        <NavbarLogo />
        <NavItems 
          items={navItems}
          onItemClick={() => setIsMobileNavOpen(false)}
        />
        <NavbarButton href="/signup" variant="gradient">
          Sign Up
        </NavbarButton>
      </NavBody>
      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <MobileNavToggle 
            isOpen={isMobileNavOpen} 
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)} 
          />
        </MobileNavHeader>
        <MobileNavMenu 
          isOpen={isMobileNavOpen} 
          onClose={() => setIsMobileNavOpen(false)}
        >
          {navItems.map((item, idx) => (
            <a
              key={`mobile-link-${idx}`}
              href={item.link}
              className="px-4 py-2 text-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-white"
              onClick={() => setIsMobileNavOpen(false)}
            >
              {item.name}
            </a>
          ))}
          <NavbarButton href="/signup" variant="gradient" className="mt-4 w-full text-center">
            Sign Up
          </NavbarButton>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
