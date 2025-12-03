import React, { useEffect, useRef } from 'react';
import './ParticlesCanvas.css';

/**
 * A React component that wraps the 30,000 Particles Canvas animation.
 * The core logic is adapted from the original vanilla JS CodePen.
 */
const ParticlesCanvas = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    // --- Constants (Adapted from original JS) ---
    const ROWS = 100;
    const COLS = 100;
    const _NUM_PARTICLES = ROWS * COLS;
    const THICKNESS = Math.pow(50, 2);
    const SPACING = 10;
    const MARGIN = 0;
    const COLOR = 220;
    const DRAG = 0.95;
    const EASE = 0.25;

    // --- Variables ---
    const ctx = canvas.getContext('2d');
    let tog = true; // Toggle for movement/drawing frames
    let man = false; // Is mouse actively moving
    let mx = 0;
    let my = 0;
    let w, h;
    let list = [];
    let animationFrameId;

    // --- Particle Prototype ---
    const createParticle = (x, y) => ({
      vx: 0,
      vy: 0,
      x: x,
      y: y,
      ox: x, // Original X
      oy: y, // Original Y
    });

    // --- Initialization Function ---
    function init() {
      // Get container dimensions
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height*.5;
      
      // Set canvas dimensions to match container
      w = canvas.width = containerWidth;
      h = canvas.height = containerHeight;

      // Mobile responsive adjustments
      const isMobile = window.innerWidth <= 768;
      const isSmallMobile = window.innerWidth <= 480;
      
      // Adjust constants based on screen size
      let adjustedSpacing = SPACING;
      let adjustedMargin = MARGIN;
      let _adjustedThickness = THICKNESS;
      
      if (isSmallMobile) {
        adjustedSpacing = 10; // Tighter spacing for small screens
        adjustedMargin = 0; // Smaller margin
        _adjustedThickness = Math.pow(20, 2); // Smaller interaction area
      } else if (isMobile) {
        adjustedSpacing = 10; // Medium spacing for mobile
        adjustedMargin = 0; // Medium margin
        _adjustedThickness = Math.pow(20, 2); // Medium interaction area
      }

      // Calculate particle grid to fit the canvas
      const availableWidth = w - (adjustedMargin * 2);
      const availableHeight = h - (adjustedMargin * 2);
      const actualCols = Math.floor(availableWidth / adjustedSpacing);
      const actualRows = Math.floor(availableHeight / adjustedSpacing);
      const actualParticles = actualCols * actualRows;

      // Update particle count to match available space
      list = [];
      for (let i = 0; i < actualParticles; i++) {
        const x = adjustedMargin + adjustedSpacing * (i % actualCols);
        const y = adjustedMargin + adjustedSpacing * Math.floor(i / actualCols);
        list[i] = createParticle(x, y);
      }
    }

    // --- Mouse/Touch Handler ---
    const handleMouseMove = (e) => {
      const bounds = container.getBoundingClientRect();
      mx = e.clientX - bounds.left;
      my = e.clientY - bounds.top;
      man = true;
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const bounds = container.getBoundingClientRect();
      const touch = e.touches[0];
      mx = touch.clientX - bounds.left;
      my = touch.clientY - bounds.top;
      man = true;
    };

    const handleMouseLeave = () => {
      man = false;
    };

    const handleTouchEnd = () => {
      man = false;
    };

    // Attach event listeners to the container
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    // Handle window resize
    const handleResize = () => {
      init();
    };
    window.addEventListener('resize', handleResize);

    // Perform initialization
    init();

    // --- Animation Step Function ---
    function step() {
      // The original code toggles logic every other frame for performance
      if ((tog = !tog)) {
        if (!man) {
          // Automatic/Demo movement when mouse is idle
          const t = +new Date() * 0.01;
          mx = w * 0.5 + Math.cos(t * 2.1) * Math.cos(t * 0.9) * w * 0.45;
          my = h * 0.5 + Math.sin(t * 3.2) * Math.tan(Math.sin(t * 0.8)) * h * 0.45;
        }

        // 1. Update particle physics (applied every other frame)
        // Get responsive thickness based on screen size
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        let currentThickness = THICKNESS;
        
        if (isSmallMobile) {
          currentThickness = Math.pow(60, 2);
        } else if (isMobile) {
          currentThickness = Math.pow(70, 2);
        }

        for (let i = 0; i < list.length; i++) {
          const p = list[i];

          // Calculate distance from mouse
          const dx = mx - p.x;
          const dy = my - p.y;
          const d = dx * dx + dy * dy; // Distance squared
          const t = currentThickness / d;

          // Apply force if within interaction distance
          if (t > 1) {
            p.vx += dx * t;
            p.vy += dy * t;
          }

          // Apply friction and move
          p.vx *= DRAG;
          p.vy *= DRAG;
          p.x += p.vx;
          p.y += p.vy;

          // Easing back to original position (grid)
          p.x += (p.ox - p.x) * EASE;
          p.y += (p.oy - p.y) * EASE;
        }
      } else {
        // 2. Draw to canvas (applied every other frame)
        // Get responsive thickness based on screen size
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        let currentThickness = THICKNESS;
        
        if (isSmallMobile) {
          currentThickness = Math.pow(60, 2);
        } else if (isMobile) {
          currentThickness = Math.pow(70, 2);
        }

        const b = 0.5 * COLOR;
        const c = 2 * COLOR;

        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          const dx = mx - p.x;
          const dy = my - p.y;
          const d = dx * dx + dy * dy;
          const a = Math.min(d, currentThickness) / currentThickness;
          const r = c * a + b;
          const s = 1 - a * 0.2; // Size of the particle (dot)

          ctx.fillStyle = `rgb(${r},${r},${r})`;
          ctx.fillRect(p.x, p.y, s, s);
        }
        ctx.fill();
      }

      // Loop the animation
      animationFrameId = requestAnimationFrame(step);
    }

    // Start the animation loop
    animationFrameId = requestAnimationFrame(step);

        // --- Cleanup Function ---
        return () => {
          // Cancel the animation loop when the component unmounts
          cancelAnimationFrame(animationFrameId);
          // Remove the event listeners
          container.removeEventListener('mousemove', handleMouseMove);
          container.removeEventListener('mouseleave', handleMouseLeave);
          container.removeEventListener('touchmove', handleTouchMove);
          container.removeEventListener('touchend', handleTouchEnd);
          window.removeEventListener('resize', handleResize);
        };
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- JSX Rendering ---
  return (
    <div className="particles-container " ref={containerRef}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default ParticlesCanvas;
