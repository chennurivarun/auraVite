import React, { useState, useEffect } from 'react';
import { Vehicle, Dealer } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Fuel,
  Settings,
  MapPin,
  Phone,
  Star,
  Shield,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Heart,
  Share2,
  Eye,
  Loader2,
  Users,
  Image,
  RotateCcw,
  Wand2
} from 'lucide-react';
import CustomerModeSetupModal from '../dealshowcase/CustomerModeSetupModal';
import ImageProcessingControls from './ImageProcessingControls';
import { DataManager } from './DataManager';

export default function VehicleDetailPanel({ 
  vehicleId, 
  onMakeOffer, 
  viewContext = "general",
  currentDealer = null,
  onEnterCustomerMode = null,
  existingTransactionsForVehicle = []
}) {
  const [vehicle, setVehicle] = useState(null);
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCustomerModeModal, setShowCustomerModeModal] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (vehicleId) {
      loadVehicleDetails();
    } else {
      setVehicle(null);
      setDealer(null);
      setError(null);
      setLoading(false);
    }
  }, [vehicleId]);

  const loadVehicleDetails = async () => {
    if (!vehicleId) return;

    setLoading(true);
    setError(null);
    try {
      const vehicleData = await Vehicle.get(vehicleId);

      if (vehicleData) {
        setVehicle(vehicleData);

        if (vehicleData.dealer_id) {
          const dealerData = await Dealer.get(vehicleData.dealer_id);
          setDealer(dealerData);
        } else {
          setDealer(null);
        }
      } else {
        setError("Vehicle not found.");
        setVehicle(null);
      }
    } catch (err) {
      console.error('Error loading vehicle details:', err);
      setError("Could not load vehicle details. Please try again.");
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerModeSetup = (transaction) => {
    console.log('[VehicleDetailPanel] Customer Mode setup complete for transaction:', transaction.id);
    
    if (onEnterCustomerMode) {
      onEnterCustomerMode(transaction, vehicle);
    }
  };

  const handleProcessingUpdate = (vehicleId, type) => {
    console.log(`[VehicleDetailPanel] Processing update for vehicle ${vehicleId}, type: ${type}`);
    // Reload vehicle details to get updated processing status
    loadVehicleDetails();
  };

  const canShowToCustomer = () => {
    // Check if current dealer exists and is verified
    if (!currentDealer || currentDealer.verification_status !== 'verified') {
      return false;
    }

    // Must not be your own vehicle
    if (vehicle && currentDealer.id === vehicle.dealer_id) {
      return false;
    }

    // Vehicle must be live
    if (!vehicle || vehicle.status !== 'live') {
      return false;
    }

    // Check if there's an existing relevant transaction
    const hasExistingOffer = existingTransactionsForVehicle.some(t =>
      t.buyer_id === currentDealer.id &&
      t.seller_id === vehicle.dealer_id &&
      t.vehicle_id === vehicle.id &&
      ['offer_made', 'negotiating', 'pending_customer_view', 'accepted'].includes(t.status)
    );

    return hasExistingOffer;
  };

  const isOwnVehicle = () => {
    return vehicle && currentDealer && vehicle.dealer_id === currentDealer.id;
  };

  const hasProcessedImages = vehicle?.processed_image_urls && vehicle.processed_image_urls.length > 0;
  const has360View = vehicle?.['360_view_url'];

  // Determine which images to show: processed or original
  const displayImages = hasProcessedImages ? vehicle.processed_image_urls : (vehicle?.image_urls || []);

  if (!vehicleId) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Eye className="w-16 h-16 text-gray-300" />
          <h3 className="momentum-h3 text-gray-600">No Vehicle Selected</h3>
          <p className="momentum-body text-gray-500 max-w-xs">
            Select a vehicle from the list to view its details, see dealer information, and make offers.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-lg text-gray-600">Loading Details...</span>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
         <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-16 h-16 text-red-400" />
            <h3 className="momentum-h3 text-red-700">Unable to Load Vehicle</h3>
            <p className="momentum-body text-gray-600 max-w-xs">
              {error || "The selected vehicle could not be found."} Please try selecting another vehicle or refresh the page.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
         </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusColors = {
      draft: "bg-gray-100 text-gray-800",
      live: "bg-green-100 text-green-800",
      in_transaction: "bg-blue-100 text-blue-800",
      sold: "bg-purple-100 text-purple-800"
    };

    return (
      <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatPrice = (price) => {
    if (!price) return 'Price not set';
    return `₹${(price / 100000).toFixed(1)}L`;
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header - vehicle title, badges, price, kilometers */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="momentum-h2 mb-1">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(vehicle.status)}
                {vehicle.rc_verified && (
                  <Badge className="bg-blue-100 text-blue-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {hasProcessedImages && (
                  <Badge className="bg-purple-100 text-purple-800">
                    <Wand2 className="w-3 h-3 mr-1" />
                    AI Enhanced
                  </Badge>
                )}
                {has360View && (
                  <Badge className="bg-cyan-100 text-cyan-800">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    360° View
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="momentum-h2 text-blue-600">
                {formatPrice(vehicle.price)}
              </div>
              {vehicle.kilometers && (
                <div className="momentum-small text-gray-600">
                  {vehicle.kilometers.toLocaleString()} km
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content - tabbed interface for better organization */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="media">Media & 360°</TabsTrigger>
              {isOwnVehicle() && <TabsTrigger value="enhance">AI Enhance</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline">
                  <Heart className="w-4 h-4 mr-2" /> 
                  Wishlist
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4 mr-2" /> 
                  Share
                </Button>
              </div>

              {/* Customer Mode Button - Enhanced Logic */}
              {canShowToCustomer() && (
                <div className="mb-4">
                  <Button
                    onClick={() => setShowCustomerModeModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    size="lg"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Show to Customer
                  </Button>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Present this vehicle professionally to your walk-in customers
                  </p>
                </div>
              )}

              {/* Offer Button */}
              {viewContext === 'marketplace' && onMakeOffer && vehicle && vehicle.dealer_id !== currentDealer?.id && (
                  <Button
                      onClick={() => onMakeOffer(vehicle)}
                      className="w-full momentum-btn-accent mb-4"
                      size="lg"
                  >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Make an Offer
                  </Button>
              )}
              {viewContext === 'marketplace' && currentDealer && vehicle && vehicle.dealer_id === currentDealer.id && (
                  <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                          This is your own listing.
                      </AlertDescription>
                  </Alert>
              )}

              {/* Vehicle Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vehicle Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="momentum-small">{vehicle.year}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-gray-500" />
                      <span className="momentum-small capitalize">{vehicle.fuel_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-gray-500" />
                      <span className="momentum-small capitalize">{vehicle.transmission}</span>
                    </div>
                    {vehicle.color && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                        <span className="momentum-small">{vehicle.color}</span>
                      </div>
                    )}
                  </div>

                  {vehicle.description && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="momentum-small text-gray-600">
                          {vehicle.description}
                        </p>
                      </div>
                    </>
                  )}

                  {vehicle.inspection_score > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Inspection Score</h4>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="momentum-small">{vehicle.inspection_score}/100</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Seller Information */}
              {dealer ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Seller Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-semibold text-base mb-2">{dealer.business_name}</div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="momentum-small">{dealer.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="momentum-small">{dealer.phone}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold">{(dealer.rating || 0).toFixed(1)}</span>
                        <span className="text-xs text-gray-500">Rating</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="font-bold">{dealer.completed_deals || 0}</span>
                        <span className="text-xs text-gray-500">Deals</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-red-600">Seller information is currently unavailable.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="media" className="space-y-4 mt-4">
              {/* Main Image or 360 View */}
              {has360View ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RotateCcw className="w-5 h-5" />
                      360° Interactive View
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <iframe
                        src={vehicle['360_view_url']}
                        className="w-full h-full border-0"
                        title="360° Vehicle View"
                        allowFullScreen
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : displayImages.length > 0 ? (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={displayImages[0]}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No photos available</p>
                  </div>
                </div>
              )}

              {/* Additional Images Gallery */}
              {displayImages.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      {hasProcessedImages ? 'AI Enhanced Photos' : 'More Photos'}
                      {hasProcessedImages && (
                        <Badge className="bg-purple-100 text-purple-800">
                          <Wand2 className="w-3 h-3 mr-1" />
                          Processed
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {displayImages.slice(1, 5).map((url, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden">
                          <img
                            src={url}
                            alt={`${vehicle.make} ${vehicle.model} - ${index + 2}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    {displayImages.length > 5 && (
                      <p className="momentum-small text-gray-600 mt-2 text-center">
                        +{displayImages.length - 5} more photos
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Original vs Enhanced Toggle */}
              {hasProcessedImages && vehicle.image_urls && vehicle.image_urls.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>View Original Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {vehicle.image_urls.slice(0, 4).map((url, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden">
                          <img
                            src={url}
                            alt={`${vehicle.make} ${vehicle.model} - Original ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {isOwnVehicle() && (
              <TabsContent value="enhance" className="space-y-4 mt-4">
                <ImageProcessingControls 
                  vehicle={vehicle} 
                  onProcessingUpdate={handleProcessingUpdate}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Customer Mode Setup Modal */}
      {vehicle && currentDealer && (
        <CustomerModeSetupModal
            vehicle={vehicle}
            currentDealer={currentDealer}
            isOpen={showCustomerModeModal}
            onClose={() => setShowCustomerModeModal(false)}
            onEnterCustomerMode={handleCustomerModeSetup}
        />
      )}
    </>
  );
}