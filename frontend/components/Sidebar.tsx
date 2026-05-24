
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const SidebarItem = ({ name, data, onSelect, selected }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (Array.isArray(data)) {
    return (
      <div className="ml-4">
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
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {name}
      </button>
      {isOpen && (
        <div className="ml-4 border-l pl-2">
          {Object.entries(data).map(([key, value]) => (
            <SidebarItem key={key} name={key} data={value} onSelect={onSelect} selected={selected} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarItem;
