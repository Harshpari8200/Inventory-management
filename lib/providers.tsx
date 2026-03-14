"use client";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

import { ThemeProvider } from "next-themes";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </ConvexBetterAuthProvider>
  )
}

export default Providers