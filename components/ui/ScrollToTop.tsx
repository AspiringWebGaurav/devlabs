"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FaArrowUp } from "react-icons/fa6";

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 320) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const handleModalState = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      setIsModalOpen(!!customEvent.detail?.isOpen);
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    window.addEventListener("contact-modal-state", handleModalState);
    window.addEventListener("assistant-modal-state", handleModalState);

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
      window.removeEventListener("contact-modal-state", handleModalState);
      window.removeEventListener("assistant-modal-state", handleModalState);
    };
  }, []);

  const scrollToTop = () => {
    window.dispatchEvent(
      new CustomEvent("nav-scroll-start", { detail: { link: "/" } })
    );
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    window.history.replaceState(null, "", "/");
  };

  return (
    <AnimatePresence>
      {isVisible && !isModalOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{
            opacity: 0,
            scale: 0.7,
            y: 20,
            transition: { duration: 0.25, ease: "easeInOut" },
          }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 20,
            mass: 0.8,
          }}
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.92 }}
          onClick={scrollToTop}
          className="fixed z-[4900] group flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/20 bg-[#000319]/80 backdrop-blur-xl text-purple shadow-[0_0_25px_rgba(203,172,249,0.3)] hover:shadow-[0_0_35px_rgba(203,172,249,0.65)] hover:border-purple/60 transition-all duration-300 cursor-pointer overflow-hidden touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000319] bottom-[calc(1.375rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-[calc(4.875rem+env(safe-area-inset-right,0px))] sm:right-[calc(5.5rem+env(safe-area-inset-right,0px))]"
          aria-label="Back to top"
        >
          <span className="absolute inset-0 rounded-full bg-gradient-to-t from-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <motion.div
            className="relative z-10 flex items-center justify-center"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <FaArrowUp className="w-4 h-4 text-purple group-hover:text-white transition-colors duration-300" />
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTop;

