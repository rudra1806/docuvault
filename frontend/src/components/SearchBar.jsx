// ============================================================
// components/SearchBar.jsx — Search Input (Midnight Vault)
// ============================================================

import { useState, useEffect, useRef } from "react";

const SearchBar = ({ onSearch, placeholder = "Search documents..." }) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      onSearch(query);
    }, 400);

    return () => clearTimeout(debounceTimer.current);
  }, [query, onSearch]);

  return (
    <div className={`relative transition-all duration-300 ${focused ? 'glow-amber' : ''}`} style={{ borderRadius: '0.75rem' }}>
      {/* Search Icon */}
      <svg
        className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
          focused ? 'text-primary-400' : 'text-muted-400'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      {/* Search Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="input-field pl-12 pr-10"
      />

      {/* Clear Button */}
      {query && (
        <button
          onClick={() => setQuery("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-400 hover:text-primary-400 transition-colors duration-200 p-1 rounded-md hover:bg-primary-500/10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
