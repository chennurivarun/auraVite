import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Shield, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Building2,
  Smartphone,
  Wallet
} from 'lucide-react';
import { PaymentGateway } from '@/api/entities';
import { DataManager } from '../shared/DataManager';

export default function PaymentGatewayIntegration({ 
  transaction, 
  onPaymentSuccess, 
  onPaymentFailure,
  isOpen,
  onClose
}) {
  const [selectedGateway, setSelectedGateway] = useState('razorpay');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [gatewayOrder, setGatewayOrder] = useState(null);

  const paymentGateways = [
    {
      id: 'razorpay',
      name: 'Razorpay',
      description: 'India\'s leading payment gateway',
      methods: ['card', 'upi', 'netbanking', 'wallet'],
      processingFee: 2.0 // percentage
    },
    {
      id: 'payu',
      name: 'PayU India',
      description: 'Trusted payment solution',
      methods: ['card', 'upi', 'netbanking', 'emi'],
      processingFee: 1.9
    },
    {
      id: 'mock',
      name: 'Mock Gateway (Demo)',
      description: 'For testing and demo purposes',
      methods: ['card', 'upi', 'netbanking'],
      processingFee: 0
    }
  ];

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, popular: true },
    { id: 'upi', name: 'UPI', icon: Smartphone, popular: true },
    { id: 'netbanking', name: 'Net Banking', icon: Building2, popular: false },
    { id: 'wallet', name: 'Digital Wallet', icon: Wallet, popular: false },
    { id: 'emi', name: 'EMI', icon: CreditCard, popular: false }
  ];

  const selectedGatewayInfo = paymentGateways.find(g => g.id === selectedGateway);
  const availableMethods = paymentMethods.filter(m => 
    selectedGatewayInfo?.methods.includes(m.id)
  );

  const finalAmount = transaction.final_amount || transaction.offer_amount;
  const processingFee = Math.round(finalAmount * (selectedGatewayInfo?.processingFee || 0) / 100);
  const totalAmount = finalAmount + processingFee;

  const initializePayment = async () => {
    setProcessing(true);
    setPaymentStatus('initializing');

    try {
      // Create payment gateway record
      const gatewayRecord = await PaymentGateway.create({
        transaction_id: transaction.id,
        payment_gateway: selectedGateway,
        gateway_order_id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payment_method: selectedMethod,
        amount: totalAmount,
        status: 'created',
        payment_initiated_at: new Date().toISOString(),
        buyer_details: {
          name: transaction.buyer_name || 'Dealer Purchase',
          email: transaction.buyer_email || 'dealer@example.com',
          phone: transaction.buyer_phone || '+91 9999999999'
        }
      });

      setGatewayOrder(gatewayRecord);
      setPaymentStatus('gateway_ready');

      // Simulate gateway initialization
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Launch payment interface
      await launchPaymentInterface(gatewayRecord);

    } catch (error) {
      console.error('Payment initialization failed:', error);
      setPaymentStatus('failed');
      if (onPaymentFailure) {
        onPaymentFailure(error.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  const launchPaymentInterface = async (gatewayRecord) => {
    setPaymentStatus('processing');

    try {
      // Simulate different payment gateway behaviors
      if (selectedGateway === 'mock') {
        // Mock gateway - simulate payment flow
        await simulateMockPayment(gatewayRecord);
      } else {
        // Real gateway integration would go here
        await simulateRealGateway(gatewayRecord);
      }

    } catch (error) {
      console.error('Payment processing failed:', error);
      await PaymentGateway.update(gatewayRecord.id, {
        status: 'failed',
        failure_reason: error.message
      });
      setPaymentStatus('failed');
      if (onPaymentFailure) {
        onPaymentFailure(error.message);
      }
    }
  };

  const simulateMockPayment = async (gatewayRecord) => {
    // Simulate payment steps
    const steps = [
      { status: 'redirecting', message: 'Redirecting to payment page...', duration: 1500 },
      { status: 'authenticating', message: 'Authenticating payment...', duration: 2000 },
      { status: 'processing', message: 'Processing payment...', duration: 2500 },
      { status: 'confirming', message: 'Confirming transaction...', duration: 1000 }
    ];

    for (const step of steps) {
      setPaymentStatus(step.status);
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    // Simulate 90% success rate
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await PaymentGateway.update(gatewayRecord.id, {
        status: 'completed',
        gateway_payment_id: paymentId,
        payment_completed_at: new Date().toISOString(),
        webhook_verified: true,
        escrow_reference: `escrow_${paymentId}`,
        gateway_response: {
          payment_id: paymentId,
          status: 'captured',
          method: selectedMethod,
          amount: totalAmount,
          fee: processingFee
        }
      });

      setPaymentStatus('completed');
      
      if (onPaymentSuccess) {
        onPaymentSuccess({
          paymentId,
          amount: totalAmount,
          method: selectedMethod,
          gatewayOrderId: gatewayRecord.gateway_order_id
        });
      }
    } else {
      throw new Error('Payment failed due to insufficient funds or bank decline');
    }
  };

  const simulateRealGateway = async (gatewayRecord) => {
    // In a real implementation, this would:
    // 1. Load the gateway's SDK (Razorpay, PayU, etc.)
    // 2. Create checkout options
    // 3. Open payment interface
    // 4. Handle success/failure callbacks
    
    // For now, we'll simulate with mock
    await simulateMockPayment(gatewayRecord);
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'initializing':
      case 'gateway_ready':
      case 'redirecting':
      case 'authenticating':
      case 'processing':
      case 'confirming':
        return <Loader2 className="w-6 h-6 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <CreditCard className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    const messages = {
      initializing: 'Setting up payment...',
      gateway_ready: 'Payment gateway ready',
      redirecting: 'Redirecting to payment page...',
      authenticating: 'Authenticating payment details...',
      processing: 'Processing your payment...',
      confirming: 'Confirming transaction...',
      completed: 'Payment completed successfully!',
      failed: 'Payment failed. Please try again.'
    };
    return messages[paymentStatus] || 'Ready to process payment';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Secure Payment Processing
          </DialogTitle>
          <DialogDescription>
            Complete your vehicle purchase with our secure payment system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Amount Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Vehicle Amount</span>
                  <span>₹{(finalAmount / 100000).toFixed(2)}L</span>
                </div>
                {processingFee > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Processing Fee ({selectedGatewayInfo?.processingFee}%)</span>
                    <span>₹{(processingFee / 100).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount</span>
                  <span className="text-blue-600">₹{(totalAmount / 100000).toFixed(2)}L</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          {paymentStatus && (
            <Alert>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <AlertDescription>{getStatusMessage()}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Gateway Selection */}
          {!paymentStatus && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium">Select Payment Gateway</label>
                <Select value={selectedGateway} onValueChange={setSelectedGateway}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose payment gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentGateways.map(gateway => (
                      <SelectItem key={gateway.id} value={gateway.id}>
                        <div>
                          <div className="font-medium">{gateway.name}</div>
                          <div className="text-xs text-gray-500">{gateway.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableMethods.map(method => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          selectedMethod === method.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{method.name}</span>
                          {method.popular && (
                            <Badge className="text-xs" variant="secondary">Popular</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-700">
                    <div className="font-medium">Secure & Protected</div>
                    <div>Your payment is secured with 256-bit SSL encryption and stored in escrow until delivery confirmation.</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={initializePayment}
                  disabled={!selectedMethod || processing}
                  className="flex-1 momentum-btn-accent"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay ₹{(totalAmount / 100000).toFixed(2)}L
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Payment Completed */}
          {paymentStatus === 'completed' && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Payment Successful!</h3>
              <p className="text-gray-600 mb-4">
                Your payment has been processed and funds are now in secure escrow.
              </p>
              <Button onClick={onClose} className="momentum-btn-primary">
                Continue to Deal Room
              </Button>
            </div>
          )}

          {/* Payment Failed */}
          {paymentStatus === 'failed' && (
            <div className="text-center py-4">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Payment Failed</h3>
              <p className="text-gray-600 mb-4">
                We couldn't process your payment. Please try again with a different method.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={() => setPaymentStatus(null)} 
                  className="flex-1 momentum-btn-accent"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}