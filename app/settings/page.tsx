
import React, { useState, useEffect } from 'react';
import { User, Dealer } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Link from "next/link";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { SendEmail } from '@/api/integrations';
import { User as UserIcon, Bell, Shield, BookOpen, Eye, Calculator } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Settings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    email_offers: true,
    email_deals: true,
    email_marketing: false,
  });

  // Customer Mode Settings State
  const [customerModeSettings, setCustomerModeSettings] = useState({
    default_desired_margin_percentage: '',
    default_minimum_margin_percentage: '',
  });
  const [pinSettings, setPinSettings] = useState({
    newPin: '',
    confirmPin: '',
    showPinSetup: false,
  });
  const [pinErrors, setPinErrors] = useState({});
  const [customerModeError, setCustomerModeError] = useState('');
  const [customerModeSuccess, setCustomerModeSuccess] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const dealers = await Dealer.filter({ created_by: user.email });
      if (dealers.length > 0) {
        const currentDealer = dealers[0];
        setDealer(currentDealer);
        
        // Load Customer Mode settings
        setCustomerModeSettings({
          default_desired_margin_percentage: currentDealer.default_desired_margin_percentage || '',
          default_minimum_margin_percentage: currentDealer.default_minimum_margin_percentage || '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = async (key, value) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    
    // Mock notification update - in real app this would update user preferences
    if (value && key === 'email_offers') {
      try {
        await SendEmail({
          to: currentUser.email,
          subject: 'Notification Preferences Updated',
          body: `Hi ${currentUser.full_name}, you will now receive email notifications for new offers.`
        });
      } catch (error) {
        console.error('Failed to send confirmation email:', error);
      }
    }
  };

  // Customer Mode Settings Handlers
  const handleCustomerModeSettingsChange = (field, value) => {
    setCustomerModeSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setCustomerModeError('');
    setCustomerModeSuccess('');
  };

  const validateCustomerModeSettings = () => {
    const { default_desired_margin_percentage, default_minimum_margin_percentage } = customerModeSettings;
    
    // Convert to number for validation, but keep as string in state for input control
    const desired = parseFloat(default_desired_margin_percentage);
    const minimum = parseFloat(default_minimum_margin_percentage);

    if (isNaN(desired) || desired <= 0) {
      setCustomerModeError('Desired margin percentage must be a positive number.');
      return false;
    }
    
    if (isNaN(minimum) || minimum <= 0) {
      setCustomerModeError('Minimum margin percentage must be a positive number.');
      return false;
    }
    
    if (minimum > desired) {
      setCustomerModeError('Minimum margin cannot be greater than desired margin.');
      return false;
    }
    
    return true;
  };

  const saveCustomerModeSettings = async () => {
    if (!validateCustomerModeSettings()) return;
    
    setSaving(true);
    setCustomerModeError('');
    setCustomerModeSuccess('');
    
    try {
      const updateData = {
        ...dealer, // Spread existing dealer data to ensure all fields are present for validation
        default_desired_margin_percentage: parseFloat(customerModeSettings.default_desired_margin_percentage),
        default_minimum_margin_percentage: parseFloat(customerModeSettings.default_minimum_margin_percentage),
        business_type: dealer.business_type || 'sole_proprietorship',
        city: dealer.city || 'Not Provided',
        state: dealer.state || 'Not Provided',
        address: dealer.address || 'Not Provided',
        phone: dealer.phone || '0000000000',
      };
      await Dealer.update(dealer.id, updateData);
      
      setCustomerModeSuccess('Customer Mode settings saved successfully!');
      
      // Reload dealer data to reflect changes
      await loadUserData();
    } catch (error) {
      console.error('Error saving Customer Mode settings:', error);
      setCustomerModeError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // PIN Management Handlers
  const validatePin = () => {
    const errors = {};
    const { newPin, confirmPin } = pinSettings;
    
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      errors.newPin = 'PIN must be exactly 4 digits';
    }
    
    if (newPin !== confirmPin) {
      errors.confirmPin = 'PINs do not match';
    }
    
    setPinErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const hashPin = async (pin) => {
    // Simple client-side hashing using crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const setupPin = async () => {
    if (!validatePin()) return;
    
    setSaving(true);
    setCustomerModeError('');
    setCustomerModeSuccess('');
    
    try {
      const hashedPin = await hashPin(pinSettings.newPin);
      
      const updateData = {
        ...dealer, // Spread existing dealer data to ensure all fields are present for validation
        private_view_pin_hash: hashedPin,
        pin_setup_required: false,
        business_type: dealer.business_type || 'sole_proprietorship',
        city: dealer.city || 'Not Provided',
        state: dealer.state || 'Not Provided',
        address: dealer.address || 'Not Provided',
        phone: dealer.phone || '0000000000',
      };
      await Dealer.update(dealer.id, updateData);
      
      setPinSettings({
        newPin: '',
        confirmPin: '',
        showPinSetup: false,
      });
      setPinErrors({});
      setCustomerModeSuccess('Private view PIN set successfully!');
      
      // Reload dealer data
      await loadUserData();
    } catch (error) {
      console.error('Error setting PIN:', error);
      setCustomerModeError('Failed to set PIN. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetPin = () => {
    setPinSettings({
      newPin: '',
      confirmPin: '',
      showPinSetup: true,
    });
    setPinErrors({});
    setCustomerModeError('');
    setCustomerModeSuccess('');
  };

  const getVerificationStatusBadge = (status) => {
    const statusConfig = {
      provisional: { color: 'bg-yellow-100 text-yellow-800', text: 'Provisional' },
      in_review: { color: 'bg-blue-100 text-blue-800', text: 'Under Review' },
      verified: { color: 'bg-green-100 text-green-800', text: 'Verified' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig.provisional;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex h-full p-8">
        <div className="animate-pulse w-full max-w-4xl mx-auto space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <div className="mb-8">
            <h1 className="momentum-h1">Settings</h1>
            <p className="momentum-body">Manage your account and preferences.</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="verification" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Verification
              </TabsTrigger>
              <TabsTrigger value="customer-mode" className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Customer Mode
              </TabsTrigger>
              <TabsTrigger value="help" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Help
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal and business details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name</label>
                      <Input value={currentUser?.full_name || ''} disabled />
                      <p className="text-xs text-gray-500 mt-1">Managed by your Google account</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <Input value={currentUser?.email || ''} disabled />
                      <p className="text-xs text-gray-500 mt-1">Managed by your Google account</p>
                    </div>
                  </div>
                  
                  {dealer && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">Business Name</label>
                          <Input value={dealer.business_name || ''} disabled />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Phone</label>
                          <Input value={dealer.phone || ''} disabled />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Business Address</label>
                        <Input value={dealer.address || 'Not provided'} disabled />
                      </div>
                      
                      <div className="pt-4 border-t">
                        <p className="momentum-small text-gray-600">
                          To update your business information, please complete the verification process.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to be notified about important updates.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Offer Notifications</div>
                        <div className="momentum-small text-gray-600">Get notified when you receive new offers</div>
                      </div>
                      <Switch 
                        checked={notifications.email_offers}
                        onCheckedChange={(checked) => handleNotificationChange('email_offers', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Deal Updates</div>
                        <div className="momentum-small text-gray-600">Get notified about deal status changes</div>
                      </div>
                      <Switch 
                        checked={notifications.email_deals}
                        onCheckedChange={(checked) => handleNotificationChange('email_deals', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Marketing Updates</div>
                        <div className="momentum-small text-gray-600">Receive news and promotional content</div>
                      </div>
                      <Switch 
                        checked={notifications.email_marketing}
                        onCheckedChange={(checked) => handleNotificationChange('email_marketing', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification">
              <Card>
                <CardHeader>
                  <CardTitle>Business Verification</CardTitle>
                  <CardDescription>Complete your verification to unlock all features.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Verification Status</div>
                      <div className="momentum-small text-gray-600">Current status of your business verification</div>
                    </div>
                    {dealer && getVerificationStatusBadge(dealer.verification_status)}
                  </div>
                  
                  {dealer?.verification_status === 'provisional' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="font-medium text-yellow-800 mb-2">Action Required</div>
                      <p className="text-sm text-yellow-700 mb-4">
                        Complete your business verification to unlock all platform features including advanced analytics and priority support.
                      </p>
                      <Link href={createPageUrl('OnboardingWizard')}>
                        <Button className="momentum-btn-accent">
                          Complete Verification
                        </Button>
                      </Link>
                    </div>
                  )}
                  
                  {dealer?.verification_status === 'in_review' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="font-medium text-blue-800 mb-2">Under Review</div>
                      <p className="text-sm text-blue-700">
                        Your verification documents are being reviewed. We'll notify you once the process is complete. This typically takes 1-2 business days.
                      </p>
                    </div>
                  )}
                  
                  {dealer?.verification_status === 'verified' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="font-medium text-green-800 mb-2">Verification Complete</div>
                      <p className="text-sm text-green-700">
                        Your business is fully verified. You have access to all platform features.
                      </p>
                    </div>
                  )}
                  
                  {dealer?.verification_status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="font-medium text-red-800 mb-2">Verification Rejected</div>
                      <p className="text-sm text-red-700 mb-4">
                        Your verification was rejected. Please review and resubmit your documents.
                      </p>
                      <Link href={createPageUrl('OnboardingWizard')}>
                        <Button variant="outline">
                          Resubmit Documents
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* NEW: Customer Mode Tab */}
            <TabsContent value="customer-mode">
              <div className="space-y-6">
                {/* Default Margin Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Default Margin Settings
                    </CardTitle>
                    <CardDescription>
                      Set your default desired and minimum margin percentages for Customer Mode. These will be pre-filled when you activate Customer Mode for any vehicle.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {customerModeError && (
                      <Alert className="bg-red-50 border-red-200 text-red-600">
                        <AlertDescription>{customerModeError}</AlertDescription>
                      </Alert>
                    )}
                    
                    {customerModeSuccess && (
                      <Alert className="bg-green-50 border-green-200 text-green-600">
                        <AlertDescription>{customerModeSuccess}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Default Desired Margin (%)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 10"
                          min="0"
                          step="0.1"
                          value={customerModeSettings.default_desired_margin_percentage}
                          onChange={(e) => handleCustomerModeSettingsChange('default_desired_margin_percentage', e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This will be your starting price when showing vehicles to customers
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Default Minimum Margin (%)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 5"
                          min="0"
                          step="0.1"
                          value={customerModeSettings.default_minimum_margin_percentage}
                          onChange={(e) => handleCustomerModeSettingsChange('default_minimum_margin_percentage', e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Your absolute minimum profit margin (walk-away price)
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={saveCustomerModeSettings}
                        disabled={saving}
                        className="momentum-btn-primary"
                      >
                        {saving ? 'Saving...' : 'Save Default Settings'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Private View PIN Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Private View PIN
                    </CardTitle>
                    <CardDescription>
                      Set a 4-digit PIN to securely access your private margin calculations during customer presentations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {dealer?.private_view_pin_hash && !dealer?.pin_setup_required ? ( // PIN is set
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="font-medium text-green-800 mb-2">PIN Already Set</div>
                        <p className="text-sm text-green-700 mb-4">
                          Your private view PIN is configured and ready to use in Customer Mode.
                        </p>
                        <Button 
                          onClick={resetPin}
                          variant="outline"
                        >
                          Reset PIN
                        </Button>
                      </div>
                    ) : ( // PIN is not set or setup is required
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="font-medium text-yellow-800 mb-2">PIN Setup Required</div>
                        <p className="text-sm text-yellow-700 mb-4">
                          You need to set up a private view PIN to use Customer Mode securely.
                        </p>
                        <Button 
                          onClick={() => setPinSettings(prev => ({ ...prev, showPinSetup: true }))}
                          className="momentum-btn-accent"
                        >
                          Set Up PIN
                        </Button>
                      </div>
                    )}

                    {pinSettings.showPinSetup && (
                      <div className="border rounded-lg p-4 space-y-4">
                        <h4 className="font-medium">Set New PIN</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              New PIN (4 digits)
                            </label>
                            <Input
                              type="password"
                              placeholder="••••"
                              maxLength="4"
                              value={pinSettings.newPin}
                              onChange={(e) => setPinSettings(prev => ({ ...prev, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                            />
                            {pinErrors.newPin && (
                              <p className="text-xs text-red-600 mt-1">{pinErrors.newPin}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Confirm PIN
                            </label>
                            <Input
                              type="password"
                              placeholder="••••"
                              maxLength="4"
                              value={pinSettings.confirmPin}
                              onChange={(e) => setPinSettings(prev => ({ ...prev, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                            />
                            {pinErrors.confirmPin && (
                              <p className="text-xs text-red-600 mt-1">{pinErrors.confirmPin}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button 
                            onClick={setupPin}
                            disabled={saving}
                            className="momentum-btn-primary"
                          >
                            {saving ? 'Setting PIN...' : 'Set PIN'}
                          </Button>
                          <Button 
                            onClick={() => setPinSettings(prev => ({ ...prev, showPinSetup: false, newPin: '', confirmPin: '' }))}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Mode Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>About Customer Mode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="momentum-body mb-4">
                      Customer Mode allows you to present vehicles to your customers with complete transparency. 
                      Your customers will see the exact breakdown of costs including the original seller's price, 
                      logistics costs, platform fees, and your service margin.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="font-medium text-blue-800 mb-2">Benefits of Transparency</div>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Build instant trust with your customers</li>
                        <li>• Position yourself as a transparent partner, not just a middleman</li>
                        <li>• Negotiate on service value rather than hidden markups</li>
                        <li>• Differentiate from traditional dealers</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Help Tab */}
            <TabsContent value="help">
              <Card>
                <CardHeader>
                  <CardTitle>Help & Support</CardTitle>
                  <CardDescription>Find answers to your questions or get in touch with our team.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="font-medium text-blue-800 mb-2">Visit our Help Center</div>
                    <p className="text-sm text-blue-700 mb-4">
                      Browse our frequently asked questions to get instant answers on how to use the platform, manage deals, and more.
                    </p>
                    <Link href={createPageUrl('Help')}>
                      <Button className="momentum-btn-primary">
                        Go to Help Center
                      </Button>
                    </Link>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="font-medium text-green-800 mb-2">Submit Feedback</div>
                    <p className="text-sm text-green-700">
                      Have a feature request or found a bug? We'd love to hear from you. Use the feedback button in the main sidebar to send us your thoughts directly.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
