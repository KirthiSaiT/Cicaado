"use client";
import { UserButton } from "@clerk/nextjs";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarLogo,
} from "../components/ui/resizable-navbar";
import { useState } from "react";

export default function Nav() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navItems = [
    { name: "Home", link: "/" },
    { name: "CheatSheet", link: "/cheatsheet" },
    { name: "GitHub", link: "/github" },
    { name: "Blog", link: "/blog" },
    { name: "Contact", link: "/contact" },
  ];

  return (
    <Navbar className="fixed top-0 left-0 right-0 w-full bg-background border-b border-border/50 z-50 h-16">
      <NavBody className="flex items-center justify-between h-full px-4 mx-auto max-w-7xl">
        <div className="flex items-center">
          <NavbarLogo />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <NavItems
            items={navItems}
            onItemClick={() => setIsMobileNavOpen(false)}
          />
        </div>

        {/* User Button - Always visible on desktop */}
        <div className="hidden md:flex items-center">
          <UserButton
            showName
            appearance={{
              elements: {
                userButtonAvatarBox: "w-8 h-8 border border-border/30",
                userButtonBox:
                  "text-foreground hover:bg-accent/10 rounded-lg px-3 py-2 transition-all duration-200 flex items-center space-x-2",
                userButtonOuterIdentifier:
                  "text-foreground font-medium text-sm",
                userButtonPopoverCard:
                  "bg-card border border-border rounded-lg",
                userButtonPopoverMain: "bg-transparent",
                userButtonPopoverFooter: "bg-transparent border-t border-border/50",
                userButtonPopoverActionButton:
                  "text-foreground hover:bg-accent/10 transition-colors rounded-md",
                userButtonPopoverActionButtonText: "text-foreground",
                userButtonPopoverActionButtonIcon: "text-muted-foreground",
                userPreviewMainIdentifier: "text-foreground font-semibold",
                userPreviewSecondaryIdentifier: "text-muted-foreground",
                userButtonPopoverActions: "bg-transparent",
              },
            }}
          />
        </div>
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav className="md:hidden">
        <MobileNavHeader className="flex items-center justify-between p-4 h-16">
          <NavbarLogo />
          <div className="flex items-center space-x-3">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-7 h-7 border border-border/30",
                  userButtonBox:
                    "text-foreground hover:bg-accent/10 rounded-lg p-1 transition-all duration-200",
                  userButtonPopoverCard:
                    "bg-card border border-border rounded-lg",
                  userButtonPopoverMain: "bg-transparent",
                  userButtonPopoverFooter:
                    "bg-transparent border-t border-border/50",
                  userButtonPopoverActionButton:
                    "text-foreground hover:bg-accent/10 transition-colors rounded-md",
                  userButtonPopoverActionButtonText: "text-foreground",
                  userButtonPopoverActionButtonIcon: "text-muted-foreground",
                  userPreviewMainIdentifier: "text-foreground font-semibold",
                  userPreviewSecondaryIdentifier: "text-muted-foreground",
                  userButtonPopoverActions: "bg-transparent",
                },
              }}
            />
            <MobileNavToggle
              isOpen={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            />
          </div>
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          className="fixed top-16 left-0 right-0 bg-card border-t border-border/50 shadow z-40"
        >
          <div className="px-4 py-6 space-y-4 max-h-screen overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/50">
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                className="block px-4 py-3 text-lg text-foreground hover:bg-accent/10 rounded-lg transition-all duration-200 border border-transparent hover:border-border/50"
                onClick={() => setIsMobileNavOpen(false)}
              >
                {item.name}
              </a>
            ))}
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
