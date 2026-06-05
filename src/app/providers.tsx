/**
 * App Providers — M1.1 (Version I-R)
 * كل الـ Providers العالمية مفصولة عن router/layout لتسهيل القراءة والاختبار.
 */
import { ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { FiscalYearProvider } from "@/contexts/FiscalYearContext";
import ErrorBoundary from "@/components/common/feedback/ErrorBoundary";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider attribute="class" defaultTheme="light" storageKey="waqf-theme">
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <FiscalYearProvider>
                <TooltipProvider>
                  <Sonner />
                  {children}
                </TooltipProvider>
              </FiscalYearProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
