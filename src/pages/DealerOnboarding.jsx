
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User } from '@/api/entities'; // Keep User for fetching current user
import * as DataManager from '@/data/DataManager'; // Import DataManager for profile creation and notifications

export default function DealerOnboarding() {
  const navigate = useNavigate();

  // State to manage form data
  const [formData, setFormData] = useState({
    business_name: '',
    phone: '',
    business_type: '',
    address: '',
    city: '',
    state: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // State for displaying error messages
  const [currentUser, setCurrentUser] = useState(null); // State to hold the current logged-in user

  // Business types for the dropdown
  const businessTypes = [
    { value: '', label: 'Select Business Type' },
    { value: 'individual', label: 'Individual' },
    { value: 'proprietorship', label: 'Proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'private_limited', label: 'Private Limited Company' },
    { value: 'public_limited', label: 'Public Limited Company' },
    // Add other types as needed
  ];

  // Fetch current user on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.getCurrentUser(); // Assuming User.getCurrentUser() fetches the logged-in user
        if (user && user.email) {
          setCurrentUser(user);
        } else {
          // If no user or email, redirect to login or show an error
          console.warn('No current user found or user email missing. Redirecting to login.');
          navigate(createPageUrl('Login')); // Redirect to login page
        }
      } catch (err) {
        console.error('Failed to fetch current user:', err);
        setError('Failed to load user data. Please try logging in again.');
        navigate(createPageUrl('Login')); // Redirect on error fetching user
      }
    };
    fetchUser();
  }, [navigate]); // Dependency array includes navigate to ensure stability

  // Generic handler for form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear any previous error messages when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // Clear previous errors

    // Ensure currentUser is loaded before proceeding with profile creation
    if (!currentUser || !currentUser.email) {
      setError('User not logged in or email unavailable. Please refresh or log in again.');
      setLoading(false);
      return;
    }

    try {
      // Validate required fields
      if (!formData.business_name?.trim()) {
        throw new Error('Business name is required');
      }
      if (!formData.phone?.trim()) {
        throw new Error('Phone number is required');
      }
      if (!formData.business_type) {
        throw new Error('Business type is required');
      }
      if (!formData.address?.trim()) {
        throw new Error('Address is required');
      }
      if (!formData.city?.trim()) {
        throw new Error('City is required');
      }
      if (!formData.state?.trim()) {
        throw new Error('State is required');
      }

      console.log('[DealerOnboarding] Creating dealer profile with data:', formData);
      
      // Create dealer profile using DataManager
      const newDealer = await DataManager.createDealerProfile(formData, currentUser.email);
      
      console.log('[DealerOnboarding] Dealer profile created:', newDealer.id);
      
      // Create welcome notification
      await DataManager.createNotification({
        user_email: currentUser.email,
        type: 'verification',
        title: 'Welcome to Aura!',
        message: 'Your dealer profile has been created. Complete your verification to start trading.',
        link: createPageUrl('OnboardingWizard'),
        priority: 'high'
      });

      // Navigate to dashboard after successful profile creation
      navigate(createPageUrl('Dashboard'));

    } catch (error) {
      console.error('[DealerOnboarding] Error creating dealer profile:', error);
      
      // More specific error messages based on the error received
      let errorMessage = error.message;
      if (error.message.includes('Validation failed')) {
        errorMessage = 'Please check your input data and try again.';
      } else if (error.message.includes('phone')) {
        errorMessage = 'Please enter a valid Indian phone number (10 digits).';
      } else if (error.message.includes('email')) { 
        errorMessage = 'Please enter a valid email address.';
      } else {
        errorMessage = 'Profile creation failed. Please try again.'; // Generic fallback error
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Render a loading state while user data is being fetched
  if (!currentUser && !error) {
    return (
        <div className="relative min-h-screen bg-gray-900 flex items-center justify-center">
            <p className="text-white text-lg">Loading user data...</p>
        </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-900 flex items-center justify-center p-4">
       <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1617546899413-5f85c1a748c8?q=80&w=1935&auto=format&fit=crop)',
          filter: 'brightness(0.4)',
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg p-8 md:p-12 rounded-2xl shadow-2xl border border-white/20">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-3xl font-bold text-white text-center mb-2">Welcome to Momentum!</h1>
          <p className="text-gray-200 text-center mb-8">Let's set up your dealer profile.</p>
          <form onSubmit={handleSubmit} className="space-y-6"> {/* Form submission handled by handleSubmit */}
            <Input
              type="text"
              name="business_name" // Name attribute for handleChange
              placeholder="Business Name"
              value={formData.business_name}
              onChange={handleChange}
              className="h-12 bg-white/20 text-white placeholder:text-gray-300 border-white/30"
              required
            />
            <Input
              type="tel"
              name="phone" // Name attribute for handleChange
              placeholder="Business Mobile Number"
              value={formData.phone}
              onChange={handleChange}
              className="h-12 bg-white/20 text-white placeholder:text-gray-300 border-white/30"
              required
            />
            {/* Dropdown for Business Type */}
            <select
                name="business_type" // Name attribute for handleChange
                value={formData.business_type}
                onChange={handleChange}
                className="w-full h-12 bg-white/20 text-white placeholder:text-gray-300 border border-white/30 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                required
            >
                {businessTypes.map((type) => (
                    <option key={type.value} value={type.value} className="bg-gray-800 text-white">
                        {type.label}
                    </option>
                ))}
            </select>
            {/* Input for Business Address */}
            <Input
              type="text"
              name="address" // Name attribute for handleChange
              placeholder="Business Address"
              value={formData.address}
              onChange={handleChange}
              className="h-12 bg-white/20 text-white placeholder:text-gray-300 border-white/30"
              required
            />
            {/* Input for City */}
            <Input
              type="text"
              name="city" // Name attribute for handleChange
              placeholder="City"
              value={formData.city}
              onChange={handleChange}
              className="h-12 bg-white/20 text-white placeholder:text-gray-300 border-white/30"
              required
            />
            {/* Input for State */}
            <Input
              type="text"
              name="state" // Name attribute for handleChange
              placeholder="State"
              value={formData.state}
              onChange={handleChange}
              className="h-12 bg-white/20 text-white placeholder:text-gray-300 border-white/30"
              required
            />

            {error && ( // Display error message if present
              <p className="text-red-400 text-center text-sm">{error}</p>
            )}

            <Button type="submit" className="w-full h-12 text-lg momentum-btn-accent" disabled={loading}>
              {loading ? 'Creating Profile...' : 'Complete Setup'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
