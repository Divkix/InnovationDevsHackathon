import "@testing-library/jest-dom";
import "vitest-canvas-mock";
import React from "react";
import type { Mock } from "vitest";
import { vi } from "vitest";

// Create a proper localStorage mock with actual storage behavior
const createLocalStorageMock = () => {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string): string | null => {
      return store.get(key) ?? null;
    }),
    setItem: vi.fn((key: string, value: string): void => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string): void => {
      store.delete(key);
    }),
    clear: vi.fn((): void => {
      store.clear();
    }),
    key: vi.fn((index: number): string | null => {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    }),
    get length() {
      return store.size;
    },
    // Helper to inspect store in tests
    _store: store,
  };
};

// Use vi.stubGlobal to properly replace localStorage
const localStorageMock = createLocalStorageMock();
vi.stubGlobal("localStorage", localStorageMock);

// Define types for mocked window objects
interface MockedMediaQueryList {
  matches: boolean;
  media: string;
  onchange: null;
  addListener: Mock<(listener: EventListenerOrEventListenerObject) => void>;
  removeListener: Mock<(listener: EventListenerOrEventListenerObject) => void>;
  addEventListener: Mock<(type: string, listener: EventListenerOrEventListenerObject) => void>;
  removeEventListener: Mock<(type: string, listener: EventListenerOrEventListenerObject) => void>;
  dispatchEvent: Mock<(event: Event) => boolean>;
}

// Mock location since it might also be read-only in some environments
Object.defineProperty(window, "location", {
  writable: true,
  value: {
    href: "http://localhost:5173/",
    origin: "http://localhost:5173",
    host: "localhost:5173",
    hostname: "localhost",
    port: "5173",
    protocol: "http:",
    pathname: "/",
    search: "",
    hash: "",
  },
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(
    (query: string): MockedMediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  ),
});

