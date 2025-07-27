import React, { useState } from 'react';
import supabase from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Package, 
  Route,
  QrCode,
  Phone,
  AlertCircle,
  Calendar,
  Shield,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function TransportStatusTracker({ transaction, vehicle, seller, buyer, currentUser, onStatusUpdate }) {
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [error, setError] = useState('');

  const isCurrentUserBuyer = currentUser?.id === buyer?.id;
  const isCurrentUserSeller = currentUser?.id === seller?.id;

  const transportStatuses = {
    pending: { label: 'Pickup Scheduled', progress: 25, color: 'bg-yellow-100 text-yellow-800' },
    picked_up: { label: 'In Transit', progress: 50, color: 'bg-blue-100 text-blue-800' },
    in_transit: { label: 'En Route', progress: 75, color: 'bg-indigo-100 text-indigo-800' },
    delivered: { label: 'Delivered', progress: 100, color: 'bg-green-100 text-green-800' }
  };

  const currentStatus = transportStatuses[transaction.transport_status] || transportStatuses.pending;

  const handleConfirmDelivery = async () => {
    setConfirmingDelivery(true);
    setError('');

    try {
      await supabase
        .from('Transaction')
        .update({
          ...transaction,
          transport_status: 'delivered',
          delivery_confirmed_at: new Date().toISOString(),
          messages: [
            ...transaction.messages,
            {
              sender_id: currentUser.id,
              message: `Vehicle delivery confirmed by ${isCurrentUserBuyer ? 'buyer' : 'seller'}. Transport completed successfully.`,
              timestamp: new Date().toISOString(),
              type: 'system'
            }
          ]
        })
        .eq('id', transaction.id);

      onStatusUpdate();
    } catch (err) {
      console.error('Failed to confirm delivery:', err);
      setError('Failed to confirm delivery. Please try again.');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const generateSecureHandoverCode = () => {
    // Generate a secure handover code based on transaction details
    const baseCode = `${transaction.id.slice(-6)}${vehicle?.vin?.slice(-4) || 'XXXX'}`;
    return baseCode.toUpperCase();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not scheduled';
    try {
      return format(new Date(dateString), 'PPP p');
    } catch {
      return 'Invalid date';
    }
  };

  const getTransportPartnerInfo = () => {
    const partners = {
      'aura_logistics': { name: 'Aura Express Logistics', phone: '+91-8800-AURA-01', contact: 'Rajesh Kumar' },
      'swift_transport': { name: 'Swift Vehicle Transport', phone: '+91-9900-SWIFT-2', contact: 'Amit Sharma' },
      'secure_movers': { name: 'Secure Auto Movers', phone: '+91-7700-SECURE', contact: 'Priya Singh' }
    };
    return partners[transaction.logistics_partner] || { name: 'Unknown Partner', phone: 'N/A', contact: 'N/A' };
  };

  const partnerInfo = getTransportPartnerInfo();

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Transport Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Transport Status
          </CardTitle>
          <CardDescription>
            Tracking ID: {transaction.transport_booking_id || 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badge and Progress */}
          <div className="flex items-center justify-between">
            <Badge className={currentStatus.color}>
              {currentStatus.label}
            </Badge>
            <span className="text-sm text-gray-600">
              {currentStatus.progress}% Complete
            </span>
          </div>
          
          <Progress value={currentStatus.progress} className="h-3" />

          {/* Timeline Steps */}
          <div className="space-y-4">
            <div className={`flex items-center gap-3 ${transaction.transport_status === 'pending' || transaction.transport_status === 'picked_up' || transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${transaction.transport_status === 'pending' || transaction.transport_status === 'picked_up' || transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? 'bg-green-100' : 'bg-gray-100'}`}>
                {transaction.transport_status === 'pending' || transaction.transport_status === 'picked_up' || transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-medium">Pickup Scheduled</div>
                <div className="text-sm text-gray-600">{formatDateTime(transaction.pickup_eta)}</div>
              </div>
            </div>

            <div className={`flex items-center gap-3 ${transaction.transport_status === 'picked_up' || transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${transaction.transport_status === 'picked_up' || transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? 'bg-green-100' : 'bg-gray-100'}`}>
                {transaction.transport_status === 'picked_up' || transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? <CheckCircle2 className="w-4 h-4" /> : <Package className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-medium">Vehicle Picked Up</div>
                <div className="text-sm text-gray-600">
                  {transaction.transport_status === 'picked_up' || transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? 'Completed' : 'Pending'}
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-3 ${transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? 'bg-green-100' : 'bg-gray-100'}`}>
                {transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? <CheckCircle2 className="w-4 h-4" /> : <Route className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-medium">In Transit</div>
                <div className="text-sm text-gray-600">
                  {transaction.transport_status === 'in_transit' || transaction.transport_status === 'delivered' ? 'En route to destination' : 'Awaiting pickup'}
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-3 ${transaction.transport_status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${transaction.transport_status === 'delivered' ? 'bg-green-100' : 'bg-gray-100'}`}>
                {transaction.transport_status === 'delivered' ? <CheckCircle2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-medium">Delivered</div>
                <div className="text-sm text-gray-600">{formatDateTime(transaction.delivery_eta)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transport Partner Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Transport Partner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{partnerInfo.name}</div>
              <div className="text-sm text-gray-600">Driver: {partnerInfo.contact}</div>
            </div>
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4 mr-2" />
              {partnerInfo.phone}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Secure Handover Code */}
      {(transaction.transport_status === 'pending' || transaction.transport_status === 'picked_up') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Secure Handover
            </CardTitle>
            <CardDescription>
              {isCurrentUserSeller ? 'Show this code to the transport partner during pickup' : 'This code will be verified during pickup'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
              <div className="text-center">
                <QrCode className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <div className="text-2xl font-mono font-bold tracking-wider">
                  {generateSecureHandoverCode()}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Secure Handover Code
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Confirmation */}
      {transaction.transport_status === 'in_transit' && isCurrentUserBuyer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Confirm Delivery
            </CardTitle>
            <CardDescription>
              Confirm that you have received the vehicle in good condition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only confirm delivery after thoroughly inspecting the vehicle. This action cannot be undone.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={handleConfirmDelivery}
              disabled={confirmingDelivery}
              className="w-full momentum-btn-accent"
              size="lg"
            >
              {confirmingDelivery ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming Delivery...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Vehicle Delivery
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delivery Completed */}
      {transaction.transport_status === 'delivered' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                Vehicle Delivered Successfully!
              </h3>
              <p className="text-gray-600">
                The transport has been completed and delivery confirmed.
                {transaction.delivery_confirmed_at && 
                  ` Confirmed on ${formatDateTime(transaction.delivery_confirmed_at)}`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Route Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Pickup Location
              </label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">{transaction.pickup_address || seller?.address || 'Not specified'}</div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Delivery Location
              </label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">{transaction.delivery_address || buyer?.address || 'Not specified'}</div>
              </div>
            </div>
          </div>
          
          {transaction.transport_instructions && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Special Instructions</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">{transaction.transport_instructions}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
