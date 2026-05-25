"use client";

import { useState } from "react";

type CategoryNode = string[] | { [key: string]: CategoryNode };

interface SidebarItemProps {
  name: string;
  data: CategoryNode;
  onSelect: (item: string) => void;
  selected: string;
}

const SidebarItem = ({ name, data, onSelect, selected }: SidebarItemProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (Array.isArray(data)) {
    return (
      <div className="ml-2">
        <div className="font-bold text-gray-700 py-1 text-sm">{name}</div>
        {data.map((item) => (
          <button
            key={item}
            onClick={() => onSelect(item)}
            className={`block w-full text-left px-2 py-1 text-sm rounded ${
              selected === item ? "bg-orange-100 text-orange-700" : "hover:bg-gray-100"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full text-left font-semibold text-gray-800 py-1"
      >
        <span className="mr-2">{isOpen ? "▼" : "▶"}</span>
        {name}
      </button>
      {isOpen && (
        <div className="ml-2 border-l pl-2">
          {Object.entries(data).map(([key, value]) => (
            <SidebarItem key={key} name={key} data={value} onSelect={onSelect} selected={selected} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarItem;
