import React, { createContext, useContext, useState } from 'react';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [isNavigating, setIsNavigating] = useState(false);

  const setNavigationState = (navigating) => {
    setIsNavigating(navigating);
  };

  return (
    <NavigationContext.Provider value={{ isNavigating, setNavigationState }}>
      {children}
    </NavigationContext.Provider>
  );
};

