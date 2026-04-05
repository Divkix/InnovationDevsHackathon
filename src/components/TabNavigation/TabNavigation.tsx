import { motion } from "framer-motion";
import { Camera, LayoutDashboard, type LucideIcon } from "lucide-react";
import type { AppTab, TabNavigationProps } from "../../types";

interface TabConfig {
  id: AppTab;
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
}

/**
 * TabNavigation component - Responsive tab navigation for Camera and Dashboard views
 *
 * Features:
 * - Two tabs: Camera and Dashboard
 * - Active tab is visually indicated with State Farm red accent
 * - Responsive layout: bottom tabs on mobile, top tabs on desktop
 * - Uses Tailwind's responsive prefixes (md: for desktop breakpoint)
 * - Accessible: keyboard navigable with proper ARIA attributes
 * - Animations: smooth transitions between tabs
 */
export function TabNavigation({ activeTab, onTabChange, className = "" }: TabNavigationProps) {
  const tabs: TabConfig[] = [
    {
      id: "camera",
      label: "Camera",
      icon: Camera,
      ariaLabel: "Switch to Camera view",
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      ariaLabel: "Switch to Dashboard view",
    },
  ];

  const handleTabClick = (tabId: AppTab): void => {
    if (tabId !== activeTab) {
      onTabChange(tabId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, tabId: AppTab): void => {
    // Handle keyboard navigation
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTabClick(tabId);
    }
  };

  return (
    <nav
      aria-label="Main navigation"
      className={`
        fixed bottom-0 left-0 right-0
        md:relative md:bottom-auto md:left-auto md:right-auto
        bg-[var(--swiss-bg)] border-t-2 border-[var(--swiss-border)]
        md:border-t-0 md:border-b-2
        z-50 md:z-auto
        swiss-grid-pattern
        ${className}
      `}
      data-testid="tab-navigation"
    >
      <div className="max-w-6xl mx-auto">
        <div
          role="tablist"
          aria-label="Main navigation"
          className="flex justify-around md:justify-start md:gap-4 px-4 py-2 pb-[env(safe-area-inset-bottom,8px)] md:pb-2"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.ariaLabel}
                tabIndex={0}
                onClick={() => handleTabClick(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab.id)}
                data-testid={`tab-${tab.id}`}
                data-active={isActive}
                className={`
                  flex items-center justify-center gap-2
                  /* Mobile: Larger touch target, icon-focused */
                  flex-col md:flex-row
                  px-4 py-2 md:py-2.5
                  min-w-[80px] md:min-w-0
                  /* Mobile: min tap target 44x44px */
                  min-h-[44px] md:min-h-0

                  /* Styling */
                  border-2 border-transparent
                  font-bold uppercase tracking-[0.14em]
                  transition-all duration-150
                  ${
                    isActive
                      ? "bg-[var(--swiss-accent)] text-white border-[var(--swiss-border)]"
                      : "text-gray-600 hover:bg-[var(--swiss-muted)] hover:border-[var(--swiss-border)]"
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E31837] focus-visible:ring-offset-2
                `}
              >
                <Icon
                  className={`
                    /* Mobile: Larger icon for touch interface */
                    w-6 h-6
                    md:w-4 md:h-4
                    ${isActive ? "text-[#E31837]" : "text-gray-500"}
                  `}
                  aria-hidden="true"
                />
                <span
                  className={`
                  /* Mobile: Smaller text under icon */
                  text-xs
                  md:text-sm
                  ${isActive ? "font-black" : ""}
                `}
                >
                  {tab.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -bottom-[2px] w-8 h-1 bg-[var(--swiss-fg)] md:hidden"
                    transition={{ duration: 0.15 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default TabNavigation;
