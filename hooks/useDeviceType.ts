import { useEffect, useState } from "react";

export type DeviceType = "desktop" | "tablet" | "mobile";

const getDeviceType = (width: number): DeviceType => {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      setDeviceType(getDeviceType(window.innerWidth));
      const isPWA =
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error iOS safari
        window.navigator.standalone === true;
      setIsStandalone(isPWA);
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("visibilitychange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("visibilitychange", update);
    };
  }, []);

  return {
    deviceType,
    isMobile: deviceType === "mobile",
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop",
    isStandalone,
  };
};

export default useDeviceType;

