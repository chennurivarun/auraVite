import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Calendar,
  Fuel,
  Settings,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  Lock,
  BarChart2,
  Tag,
  Car,
  Truck,
  Building,
  TrendingUp,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PINPadModal from '../shared/PINPadModal';
import LazyImage from '../shared/LazyImage';
import { DataManager } from '../shared/DataManager';

export default function CustomerModeVehicleDetailPanel({
  transaction,
  vehicle,
  currentDealer,
  onExitCustomerMode
}) {
  const [isPrivateViewUnlocked, setIsPrivateViewUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [privateData, setPrivateData] = useState({ 
    minimum_margin_amount: null, 
    final_floor_price: null 
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formatPrice = (price) => {
    if (price === null || typeof price === 'undefined' || isNaN(price)) return 'N/A';
    return `₹${(price / 100000).toFixed(2)} Lakh`;
  };

  const handlePinSubmit = async (pin) => {
    setPinError('');
    try {
      // Call the DataManager function to verify PIN and get private data
      const data = await DataManager.verifyPinAndGetPrivatePricing(transaction.id, pin);
      setPrivateData(data);
      setIsPrivateViewUnlocked(true);
      setShowPinModal(false);
    } catch (error) {
      setPinError(error.message || 'Verification failed.');
    }
  };

  const togglePrivateView = () => {
    if (isPrivateViewUnlocked) {
      setIsPrivateViewUnlocked(false);
      setPrivateData({ minimum_margin_amount: null, final_floor_price: null });
    } else {
      setShowPinModal(true);
    }
  };

  const handleFinalizeDeal = async () => {
    try {
      setLoading(true);
      const updatedTransaction = await DataManager.finalizeTransactionForCustomer(
        transaction.id,
        transaction.showroom_price
      );
      
      // Navigate to the Deal Room for this transaction
      navigate(createPageUrl(`DealRoom?transactionId=${updatedTransaction.id}`));
    } catch (error) {
      console.error("Failed to finalize deal:", error);
      alert("Failed to finalize deal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!transaction || !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Vehicle Data
            </h3>
            <p className="text-gray-600">
              Unable to load vehicle information for customer presentation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Exit Button */}
      <div className="bg-white border-b shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentDealer?.business_name || 'Auto Dealership'}
              </h1>
              <p className="text-sm text-gray-600">Professional Vehicle Presentation</p>
            </div>
          </div>
          <Button variant="outline" onClick={onExitCustomerMode} className="flex items-center gap-2">
            <X className="w-4 h-4" />
            Exit Customer View
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Dealer's Private Info Strip */}
        <div className="w-full bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg mb-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Your Private Negotiation Zone</h3>
              <p className="text-sm text-yellow-700">
                Click the eye icon to {isPrivateViewUnlocked ? 'hide' : 'view'} your floor price
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm">Your Floor Price</div>
              <div className="font-bold text-lg">
                {isPrivateViewUnlocked ? formatPrice(privateData.final_floor_price) : '****'}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePrivateView}
              className="text-yellow-800 hover:text-yellow-900 hover:bg-yellow-200"
            >
              {isPrivateViewUnlocked ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vehicle Information */}
          <div className="space-y-6">
            {/* Vehicle Image */}
            <Card className="overflow-hidden shadow-lg">
              <div className="aspect-video relative">
                <LazyImage
                  src={vehicle.image_urls?.[0] || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800'}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                  fallback={
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-100">
                      <Car className="w-16 h-16 mb-2" />
                      <span>Vehicle Image</span>
                    </div>
                  }
                />
                {vehicle.rc_verified && vehicle.inspection_score >= 85 && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-100 text-green-800 shadow-md">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Certified
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Vehicle Details */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>Year: {vehicle.year}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-gray-500" />
                    <span className="capitalize">Fuel: {vehicle.fuel_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span className="capitalize">Transmission: {vehicle.transmission}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-gray-500" />
                    <span>Kilometers: {vehicle.kilometers?.toLocaleString() || 'N/A'} km</span>
                  </div>
                </div>

                {vehicle.description && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-gray-600">{vehicle.description}</p>
                    </div>
                  </>
                )}

                {vehicle.features && vehicle.features.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Key Features</h4>
                      <div className="flex flex-wrap gap-2">
                        {vehicle.features.slice(0, 6).map(feature => (
                          <Badge key={feature} variant="secondary">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {vehicle.inspection_score > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="font-medium">Inspection Score: {vehicle.inspection_score}/100</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pricing Information */}
          <div className="space-y-6">
            {/* Main Price Display */}
            <Card className="shadow-lg border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Tag className="w-5 h-5" />
                  Total Showroom Price
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {formatPrice(transaction.showroom_price)}
                  </div>
                  <p className="text-gray-600">
                    Transparent pricing with complete breakdown below
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Price Breakdown */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Transparent Price Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-gray-500" />
                      Vehicle Base Price
                    </span>
                    <span className="font-semibold">{formatPrice(transaction.offer_amount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-gray-500" />
                      Transportation Cost
                    </span>
                    <span className="font-semibold">{formatPrice(transaction.estimated_logistics_cost)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      Platform & Processing Fee
                    </span>
                    <span className="font-semibold">{formatPrice(transaction.platform_fee)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
                      Our Service Margin
                    </span>
                    <span className="font-semibold">{formatPrice(transaction.desired_margin_amount)}</span>
                  </div>

                  <Separator />
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Showroom Price</span>
                    <span className="text-blue-600">{formatPrice(transaction.showroom_price)}</span>
                  </div>

                  {/* Private View for Dealer */}
                  {isPrivateViewUnlocked && privateData.minimum_margin_amount !== null && (
                    <>
                      <Separator />
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-yellow-800 flex items-center gap-1">
                            <Lock className="w-3 h-3"/> Your Minimum Margin:
                          </span>
                          <span className="font-bold text-yellow-900">
                            {formatPrice(privateData.minimum_margin_amount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-800 flex items-center gap-1">
                            <Lock className="w-3 h-3"/> Your Floor Price:
                          </span>
                          <span className="font-bold text-yellow-900">
                            {formatPrice(privateData.final_floor_price)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="lg" 
                        className="w-full text-lg bg-green-600 hover:bg-green-700"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Finalize Deal'
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deal Finalization</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to finalize this deal for {formatPrice(transaction.showroom_price)}? 
                          This will update the transaction status and move to the next phase.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleFinalizeDeal} disabled={loading}>
                          Confirm Finalize
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            {/* Trust Indicators */}
            <Card className="shadow-lg bg-gray-50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Why Choose Us</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Transparent pricing with no hidden charges</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Professional vehicle inspection and certification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Complete documentation and RTO transfer support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Secure payment processing and buyer protection</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      <PINPadModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmitPin={handlePinSubmit}
        error={pinError}
      />
    </div>
  );
}