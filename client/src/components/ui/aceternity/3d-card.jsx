import { cn } from "../../../lib/utils";
import React, {
  createContext,
  useState,
  useContext,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

const MouseEnterContext = createContext(undefined);

export const CardContainer = ({
  children,
  className,
  containerClassName,
}) => {
  const containerRef = useRef(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [interactionEnabled, setInteractionEnabled] = useState(true);
  const frameRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setInteractionEnabled(false);
      return undefined;
    }

    if (typeof window === "undefined" || !window.matchMedia) {
      setInteractionEnabled(true);
      return undefined;
    }

    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const hoverQuery = window.matchMedia("(hover: none)");

    const update = () => {
      const disable = prefersReducedMotion || coarseQuery.matches || hoverQuery.matches;
      setInteractionEnabled(!disable);
    };

    update();

    const handler = () => update();

    if (typeof coarseQuery.addEventListener === "function") {
      coarseQuery.addEventListener("change", handler);
      hoverQuery.addEventListener("change", handler);
    } else {
      coarseQuery.addListener(handler);
      hoverQuery.addListener(handler);
    }

    return () => {
      if (typeof coarseQuery.removeEventListener === "function") {
        coarseQuery.removeEventListener("change", handler);
        hoverQuery.removeEventListener("change", handler);
      } else {
        coarseQuery.removeListener(handler);
        hoverQuery.removeListener(handler);
      }
    };
  }, [prefersReducedMotion]);

  useEffect(() => () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);

  const handleMouseMove = useCallback(
    (event) => {
      if (!interactionEnabled || !containerRef.current) return;

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) {
          frameRef.current = null;
          return;
        }

        const { left, top, width, height } =
          containerRef.current.getBoundingClientRect();

        if (!width || !height) {
          frameRef.current = null;
          return;
        }

        const xRatio = ((event.clientX - left) - width / 2) / width;
        const yRatio = ((event.clientY - top) - height / 2) / height;

        const rotationY = xRatio * 15;
        const rotationX = -yRatio * 15;

        containerRef.current.style.transform = `rotateY(${rotationY}deg) rotateX(${rotationX}deg)`;
        frameRef.current = null;
      });
    },
    [interactionEnabled]
  );

  const resetTransform = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.style.transform = `rotateY(0deg) rotateX(0deg)`;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!interactionEnabled) return;
    setIsMouseEntered(true);
  }, [interactionEnabled]);

  const handleMouseLeave = useCallback(() => {
    resetTransform();
    setIsMouseEntered(false);
  }, [resetTransform]);

  useEffect(() => {
    if (!interactionEnabled) {
      handleMouseLeave();
    }
  }, [interactionEnabled, handleMouseLeave]);

  return (
    <MouseEnterContext.Provider
      value={[interactionEnabled && isMouseEntered, setIsMouseEntered]}
    >
      <div
        className={cn("flex items-center justify-center", containerClassName)}
        style={{
          perspective: "1000px",
        }}
      >
        <div
          ref={containerRef}
          onMouseEnter={interactionEnabled ? handleMouseEnter : undefined}
          onMouseMove={interactionEnabled ? handleMouseMove : undefined}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "relative flex items-center justify-center transition-all duration-200 ease-linear",
            className
          )}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
};

export const CardBody = ({ children, className }) => {
  return (
    <div
      className={cn(
        "h-96 w-96 [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]",
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardItem = ({
  as: Tag = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}) => {
  const ref = useRef(null);
  const [isMouseEntered] = useMouseEnter();

  const handleAnimations = useCallback(() => {
    if (!ref.current) return;
    if (isMouseEntered) {
      ref.current.style.transform = `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    } else {
      ref.current.style.transform = `translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
    }
  }, [isMouseEntered, translateX, translateY, translateZ, rotateX, rotateY, rotateZ]);

  useEffect(() => {
    handleAnimations();
  }, [handleAnimations]);

  return (
    <Tag
      ref={ref}
      className={cn("w-fit transition duration-200 ease-linear", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export const useMouseEnter = () => {
  const context = useContext(MouseEnterContext);
  if (context === undefined) {
    throw new Error("useMouseEnter must be used within a MouseEnterProvider");
  }
  return context;
};

