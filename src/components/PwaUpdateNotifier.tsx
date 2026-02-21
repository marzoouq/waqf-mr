import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Listens for service worker controller changes (auto-update)
 * and shows a brief success toast to the user.
 */
const PwaUpdateNotifier = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let isFirstController = !navigator.serviceWorker.controller;

    const onControllerChange = () => {
      // Skip the very first activation (initial install, not an update)
      if (isFirstController) {
        isFirstController = false;
        return;
      }
      toast.success("تم تحديث التطبيق بنجاح ✨", {
        description: "تم تطبيق أحدث نسخة تلقائياً",
        duration: 4000,
      });
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
};

export default PwaUpdateNotifier;
