import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function CustomDropdown({
  value,
  onChange,
  options,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 pr-10 bg-theme-hover/50 backdrop-blur-sm border border-theme rounded-lg text-theme-text hover:border-theme-primary/50 hover:bg-theme-hover focus:ring-2 focus:ring-theme-primary focus:border-theme-primary focus-visible:outline-none transition-all cursor-pointer text-left flex items-center justify-between"
      >
        <span>{selectedOption?.label || value}</span>
        <ChevronDown
          className={`w-4 h-4 text-theme-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-theme-card border border-theme rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2.5 cursor-pointer transition-all duration-200 ${
                value === option.value
                  ? "bg-theme-hover text-white font-medium"
                  : "text-theme-text hover:bg-theme-primary hover:text-white"
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
