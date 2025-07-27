
import React, { useState, useEffect, useMemo } from "react";
import VehicleCard from "../components/shared/VehicleCard";
import VehicleDetailPanel from "../components/shared/VehicleDetailPanel";
import { Button } from "@/components/ui/button";
import { Search, Plus, TrendingUp, DollarSign, Car, Handshake, AlertTriangle, Clock, CheckSquare, PartyPopper, Shield, Users, Activity, Settings, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from "@/components/ui/input";
import ErrorBoundary from "../components/shared/ErrorBoundary";
import PermissionGuard from "../components/shared/PermissionGuard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { DataManager } from "../components/shared/DataManager";
import { SecurityValidator } from "../components/shared/SecurityValidator";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDealer, setCurrentDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[Dashboard] Loading dashboard data...');
      
      // Setup platform admin for whitedevil1309@gmail.com if needed
      await DataManager.setupPlatformAdmin();
      
      // Get current user
      const user = await DataManager.getCurrentUser();
      if (!user) {
        console.log('[Dashboard] User not authenticated, redirecting to welcome');
        navigate(createPageUrl('Welcome'));
        return;
      }
      
      console.log(`[Dashboard] User authenticated: ${user.email} ${user.platform_admin ? '(Admin)' : ''}`);
      setCurrentUser(user);
      
      // Get dealer profile
      const dealer = await DataManager.getDealerByUserEmail(user.email);
      if (!dealer && !user.platform_admin) {
        console.log('[Dashboard] No dealer profile found, redirecting to onboarding');
        navigate(createPageUrl('DealerOnboarding'));
        return;
      }
      
      if (dealer) {
        console.log(`[Dashboard] Dealer found: ${dealer.business_name} (ID: ${dealer.id})`);
        setCurrentDealer(dealer);

        if (dealer.verification_status === 'verified') {
          console.log('[Dashboard] Dealer is verified, loading full dashboard data');
          
          // Load dashboard data using DataManager
          const dashboardData = await DataManager.getDashboardData(dealer.id);
          
          console.log(`[Dashboard] Loaded ${dashboardData.vehicles.length} vehicles and ${dashboardData.transactions.length} transactions`);
          
          setVehicles(dashboardData.vehicles);
          setTransactions(dashboardData.transactions);
          
          if (dashboardData.vehicles.length > 0) {
            setSelectedVehicleId(dashboardData.vehicles[0].id);
          }
        } else {
          console.log(`[Dashboard] Dealer verification status: ${dealer.verification_status}`);
          setVehicles([]);
          setTransactions([]);
        }
      } else if (user.platform_admin) {
        // Platform admin without dealer profile - show admin dashboard
        console.log('[Dashboard] Platform admin detected, showing admin view');
        setCurrentDealer(null);
        setVehicles([]);
        setTransactions([]);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartSearch = (e) => {
    e.preventDefault();
    const sanitizedSearch = SecurityValidator.sanitizeInput(searchTerm);
    if (sanitizedSearch.trim()) {
      navigate(createPageUrl(`Marketplace?query=${encodeURIComponent(sanitizedSearch)}`));
    }
  };

  const stats = useMemo(() => {
    const totalInventory = vehicles.length;
    const liveListings = vehicles.filter(v => v.status === 'live').length;
    const inTransaction = vehicles.filter(v => v.status === 'in_transaction').length;
    const soldThisMonth = vehicles.filter(v => 
      v.status === 'sold' && 
      v.date_sold && 
      new Date(v.date_sold).getMonth() === new Date().getMonth()
    ).length;

    const pendingPayments = transactions.filter(t => 
      t.seller_id === currentDealer?.id && 
      t.escrow_status === 'paid' && 
      t.status === 'in_escrow'
    ).length;

    return { totalInventory, liveListings, inTransaction, soldThisMonth, pendingPayments };
  }, [vehicles, transactions, currentDealer]);

  const salesData = useMemo(() => {
    return [
      { month: 'Jan', sales: 4 },
      { month: 'Feb', sales: 7 },
      { month: 'Mar', sales: 12 },
      { month: 'Apr', sales: 8 },
      { month: 'May', sales: 15 },
      { month: 'Jun', sales: 10 },
    ];
  }, []);

  const agingInventory = useMemo(() => {
    return vehicles
      .filter(v => v.days_in_stock > 30)
      .slice(0, 5);
  }, [vehicles]);

  const actionItems = useMemo(() => {
    const items = [];
    
    if (currentDealer && currentDealer.verification_status === 'provisional') {
      items.push({
        id: 'verification',
        title: 'Complete Business Verification',
        description: 'Unlock all features by completing your KYC process',
        action: 'Start Verification',
        link: createPageUrl('OnboardingWizard'),
        urgent: true
      });
    }

    const draftVehicles = vehicles.filter(v => v.status === 'draft').length;
    if (draftVehicles > 0) {
      items.push({
        id: 'drafts',
        title: `${draftVehicles} Draft Listings`,
        description: 'Publish your draft listings to start receiving offers',
        action: 'View Drafts',
        link: createPageUrl('Inventory'),
        urgent: false
      });
    }

    const pendingOffers = transactions.filter(t => 
      t.seller_id === currentDealer?.id && 
      t.status === 'offer_made'
    ).length;
    if (pendingOffers > 0) {
      items.push({
        id: 'offers',
        title: `${pendingOffers} Pending Offers`,
        description: 'Review and respond to incoming offers',
        action: 'View Offers',
        link: createPageUrl('Transactions'),
        urgent: true
      });
    }

    const pendingPayments = transactions.filter(t => 
      t.seller_id === currentDealer?.id && 
      t.escrow_status === 'paid' && 
      t.status === 'in_escrow'
    ).length;
    if (pendingPayments > 0) {
      items.push({
        id: 'payments',
        title: `${pendingPayments} Payment${pendingPayments > 1 ? 's' : ''} Ready`,
        description: 'Funds in escrow waiting for your confirmation to release',
        action: 'Release Funds',
        link: createPageUrl('Transactions'),
        urgent: true
      });
    }

    return items;
  }, [currentDealer, vehicles, transactions]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      return `${vehicle.make} ${vehicle.model} ${vehicle.year}`.toLowerCase()
        .includes(searchTerm.toLowerCase());
    });
  }, [vehicles, searchTerm]);

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading Dashboard..." />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="momentum-h3 text-red-700 mb-2">Error Loading Dashboard</h3>
          <p className="momentum-body text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="momentum-btn-primary">
            Reload Page
          </Button>
        </div>
      </div>
    );
  }
  
  if (!currentDealer && currentUser && !currentUser.platform_admin) {
    return <LoadingSpinner fullScreen text="Loading Dealer Profile..." />;
  }

  // Platform Admin Dashboard View
  if (currentUser?.platform_admin && !currentDealer) {
    return (
      <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="momentum-h1 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Platform Administrator Dashboard
            </h1>
            <p className="momentum-body">
              Welcome back, {currentUser.full_name || currentUser.email}. Manage the entire platform from here.
            </p>
          </div>
          <Link href={createPageUrl("PlatformAdmin")}>
            <Button className="momentum-btn-accent">
              <Shield className="w-4 h-4 mr-2" />
              Admin Panel
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="momentum-card p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">Admin</div>
                <div className="momentum-small">Platform Access</div>
              </div>
            </div>
          </Card>
          
          <Card className="momentum-card p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">Active</div>
                <div className="momentum-small">System Status</div>
              </div>
            </div>
          </Card>
          
          <Card className="momentum-card p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">System</div>
                <div className="momentum-small">Configuration</div>
              </div>
            </div>
          </Card>
          
          <Card className="momentum-card p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">Reports</div>
                <div className="momentum-small">Analytics</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="momentum-card p-6">
            <h3 className="momentum-h3 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href={createPageUrl("PlatformAdmin")} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  User Management & Permissions
                </Button>
              </Link>
              <Link href={createPageUrl("Analytics")} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Platform Analytics
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Settings className="w-4 h-4 mr-2" />
                System Configuration
              </Button>
            </div>
          </Card>

          <Card className="momentum-card p-6">
            <h3 className="momentum-h3 mb-4">Platform Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="momentum-body">System Health</span>
                <Badge className="bg-green-100 text-green-800">Operational</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="momentum-body">User Permissions</span>
                <Badge className="bg-blue-100 text-blue-800">Managed</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="momentum-body">Margin System</span>
                <Badge className="bg-purple-100 text-purple-800">Dynamic</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const isVerified = currentDealer.verification_status === 'verified';
  const hasNoVehicles = vehicles.length === 0;

  if (!isVerified) {
    return (
      <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="momentum-h1">Welcome, {currentDealer.business_name}</h1>
            <p className="momentum-body">
              Your account is {currentDealer.verification_status}. Complete verification to unlock trading.
            </p>
          </div>
        </div>
        
        {currentDealer.verification_status === 'provisional' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-r-lg shadow-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-yellow-800">
                  Complete Your Business Verification
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Unlock all features including making offers, selling vehicles, and accessing analytics by completing your business verification.
                  </p>
                </div>
                <div className="mt-4">
                  <Link href={createPageUrl("OnboardingWizard")}>
                    <Button className="momentum-btn-accent">
                      Start Verification
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentDealer.verification_status === 'in_review' && (
           <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6 rounded-r-lg shadow-md">
             <h3 className="text-lg font-medium text-blue-800">Verification in Review</h3>
            <p className="text-sm text-blue-700 mt-2">
              Your verification details are under review. We will notify you once the process is complete (typically within 2 business days).
            </p>
          </div>
        )}

        <div className="mt-8">
          <h2 className="momentum-h2 mb-4">Explore the Marketplace (Read-Only)</h2>
          <p className="momentum-body mb-6">
            You can browse the national inventory while your verification is pending.
          </p>
          <Link href={createPageUrl('Marketplace')}>
            <Button variant="outline" size="lg">
              Browse Live Vehicles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PermissionGuard requireDealer={true}>
        <div className="flex h-full">
          <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="momentum-h1">Dashboard</h1>
                <p className="momentum-body">
                  Welcome back, {currentDealer.business_name}. Here's your business overview.
                </p>
              </div>
              <Link href={createPageUrl("ListingWizard")}>
                <Button className="momentum-btn-accent">
                  <Plus className="w-4 h-4 mr-2" />
                  List Vehicle
                </Button>
              </Link>
            </div>

            {/* Smart Search Bar */}
            <div className="mb-8">
              <form onSubmit={handleSmartSearch}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Find a car for your customer... (e.g., '2022 white SUV with sunroof')"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 text-base rounded-lg shadow-sm"
                  />
                  <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 momentum-btn-primary">
                    Find Match
                  </Button>
                </div>
              </form>
            </div>

            {isVerified && hasNoVehicles ? (
              <div className="text-center py-12 momentum-card mb-8 bg-gradient-to-br from-blue-50 to-indigo-50">
                <PartyPopper className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="momentum-h2 mb-2 text-gray-800">Welcome to the Driver's Seat, {currentDealer.business_name}!</h3>
                <p className="momentum-body mb-8 max-w-2xl mx-auto">You're fully verified and ready to trade. Your dashboard will come alive with stats and analytics as you transact. <br/>What would you like to do first?</p>
                <div className="flex justify-center items-center gap-4 flex-wrap">
                  <Link href={createPageUrl("ListingWizard")}>
                    <Button className="momentum-btn-accent" size="lg">
                      <Plus className="w-5 h-5 mr-2" /> List Your First Vehicle
                    </Button>
                  </Link>
                  <div className="text-gray-500 font-semibold">OR</div>
                  <Link href={createPageUrl("Marketplace")}>
                    <Button variant="outline" size="lg" className="bg-white">
                      <Search className="w-5 h-5 mr-2" /> Find a Car for a Customer
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="momentum-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Car className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stats.totalInventory}</div>
                        <div className="momentum-small">Total Inventory</div>
                      </div>
                    </div>
                  </div>
                  <div className="momentum-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stats.liveListings}</div>
                        <div className="momentum-small">Live Listings</div>
                      </div>
                    </div>
                  </div>
                  <div className="momentum-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Handshake className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stats.inTransaction}</div>
                        <div className="momentum-small">In Transaction</div>
                      </div>
                    </div>
                  </div>
                  <div className="momentum-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stats.soldThisMonth}</div>
                        <div className="momentum-small">Sold This Month</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                  <div className="lg:col-span-2">
                    <div className="momentum-card p-6">
                      <h3 className="momentum-h3 mb-4">Sales Performance</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="sales" stroke="#0066CC" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="momentum-card p-6">
                    <h3 className="momentum-h3 mb-4 flex items-center gap-2">
                      <CheckSquare className="w-5 h-5" />
                      Action Required
                    </h3>
                    <div className="space-y-3">
                      {actionItems.length === 0 ? (
                        <p className="momentum-small text-gray-500">All caught up! 🎉</p>
                      ) : (
                        actionItems.map(item => (
                          <div key={item.id} className={`p-3 rounded-lg border ${item.urgent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-gray-600 mb-2">{item.description}</div>
                            <Link href={item.link}>
                              <Button size="sm" variant={item.urgent ? 'default' : 'outline'} className="text-xs">
                                {item.action}
                              </Button>
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h2 className="momentum-h2 mb-4">Recent Listings</h2>
                    {filteredVehicles.length === 0 ? (
                      <div className="text-center py-12 momentum-card">
                        <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="momentum-h3 mb-2">No vehicles yet</h3>
                        <p className="momentum-body mb-6">Your listed vehicles will appear here.</p>
                        <Link href={createPageUrl("ListingWizard")}>
                          <Button className="momentum-btn-accent">
                            <Plus className="w-4 h-4 mr-2" />
                            List Your First Vehicle
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredVehicles.slice(0, 3).map(vehicle => (
                          <VehicleCard
                            key={vehicle.id}
                            vehicle={vehicle}
                            onClick={(v) => setSelectedVehicleId(v.id)}
                            isSelected={selectedVehicleId === vehicle.id}
                            size="compact"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="momentum-h2 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Aging Inventory
                    </h2>
                    <div className="momentum-card">
                      {agingInventory.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="momentum-small text-gray-500">No aging inventory</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {agingInventory.map(vehicle => (
                            <div key={vehicle.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedVehicleId(vehicle.id)}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                                  <div className="momentum-small text-gray-600">₹{(vehicle.price / 100000).toFixed(1)}L</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-orange-600">{vehicle.days_in_stock} days</div>
                                  <div className="momentum-small text-gray-500">in stock</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-[400px] bg-momentum-surface-0 border-l border-momentum-surface-3 shrink-0 hidden lg:block">
            <VehicleDetailPanel
              vehicleId={selectedVehicleId}
              onMakeOffer={(vehicle) => console.log('Make offer for:', vehicle)}
            />
          </div>
        </div>
      </PermissionGuard>
    </ErrorBoundary>
  );
}
