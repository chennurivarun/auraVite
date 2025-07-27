import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calculator, Eye, AlertTriangle, Loader2, TrendingUp, Truck, Building } from 'lucide-react';
import supabase from '@/api/supabaseClient';
import { DataManager } from '../shared/DataManager';

export default function CustomerModeSetupModal({
  vehicle,
  currentDealer,
  isOpen,
  onClose,
  onEnterCustomerMode
}) {
  const [desiredMarginPercentage, setDesiredMarginPercentage] = useState('');
  const [minimumMarginPercentage, setMinimumMarginPercentage] = useState('');
  const [platformFee, setPlatformFee] = useState(0);
  const [logisticsCost, setLogisticsCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [existingTransaction, setExistingTransaction] = useState(null);

  useEffect(() => {
    if (isOpen && vehicle && currentDealer) {
      loadPricingDefaults();
    }
  }, [isOpen, vehicle, currentDealer]);

  const loadPricingDefaults = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load current dealer to get default margin settings
      const { data: dealer, error: dealerErr } = await supabase
        .from('Dealer')
        .select('*')
        .eq('id', currentDealer.id)
        .single();
      if (dealerErr) throw dealerErr;
      if (dealer) {
        if (dealer.default_desired_margin_percentage) {
          setDesiredMarginPercentage(dealer.default_desired_margin_percentage.toString());
        }
        if (dealer.default_minimum_margin_percentage) {
          setMinimumMarginPercentage(dealer.default_minimum_margin_percentage.toString());
        }
      }

      // Fetch dynamic logistics cost
      const estimatedLogistics = await DataManager.getEstimatedLogisticsCost(currentDealer.id, vehicle.id);
      setLogisticsCost(estimatedLogistics);

      // Get platform fee
      setPlatformFee(DataManager.getPlatformFee());

      // Load existing transaction if any
      const { data: existingTransactions, error: txErr } = await supabase
        .from('Transaction')
        .select('*')
        .match({ vehicle_id: vehicle.id, buyer_id: currentDealer.id });
      if (txErr) throw txErr;

      if (existingTransactions.length > 0) {
        const transaction = existingTransactions[0];
        setExistingTransaction(transaction);
        
        // Override with existing values if they exist
        if (transaction.platform_fee !== undefined) setPlatformFee(transaction.platform_fee);
        if (transaction.estimated_logistics_cost !== undefined) setLogisticsCost(transaction.estimated_logistics_cost);
        if (transaction.desired_margin_amount !== undefined && vehicle.price) {
          const percentage = ((transaction.desired_margin_amount / vehicle.price) * 100).toFixed(1);
          setDesiredMarginPercentage(percentage);
        }
        if (transaction.minimum_margin_amount !== undefined && vehicle.price) {
          const percentage = ((transaction.minimum_margin_amount / vehicle.price) * 100).toFixed(1);
          setMinimumMarginPercentage(percentage);
        }
      }

    } catch (err) {
      console.error('Error loading pricing defaults:', err);
      setError('Failed to load pricing data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateLandedCost = () => {
    const sellerPrice = vehicle?.price || 0;
    return sellerPrice + logisticsCost + platformFee;
  };

  const calculateShowroomPrice = () => {
    const landedCost = calculateLandedCost();
    const desiredMarginAmount = calculateDesiredMarginAmount();
    return landedCost + desiredMarginAmount;
  };

  const calculateFinalFloorPrice = () => {
    const landedCost = calculateLandedCost();
    const minimumMarginAmount = calculateMinimumMarginAmount();
    return landedCost + minimumMarginAmount;
  };

  const calculateDesiredMarginAmount = () => {
    if (!desiredMarginPercentage || !vehicle?.price) return 0;
    return (parseFloat(desiredMarginPercentage) / 100) * vehicle.price;
  };

  const calculateMinimumMarginAmount = () => {
    if (!minimumMarginPercentage || !vehicle?.price) return 0;
    return (parseFloat(minimumMarginPercentage) / 100) * vehicle.price;
  };

  const validateInputs = () => {
    if (!desiredMarginPercentage || parseFloat(desiredMarginPercentage) < 0) {
      setError('Please enter a valid desired margin percentage.');
      return false;
    }
    if (!minimumMarginPercentage || parseFloat(minimumMarginPercentage) < 0) {
      setError('Please enter a valid minimum margin percentage.');
      return false;
    }
    if (parseFloat(minimumMarginPercentage) > parseFloat(desiredMarginPercentage)) {
      setError('Minimum margin cannot be higher than desired margin.');
      return false;
    }
    return true;
  };

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return '₹0.00L';
    return `₹${(price / 100000).toFixed(2)}L`;
  };

  const handleEnterCustomerMode = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const transactionData = {
        vehicle_id: vehicle.id,
        buyer_id: currentDealer.id,
        seller_id: vehicle.dealer_id,
        offer_amount: vehicle.price,
        estimated_logistics_cost: logisticsCost,
        platform_fee: platformFee,
        desired_margin_amount: calculateDesiredMarginAmount(),
        minimum_margin_amount: calculateMinimumMarginAmount(),
        showroom_price: calculateShowroomPrice(),
        final_floor_price: calculateFinalFloorPrice(),
        customer_mode_active: true,
        customer_mode_activated_at: new Date().toISOString(),
        status: 'pending_customer_view',
        pricing_tier_notes: `Configured for customer presentation with ${desiredMarginPercentage}% desired margin and ${minimumMarginPercentage}% minimum margin.`
      };

      let transaction;
      if (existingTransaction) {
        const { data, error } = await supabase
          .from('Transaction')
          .update(transactionData)
          .eq('id', existingTransaction.id)
          .select()
          .single();
        if (error) throw error;
        transaction = data;
      } else {
        const { data, error } = await supabase
          .from('Transaction')
          .insert(transactionData)
          .select()
          .single();
        if (error) throw error;
        transaction = data;
      }

      onEnterCustomerMode(transaction, vehicle);
      onClose();
    } catch (err) {
      console.error('Error entering customer mode:', err);
      setError('Failed to enter customer mode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Configure Customer Presentation
          </DialogTitle>
          <DialogDescription>
            Set up transparent pricing for your customer presentation of this {vehicle?.year} {vehicle?.make} {vehicle?.model}.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading pricing data...
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && (
          <div className="space-y-6">
            {/* Cost Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Cost Analysis
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Original Seller's Price:</span>
                  <span className="font-semibold">{formatPrice(vehicle?.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Est. Logistics Cost:
                  </span>
                  <span className="font-semibold">{formatPrice(logisticsCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    Aura Platform Fee:
                  </span>
                  <span className="font-semibold">{formatPrice(platformFee)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Landed Cost:</span>
                  <span>{formatPrice(calculateLandedCost())}</span>
                </div>
              </div>
            </div>

            {/* Margin Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="desired-margin">Desired Margin (%)</Label>
                <Input
                  id="desired-margin"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={desiredMarginPercentage}
                  onChange={(e) => setDesiredMarginPercentage(e.target.value)}
                  placeholder="e.g., 15"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Amount: {formatPrice(calculateDesiredMarginAmount())}
                </p>
              </div>
              
              <div>
                <Label htmlFor="minimum-margin">Minimum Margin (%)</Label>
                <Input
                  id="minimum-margin"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={minimumMarginPercentage}
                  onChange={(e) => setMinimumMarginPercentage(e.target.value)}
                  placeholder="e.g., 8"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Amount: {formatPrice(calculateMinimumMarginAmount())}
                </p>
              </div>
            </div>

            <Separator />

            {/* Price Summary */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-blue-800">Customer Pricing Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Showroom Price (Customer Sees):</span>
                  <span className="font-bold text-lg text-blue-600">
                    {formatPrice(calculateShowroomPrice())}
                  </span>
                </div>
                <div className="flex justify-between text-yellow-800">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Your Floor Price (Private):
                  </span>
                  <span className="font-semibold">
                    {formatPrice(calculateFinalFloorPrice())}
                  </span>
                </div>
              </div>
            </div>

            {existingTransaction && (
              <Alert>
                <AlertDescription>
                  This will update your existing customer presentation for this vehicle.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleEnterCustomerMode} 
            disabled={loading || !desiredMarginPercentage || !minimumMarginPercentage}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              'Enter Customer Mode'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
