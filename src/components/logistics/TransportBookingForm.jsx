import React, { useState } from 'react';
import supabase from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Shield, 
  AlertCircle, 
  Calendar as CalendarIcon,
  Loader2,
  Package,
  Route
} from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function TransportBookingForm({ transaction, vehicle, seller, buyer, currentUser, onBookingComplete }) {
  const [formData, setFormData] = useState({
    pickup_address: seller?.address || '',
    delivery_address: buyer?.address || '',
    pickup_date: null,
    delivery_date: null,
    transport_partner: '',
    special_instructions: '',
    insurance_required: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isCurrentUserSeller = currentUser?.id === seller?.id;
  const isCurrentUserBuyer = currentUser?.id === buyer?.id;

  const transportPartners = [
    { id: 'aura_logistics', name: 'Aura Express Logistics', price: 8500, rating: 4.8, eta: '2-3 days' },
    { id: 'swift_transport', name: 'Swift Vehicle Transport', price: 7200, rating: 4.6, eta: '3-4 days' },
    { id: 'secure_movers', name: 'Secure Auto Movers', price: 9200, rating: 4.9, eta: '1-2 days' }
  ];

  const selectedPartner = transportPartners.find(p => p.id === formData.transport_partner);

  const calculatePickupETA = () => {
    if (!formData.pickup_date) return null;
    return formData.pickup_date;
  };

  const calculateDeliveryETA = () => {
    if (!formData.pickup_date || !selectedPartner) return null;
    const pickupDate = new Date(formData.pickup_date);
    const etaDays = selectedPartner.eta === '1-2 days' ? 2 : 
                   selectedPartner.eta === '2-3 days' ? 3 : 4;
    return addDays(pickupDate, etaDays);
  };

  const handleBookTransport = async () => {
    if (!formData.pickup_date || !formData.transport_partner) {
      setError('Please select pickup date and transport partner');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const pickupETA = calculatePickupETA();
      const deliveryETA = calculateDeliveryETA();

      await supabase
        .from('Transaction')
        .update({
          ...transaction,
          transport_status: 'pending',
          pickup_eta: pickupETA?.toISOString(),
          delivery_eta: deliveryETA?.toISOString(),
          logistics_partner: formData.transport_partner,
          pickup_address: formData.pickup_address,
          delivery_address: formData.delivery_address,
          transport_instructions: formData.special_instructions,
          transport_booking_id: `TRK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          messages: [
            ...transaction.messages,
            {
              sender_id: currentUser.id,
              message: `Transport booked with ${selectedPartner.name}. Pickup scheduled for ${format(pickupETA, 'PPP')} and delivery expected by ${format(deliveryETA, 'PPP')}.`,
              timestamp: new Date().toISOString(),
              type: 'system'
            }
          ]
        })
        .eq('id', transaction.id);

      onBookingComplete();
    } catch (err) {
      console.error('Failed to book transport:', err);
      setError('Failed to book transport. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Booking Authorization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Transport Booking
          </CardTitle>
          <CardDescription>
            {isCurrentUserSeller ? 'Schedule pickup of your sold vehicle' : 'Arrange delivery of your purchased vehicle'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCurrentUserSeller && !isCurrentUserBuyer && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only the buyer or seller can book transport for this vehicle.
              </AlertDescription>
            </Alert>
          )}

          {/* Route Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Pickup Address
              </label>
              <Input
                value={formData.pickup_address}
                onChange={(e) => setFormData(prev => ({ ...prev, pickup_address: e.target.value }))}
                placeholder="Enter pickup address"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Delivery Address
              </label>
              <Input
                value={formData.delivery_address}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
                placeholder="Enter delivery address"
              />
            </div>
          </div>

          {/* Vehicle Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Vehicle Details
            </h4>
            <div className="text-sm text-gray-600">
              <div>{vehicle?.year} {vehicle?.make} {vehicle?.model}</div>
              <div>VIN: {vehicle?.vin || 'Not provided'}</div>
              <div>Value: ₹{((transaction?.final_amount || transaction?.offer_amount) / 100000).toFixed(1)}L</div>
            </div>
          </div>

          {/* Pickup Date Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Preferred Pickup Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.pickup_date ? format(formData.pickup_date, 'PPP') : 'Select pickup date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.pickup_date}
                  onSelect={(date) => setFormData(prev => ({ ...prev, pickup_date: date }))}
                  disabled={(date) => date < new Date() || date < addDays(new Date(), 1)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Transport Partner Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Route className="w-4 h-4" />
              Transport Partner
            </label>
            <div className="space-y-3">
              {transportPartners.map((partner) => (
                <div
                  key={partner.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.transport_partner === partner.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, transport_partner: partner.id }))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{partner.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-4">
                        <span>⭐ {partner.rating}</span>
                        <span>ETA: {partner.eta}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">₹{partner.price.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">All inclusive</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery ETA Preview */}
          {formData.pickup_date && selectedPartner && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Estimated Timeline</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <div className="flex justify-between">
                  <span>Pickup:</span>
                  <span className="font-medium">{format(calculatePickupETA(), 'PPP')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className="font-medium">{format(calculateDeliveryETA(), 'PPP')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-bold">₹{selectedPartner.price.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Special Instructions (Optional)</label>
            <Input
              value={formData.special_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
              placeholder="Any special handling requirements..."
            />
          </div>

          {/* Insurance Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="insurance"
              checked={formData.insurance_required}
              onChange={(e) => setFormData(prev => ({ ...prev, insurance_required: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="insurance" className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              Include transport insurance (Recommended)
            </label>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button
              onClick={handleBookTransport}
              disabled={loading || !formData.pickup_date || !formData.transport_partner || (!isCurrentUserSeller && !isCurrentUserBuyer)}
              className="momentum-btn-accent"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking Transport...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  Book Transport - ₹{selectedPartner?.price.toLocaleString() || '0'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
