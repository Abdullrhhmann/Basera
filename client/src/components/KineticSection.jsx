import React, { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useTranslation } from 'react-i18next';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import './KineticSection.css';

gsap.registerPlugin(CustomEase, ScrambleTextPlugin);

const RTL_CHAR_PATTERN = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

// Custom text splitting function to replace GSAP SplitText
const splitTextIntoChars = (element, className = 'char') => {
  const text = element.textContent;
  const chars = [];
  element.innerHTML = '';

  const shouldKeepLigatures = RTL_CHAR_PATTERN.test(text);

  if (shouldKeepLigatures) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    span.style.display = 'inline-block';
    span.setAttribute('dir', 'auto');
    element.appendChild(span);
    chars.push(span);
    return { chars, element };
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const span = document.createElement('span');
    span.className = className;
    span.textContent = char;
    span.style.display = 'inline-block';
    element.appendChild(span);
    chars.push(span);
  }

  return { chars, element };
};

const createInitialState = () => ({
  activeRowId: null,
  kineticAnimationActive: false,
  activeKineticAnimation: null,
  textRevealAnimation: null,
  transitionInProgress: false,
});

const BASE_BACKGROUND_ITEMS = [
  { key: 'be', style: { top: '5%', left: '8%' } },
  { key: 'present', style: { top: '5%', left: '15%' } },
  { key: 'listen', style: { top: '5%', left: '28%' } },
  { key: 'deeply', style: { top: '5%', left: '42%' } },
  { key: 'observe', style: { top: '5%', left: '55%' } },
  { key: 'ampersand', style: { top: '5%', left: '75%' } },
  { key: 'feel', style: { top: '5%', left: '85%' } },
  { key: 'make', style: { top: '10%', left: '12%' } },
  { key: 'better', style: { top: '10%', left: '45%' } },
  { key: 'decisions', style: { top: '10%', right: '20%' } },
  { key: 'the', style: { top: '15%', left: '8%' } },
  { key: 'creative', style: { top: '15%', left: '30%' } },
  { key: 'process', style: { top: '15%', left: '55%' } },
  { key: 'is', style: { top: '15%', right: '20%' } },
  { key: 'mysterious', style: { top: '15%', right: '5%' } },
  { key: 'isTheKey', style: { top: '25%', right: '5%' } },
  { key: 'findYourVoice', style: { top: '35%', left: '25%' } },
  { key: 'trustIntuition', style: { top: '35%', left: '65%' } },
  { key: 'embraceSilence', style: { top: '50%', left: '5%' } },
  { key: 'questionEverything', style: { top: '50%', right: '5%' } },
  { key: 'truth', style: { top: '75%', left: '20%' } },
  { key: 'wisdom', style: { top: '75%', right: '20%' } },
  { key: 'focus', style: { top: '80%', left: '10%' } },
  { key: 'attention', style: { top: '80%', left: '35%' } },
  { key: 'awareness', style: { top: '80%', left: '65%' } },
  { key: 'presence', style: { top: '80%', right: '10%' } },
  { key: 'simplify', style: { top: '85%', left: '25%' } },
  { key: 'refine', style: { top: '85%', right: '25%' } },
];

const SIMPLICITY_ITEMS = [
  { key: 'simplicity_s', style: { top: '25%', left: '5%' } },
  { key: 'simplicity_i1', style: { top: '25%', left: '10%' } },
  { key: 'simplicity_m', style: { top: '25%', left: '15%' } },
  { key: 'simplicity_p', style: { top: '25%', left: '20%' } },
  { key: 'simplicity_l', style: { top: '25%', left: '25%' } },
  { key: 'simplicity_i2', style: { top: '25%', left: '30%' } },
  { key: 'simplicity_c', style: { top: '25%', left: '35%' } },
  { key: 'simplicity_i3', style: { top: '25%', left: '40%' } },
  { key: 'simplicity_t', style: { top: '25%', left: '45%' } },
  { key: 'simplicity_y', style: { top: '25%', left: '50%' } },
];