// Mock framer-motion for tests - comprehensive mock to replace all motion components
vi.mock("framer-motion", () => {
  const MOTION_PROP_KEYS = new Set([
    "animate",
    "initial",
    "exit",
    "variants",
    "transition",
    "whileHover",
    "whileTap",
    "whileFocus",
    "whileDrag",
    "whileInView",
    "viewport",
    "drag",
    "dragConstraints",
    "dragElastic",
    "dragMomentum",
    "layout",
    "layoutId",
    "layoutDependency",
    "layoutScroll",
    "onHoverStart",
    "onHoverEnd",
    "onTap",
    "onTapStart",
    "onTapCancel",
    "onPan",
    "onPanStart",
    "onPanEnd",
    "onDrag",
    "onDragStart",
    "onDragEnd",
    "onViewportEnter",
    "onViewportLeave",
  ]);

  function stripMotionProps(props: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(props).filter(([key]) => !MOTION_PROP_KEYS.has(key) && key !== "ref"),
    );
  }

  const createMotionComponent = (element: string) =>
    React.forwardRef(
      (
        { children, ...props }: { children?: React.ReactNode; [key: string]: unknown },
        ref: unknown,
      ) => {
        const safeProps = stripMotionProps(props);
        return React.createElement(element, { ...safeProps, ref }, children);
      },
    );

  return {
    __esModule: true,
    motion: {
      div: createMotionComponent("div"),
      span: createMotionComponent("span"),
      button: createMotionComponent("button"),
      a: createMotionComponent("a"),
      ul: createMotionComponent("ul"),
      li: createMotionComponent("li"),
      nav: createMotionComponent("nav"),
      header: createMotionComponent("header"),
      footer: createMotionComponent("footer"),
      main: createMotionComponent("main"),
      section: createMotionComponent("section"),
      article: createMotionComponent("article"),
      aside: createMotionComponent("aside"),
      h1: createMotionComponent("h1"),
      h2: createMotionComponent("h2"),
      h3: createMotionComponent("h3"),
      h4: createMotionComponent("h4"),
      h5: createMotionComponent("h5"),
      h6: createMotionComponent("h6"),
      p: createMotionComponent("p"),
      img: createMotionComponent("img"),
      svg: createMotionComponent("svg"),
      path: createMotionComponent("path"),
      circle: createMotionComponent("circle"),
      rect: createMotionComponent("rect"),
      line: createMotionComponent("line"),
      polyline: createMotionComponent("polyline"),
      polygon: createMotionComponent("polygon"),
      text: createMotionComponent("text"),
      g: createMotionComponent("g"),
      defs: createMotionComponent("defs"),
      clipPath: createMotionComponent("clipPath"),
      mask: createMotionComponent("mask"),
      linearGradient: createMotionComponent("linearGradient"),
      radialGradient: createMotionComponent("radialGradient"),
      stop: createMotionComponent("stop"),
      animate: createMotionComponent("animate"),
      motion: {
        custom: (Component: React.ComponentType<{ children?: React.ReactNode }>) => {
          return ({
            children,
            ...props
          }: {
            children?: React.ReactNode;
            [key: string]: unknown;
          }) => {
            const safeProps = stripMotionProps(props);
            return React.createElement(Component, safeProps, children);
          };
        },
      },
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
    AnimateSharedLayout: ({ children }: { children?: React.ReactNode }) => children,
    LazyMotion: ({ children }: { children?: React.ReactNode }) => children,
    MotionConfig: ({ children }: { children?: React.ReactNode }) => children,
    Reorder: {
      Group: ({ children }: { children?: React.ReactNode }) => children,
      Item: ({ children }: { children?: React.ReactNode }) => children,
    },
    useAnimation: vi.fn(() => ({
      start: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
      set: vi.fn(),
      mount: vi.fn(),
    })),
    useMotionValue: vi.fn((initial: unknown) => ({
      get: vi.fn(() => initial),
      set: vi.fn(),
      on: vi.fn(() => vi.fn()),
    })),
    useTransform: vi.fn((input: unknown, transform: (value: number) => unknown) => {
      // Handle array of inputs (useTransform can accept multiple motion values)
      if (Array.isArray(input)) {
        const values = input.map((i) =>
          typeof i === "object" && i !== null && "get" in i
            ? (i as { get: () => number }).get()
            : i,
        );
        const transformed = transform(values as unknown as number);
        return {
          get: vi.fn(() => transformed),
          on: vi.fn((event: string, callback: (value: unknown) => void) => {
            if (event === "change") {
              callback(transformed);
            }
            return vi.fn();
          }),
        };
      }

      // Handle single motion value input
      const getInputValue = () => {
        if (typeof input === "number") return input;
        if (typeof input === "object" && input !== null && "get" in input) {
          return (input as { get: () => number }).get();
        }
        return 0;
      };

      const currentValue = getInputValue();
      const transformedValue = transform(currentValue);

      return {
        get: vi.fn(() => transformedValue),
        on: vi.fn((event: string, callback: (value: unknown) => void) => {
          if (event === "change") {
            // Immediately call with the transformed value so tests see the correct value
            callback(transformedValue);
          }
          return vi.fn();
        }),
      };
    }),
    useSpring: vi.fn((value: number | { get: () => number }) => {
      let currentValue = typeof value === "number" ? value : value.get();
      return {
        set: vi.fn((newValue: number) => {
          currentValue = newValue;
          return newValue;
        }),
        get: vi.fn(() => currentValue),
        on: vi.fn((event: string, callback: (value: number) => void) => {
          if (event === "change") {
            callback(currentValue);
          }
          return vi.fn();
        }),
      };
    }),
    useScroll: vi.fn(() => ({
      scrollX: { get: vi.fn(() => 0) },
      scrollY: { get: vi.fn(() => 0) },
      scrollXProgress: { get: vi.fn(() => 0) },
      scrollYProgress: { get: vi.fn(() => 0) },
    })),
    useInView: vi.fn(() => false),
    useReducedMotion: vi.fn(() => false),
    useDragControls: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
    })),
    useMotionTemplate: vi.fn((..._values: unknown[]) => ({
      get: vi.fn(),
      on: vi.fn(() => vi.fn()),
    })),
    useTime: vi.fn(() => ({ get: vi.fn(() => 0) })),
    useVelocity: vi.fn(() => ({ get: vi.fn(() => 0) })),
    useWillChange: vi.fn(() => "auto"),
    isValidMotionProp: vi.fn(() => true),
    addScaleCorrector: vi.fn(),
    domAnimation: {},
    domMax: {},
  };
});
