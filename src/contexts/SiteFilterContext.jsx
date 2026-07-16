import React, { createContext, useState, useContext } from 'react';

const SiteFilterContext = createContext();

export const useSiteFilter = () => useContext(SiteFilterContext);

export const SiteFilterProvider = ({ children }) => {
  const [siteFilter, setSiteFilter] = useState('');

  return (
    <SiteFilterContext.Provider value={{ siteFilter, setSiteFilter }}>
      {children}
    </SiteFilterContext.Provider>
  );
};
