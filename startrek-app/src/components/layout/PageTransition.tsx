"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex-1 flex flex-col min-w-0 w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
