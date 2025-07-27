import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '@/api/supabaseClient';

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
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      setCurrentUser(userData.user);

      const { data: dealer, error: dealerErr } = await supabase
        .from('Dealer')
        .select('*')
        .eq('created_by', userData.user.email)
        .maybeSingle();
      if (dealerErr) throw dealerErr;
      setCurrentDealer(dealer);
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
