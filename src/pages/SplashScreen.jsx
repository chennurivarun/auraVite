import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Dealer } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const routeUser = async () => {
      try {
        const user = await User.me();
        
        const dealerData = await Dealer.filter({ created_by: user.email });

        if (dealerData.length === 0) {
          navigate(createPageUrl('DealerOnboarding'));
        } else {
          navigate(createPageUrl('Dashboard'));
        }
      } catch (error) {
        navigate(createPageUrl('Welcome'));
      }
    };

    const timer = setTimeout(routeUser, 1500); 
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 transition-opacity duration-500">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
        <span className="text-white font-bold text-5xl">A</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Aura</h1>
      <p className="text-lg text-gray-300 mb-10">The Future of Auto Trading</p>
      <div className="flex items-center gap-3 text-white">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading Your Workspace...</span>
      </div>
    </div>
  );
}