"use client";

import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ChevronLeft } from "lucide-react";

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <>
      <DesktopSidebar className={className}>{children}</DesktopSidebar>
      <MobileSidebar className={className}>{children}</MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <div className="relative h-full flex-shrink-0 hidden md:block">
      <motion.div
        className={cn(
          "h-full px-2.5 py-3 hidden md:flex md:flex-col w-[248px]",
          className
        )}
        animate={{
          width: animate ? (open ? "248px" : "68px") : "248px",
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        {...props}
      >
        {children}
      </motion.div>
      
      {/* Toggle Button - outside motion.div to avoid type issues */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Recolher menu" : "Expandir menu"}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6
                   bg-card border border-input rounded-full
                   hidden md:flex items-center justify-center
                   hover:bg-accent
                   transition-colors z-50 group"
      >
        <ChevronLeft
          className={cn(
            "w-4 h-4 text-icon group-hover:text-foreground transition-transform duration-300",
            !open && "rotate-180"
          )}
        />
      </button>
    </div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  const { pathname } = useLocation();
  // Tocar num item do menu navega; o overlay fecha junto.
  useEffect(() => {
    if (window.innerWidth < 768) setOpen(false);
  }, [pathname, setOpen]);
  return (
    <>
      <div
        className={cn(
          "h-14 flex-shrink-0 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-muted w-full border-b border-border"
        )}
        {...props}
      >
        <div className="flex items-center gap-3 z-20 w-full">
          <button type="button" aria-label="Abrir menu" onClick={() => setOpen(!open)} className="text-icon hover:text-foreground transition-colors">
            <Menu />
          </button>
          <img
            src="/logo-lumina-sidebar.png"
            alt="Integra Connect"
            className="h-8 w-auto object-contain dark:brightness-0 dark:invert"
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-card p-6 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <button
                type="button"
                aria-label="Fechar menu"
                className="absolute right-6 top-6 z-50 text-icon hover:text-foreground transition-colors"
                onClick={() => setOpen(!open)}
              >
                <X />
              </button>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
