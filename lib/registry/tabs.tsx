import * as React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultTab, onChange, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

  const handleSelect = (id: string) => {
    setActiveTab(id);
    if (onChange) onChange(id);
  };

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className={`w-full flex flex-col space-y-4 ${className}`}>
      {/* Tabs Header */}
      <div className="flex items-center space-x-1 rounded-xl border border-[#2a2c34] bg-[#111318] p-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#17191f] text-white shadow-sm border border-[#2a2c34]'
                  : 'text-[#8a8b8d] hover:text-[#e1e2e5] hover:bg-[#17191f]/50'
              }`}
            >
              {tab.icon && <span className="w-3.5 h-3.5">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs Content */}
      <div className="rounded-xl border border-[#2a2c34] bg-[#111318] p-6 text-[#e1e2e5] animate-in fade-in-50 duration-200">
        {currentTab?.content}
      </div>
    </div>
  );
}
