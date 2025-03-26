import React from 'react';

interface TabSelectorProps {
  activeTab: 'texto' | 'multimedia' | 'enlace' | 'encuesta';
  onTabChange: (tab: 'texto' | 'multimedia' | 'enlace' | 'encuesta') => void;
}

const TabSelector: React.FC<TabSelectorProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex gap-4 px-6 py-4 border-b">
      {['texto', 'multimedia', 'enlace', 'encuesta'].map((tab) => (
        <button
          key={tab}
          className={`tab-button px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab ? 'text-green-600 bg-green-50 border-b-2 border-green-600' : 'text-gray-600 hover:bg-gray-50'
          }`}
          onClick={() => onTabChange(tab as typeof activeTab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );
};

export default TabSelector; 