"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOutsideClick } from "../../../hooks/use-outside-click";

export function ExpandableCardDemo({ cards: propCards }) {
  const [active, setActive] = useState(null);
  const id = useId();
  const ref = useRef(null);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setActive(false);
      }
    }

    if (active && typeof active === "object") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  return (
    <div className="relative w-full min-h-[600px] overflow-hidden">
      <AnimatePresence>
        {active && typeof active === "object" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#131c2b]/20 z-10" />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && typeof active === "object" ? (
          <div 
            className="absolute inset-0 flex items-center justify-center z-[100] px-4 py-8 sm:p-4" 
          >
            <motion.button
              key={`button-${active.title}-${id}`}
              layout
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
                transition: {
                  duration: 0.05,
                },
              }}
              className="flex absolute top-3 right-3 sm:top-2 sm:right-2 lg:hidden items-center justify-center bg-white rounded-full h-8 w-8 sm:h-6 sm:w-6 z-10 shadow-lg"
              onClick={() => setActive(null)}>
              <CloseIcon />
            </motion.button>
            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="w-full max-w-[500px] h-full max-h-[90%] flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden shadow-2xl relative">
              <motion.div layoutId={`image-${active.title}-${id}`} className="flex-shrink-0">
                <img
                  width={200}
                  height={200}
                  src={active.src}
                  alt={active.title}
                  className="w-full h-56 sm:h-64 sm:rounded-tr-lg sm:rounded-tl-lg object-cover object-top" />
              </motion.div>

              <div className="flex flex-col overflow-hidden flex-1">
                <div className="flex flex-col gap-3 p-4 sm:p-5 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <motion.h3
                      layoutId={`title-${active.title}-${id}`}
                      className="font-semibold text-basira-navy dark:text-white text-base sm:text-lg">
                      {active.title}
                    </motion.h3>
                    <motion.a
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      href={active.ctaLink}
                      target="_blank"
                      className="px-4 py-2 text-xs sm:text-sm rounded-full font-bold bg-basira-gold text-white hover:bg-[#C09C3D] transition-colors duration-300 whitespace-nowrap flex-shrink-0 w-full sm:w-auto">
                      {active.ctaText}
                    </motion.a>
                  </div>
                  <motion.p
                    layoutId={`description-${active.description}-${id}`}
                    className="text-basira-navy/70 dark:text-gray-300 text-xs sm:text-sm">
                    {active.description}
                  </motion.p>
                </div>
                <div className="p-4 sm:p-5 flex-1 overflow-auto">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-basira-navy/70 text-xs sm:text-sm pb-2 flex flex-col items-start gap-2 sm:gap-3 dark:text-gray-300">
                    {typeof active.content === "function"
                      ? active.content()
                      : active.content}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
      <ul
        className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-4">
        {(propCards || cards).map((card, index) => (
          <motion.div
            layoutId={`card-${card.title}-${id}`}
            key={card.title}
            onClick={() => setActive(card)}
            className="p-4 flex flex-col hover:bg-basira-gold/5 dark:hover:bg-basira-gold/10 rounded-xl cursor-pointer transition-colors duration-300">
            <div className="flex gap-4 flex-col w-full">
              <motion.div layoutId={`image-${card.title}-${id}`}>
                <img
                  width={100}
                  height={100}
                  src={card.src}
                  alt={card.title}
                  className="h-48 w-full rounded-lg object-cover object-top" />
              </motion.div>
              <div className="flex justify-center items-center flex-col">
                <motion.h3
                  layoutId={`title-${card.title}-${id}`}
                  className="font-medium text-white text-center text-base">
                  {card.title}
                </motion.h3>
                <motion.p
                  layoutId={`description-${card.description}-${id}`}
                  className="text-gray-300 text-center text-base">
                  {card.description}
                </motion.p>
              </div>
            </div>
          </motion.div>
        ))}
      </ul>
    </div>
  );
}

