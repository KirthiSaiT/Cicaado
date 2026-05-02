import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut, SignIn } from "@clerk/nextjs";
import Nav from "../components/Nav";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en" className="dark">
        <body className="min-h-screen bg-background text-foreground">
          <SignedIn>
            <Nav />
            <main className="pt-20 container mx-auto p-6">
              {children}
            </main>
          </SignedIn>
          
          <SignedOut>
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
              {/* Animated background grid */}
              <div className="absolute inset-0 opacity-10">
                <div className="grid grid-cols-12 grid-rows-12 h-full w-full">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="border border-primary/20 animate-pulse" 
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Login container */}
              <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold text-primary mb-2">
                    🛡️ Ciccado
                  </h1>
                  <p className="text-muted-foreground">
                    Ethical Hacking & Cybersecurity Platform
                  </p>
                  <div className="mt-4 text-xs text-primary/60 font-mono">
                    [ SECURE TERMINAL ACCESS REQUIRED ]
                  </div>
                </div>
                
                <SignIn
                  routing="hash"
                  appearance={{
                    elements: {
                      formButtonPrimary: `
                        bg-gradient-to-r from-green-600 to-green-700 
                        hover:from-green-700 hover:to-green-800 
                        text-white font-semibold py-3 px-6 rounded-lg 
                        shadow-lg hover:shadow-xl transition-all duration-300
                        border border-green-500/50
                      `,
                      card: `
                        bg-white text-black shadow-2xl rounded-xl p-8 
                        border border-gray-200 backdrop-blur-sm
                      `,
                      headerTitle: "text-2xl font-bold mb-4 text-gray-900",
                      headerSubtitle: "text-gray-600 mb-6",
                      formFieldInput: `
                        bg-white text-black border-2 border-gray-300 
                        rounded-lg p-3 focus:border-green-500 focus:ring-2 
                        focus:ring-green-500/20 transition-all duration-200
                      `,
                      formFieldLabel: "text-gray-700 font-medium mb-2",
                      footerActionText: "text-gray-600",
                      footerActionLink: "text-green-600 hover:text-green-700 font-semibold",
                      dividerText: "text-gray-500",
                      socialButtonsBlockButton: `
                        border-2 border-gray-300 hover:border-green-500 
                        text-gray-700 hover:text-green-700 transition-colors
                      `,
                      socialButtonsProviderIcon: "text-gray-700",
                      formFieldErrorText: "text-red-600",
                      identityPreviewEditButton: "text-green-600 hover:text-green-700"
                    },
                    layout: {
                      socialButtonsPlacement: "bottom"
                    }
                  }}
                />
              </div>
              
              {/* Terminal-style footer */}
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <div className="text-xs text-primary/40 font-mono">
                  root@kali:~# Access granted to authorized personnel only
                </div>
              </div>
            </div>
          </SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}