import React, { useState, useEffect, useMemo } from "react";
import { Vehicle, Transaction, Dealer, User, Notification } from "@/api/entities";
import VehicleCard from "../components/shared/VehicleCard";
import VehicleDetailPanel from "../components/shared/VehicleDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Filter, SlidersHorizontal, Heart, Share2, AlertCircle, Star, Loader2, Plus } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { SendEmail, InvokeLLM } from '@/api/integrations';
import ErrorBoundary from "../components/shared/ErrorBoundary";
import PermissionGuard from "../components/shared/PermissionGuard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { SecurityValidator } from "../components/shared/SecurityValidator";
import CustomerModeVehicleDetailPanel from "../components/dealshowcase/CustomerModeVehicleDetailPanel";
import { DataManager } from "../components/shared/DataManager";

export default function Marketplace() {
  const navigate = useNavigate();
  const location = useLocation();

  const [vehicles, setVehicles] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDealer, setCurrentDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  
  // Advanced Filters
  const [filters, setFilters] = useState({
    priceRange: [100000, 5000000],
    yearRange: [2010, new Date().getFullYear()],
    kmRange: [0, 200000],
    fuelTypes: [],
    transmissions: [],
    makes: [],
    verifiedOnly: false,
    dealerRating: 0,
    location: ""
  });
  
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [showMakeOfferModal, setShowMakeOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showCustomerModeModal, setShowCustomerModeModal] = useState(false);

  // Customer Mode State
  const [customerModeActive, setCustomerModeActive] = useState(false);
  const [customerModeTransaction, setCustomerModeTransaction] = useState(null);
  const [customerModeVehicle, setCustomerModeVehicle] = useState(null);

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');
    if (query) {
      setSearchTerm(query);
    }
  }, [location.search]);

  const loadMarketplaceData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[Marketplace] Loading marketplace data...');
      
      const user = await DataManager.getCurrentUser();
      if (!user) {
        console.log('[Marketplace] User not authenticated, redirecting to welcome');
        setCurrentUser(null);
        setCurrentDealer(null);
        navigate(createPageUrl('Welcome'));
        return;
      }
      
      console.log(`[Marketplace] User authenticated: ${user.email}`);
      setCurrentUser(user);
      
      const dealer = await DataManager.getDealerByUserEmail(user.email);
      if (!dealer) {
        console.log('[Marketplace] No dealer profile found, redirecting to onboarding');
        setCurrentDealer(null);
        navigate(createPageUrl('DealerOnboarding'));
        return;
      }
      
      console.log(`[Marketplace] Dealer found: ${dealer.business_name} (ID: ${dealer.id})`);
      setCurrentDealer(dealer);

      // Fetch current dealer's transactions
      const dealerTransactions = await DataManager.getTransactionsByDealer(dealer.id);
      setTransactions(dealerTransactions);
      console.log(`[Marketplace] Loaded ${dealerTransactions.length} transactions for dealer`);
      
      // Get live vehicles using DataManager, excluding current dealer's vehicles
      const allVehiclesData = await DataManager.getLiveVehicles(dealer.id, { 
        limit: 100, 
        sort: '-created_date' 
      });
      
      console.log(`[Marketplace] Loaded ${allVehiclesData.length} live vehicles`);
      setVehicles(allVehiclesData);
      
      const allDealersData = await Dealer.list();
      setDealers(allDealersData);
      
      if (allVehiclesData.length > 0) {
        setSelectedVehicleId(allVehiclesData[0].id);
      }
    } catch (error) {
      console.error('[Marketplace] Error loading marketplace data:', error);
      setError(error.message);
      setVehicles([]);
      setDealers([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Customer Mode Handler
  const handleEnterCustomerMode = (transaction, vehicle) => {
    console.log('[Marketplace] Entering Customer Mode for transaction:', transaction.id);
    setCustomerModeActive(true);
    setCustomerModeTransaction(transaction);
    setCustomerModeVehicle(vehicle);
    setShowCustomerModeModal(false);
  };

  // Exit Customer Mode Handler
  const handleExitCustomerMode = () => {
    console.log('[Marketplace] Exiting Customer Mode');
    setCustomerModeActive(false);
    setCustomerModeTransaction(null);
    setCustomerModeVehicle(null);
    loadMarketplaceData();
  };

  const handleMakeOffer = (vehicle) => {
    if (!currentDealer) {
      alert('You must have a complete dealer profile to make offers.');
      return;
    }

    if (currentDealer.id === vehicle.dealer_id) {
      alert('You cannot make an offer on your own vehicle.');
      return;
    }

    // Check if an existing offer exists for this vehicle from the current dealer
    const existingOffer = transactions.find(t =>
      t.buyer_id === currentDealer.id &&
      t.seller_id === vehicle.dealer_id &&
      t.vehicle_id === vehicle.id &&
      ['offer_made', 'negotiating', 'pending_customer_view', 'accepted'].includes(t.status)
    );

    setSelectedVehicle(vehicle);

    if (existingOffer && ['pending_customer_view', 'accepted'].includes(existingOffer.status)) {
      setShowCustomerModeModal(true);
      setCustomerModeTransaction(existingOffer);
      setCustomerModeVehicle(vehicle);
    } else {
      setShowMakeOfferModal(true);
    }
  };

  const sendOfferTransaction = async () => {
    if (!selectedVehicle || !selectedVehicle.id || !selectedVehicle.dealer_id) {
      alert('Cannot make an offer on this vehicle due to missing information.');
      return;
    }
    
    if (!currentDealer || !currentDealer.id) {
      alert('You must have a complete dealer profile to make offers.');
      return;
    }
    
    if (selectedVehicle.dealer_id === currentDealer.id) {
        alert("You cannot make an offer on your own vehicle.");
        return;
    }
    
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      alert('Please enter a valid offer amount');
      return;
    }

    try {
      const newTransaction = await Transaction.create({
        vehicle_id: selectedVehicle.id,
        seller_id: selectedVehicle.dealer_id,
        buyer_id: currentDealer.id,
        offer_amount: parseFloat(offerAmount) * 100000,
        status: 'offer_made',
        messages: [{
          sender_id: currentDealer.id,
          message: `Initial offer of ₹${offerAmount}L for your ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
          timestamp: new Date().toISOString()
        }]
      });
      
      await Vehicle.update(selectedVehicle.id, { status: 'in_transaction' });
      
      // Notification logic
      const sellerDealer = getDealerForVehicle(selectedVehicle);
      const allUsersData = await User.list(); 
      const sellerUser = allUsersData.find(u => u.email === sellerDealer?.created_by);
      
      if (sellerUser) {
        const notificationMessage = `${currentDealer.business_name} made an offer of ₹${offerAmount}L on your ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}.`;
        
        await Notification.create({
          user_email: sellerUser.email,
          message: notificationMessage,
          link: createPageUrl(`DealRoom?transactionId=${newTransaction.id}`),
          type: 'offer',
          icon: 'DollarSign'
        });

        await SendEmail({
          to: sellerUser.email,
          subject: `New Offer Received: ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
          body: `
            <p>Hi ${sellerDealer.business_name},</p>
            <p>${notificationMessage}</p>
            <p>You can review the offer and respond in the Deal Room.</p>
            <p><a href="${window.location.origin}${createPageUrl(`DealRoom?transactionId=${newTransaction.id}`)}">View Offer</a></p>
            <br/>
            <p>Regards,<br/>The Aura Team</p>
          `
        });
      }
      
      setShowMakeOfferModal(false);
      setOfferAmount("");
      setSelectedVehicle(null);
      
      await loadMarketplaceData(); 
      
      navigate(createPageUrl(`DealRoom?transactionId=${newTransaction.id}`));
      
    } catch (error) {
      console.error('Failed to make offer:', error);
      alert('Failed to make offer. The seller information may be invalid. Please try another vehicle. Error: ' + error.message);
    }
  };

  const getDealerForVehicle = (vehicle) => {
    if (!vehicle || !vehicle.dealer_id) return null;
    return dealers.find(d => d.id === vehicle.dealer_id);
  };

  const getFilteredVehicles = () => {
    if (loading) return [];
    
    let filtered = vehicles;

    if (currentDealer) {
        filtered = filtered.filter(vehicle => vehicle.dealer_id !== currentDealer.id);
    }
    
    filtered = filtered.filter(vehicle => {
      if (!vehicle) return false;
      
      const searchStr = `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      const price = vehicle.price || 0;
      const matchesPrice = price >= filters.priceRange[0] && price <= filters.priceRange[1];
      
      const year = vehicle.year || 0;
      const matchesYear = year >= filters.yearRange[0] && year <= filters.yearRange[1];
      
      const km = vehicle.kilometers || 0;
      const matchesKm = km >= filters.kmRange[0] && km <= filters.kmRange[1];
      
      const matchesFuel = filters.fuelTypes.length === 0 || filters.fuelTypes.includes(vehicle.fuel_type);
      
      const matchesTransmission = filters.transmissions.length === 0 || filters.transmissions.includes(vehicle.transmission);
      
      const matchesMake = filters.makes.length === 0 || filters.makes.includes(vehicle.make);
      
      const matchesVerified = !filters.verifiedOnly || vehicle.rc_verified;
      
      return matchesSearch && matchesPrice && matchesYear && matchesKm && 
             matchesFuel && matchesTransmission && matchesMake && matchesVerified;
    });

    switch (sortBy) {
      case "price_low": 
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0)); 
        break;
      case "price_high": 
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0)); 
        break;
      case "year_new": 
        filtered.sort((a, b) => (b.year || 0) - (a.year || 0)); 
        break;
      case "km_low": 
        filtered.sort((a, b) => (a.kilometers || 0) - (b.kilometers || 0)); 
        break;
      case "rating": 
        filtered.sort((a, b) => (b.inspection_score || 0) - (a.inspection_score || 0)); 
        break;
      case "newest":
      default: 
        filtered.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        break;
    }
    
    return filtered;
  };

  const clearAllFilters = () => {
    setFilters({
      priceRange: [100000, 5000000],
      yearRange: [2010, new Date().getFullYear()],
      kmRange: [0, 200000],
      fuelTypes: [],
      transmissions: [],
      makes: [],
      verifiedOnly: false,
      dealerRating: 0,
      location: ""
    });
    setSearchTerm("");
    setSelectedVehicleId(null);
  };

  const displayVehicles = getFilteredVehicles();
  const availableMakes = useMemo(() => {
    return [...new Set(vehicles.map(v => v?.make).filter(Boolean))].sort();
  }, [vehicles]);

  const existingTransactionsForSelectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return [];
    return transactions.filter(t => t.vehicle_id === selectedVehicleId);
  }, [selectedVehicleId, transactions]);

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading Marketplace..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-momentum-surface-0">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={loadMarketplaceData}>Retry</Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PermissionGuard requireDealer={true}>
        <div className="flex h-full">
          {customerModeActive ? (
            <div className="flex-1">
              <CustomerModeVehicleDetailPanel
                transaction={customerModeTransaction}
                vehicle={customerModeVehicle}
                currentDealer={currentDealer}
                onExitCustomerMode={handleExitCustomerMode}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="momentum-h1">Marketplace</h1>
                    <p className="momentum-body">
                      Browse {vehicles.filter(v => v && v.dealer_id !== currentDealer?.id).length} live vehicles from trusted dealers.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {!currentDealer && (
                      <Link to={createPageUrl('DealerOnboarding')}>
                        <Button className="momentum-btn-accent">
                          <Plus className="w-4 h-4 mr-2" />
                          Become a Dealer
                        </Button>
                      </Link>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Advanced Filters
                    </Button>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="price_low">Price: Low to High</SelectItem>
                        <SelectItem value="price_high">Price: High to Low</SelectItem>
                        <SelectItem value="year_new">Year: Newest First</SelectItem>
                        <SelectItem value="km_low">Mileage: Lowest First</SelectItem>
                        <SelectItem value="rating">Highest Rated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Search by make, model, or description"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-11 h-12 rounded-lg"
                    />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {(searchTerm || Object.values(filters).some(f => 
                      Array.isArray(f) ? f.length > 0 : (f !== false && f !== 0 && f !== "" && 
                      JSON.stringify(f) !== JSON.stringify([100000, 5000000]) &&
                      JSON.stringify(f) !== JSON.stringify([2010, new Date().getFullYear()]) &&
                      JSON.stringify(f) !== JSON.stringify([0, 200000]))
                    )) && (
                      <Button variant="ghost" onClick={clearAllFilters} className="text-sm">
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {showFilters && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Advanced Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Price Range: ₹{(filters.priceRange[0] / 100000).toFixed(1)}L - ₹{(filters.priceRange[1] / 100000).toFixed(1)}L
                          </label>
                          <Slider
                            value={filters.priceRange}
                            onValueChange={(value) => setFilters({...filters, priceRange: value})}
                            min={100000}
                            max={5000000}
                            step={50000}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Year Range: {filters.yearRange[0]} - {filters.yearRange[1]}
                          </label>
                          <Slider
                            value={filters.yearRange}
                            onValueChange={(value) => setFilters({...filters, yearRange: value})}
                            min={2005}
                            max={new Date().getFullYear()}
                            step={1}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Kilometers: {(filters.kmRange[0] / 1000).toFixed(0)}k - {(filters.kmRange[1] / 1000).toFixed(0)}k
                          </label>
                          <Slider
                            value={filters.kmRange}
                            onValueChange={(value) => setFilters({...filters, kmRange: value})}
                            min={0}
                            max={200000}
                            step={5000}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Makes</label>
                          <div className="max-h-32 overflow-y-auto space-y-2">
                            {availableMakes.slice(0, 8).map(make => (
                              <div key={make} className="flex items-center space-x-2">
                                <Checkbox
                                  id={make}
                                  checked={filters.makes.includes(make)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFilters({...filters, makes: [...filters.makes, make]});
                                    } else {
                                      setFilters({...filters, makes: filters.makes.filter(m => m !== make)});
                                    }
                                  }}
                                />
                                <label htmlFor={make} className="text-sm">{make}</label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Fuel Types</label>
                          <div className="space-y-2">
                            {['petrol', 'diesel', 'cng', 'electric', 'hybrid'].map(fuel => (
                              <div key={fuel} className="flex items-center space-x-2">
                                <Checkbox
                                  id={fuel}
                                  checked={filters.fuelTypes.includes(fuel)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFilters({...filters, fuelTypes: [...filters.fuelTypes, fuel]});
                                    } else {
                                      setFilters({...filters, fuelTypes: filters.fuelTypes.filter(f => f !== fuel)});
                                    }
                                  }}
                                />
                                <label htmlFor={fuel} className="text-sm capitalize">{fuel}</label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Additional</label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="verified"
                                checked={filters.verifiedOnly}
                                onCheckedChange={(checked) => setFilters({...filters, verifiedOnly: checked})}
                              />
                              <label htmlFor="verified" className="text-sm">Verified Only</label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {displayVehicles.length === 0 ? (
                  <div className="text-center py-12 momentum-card">
                    <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="momentum-h3 mb-2">No Vehicles Found</h3>
                    <p className="momentum-body">Try adjusting your filters or search terms.</p>
                    {(searchTerm || Object.values(filters).some(f => 
                      Array.isArray(f) ? f.length > 0 : (f !== false && f !== 0 && f !== "" &&
                      JSON.stringify(f) !== JSON.stringify([100000, 5000000]) &&
                      JSON.stringify(f) !== JSON.stringify([2010, new Date().getFullYear()]) &&
                      JSON.stringify(f) !== JSON.stringify([0, 200000]))
                    )) && (
                      <Button onClick={clearAllFilters} className="mt-4">
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-600">
                        Showing {displayVehicles.length} of {vehicles.filter(v => v && v.dealer_id !== currentDealer?.id).length} vehicles
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Heart className="w-4 h-4 mr-2" />
                          Save Search
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                      {displayVehicles.map((vehicle) => (
                        <VehicleCard
                          key={vehicle.id}
                          vehicle={vehicle}
                          dealer={getDealerForVehicle(vehicle)}
                          onClick={(v) => setSelectedVehicleId(v.id)}
                          isSelected={selectedVehicleId === vehicle.id}
                          showActions={true}
                          showCredibility={true}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="w-[400px] bg-momentum-surface-0 border-l border-momentum-surface-3 shrink-0 hidden lg:block">
                <VehicleDetailPanel
                  vehicleId={selectedVehicleId}
                  onMakeOffer={handleMakeOffer}
                  viewContext="marketplace"
                  currentDealer={currentDealer}
                  onEnterCustomerMode={handleEnterCustomerMode}
                  existingTransactionsForVehicle={existingTransactionsForSelectedVehicle}
                />
              </div>
            </>
          )}
        </div>

        <Dialog open={showMakeOfferModal} onOpenChange={setShowMakeOfferModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Make an Offer</DialogTitle>
              <DialogDescription>
                Make a competitive offer for this vehicle. The seller will be notified instantly.
              </DialogDescription>
            </DialogHeader>
            
            {selectedVehicle && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="font-medium">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Listed at: ₹{(selectedVehicle.price / 100000).toFixed(1)}L
                </div>
                {getDealerForVehicle(selectedVehicle) && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{getDealerForVehicle(selectedVehicle).business_name}</span>
                    <span>•</span>
                    <span>{(getDealerForVehicle(selectedVehicle).rating || 0).toFixed(1)} rating</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Offer Amount (in Lakhs)</label>
                <Input
                  type="number"
                  placeholder="e.g., 8.5"
                  step="0.1"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="text-lg"
                />
                {offerAmount && selectedVehicle && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      Total: ₹{(parseFloat(offerAmount) * 100000).toLocaleString()} 
                    </p>
                    {(() => {
                      if (selectedVehicle && offerAmount) {
                        const difference = selectedVehicle.price - (parseFloat(offerAmount) * 100000);
                        const percentageDiff = ((difference / selectedVehicle.price) * 100);
                        return (
                          <p className={`text-sm ${difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {difference > 0 ? `₹${(difference / 100000).toFixed(1)}L below` : `₹${(Math.abs(difference) / 100000).toFixed(1)}L above`} asking price ({percentageDiff.toFixed(1)}%)
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <strong>Tip:</strong> Fair offers are more likely to be accepted. Consider the vehicle's condition and market value.
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowMakeOfferModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={sendOfferTransaction}
                disabled={!offerAmount || parseFloat(offerAmount) <= 0}
                className="momentum-btn-accent"
              >
                Send Offer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCustomerModeModal} onOpenChange={setShowCustomerModeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enter Customer View</DialogTitle>
              <DialogDescription>
                You have an existing transaction for this vehicle. Do you want to enter the customer view for this transaction?
              </DialogDescription>
            </DialogHeader>
            {selectedVehicle && customerModeTransaction && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="font-medium">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Your last offer: ₹{(customerModeTransaction.offer_amount / 100000).toFixed(1)}L
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Status: {customerModeTransaction.status.replace(/_/g, ' ')}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCustomerModeModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleEnterCustomerMode(customerModeTransaction, selectedVehicle)}
                disabled={!customerModeTransaction || !selectedVehicle}
                className="momentum-btn-accent"
              >
                Enter Customer View
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </PermissionGuard>
    </ErrorBoundary>
  );
}