export const CloseIcon = () => {
  return (
    <motion.svg
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
        transition: {
          duration: 0.05,
        },
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-black">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  );
};

const cards = [
  {
    description: "Emaar Egypt",
    title: "Luxury Villas - New Cairo",
    src: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    ctaText: "View Details",
    ctaLink: "/properties",
    content: () => {
      return (
        <p>Premium luxury villas with modern architecture, featuring private gardens, swimming pools, and smart home technology. Located in the heart of New Cairo with easy access to major highways and shopping centers. <br /> <br />Starting from EGP 8.5M, this exclusive development by Emaar Egypt offers world-class amenities including smart home technology, private swimming pools, landscaped gardens, 24/7 security, gym & spa facilities, and direct access to shopping centers. Perfect for those seeking luxury living in Egypt's most prestigious new development area.</p>
      );
    },
  },
  {
    description: "SODIC",
    title: "Marina Heights - North Coast",
    src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80",
    ctaText: "View Details",
    ctaLink: "/properties",
    content: () => {
      return (
        <p>Exclusive beachfront apartments and penthouses with stunning Mediterranean Sea views. Features include private beach access, yacht marina, and world-class amenities. <br /> <br />Starting from EGP 12M, this premium development by SODIC offers the ultimate coastal living experience with direct beach access, private yacht marina, sea view balconies, and luxury resort-style amenities. Perfect for those seeking an investment opportunity in Egypt's most prestigious coastal destination.</p>
      );
    },
  },
  {
    description: "Palm Hills",
    title: "Garden City Residences",
    src: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    ctaText: "View Details",
    ctaLink: "/properties",
    content: () => {
      return (
        <p>Modern residential complex with green spaces and family-friendly amenities. Perfect for families looking for a peaceful environment with excellent connectivity to Cairo. <br /> <br />Starting from EGP 6.2M, this family-oriented development by Palm Hills features extensive green spaces, family amenities, nearby schools, shopping mall, medical center, and easy access to Cairo. Ideal for families seeking a balanced lifestyle in a well-connected community.</p>
      );
    },
  },
  {
    description: "Talaat Moustafa Group",
    title: "Capital Heights - New Capital",
    src: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    ctaText: "View Details",
    ctaLink: "/properties",
    content: () => {
      return (
        <p>Ultra-modern high-rise towers in the heart of Egypt's new administrative capital. Featuring cutting-edge design, smart city integration, and proximity to government buildings. <br /> <br />Starting from EGP 15M, this futuristic development by Talaat Moustafa Group offers smart city integration, government proximity, modern architecture, high-speed internet, and prime business district location. Perfect for those seeking a future investment in Egypt's new administrative capital.</p>
      );
    },
  },
  {
    description: "Orascom Development",
    title: "Zamalek Heritage",
    src: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    ctaText: "View Details",
    ctaLink: "/properties",
    content: () => {
      return (
        <p>Boutique luxury apartments in the prestigious Zamalek district. Combining historical charm with modern luxury, featuring Nile views and premium finishes. <br /> <br />Starting from EGP 18M, this exclusive development by Orascom Development offers Nile views, historical location, premium finishes, boutique design, cultural district access, and high-end amenities. Perfect for those seeking luxury living in Cairo's most prestigious neighborhood.</p>
      );
    },
  },
  {
    description: "El Gouna Development",
    title: "Desert Oasis - El Gouna",
    src: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    ctaText: "View Details",
    ctaLink: "/properties",
    content: () => {
      return (
        <p>Eco-friendly resort-style villas in the beautiful El Gouna. Perfect for those seeking a sustainable lifestyle with access to world-class diving and water sports. <br /> <br />Starting from EGP 9.8M, this sustainable development by El Gouna Development features eco-friendly design, resort amenities, water sports access, diving center, sustainable living options, and tourism investment opportunities. Perfect for those seeking a unique lifestyle in Egypt's premier resort destination.</p>
      );
    },
  },
];




