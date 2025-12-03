import React, { useState, useEffect } from "react";
import { cn } from "../../../lib/utils";

export const Marquee = React.forwardRef(
  ({ className, reverse = false, pauseOnHover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        className={cn(
          "group relative flex overflow-hidden",
          className
        )}
      >
        {children}
      </div>
    );
  }
);
Marquee.displayName = "Marquee";

export const MarqueeContent = React.forwardRef(
  ({ className, reverse = false, pauseOnHover = true, speed = "normal", mobileSpeed, children, ...props }, ref) => {
    const speedMap = {
      slow: "60s",
      normal: "40s",
      fast: "20s",
    };
    
    const duration = speedMap[speed] || speedMap.normal;
    const mobileDuration = mobileSpeed ? speedMap[mobileSpeed] : duration;
    
    const [animationDuration, setAnimationDuration] = useState(duration);
    
    useEffect(() => {
      const updateDuration = () => {
        if (window.innerWidth <= 640 && mobileSpeed) {
          setAnimationDuration(mobileDuration);
        } else {
          setAnimationDuration(duration);
        }
      };
      
      updateDuration();
      window.addEventListener('resize', updateDuration);
      
      return () => window.removeEventListener('resize', updateDuration);
    }, [duration, mobileDuration, mobileSpeed]);
    
    const items = React.Children.toArray(children);
    
    return (
      <div
        ref={ref}
        {...props}
        className={cn(
          "flex min-w-full shrink-0 items-center justify-around gap-4",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
          className
        )}
        style={{
          animation: `marquee ${animationDuration} linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {items}
        {/* Duplicate for seamless loop */}
        {items.map((child, index) =>
          React.isValidElement(child)
            ? React.cloneElement(child, {
                key: `${child.key || "marquee-item"}-duplicate-${index}`,
                "aria-hidden": true,
              })
            : child
        )}
      </div>
    );
  }
);
MarqueeContent.displayName = "MarqueeContent";

export const MarqueeItem = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        className={cn("flex-shrink-0", className)}
      >
        {children}
      </div>
    );
  }
);
MarqueeItem.displayName = "MarqueeItem";

export const MarqueeFade = React.forwardRef(
  ({ className, side = "left", ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        className={cn(
          "pointer-events-none absolute inset-y-0 z-10 w-1/12",
          side === "left"
            ? "left-0 bg-gradient-to-r from-[#131c2b] to-transparent"
            : "right-0 bg-gradient-to-l from-[#131c2b] to-transparent",
          className
        )}
      />
    );
  }
);
MarqueeFade.displayName = "MarqueeFade";

