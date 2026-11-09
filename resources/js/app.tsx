import { createInertiaApp } from "@inertiajs/react";
import FlashToaster from "@/components/flash-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initializeTheme } from "@/hooks/use-appearance";
import AppLayout from "@/layouts/app-layout";
import AuthLayout from "@/layouts/auth-layout";
import SettingsLayout from "@/layouts/settings/layout";

const appName = import.meta.env.VITE_APP_NAME || "SIPAS-SKPD";

void createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  layout: (name) => {
    switch (true) {
      case name === "welcome":
        return null;
      case name === "auth/login":
        return null;
      case name.startsWith("auth/"):
        return AuthLayout;
      case name.startsWith("settings/"):
        return [AppLayout, SettingsLayout];
      default:
        return AppLayout;
    }
  },
  strictMode: true,
  withApp(app) {
    return (
      <TooltipProvider delayDuration={0}>
        {app}
        <FlashToaster />
      </TooltipProvider>
    );
  },
  progress: {
    color: "var(--primary)",
  },
});

// This will set light / dark mode on load...
initializeTheme();
