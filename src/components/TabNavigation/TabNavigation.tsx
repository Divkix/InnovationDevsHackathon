import { Camera, LayoutDashboard, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TabNavigationProps, AppTab } from '../../types';

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
export function TabNavigation({
  activeTab,
  onTabChange,
  className = '',
}: TabNavigationProps) {
  const tabs: TabConfig[] = [
    {
      id: 'camera',
      label: 'Camera',
      icon: Camera,
      ariaLabel: 'Switch to Camera view',
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      ariaLabel: 'Switch to Dashboard view',
    },
  ];

  const handleTabClick = (tabId: AppTab): void => {
    if (tabId !== activeTab) {
      onTabChange(tabId);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    tabId: AppTab
  ): void => {
    // Handle keyboard navigation
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabClick(tabId);
    }
  };

  return (
    <nav
      role="tablist"
      aria-label="Main navigation"
      className={`
        /* Mobile: Fixed bottom, full width, horizontal layout */
        fixed bottom-0 left-0 right-0
        md:relative md:bottom-auto md:left-auto md:right-auto

        /* Background and border */
        bg-white border-t border-gray-200
        md:border-t-0 md:border-b

        /* Z-index for mobile overlay */
        z-50 md:z-auto

        /* Container */
        ${className}
      `}
      data-testid="tab-navigation"
    >
      <div className="max-w-6xl mx-auto">
        <div
          className={`
          flex
          /* Mobile: Equal distribution, padding for safe areas */
          justify-around
          md:justify-start md:gap-4
          px-4 py-2
          /* Mobile bottom safe area padding for notched devices */
          pb-[env(safe-area-inset-bottom,8px)]
          md:pb-2
        `}
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
                  rounded-lg
                  font-medium
                  transition-all duration-200

                  /* Active vs inactive states - State Farm red for active */
                  ${
                    isActive
                      ? 'bg-red-50 text-[#E31837] md:bg-red-50 md:text-[#E31837]'
                      : 'text-gray-600 hover:bg-gray-100'
                  }

                  /* Focus visible for accessibility */
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E31837] focus-visible:ring-offset-2
                `}
              >
                <Icon
                  className={`
                    /* Mobile: Larger icon for touch interface */
                    w-6 h-6
                    md:w-4 md:h-4
                    ${isActive ? 'text-[#E31837]' : 'text-gray-500'}
                  `}
                  aria-hidden="true"
                />
                <span
                  className={`
                  /* Mobile: Smaller text under icon */
                  text-xs
                  md:text-sm
                  ${isActive ? 'font-semibold' : ''}
                `}
                >
                  {tab.label}
                </span>

                {/* Active indicator bar for mobile */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -bottom-[2px] w-8 h-1 bg-[#E31837] rounded-full md:hidden"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
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
