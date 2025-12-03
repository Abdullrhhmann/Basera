import React from 'react';
import { motion } from 'framer-motion';

const COMPANY_LOGOS = [
  { src: '/logos/tmg.png', alt: 'Talaat Moustafa Group' },
  { src: '/logos/sodic.png', alt: 'SODIC' },
  { src: '/logos/PalmHills.svg', alt: 'Palm Hills' },
  { src: '/logos/emmar.png', alt: 'Emaar Misr' },
  { src: '/logos/hassan-allam.png', alt: 'Hassan Allam Properties' },
  { src: '/logos/ora.png', alt: 'Ora Developers' },
];

const InfiniteScrollingLogos = ({ 
  title = "",
  duration = 10,
  className = ""
}) => {
  return (
    <div className={`py-16 ${className}`}>
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-center text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 font-medium">
            {title}
          </h2>
        )}
        
        <div className="relative flex overflow-hidden before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-20 ">
          <motion.div
            transition={{
              duration: duration,
              ease: 'linear',
              repeat: Infinity,
            }}
            initial={{ translateX: 0 }}
            animate={{ translateX: '-50%' }}
            className="flex flex-none gap-16 pr-16"
          >
            {[...new Array(2)].fill(0).map((_, index) => (
              <React.Fragment key={index}>
                {COMPANY_LOGOS.map(({ src, alt }) => (
                  <img
                    key={`${alt}-${index}`}
                    src={src}
                    alt={alt}
                    className="h-20 md:h-20 w-auto flex-none grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
                  />
                ))}
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default InfiniteScrollingLogos;

