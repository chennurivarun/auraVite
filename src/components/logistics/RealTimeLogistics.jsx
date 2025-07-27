import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Route, 
  Shield,
  Star,
  RefreshCw,
  Calculator,
  AlertCircle
} from 'lucide-react';
import { LogisticsPartner } from '@/api/entities';
import { DataManager } from '../shared/DataManager';

export default function RealTimeLogistics({ 
  transaction, 
  vehicle, 
  seller, 
  buyer, 
  onQuoteUpdate 
}) {
  const [loading, setLoading] = useState(true);
  const [logisticsPartners, setLogisticsPartners] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLogisticsPartners();
    calculateRealTimeQuotes();
  }, []);

  const loadLogisticsPartners = async () => {
    try {
      const partners = await LogisticsPartner.list();
      setLogisticsPartners(partners.filter(p => p.is_active));
    } catch (error) {
      console.error('Failed to load logistics partners:', error);
      setError('Failed to load logistics partners');
    }
  };

  const calculateDistance = (origin, destination) => {
    // Simulate distance calculation based on city/state
    // In real implementation, this would use Google Maps Distance Matrix API
    const originState = origin?.state?.toLowerCase() || '';
    const destState = destination?.state?.toLowerCase() || '';
    const originCity = origin?.city?.toLowerCase() || '';
    const destCity = destination?.city?.toLowerCase() || '';

    if (originState === destState) {
      if (originCity === destCity) {
        return 15 + Math.random() * 25; // 15-40 km for same city
      }
      return 150 + Math.random() * 200; // 150-350 km for same state
    }
    return 400 + Math.random() * 800; // 400-1200 km for different states
  };

  const calculateRealTimeQuotes = async () => {
    setCalculating(true);
    setError(null);

    try {
      if (!seller || !buyer) {
        throw new Error('Seller or buyer information missing');
      }

      const distance = calculateDistance(seller, buyer);
      const vehicleValue = vehicle?.price || 0;
      const isLuxury = vehicleValue > 2000000; // > 20L considered luxury
      const isInterstate = seller?.state !== buyer?.state;

      const calculatedQuotes = logisticsPartners.map(partner => {
        let baseRate = partner.base_rate_per_km * distance;
        let finalRate = Math.max(baseRate, partner.minimum_charge);

        // Apply multipliers
        if (isInterstate) {
          finalRate *= partner.pricing_multipliers?.interstate || 1.5;
        }
        if (isLuxury) {
          finalRate *= partner.pricing_multipliers?.luxury_vehicle || 1.3;
        }

        // Insurance cost
        let insuranceCost = 0;
        if (partner.insurance_included) {
          insuranceCost = (vehicleValue * (partner.insurance_rate_percent || 0.5)) / 100;
          finalRate += insuranceCost;
        }

        return {
          partnerId: partner.id,
          partnerName: partner.partner_name,
          totalCost: Math.round(finalRate),
          baseCost: Math.round(baseRate),
          insuranceCost: Math.round(insuranceCost),
          distance: Math.round(distance),
          estimatedDays: partner.average_delivery_days + (isInterstate ? 1 : 0),
          rating: partner.rating || 4.0,
          totalDeliveries: partner.total_deliveries || 0,
          insuranceIncluded: partner.insurance_included,
          contactPerson: partner.contact_person,
          phone: partner.phone,
          features: [
            partner.insurance_included ? 'Insurance Included' : 'Insurance Optional',
            isInterstate ? 'Interstate Service' : 'Intrastate Service',
            partner.rating >= 4.5 ? 'Top Rated' : 'Good Rating',
            partner.total_deliveries > 1000 ? 'Experienced' : 'Reliable'
          ]
        };
      });

      // Sort by total cost
      calculatedQuotes.sort((a, b) => a.totalCost - b.totalCost);
      setQuotes(calculatedQuotes);

      // Auto-select the most economical option
      if (calculatedQuotes.length > 0) {
        setSelectedQuote(calculatedQuotes[0]);
        if (onQuoteUpdate) {
          onQuoteUpdate(calculatedQuotes[0]);
        }
      }

    } catch (error) {
      console.error('Failed to calculate logistics quotes:', error);
      setError(error.message);
    } finally {
      setCalculating(false);
      setLoading(false);
    }
  };

  const handleQuoteSelection = (quote) => {
    setSelectedQuote(quote);
    if (onQuoteUpdate) {
      onQuoteUpdate(quote);
    }
  };

  const getDeliveryTimeText = (days) => {
    if (days <= 2) return `${days} day${days > 1 ? 's' : ''} (Express)`;
    if (days <= 4) return `${days} days (Standard)`;
    return `${days} days (Economy)`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            <span>Calculating real-time logistics quotes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={calculateRealTimeQuotes}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Route Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Transport Route
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <MapPin className="w-5 h-5 text-green-600" />
                <div className="w-px h-8 bg-gray-300 my-1"></div>
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-2">
                <div>
                  <div className="font-medium">{seller?.city || 'Origin'}, {seller?.state || 'State'}</div>
                  <div className="text-sm text-gray-600">{seller?.business_name}</div>
                </div>
                <div>
                  <div className="font-medium">{buyer?.city || 'Destination'}, {buyer?.state || 'State'}</div>
                  <div className="text-sm text-gray-600">{buyer?.business_name}</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Estimated Distance</div>
              <div className="font-bold text-lg">{selectedQuote?.distance || 0} km</div>
              <div className="text-sm text-gray-600">
                {seller?.state !== buyer?.state ? 'Interstate' : 'Intrastate'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logistics Quotes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Real-Time Logistics Quotes
              </CardTitle>
              <CardDescription>
                Live pricing from verified transport partners
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={calculateRealTimeQuotes}
              disabled={calculating}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
              Refresh Quotes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quotes.map((quote, index) => (
              <div
                key={quote.partnerId}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedQuote?.partnerId === quote.partnerId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleQuoteSelection(quote)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{quote.partnerName}</h4>
                      {index === 0 && (
                        <Badge className="bg-green-100 text-green-800">Best Price</Badge>
                      )}
                      {quote.rating >= 4.5 && (
                        <Badge className="bg-yellow-100 text-yellow-800">Top Rated</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Contact Person</div>
                        <div className="font-medium">{quote.contactPerson}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Phone</div>
                        <div className="font-medium">{quote.phone}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Delivery Time</div>
                        <div className="font-medium">{getDeliveryTimeText(quote.estimatedDays)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Rating</div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{quote.rating.toFixed(1)}</span>
                          <span className="text-gray-500">({quote.totalDeliveries})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {quote.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{quote.totalCost.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      ₹{Math.round(quote.totalCost / quote.distance)}/km
                    </div>
                    {quote.insuranceCost > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        Insurance: ₹{quote.insuranceCost.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {quotes.length === 0 && !calculating && (
            <div className="text-center py-8 text-gray-500">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No logistics partners available for this route.</p>
              <Button 
                variant="outline" 
                onClick={calculateRealTimeQuotes}
                className="mt-2"
              >
                Retry Quote Calculation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Quote Summary */}
      {selectedQuote && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Selected Transport Quote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-blue-800">{selectedQuote.partnerName}</h4>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{selectedQuote.totalCost.toLocaleString()}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-blue-700">Distance</div>
                  <div className="font-medium">{selectedQuote.distance} km</div>
                </div>
                <div>
                  <div className="text-blue-700">Delivery Time</div>
                  <div className="font-medium">{getDeliveryTimeText(selectedQuote.estimatedDays)}</div>
                </div>
                <div>
                  <div className="text-blue-700">Insurance</div>
                  <div className="font-medium">
                    {selectedQuote.insuranceIncluded ? 'Included' : 'Optional'}
                  </div>
                </div>
              </div>

              {selectedQuote.insuranceCost > 0 && (
                <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-700">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Vehicle insured up to ₹{(vehicle?.price || 0).toLocaleString()} during transport
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
