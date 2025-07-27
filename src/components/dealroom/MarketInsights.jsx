import React, { useState, useEffect } from 'react';
import supabase from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Info,
  DollarSign,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function MarketInsights({ vehicle, currentOfferAmount, listedPrice }) {
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (vehicle && vehicle.make && vehicle.model && vehicle.year) {
      fetchMarketData();
    }
  }, [vehicle]);

  const fetchMarketData = async () => {
    if (!vehicle) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Query for similar vehicles that have been sold
      const { data: soldVehicles, error } = await supabase
        .from('Vehicle')
        .select('*')
        .match({
          make: vehicle.make,
          model: vehicle.model,
          status: 'sold'
        });
      if (error) throw error;

      // Filter by similar year range (±2 years)
      const yearRange = 2;
      const similarVehicles = soldVehicles.filter(v => 
        v.year >= (vehicle.year - yearRange) && 
        v.year <= (vehicle.year + yearRange) &&
        v.price && v.price > 0
      );

      if (similarVehicles.length === 0) {
        setMarketData({
          averagePrice: null,
          totalSimilarSales: 0,
          priceRange: { min: 0, max: 0 },
          confidence: 'low'
        });
        return;
      }

      // Calculate market statistics
      const prices = similarVehicles.map(v => v.price);
      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Determine confidence level based on sample size
      let confidence = 'low';
      if (similarVehicles.length >= 5) confidence = 'medium';
      if (similarVehicles.length >= 10) confidence = 'high';

      setMarketData({
        averagePrice: Math.round(averagePrice),
        totalSimilarSales: similarVehicles.length,
        priceRange: { min: minPrice, max: maxPrice },
        confidence,
        yearRange: `${vehicle.year - yearRange}-${vehicle.year + yearRange}`
      });

    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('Unable to load market data');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `₹${(price / 100000).toFixed(1)}L`;
  };

  const getOfferAnalysis = () => {
    if (!marketData || !marketData.averagePrice || !currentOfferAmount) return null;

    const offerPrice = parseFloat(currentOfferAmount) * 100000;
    const difference = offerPrice - marketData.averagePrice;
    const percentage = ((difference / marketData.averagePrice) * 100);

    return {
      difference: Math.abs(difference),
      percentage: Math.abs(percentage),
      isAboveMarket: difference > 0,
      isSignificant: Math.abs(percentage) > 10
    };
  };

  const getListedPriceAnalysis = () => {
    if (!marketData || !marketData.averagePrice || !listedPrice) return null;

    const difference = listedPrice - marketData.averagePrice;
    const percentage = ((difference / marketData.averagePrice) * 100);

    return {
      difference: Math.abs(difference),
      percentage: Math.abs(percentage),
      isAboveMarket: difference > 0,
      isSignificant: Math.abs(percentage) > 10
    };
  };

  const offerAnalysis = getOfferAnalysis();
  const listedAnalysis = getListedPriceAnalysis();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-gray-600">Analyzing market data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!marketData || marketData.totalSimilarSales === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium">Limited Market Data</p>
            <p className="text-xs text-gray-400 mt-1">
              No recent sales found for {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceBadge = (confidence) => {
    const configs = {
      low: { color: 'bg-red-100 text-red-800', text: 'Low Confidence' },
      medium: { color: 'bg-yellow-100 text-yellow-800', text: 'Medium Confidence' },
      high: { color: 'bg-green-100 text-green-800', text: 'High Confidence' }
    };
    
    const config = configs[confidence] || configs.low;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Market Insights
          {getConfidenceBadge(marketData.confidence)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Average */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Market Average</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {formatPrice(marketData.averagePrice)}
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Based on {marketData.totalSimilarSales} sales ({marketData.yearRange})
          </div>
        </div>

        {/* Price Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Lowest Sale</div>
            <div className="font-semibold text-gray-900">
              {formatPrice(marketData.priceRange.min)}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Highest Sale</div>
            <div className="font-semibold text-gray-900">
              {formatPrice(marketData.priceRange.max)}
            </div>
          </div>
        </div>

        {/* Listed Price Analysis */}
        {listedAnalysis && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-2">Listed Price Analysis</h4>
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              listedAnalysis.isAboveMarket ? 'bg-red-50' : 'bg-green-50'
            }`}>
              {listedAnalysis.isAboveMarket ? (
                <TrendingUp className="w-4 h-4 text-red-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-600" />
              )}
              <div className="text-sm">
                <span className={listedAnalysis.isAboveMarket ? 'text-red-800' : 'text-green-800'}>
                  {formatPrice(listedAnalysis.difference)} {listedAnalysis.isAboveMarket ? 'above' : 'below'} market avg
                </span>
                <span className="text-gray-600 ml-1">
                  ({listedAnalysis.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Current Offer Analysis */}
        {offerAnalysis && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-2">Current Offer Analysis</h4>
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              offerAnalysis.isAboveMarket ? 'bg-green-50' : 'bg-orange-50'
            }`}>
              {offerAnalysis.isAboveMarket ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-orange-600" />
              )}
              <div className="text-sm">
                <span className={offerAnalysis.isAboveMarket ? 'text-green-800' : 'text-orange-800'}>
                  {formatPrice(offerAnalysis.difference)} {offerAnalysis.isAboveMarket ? 'above' : 'below'} market avg
                </span>
                <span className="text-gray-600 ml-1">
                  ({offerAnalysis.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Insight Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Market insights are based on historical sales data of similar vehicles. 
            Actual market conditions may vary based on vehicle condition, location, and current demand.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
