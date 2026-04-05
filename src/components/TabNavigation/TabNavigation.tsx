import { motion } from "framer-motion";
import { Camera, LayoutDashboard, type LucideIcon } from "lucide-react";
import type { AppTab, TabNavigationProps } from "../../types";

interface TabConfig {
  id: AppTab;
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
}

export function TabNavigation({ activeTab, onTabChange, className = "" }: TabNavigationProps) {
  const tabs: TabConfig[] = [
    { id: "camera", label: "Camera", icon: Camera, ariaLabel: "Switch to Camera view" },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      ariaLabel: "Switch to Dashboard view",
    },
  ];

  const handleTabClick = (tabId: AppTab): void => {
    if (tabId !== activeTab) onTabChange(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, tabId: AppTab): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTabClick(tabId);
    }
  };

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0
        md:relative md:bottom-auto md:left-auto md:right-auto
        bg-swiss border-t-4 border-swiss-fg
        md:border-t-0 md:border-b-4
        z-50 md:z-auto
        ${className}
      `}
      data-testid="tab-navigation"
    >
      <div className="max-w-6xl mx-auto">
        <div
          role="tablist"
          aria-label="Main navigation"
          className="flex justify-around md:justify-start md:gap-1 px-4 py-2 pb-[env(safe-area-inset-bottom,8px)] md:pb-2"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.98 }}
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
                  flex-col md:flex-row
                  px-6 py-3 md:py-4
                  min-w-[80px] md:min-w-0
                  min-h-[44px] md:min-h-0
                  font-bold uppercase tracking-widest text-xs md:text-sm
                  transition-colors duration-200 ease-out
                  border-b-4
                  ${
                    isActive
                      ? "border-swiss-accent text-swiss-fg"
                      : "border-transparent text-swiss-fg/50 hover:text-swiss-fg"
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-swiss-accent focus-visible:ring-offset-2
                `}
              >
                <Icon className="w-6 h-6 md:w-5 md:h-5" aria-hidden="true" />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default TabNavigation;
