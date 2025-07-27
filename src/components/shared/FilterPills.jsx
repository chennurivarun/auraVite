import React from "react";
import { Plus } from "lucide-react";

export default function FilterPills({ 
  filters = [], 
  activeFilter = "", 
  onFilterChange, 
  showAddButton = false,
  onAddFilter
}) {
  // Ensure filters is always an array
  const safeFilters = Array.isArray(filters) ? filters : [];

  if (safeFilters.length === 0) {
    return null;
  }

  const handleFilterClick = (filterKey) => {
    if (onFilterChange && typeof onFilterChange === 'function') {
      onFilterChange(filterKey);
    }
  };

  const handleAddClick = () => {
    if (onAddFilter && typeof onAddFilter === 'function') {
      onAddFilter();
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {safeFilters.map((filter) => (
        <button
          key={filter.key || filter.label}
          onClick={() => handleFilterClick(filter.key)}
          className={`momentum-pill-filter ${
            activeFilter === filter.key ? 'active' : ''
          }`}
        >
          {filter.label || 'Unnamed Filter'}
          {filter.count !== undefined && (
            <span className="ml-2 opacity-70">({filter.count})</span>
          )}
        </button>
      ))}
      
      {showAddButton && (
        <button
          onClick={handleAddClick}
          className="momentum-pill-filter border-dashed hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Filter
        </button>
      )}
    </div>
  );
}
