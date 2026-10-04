import { useState, useEffect } from "react";

export function useSidebar() {
  const getInitialState = () => {
    if (typeof document !== "undefined") {
      if (document.body.classList.contains("sidebar-closed")) return false;
      if (document.body.classList.contains("sidebar-open")) return true;
    }
    return true;
  };

  const [isOpen, setIsOpen] = useState(getInitialState);

  useEffect(() => {
    setIsOpen(getInitialState());

    const handleSidebarChange = (e) => {
      if (e.detail && typeof e.detail.isOpen === "boolean") {
        setIsOpen(e.detail.isOpen);
      }
    };

    const observer = new MutationObserver(() => {
      setIsOpen(getInitialState());
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    window.addEventListener("sidebar-changed", handleSidebarChange);
    return () => {
      window.removeEventListener("sidebar-changed", handleSidebarChange);
      observer.disconnect();
    };
  }, []);

  return isOpen;
}

export default useSidebar;
