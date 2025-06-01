"use client";
import { UserButton } from "@clerk/nextjs";
import { Navbar, NavBody, NavItems, MobileNav, MobileNavHeader, MobileNavMenu, MobileNavToggle, NavbarLogo } from "../components/ui/resizable-navbar";
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
    <Navbar className="fixed top-0 w-full navbar-gradient backdrop-blur-sm border-b border-border/50 z-50">
      <NavBody className="flex items-center justify-between">
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
                userButtonAvatarBox: "w-8 h-8 border border-primary/30 shadow-lg",
                userButtonBox: "text-foreground hover:bg-accent/20 rounded-lg px-3 py-2 transition-all duration-200 flex items-center space-x-2",
                userButtonOuterIdentifier: "text-foreground font-medium text-sm",
                userButtonPopoverCard: "bg-card border border-border shadow-xl backdrop-blur-sm rounded-lg",
                userButtonPopoverMain: "bg-transparent",
                userButtonPopoverFooter: "bg-transparent border-t border-border/50",
                userButtonPopoverActionButton: "text-foreground hover:bg-accent/20 transition-colors rounded-md",
                userButtonPopoverActionButtonText: "text-foreground",
                userButtonPopoverActionButtonIcon: "text-muted-foreground",
                userPreviewMainIdentifier: "text-foreground font-semibold",
                userPreviewSecondaryIdentifier: "text-muted-foreground",
                userButtonPopoverActions: "bg-transparent"
              }
            }}
          />
        </div>
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav className="md:hidden">
        <MobileNavHeader className="flex items-center justify-between p-4">
          <NavbarLogo />
          <div className="flex items-center space-x-3">
            {/* Mobile User Button */}
            <UserButton 
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-7 h-7 border border-primary/30",
                  userButtonBox: "text-foreground hover:bg-accent/20 rounded-lg p-1 transition-all duration-200",
                  userButtonPopoverCard: "bg-card border border-border shadow-xl backdrop-blur-sm rounded-lg",
                  userButtonPopoverMain: "bg-transparent",
                  userButtonPopoverFooter: "bg-transparent border-t border-border/50",
                  userButtonPopoverActionButton: "text-foreground hover:bg-accent/20 transition-colors rounded-md",
                  userButtonPopoverActionButtonText: "text-foreground",
                  userButtonPopoverActionButtonIcon: "text-muted-foreground",
                  userPreviewMainIdentifier: "text-foreground font-semibold",
                  userPreviewSecondaryIdentifier: "text-muted-foreground",
                  userButtonPopoverActions: "bg-transparent"
                }
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
          className="bg-card/95 backdrop-blur-sm border-t border-border/50"
        >
          <div className="px-4 py-6 space-y-4">
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                className="block px-4 py-3 text-lg text-foreground hover:text-primary hover:bg-accent/20 rounded-lg transition-all duration-200 border border-transparent hover:border-primary/20"
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