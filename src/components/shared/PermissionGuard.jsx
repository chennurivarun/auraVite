import React, { useState, useEffect } from 'react';
import { User, Dealer } from '@/api/entities';
import { Shield, AlertTriangle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function PermissionGuard({ 
  children, 
  requireVerification = false,
  requireDealer = true,
  fallback = null 
}) {
  const [user, setUser] = useState(null);
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (requireDealer) {
        const dealers = await Dealer.filter({ created_by: currentUser.email });
        if (dealers.length === 0) {
          setError('Dealer profile required');
          return;
        }
        
        const currentDealer = dealers[0];
        setDealer(currentDealer);

        if (requireVerification && currentDealer.verification_status !== 'verified') {
          setError('Business verification required');
          return;
        }
      }
    } catch (err) {
      setError('Authentication required');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Checking permissions..." />;
  }

  if (error) {
    if (fallback) {
      return fallback;
    }

    return (
      <div className="flex h-screen w-full items-center justify-center bg-momentum-surface-1">
        <div className="text-center max-w-md p-8">
          <Shield className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="momentum-h2 text-gray-700 mb-2">Access Restricted</h2>
          <p className="momentum-body text-gray-600">
            {error === 'Authentication required' && 'Please log in to access this feature.'}
            {error === 'Dealer profile required' && 'A dealer profile is required to access this feature.'}
            {error === 'Business verification required' && 'Please complete business verification to access this feature.'}
          </p>
        </div>
      </div>
    );
  }

  return children;
}
