import React, { useEffect, useRef, useState } from 'react';

const MultiSelectDropdown = ({ label, options, selected, onToggle, lt, danger = false }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="dropdown-select" ref={wrapperRef}>
      <button
        type="button"
        className={`dropdown-trigger${open ? ' open' : ''}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label} ({selected.length})</span>
        <span className="dropdown-caret">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="dropdown-panel">
          {options.map((item) => {
            const checked = selected.includes(item.name);
            return (
              <div
                key={item.name}
                className={`dropdown-item${checked ? ' selected' : ''}${danger ? ' danger' : ''}`}
                onClick={() => onToggle(item.name)}
              >
                <span>
                  <span className="tool-name">{lt(item.name)}</span>
                  <span className="tool-category">{lt(item.category)}</span>
                </span>
                {checked && <span className="dropdown-check">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