const TEXT_ROWS = ['focus', 'presence', 'feel'];

const DEFAULT_TYPE_LINES = [
  'focus focus focus',
  'presence presence presence',
  'feel feel feel',
  'focus focus focus',
  'presence presence presence',
  'focus focus focus',
  'focus focus focus',
  'presence presence presence',
  'feel feel feel',
  'focus focus focus',
  'presence presence presence',
  'focus focus focus',
];

const KineticSection = () => {
    const { t } = useTranslation();
    const componentRef = useRef(null);
    const _textRowsRef = useRef([]);
    const splitTexts = useRef({});
    const state = useRef(createInitialState());
    const prefersReducedMotion = usePrefersReducedMotion();
    const sectionVisibleRef = useRef(false);
    const scrambleTimeoutRef = useRef(null);
    const parallaxCleanupRef = useRef(null);
    const startInteractiveRef = useRef(() => {});
    const stopInteractiveRef = useRef(() => {});
    const fadeOutRef = useRef(() => {});

    const kineticConfig = useMemo(
        () => t('home.kinetic', { returnObjects: true }),
        [t]
    );

    const backgroundItems = useMemo(() => {
        if (!kineticConfig || !kineticConfig.background) {
            return [];
        }

        const blueprint = [
            ...BASE_BACKGROUND_ITEMS.slice(0, 15),
            ...SIMPLICITY_ITEMS,
            ...BASE_BACKGROUND_ITEMS.slice(15),
        ];

        return blueprint
            .map((item) => ({
                ...item,
                label: kineticConfig.background[item.key],
            }))
            .filter(
                (item) =>
                    item.label !== undefined &&
                    item.label !== null &&
                    item.label !== ''
            );
    }, [kineticConfig]);

    const alternativeTexts = useMemo(
        () => kineticConfig?.alternatives ?? {},
        [kineticConfig]
    );

    const rowLabels = useMemo(
        () => kineticConfig?.rows ?? {},
        [kineticConfig]
    );

    const typeLinesContent = useMemo(
        () =>
            kineticConfig?.typeLines?.length
                ? kineticConfig.typeLines
                : DEFAULT_TYPE_LINES,
        [kineticConfig]
    );

    useEffect(() => {
        if (!kineticConfig || backgroundItems.length === 0) {
            return undefined;
        }

        if (prefersReducedMotion) {
            const section = componentRef.current;
            if (section) {
                const textNodes = section.querySelectorAll('.text-content');
                textNodes.forEach((node) => {
                    node.style.visibility = 'visible';
                });
            }
            return undefined;
        }

        splitTexts.current = {};
        state.current = createInitialState();

        let resizeTimer;
        let resizeHandler;
        const listeners = [];
        let styleElement;
        let isCancelled = false;
        let scrambleRandomTextFn = null;
        let observer;

        const initializeAnimation = () => {
            const sectionElement = componentRef.current;
            const backgroundTextItems = sectionElement?.querySelectorAll(".text-item") ?? [];
            const backgroundImages = sectionElement
                ? {
                      default: sectionElement.querySelector("#default-bg"),
                      focus: sectionElement.querySelector("#focus-bg"),
                      presence: sectionElement.querySelector("#presence-bg"),
                      feel: sectionElement.querySelector("#feel-bg")
                  }
                : {};

            function switchBackgroundImage(id) {
                Object.values(backgroundImages).forEach((bg) => {
                    if (bg) {
                        gsap.to(bg, {
                            opacity: 0,
                            duration: 0.8,
                            ease: "customEase"
                        });
                    }
                });

                const targetBg = backgroundImages[id] || backgroundImages.default;
                if (targetBg) {
                    gsap.to(targetBg, {
                        opacity: 1,
                        duration: 0.8,
                        ease: "customEase",
                        delay: 0.2
                    });
                }
            }

            backgroundTextItems.forEach((item) => {
                const initialText = item.dataset.text ?? item.textContent ?? "";
                item.textContent = initialText;
                item.dataset.originalText = initialText;
                item.dataset.text = initialText;
                gsap.set(item, { opacity: 1 });
            });

            const typeLines = document.querySelectorAll(".type-line");
            typeLines.forEach((line, index) => {
                const baseText = typeLinesContent[index] ?? line.textContent ?? "";
                line.textContent = baseText;
                line.classList.remove("odd", "even");
                if (index % 2 === 0) {
                    line.classList.add("odd");
                } else {
                    line.classList.add("even");
                }
            });

            const oddLines = document.querySelectorAll(".type-line.odd");
            const evenLines = document.querySelectorAll(".type-line.even");
            const TYPE_LINE_OPACITY = 0.015;

            const textRows = document.querySelectorAll(".text-row");

            textRows.forEach((row) => {
                const textElement = row.querySelector(".text-content");
                const rowId = row.dataset.rowId;

                if (textElement) {
                    const displayText =
                        textElement.dataset.text ?? textElement.textContent ?? "";
                    textElement.textContent = displayText;
                    splitTexts.current[rowId] = splitTextIntoChars(textElement, "char");
                    textElement.style.visibility = "visible";
                }
            });

            function updateCharacterWidths() {
                const isMobile = window.innerWidth < 1024;

                textRows.forEach((row) => {
                    const rowId = row.dataset.rowId;
                    const textElement = row.querySelector(".text-content");
                    if (!textElement || !splitTexts.current[rowId]) return;

                    const computedStyle = window.getComputedStyle(textElement);
                    const currentFontSize = computedStyle.fontSize;
                    const chars = splitTexts.current[rowId].chars;

                    chars.forEach((char, i) => {
                        const charInner = char.querySelector(".char-inner");
                        const charText = charInner ? charInner.textContent : char.textContent;
                        if (!charText && i === 0) return;

                        const treatAsWord =
                            charText && (charText.length > 1 || RTL_CHAR_PATTERN.test(charText));
                        const fontSizeValue = parseFloat(currentFontSize);
                        const fontSizeRatio = fontSizeValue / 160;

                        const ensureInnerSpan = () => {
                            if (charInner) {
                                return charInner;
                            }
                            const innerSpan = document.createElement("span");
                            innerSpan.className = "char-inner";
                            innerSpan.textContent = charText;
                            char.textContent = "";
                            char.appendChild(innerSpan);
                            innerSpan.style.transform = "translate3d(0, 0, 0)";
                            return innerSpan;
                        };

                        const measureWidth = () => {
                            const tempSpan = document.createElement("span");
                            tempSpan.style.position = "absolute";
                            tempSpan.style.visibility = "hidden";
                            tempSpan.style.fontSize = currentFontSize;
                            tempSpan.style.fontFamily = "Longsile, sans-serif";
                            tempSpan.textContent = charText;
                            tempSpan.setAttribute("dir", char.getAttribute("dir") || "auto");
                            document.body.appendChild(tempSpan);
                            const width = tempSpan.offsetWidth;
                            document.body.removeChild(tempSpan);
                            return width;
                        };

                        let charWidth;

                        if (isMobile && !treatAsWord) {
                            charWidth = fontSizeValue * 0.5;
                        } else {
                            const measuredWidth = measureWidth();
                            const padding = 10 * fontSizeRatio;
                            charWidth = Math.max(measuredWidth + padding, 30 * fontSizeRatio);
                        }

                        const inner = ensureInnerSpan();
                        inner.setAttribute("dir", char.getAttribute("dir") || "auto");

                        char.style.width = `${charWidth}px`;
                        char.style.maxWidth = `${charWidth}px`;
                        char.dataset.charWidth = charWidth;

                        const hoverWidthBase = treatAsWord ? charWidth * 1.2 : Math.max(charWidth * 1.8, 85 * fontSizeRatio);
                        char.dataset.hoverWidth = hoverWidthBase;

                        char.style.setProperty("--char-index", i);
                    });
                });
            }

            updateCharacterWidths();

            resizeHandler = () => {
                if (resizeTimer) {
                    clearTimeout(resizeTimer);
                }
                resizeTimer = setTimeout(() => updateCharacterWidths(), 250);
            };

            window.addEventListener("resize", resizeHandler);

            textRows.forEach((row, rowIndex) => {
                const rowId = row.dataset.rowId;
                const chars = splitTexts.current[rowId]?.chars || [];

                gsap.set(chars, {
                    opacity: 0,
                    filter: "blur(15px)"
                });

                gsap.to(chars, {
                    opacity: 1,
                    filter: "blur(0px)",
                    duration: 0.8,
                    stagger: 0.09,
                    ease: "customEase",
                    delay: 0.15 * rowIndex
                });
            });

            function forceResetKineticAnimation() {
                if (state.current.activeKineticAnimation) {
                    state.current.activeKineticAnimation.kill();
                    state.current.activeKineticAnimation = null;
                }

                const kineticType = document.getElementById("kinetic-type");
                gsap.killTweensOf([kineticType, typeLines, oddLines, evenLines]);

                gsap.set(kineticType, {
                    display: "grid",
                    scale: 1,
                    rotation: 0,
                    opacity: 1,
                    visibility: "visible"
                });

                gsap.set(typeLines, {
                    opacity: TYPE_LINE_OPACITY,
                    x: "0%"
                });

                typeLines.forEach((line, index) => {
                    const baseText = typeLinesContent[index] ?? line.textContent ?? "";
                    line.textContent = baseText;
                });

                state.current.kineticAnimationActive = false;
            }

            function startKineticAnimation(text) {
                forceResetKineticAnimation();

                const kineticType = document.getElementById("kinetic-type");
                kineticType.style.display = "grid";
                kineticType.style.opacity = "1";
                kineticType.style.visibility = "visible";

                const repeatedText = `${text} ${text} ${text}`;

                typeLines.forEach((line) => {
                    line.textContent = repeatedText;
                });

                setTimeout(() => {
                    const timeline = gsap.timeline({
                        onComplete: () => {
                            state.current.kineticAnimationActive = false;
                        }
                    });

                    timeline.to(kineticType, {
                        duration: 2.0,
                        ease: "customEase",
                        scale: 2.7,
                        rotation: -90
                    });

                    timeline.to(
                        oddLines,
                        {
                            keyframes: [
                                { x: "20%", duration: 1.5, ease: "customEase" },
                                { x: "-200%", duration: 2.0, ease: "customEase" }
                            ],
                            stagger: 0.12
                        },
                        0
                    );

                    timeline.to(
                        evenLines,
                        {
                            keyframes: [
                                { x: "-20%", duration: 1.5, ease: "customEase" },
                                { x: "200%", duration: 2.0, ease: "customEase" }
                            ],
                            stagger: 0.12
                        },
                        0
                    );

                    timeline.to(
                        typeLines,
                        {
                            keyframes: [
                                { opacity: 1, duration: 1.5, ease: "customEase" },
                                { opacity: 0, duration: 2.0, ease: "customEase" }
                            ],
                            stagger: 0.08
                        },
                        0
                    );

                    state.current.kineticAnimationActive = true;
                    state.current.activeKineticAnimation = timeline;
                }, 20);
            }

            function fadeOutKineticAnimation() {
                if (!state.current.kineticAnimationActive) return;

                if (state.current.activeKineticAnimation) {
                    state.current.activeKineticAnimation.kill();
                    state.current.activeKineticAnimation = null;
                }

                const kineticType = document.getElementById("kinetic-type");

                const fadeOutTimeline = gsap.timeline({
                    onComplete: () => {
                        gsap.set(kineticType, {
                            scale: 1,
                            rotation: 0,
                            opacity: 1
                        });

                        gsap.set(typeLines, {
                            opacity: TYPE_LINE_OPACITY,
                            x: "0%"
                        });

                        typeLines.forEach((line, index) => {
                            const baseText =
                                typeLinesContent[index] ?? line.textContent ?? "";
                            line.textContent = baseText;
                        });

                        state.current.kineticAnimationActive = false;
                    }
                });

                fadeOutTimeline.to(kineticType, {
                    opacity: 0,
                    scale: 0.8,
                    duration: 0.5,
                    ease: "customEase"
                });
            }
            fadeOutRef.current = fadeOutKineticAnimation;

            function createTextRevealAnimation(rowId) {
                const timeline = gsap.timeline();

                timeline.to(backgroundTextItems, {
                    opacity: 0.3,
                    duration: 0.5,
                    ease: "customEase"
                });

                timeline.call(() => {
                    backgroundTextItems.forEach((item) => {
                        item.classList.add("highlight");
                    });
                });

                timeline.call(
                    () => {
                        backgroundTextItems.forEach((item) => {
                            const textKey = item.dataset.textKey;
                            const altValue = alternativeTexts[rowId]?.[textKey];
                            if (altValue) {
                                item.textContent = altValue;
                            }
                        });
                    },
                    null,
                    "+=0.5"
                );

                timeline.call(() => {
                    backgroundTextItems.forEach((item) => {
                        item.classList.remove("highlight");
                        item.classList.add("highlight-reverse");
                    });
                });

                timeline.call(
                    () => {
                        backgroundTextItems.forEach((item) => {
                            item.classList.remove("highlight-reverse");
                        });
                    },
                    null,
                    "+=0.5"
                );

                return timeline;
            }

            function resetBackgroundTextWithAnimation() {
                const timeline = gsap.timeline();

                timeline.call(() => {
                    backgroundTextItems.forEach((item) => {
                        item.classList.add("highlight");
                    });
                });

                timeline.call(
                    () => {
                        backgroundTextItems.forEach((item) => {
                            item.textContent = item.dataset.originalText;
                        });
                    },
                    null,
                    "+=0.5"
                );

                timeline.call(() => {
                    backgroundTextItems.forEach((item) => {
                        item.classList.remove("highlight");
                        item.classList.add("highlight-reverse");
                    });
                });

                timeline.call(
                    () => {
                        backgroundTextItems.forEach((item) => {
                            item.classList.remove("highlight-reverse");
                        });
                    },
                    null,
                    "+=0.5"
                );

                timeline.to(backgroundTextItems, {
                    opacity: 1,
                    duration: 0.5,
                    ease: "customEase"
                });

                return timeline;
            }

            function transitionBetweenRows(fromRow, toRow) {
                if (state.current.transitionInProgress) return;

                state.current.transitionInProgress = true;

                const fromRowId = fromRow.dataset.rowId;
                const toRowId = toRow.dataset.rowId;

                fromRow.classList.remove("active");
                const fromChars = splitTexts.current[fromRowId]?.chars || [];
                const fromInners = fromRow.querySelectorAll(".char-inner");

                gsap.killTweensOf(fromChars);
                gsap.killTweensOf(fromInners);

                toRow.classList.add("active");
                state.current.activeRowId = toRowId;

                const toText = toRow.querySelector(".text-content")?.dataset.text ?? "";
                const toChars = splitTexts.current[toRowId]?.chars || [];
                const toInners = toRow.querySelectorAll(".char-inner");

                forceResetKineticAnimation();
                switchBackgroundImage(toRowId);

                if (state.current.textRevealAnimation) {
                    state.current.textRevealAnimation.kill();
                }
                state.current.textRevealAnimation = createTextRevealAnimation(toRowId);
                startKineticAnimation(toText);

                gsap.set(fromChars, {
                    maxWidth: (i, target) => parseFloat(target.dataset.charWidth)
                });

                gsap.set(fromInners, { x: 0 });

                const timeline = gsap.timeline({
                    onComplete: () => {
                        state.current.transitionInProgress = false;
                    }
                });

                timeline.to(
                    toChars,
                    {
                        maxWidth: (i, target) => parseFloat(target.dataset.hoverWidth),
                        duration: 0.64,
                        stagger: 0.04,
                        ease: "customEase"
                    },
                    0
                );

                timeline.to(
                    toInners,
                    {
                        x: -35,
                        duration: 0.64,
                        stagger: 0.04,
                        ease: "customEase"
                    },
                    0.05
                );
            }

            function activateRow(row) {
                const rowId = row.dataset.rowId;

                if (state.current.activeRowId === rowId) return;
                if (state.current.transitionInProgress) return;

                const activeRow = document.querySelector(".text-row.active");

                if (activeRow) {
                    transitionBetweenRows(activeRow, row);
                } else {
                    row.classList.add("active");
                    state.current.activeRowId = rowId;

                    const text =
                        row.querySelector(".text-content")?.dataset.text ?? "";
                    const chars = splitTexts.current[rowId]?.chars || [];
                    const innerSpans = row.querySelectorAll(".char-inner");

                    switchBackgroundImage(rowId);
                    startKineticAnimation(text);

                    if (state.current.textRevealAnimation) {
                        state.current.textRevealAnimation.kill();
                    }
                    state.current.textRevealAnimation = createTextRevealAnimation(rowId);

                    const timeline = gsap.timeline();

                    timeline.to(
                        chars,
                        {
                            maxWidth: (i, target) => parseFloat(target.dataset.hoverWidth),
                            duration: 0.64,
                            stagger: 0.04,
                            ease: "customEase"
                        },
                        0
                    );

                    timeline.to(
                        innerSpans,
                        {
                            x: -35,
                            duration: 0.64,
                            stagger: 0.04,
                            ease: "customEase"
                        },
                        0.05
                    );
                }
            }

            function deactivateRow(row) {
                const rowId = row.dataset.rowId;

                if (state.current.activeRowId !== rowId) return;
                if (state.current.transitionInProgress) return;

                state.current.activeRowId = null;
                row.classList.remove("active");

                switchBackgroundImage("default");
                fadeOutKineticAnimation();

                if (state.current.textRevealAnimation) {
                    state.current.textRevealAnimation.kill();
                }
                state.current.textRevealAnimation = resetBackgroundTextWithAnimation();

                const chars = splitTexts.current[rowId]?.chars || [];
                const innerSpans = row.querySelectorAll(".char-inner");

                const timeline = gsap.timeline();

                timeline.to(
                    innerSpans,
                    {
                        x: 0,
                        duration: 0.64,
                        stagger: 0.03,
                        ease: "customEase"
                    },
                    0
                );

                timeline.to(
                    chars,
                    {
                        maxWidth: (i, target) => parseFloat(target.dataset.charWidth),
                        duration: 0.64,
                        stagger: 0.03,
                        ease: "customEase"
                    },
                    0.05
                );
            }

            function initializeParallax() {
                const container = componentRef.current;
                if (!container) {
                    return () => {};
                }

                if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
                    return () => {};
                }

                const backgroundElements = [
                    ...container.querySelectorAll("[id$='-bg']"),
                    ...container.querySelectorAll(".bg-text-container")
                ];

                const parallaxLayers = [0.02, 0.03, 0.04, 0.05];
                backgroundElements.forEach((el, index) => {
                    el.dataset.parallaxSpeed = parallaxLayers[index % parallaxLayers.length];

                    gsap.set(el, {
                        transformOrigin: "center center",
                        force3D: true
                    });
                });

                let frameId = null;

                const handleMouseMove = (e) => {
                    if (frameId) {
                        cancelAnimationFrame(frameId);
                    }

                    frameId = requestAnimationFrame(() => {
                        const { left, top, width, height } = container.getBoundingClientRect();
                        const offsetX = ((e.clientX - left) - width / 2) / (width / 2 || 1);
                        const offsetY = ((e.clientY - top) - height / 2) / (height / 2 || 1);

                        backgroundElements.forEach((el) => {
                            const speed = parseFloat(el.dataset.parallaxSpeed);

                            if (el.id && el.id.endsWith("-bg") && el.style.opacity === "0") {
                                return;
                            }

                            const moveX = offsetX * 80 * speed;
                            const moveY = offsetY * 40 * speed;

                            gsap.to(el, {
                                x: moveX,
                                y: moveY,
                                duration: 0.8,
                                ease: "mouseEase",
                                overwrite: "auto"
                            });
                        });

                        frameId = null;
                    });
                };

                const handleMouseLeave = () => {
                    if (frameId) {
                        cancelAnimationFrame(frameId);
                        frameId = null;
                    }

                    backgroundElements.forEach((el) => {
                        gsap.to(el, {
                            x: 0,
                            y: 0,
                            duration: 1.2,
                            ease: "customEase"
                        });
                    });
                };

                container.addEventListener("mousemove", handleMouseMove);
                container.addEventListener("mouseleave", handleMouseLeave);

                backgroundElements.forEach((el, index) => {
                    const delay = index * 0.2;
                    const floatAmount = 5 + (index % 3) * 2;

                    gsap.to(el, {
                        y: `+=${floatAmount}`,
                        duration: 3 + (index % 2),
                        ease: "sine.inOut",
                        repeat: -1,
                        yoyo: true,
                        delay: delay
                    });
                });

                return () => {
                    container.removeEventListener("mousemove", handleMouseMove);
                    container.removeEventListener("mouseleave", handleMouseLeave);
                    if (frameId) {
                        cancelAnimationFrame(frameId);
                    }
                };
            }

            textRows.forEach((row) => {
                const interactiveArea = row.querySelector(".interactive-area");

                const handleEnter = () => activateRow(row);
                const handleLeave = () => {
                    if (state.current.activeRowId === row.dataset.rowId) {
                        deactivateRow(row);
                    }
                };
                const handleClick = () => activateRow(row);

                interactiveArea?.addEventListener("mouseenter", handleEnter);
                interactiveArea?.addEventListener("mouseleave", handleLeave);
                row.addEventListener("click", handleClick);

                listeners.push({
                    target: interactiveArea,
                    event: "mouseenter",
                    handler: handleEnter
                });
                listeners.push({
                    target: interactiveArea,
                    event: "mouseleave",
                    handler: handleLeave
                });
                listeners.push({ target: row, event: "click", handler: handleClick });
            });

            function scrambleRandomText() {
                if (!sectionVisibleRef.current || isCancelled) {
                    scrambleTimeoutRef.current = null;
                    return;
                }

                const randomIndex = Math.floor(Math.random() * backgroundTextItems.length);
                const randomItem = backgroundTextItems[randomIndex];
                const originalText = randomItem.dataset.text ?? randomItem.textContent ?? "";

                gsap.to(randomItem, {
                    duration: 1,
                    scrambleText: {
                        text: originalText,
                        chars: "■▪▌▐▬",
                        revealDelay: 0.5,
                        speed: 0.3
                    },
                    ease: "none"
                });

                const delay = 0.5 + Math.random() * 2;
                scrambleTimeoutRef.current = window.setTimeout(scrambleRandomText, delay * 1000);
            }
            scrambleRandomTextFn = scrambleRandomText;

            startInteractiveRef.current = () => {
                if (isCancelled || !sectionVisibleRef.current) {
                    return;
                }

                if (!parallaxCleanupRef.current) {
                    parallaxCleanupRef.current = initializeParallax();
                }

                if (scrambleRandomTextFn && !scrambleTimeoutRef.current) {
                    scrambleTimeoutRef.current = window.setTimeout(scrambleRandomTextFn, 1000);
                }
            };

            stopInteractiveRef.current = () => {
                if (parallaxCleanupRef.current) {
                    parallaxCleanupRef.current();
                    parallaxCleanupRef.current = null;
                }

                if (scrambleTimeoutRef.current) {
                    clearTimeout(scrambleTimeoutRef.current);
                    scrambleTimeoutRef.current = null;
                }
            };

            const simplicity = sectionElement?.querySelector(
                '.text-item[data-text-key="isTheKey"]'
            );
            if (simplicity) {
                const splitSimplicity = splitTextIntoChars(
                    simplicity,
                    "simplicity-char"
                );

                gsap.from(splitSimplicity.chars, {
                    opacity: 0,
                    scale: 0.5,
                    duration: 1,
                    stagger: 0.015,
                    ease: "customEase",
                    delay: 1
                });
            }

            backgroundTextItems.forEach((item, index) => {
                const delay = index * 0.1;
                gsap.to(item, {
                    opacity: 0.85,
                    duration: 2 + (index % 3),
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut",
                    delay: delay
                });
            });

            styleElement = document.createElement("style");
            styleElement.textContent = `
                #kinetic-type {
                    z-index: 200 !important;
                    display: grid !important;
                    visibility: visible !important;
                    opacity: 1;
                    pointer-events: none;
                }
            `;
            document.head.appendChild(styleElement);
        };

        document.fonts.ready.then(() => {
            if (!isCancelled) {
                initializeAnimation();

                if (componentRef.current) {
                    observer = new IntersectionObserver(
                        ([entry]) => {
                            sectionVisibleRef.current = entry.isIntersecting;

                            if (entry.isIntersecting) {
                                startInteractiveRef.current?.();
                            } else {
                                stopInteractiveRef.current?.();
                                fadeOutRef.current?.();
                            }
                        },
                        { threshold: 0.2 }
                    );

                    observer.observe(componentRef.current);
                }
            }
        });

        return () => {
            isCancelled = true;

            if (resizeHandler) {
                window.removeEventListener("resize", resizeHandler);
            }
            if (resizeTimer) {
                clearTimeout(resizeTimer);
            }

            listeners.forEach(({ target, event, handler }) => {
                target?.removeEventListener(event, handler);
            });
            observer?.disconnect();
            stopInteractiveRef.current?.();

            if (styleElement && styleElement.parentNode) {
                styleElement.parentNode.removeChild(styleElement);
            }

            state.current.activeKineticAnimation?.kill?.();
            state.current.textRevealAnimation?.kill?.();
            gsap.killTweensOf("*");
        };
    }, [kineticConfig, backgroundItems, alternativeTexts, typeLinesContent, prefersReducedMotion]);

    return (
        <div className="kinetic-section-container" ref={componentRef}>
            <div className="background-frame"></div>

            <div className="background-image default" id="default-bg"></div>
            <div className="background-image focus" id="focus-bg"></div>
            <div className="background-image presence" id="presence-bg"></div>
            <div className="background-image feel" id="feel-bg"></div>

            <div className="bottom-gradient"></div>

            <div className="text-background">
                {backgroundItems.map(({ key, style, label }) => (
                    <div
                        key={key}
                        className="text-item"
                        style={style}
                        data-text={label}
                        data-text-key={key}
                    >
                        {label}
                    </div>
                ))}
            </div>

            <div className="main-content">
                <div className="sliced-container">
                    {TEXT_ROWS.map((rowId) => {
                        const label = rowLabels[rowId] ?? rowId.toUpperCase();
                        return (
                            <div className="text-row" data-row-id={rowId} key={rowId}>
                                <div
                                    className="text-content"
                                    data-text={label}
                                    data-text-key={rowId}
                                >
                                    {label}
                                </div>
                                <div className="interactive-area"></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="type" id="kinetic-type" aria-hidden="true">
                {typeLinesContent.map((lineText, index) => (
                    <div className="type-line" key={index}>
                        {lineText}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KineticSection;
