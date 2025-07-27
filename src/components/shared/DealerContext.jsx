import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Dealer } from '@/api/entities';

const DealerContext = createContext();

export const useDealerContext = () => {
  const context = useContext(DealerContext);
  if (!context) {
    throw new Error('useDealerContext must be used within a DealerProvider');
  }
  return context;
};

export const DealerProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDealer, setCurrentDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDealerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      // Correctly fetch dealer using user email
      const dealerData = await Dealer.filter({ created_by: user.email });
      
      if (dealerData.length > 0) {
        setCurrentDealer(dealerData[0]);
      } else {
        setCurrentDealer(null);
      }
    } catch (err) {
      console.error('Error loading dealer data:', err);
      setError(err.message);
      setCurrentUser(null);
      setCurrentDealer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealerData();
  }, []);

  const value = {
    currentUser,
    currentDealer,
    loading,
    error,
    refreshDealer: loadDealerData
  };

  return (
    <DealerContext.Provider value={value}>
      {children}
    </DealerContext.Provider>
  );
};
