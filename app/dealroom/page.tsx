
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Transaction, Vehicle, Dealer, User, RTOApplication, Notification } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MessageSquare,
  Car,
  User as UserIcon,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  Clock,
  Star,
  TrendingUp,
  AlertCircle,
  Send,
  Loader2,
  CreditCard,
  Shield,
  Lock,
  FileText,
  Truck,
  CheckCircle2,
  Eye,
  Copy,
  Building,
  ThumbsUp
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { SendEmail } from '@/api/integrations';

// Import Phase 3 components
import PaymentGatewayIntegration from '@/components/payments/PaymentGatewayIntegration';
import RealTimeLogistics from '@/components/logistics/RealTimeLogistics';
import DigitalDocumentManager from '@/components/documents/DigitalDocumentManager';

// Import existing components
import OfferHistoryTracker from '@/components/dealroom/OfferHistoryTracker';
import MarketInsights from '@/components/dealroom/MarketInsights';
// RTOInitiationForm and RTOStatusTracker are no longer directly used in the tabs, but RTOApplication entity is still used for loading.
// TransportBookingForm and TransportStatusTracker are replaced by RealTimeLogistics.
import DealCompletionModal from '@/components/post-sale/DealCompletionModal';
import DealArchiveManager from '@/components/post-sale/DealArchiveManager';

export default function DealRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [seller, setSeller] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDealer, setCurrentDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chat and negotiation state
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [counterOffer, setCounterOffer] = useState('');
  const [makingCounterOffer, setMakingCounterOffer] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Phase 3: Payment state
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  // processingPayment is still useful if the actual payment API call is inside DealRoom, but here it's delegated to PaymentGatewayIntegration.
  // We can keep it if the logic comes back to DealRoom later for other reasons, but for now it's not directly used for the payment dialog itself.
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false); // This dialog is removed in the outline's JSX, but keeping state for now
  const [releasingFunds, setReleasingFunds] = useState(false); // This dialog is removed in the outline's JSX, but keeping state for now

  // Phase 3: Logistics state
  const [selectedLogisticsQuote, setSelectedLogisticsQuote] = useState(null);

  // RTO state
  const [rtoApplication, setRtoApplication] = useState(null);
  const [loadingRTO, setLoadingRTO] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState('negotiation');

  // Post-sale workflow
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [dealCompleted, setDealCompleted] = useState(false);

  // User lookups
  const [allUsers, setAllUsers] = useState([]);
  const [allDealers, setAllDealers] = useState([]);

  // Get transaction ID from URL parameters
  const getTransactionId = () => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('transactionId');
  };

  useEffect(() => {
    const transactionId = getTransactionId();
    if (transactionId) {
      loadDealRoomData(transactionId);
    } else {
      setError('No transaction ID provided');
      setLoading(false);
    }
  }, [location.search]);

  // Utility to find user object for a given dealer ID
  const findUserForDealer = (dealerId) => {
    const dealer = allDealers.find(d => d.id === dealerId);
    if (dealer && dealer.created_by) {
      return allUsers.find(user => user.email === dealer.created_by);
    }
    return null;
  };

  const loadRTOApplication = async (transactionId) => {
    setLoadingRTO(true);
    try {
      const rtoData = await RTOApplication.filter({ transaction_id: transactionId });
      if (rtoData.length > 0) {
        setRtoApplication(rtoData[0]);
      } else {
        setRtoApplication(null);
      }
    } catch (err) {
      console.error('Error loading RTO application:', err);
      setRtoApplication(null);
    } finally {
      setLoadingRTO(false);
    }
  };

  const loadDealRoomData = async (transactionId) => {
    setLoading(true);
    setError(null);
    try {
      const [user, currentTransaction, allUsersData, allDealersData] = await Promise.all([
        User.me(),
        Transaction.get(transactionId),
        User.list(),
        Dealer.list()
      ]);

      setCurrentUser(user);
      setTransaction(currentTransaction);
      setAllUsers(allUsersData);
      setAllDealers(allDealersData);

      const userDealerData = allDealersData.find(dealer => dealer.created_by === user.email);
      if (userDealerData) {
        setCurrentDealer(userDealerData);
      }

      const vehicleData = await Vehicle.filter({ id: currentTransaction.vehicle_id });
      if (vehicleData.length > 0) {
        setVehicle(vehicleData[0]);
      } else {
        setError("Associated vehicle not found.");
      }

      if (currentTransaction.seller_id) {
        const foundSeller = allDealersData.find(dealer => dealer.id === currentTransaction.seller_id);
        if (foundSeller) {
          setSeller(foundSeller);
        } else {
          console.warn(`Seller with ID ${currentTransaction.seller_id} not found`);
          setSeller(null);
        }
      } else {
        setSeller(null);
      }

      if (currentTransaction.buyer_id) {
        const foundBuyer = allDealersData.find(dealer => dealer.id === currentTransaction.buyer_id);
        if (foundBuyer) {
          setBuyer(foundBuyer);
        } else {
          console.warn(`Buyer with ID ${currentTransaction.buyer_id} not found`);
          setBuyer(null);
        }
      } else {
        setBuyer(null);
      }

      // RTO application is loaded even if the RTO tab is integrated into Documents
      await loadRTOApplication(transactionId);

    } catch (err) {
      console.error('Error loading deal room data:', err);
      setError('Failed to load deal room data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Determine user role in this transaction
  const isSellerView = currentDealer && transaction && currentDealer.id === transaction.seller_id;
  const isBuyerView = currentDealer && transaction && currentDealer.id === transaction.buyer_id;
  const otherParty = isSellerView ? buyer : seller;

  // Check if deal completion modal should be shown
  useEffect(() => {
    if (transaction && vehicle && currentDealer && otherParty) {
      const isCompleted = transaction.status === 'completed' && transaction.transport_status === 'delivered';
      const hasRated = isSellerView ? transaction.seller_rating : transaction.buyer_rating;

      if (isCompleted && !hasRated && !dealCompleted) {
        setShowCompletionModal(true);
      }
    }
  }, [transaction, vehicle, currentDealer, otherParty, isSellerView, dealCompleted]);

  // Phase 3: Payment Success Handler
  const handlePaymentSuccess = async (paymentData) => {
    try {
      const updatedTransaction = {
        ...transaction,
        status: 'in_escrow',
        escrow_status: 'paid',
        payment_method: paymentData.method,
        payment_confirmed_at: new Date().toISOString(),
        messages: [
          ...(transaction.messages || []),
          {
            sender_id: currentDealer?.id,
            message: `Payment of ₹${(paymentData.amount / 100000).toFixed(2)}L completed successfully. Funds secured in escrow.`,
            timestamp: new Date().toISOString(),
            type: 'system'
          }
        ]
      };

      await Transaction.update(transaction.id, updatedTransaction);
      setTransaction(updatedTransaction);
      setShowPaymentGateway(false);

      // Create notification for seller
      const sellerUser = findUserForDealer(transaction.seller_id);
      if (sellerUser) {
        await Notification.create({
          user_email: sellerUser.email,
          type: 'payment',
          title: 'Payment Received!',
          message: `Buyer has completed payment of ₹${(paymentData.amount / 100000).toFixed(2)}L. Funds are now in secure escrow.`,
          link: createPageUrl(`DealRoom?transactionId=${transaction.id}`),
          icon: 'CreditCard'
        });
        await SendEmail({
          to: sellerUser.email,
          subject: `Payment Received in Escrow for ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          body: `<p>The buyer has paid the amount into escrow for your ${vehicle.year} ${vehicle.make} ${vehicle.model}. The funds are now secure. Please proceed with logistics arrangements.</p>`
        });
      }

      await loadDealRoomData(transaction.id);
    } catch (error) {
      console.error('Payment success handling failed:', error);
      alert('Failed to process payment success. Please check transaction status.');
    }
  };

  const handlePaymentFailure = (errorMessage) => {
    setShowPaymentGateway(false);
    alert(`Payment failed: ${errorMessage}`);
  };

  // Phase 3: Logistics Quote Handler
  const handleLogisticsQuoteUpdate = (quote) => {
    setSelectedLogisticsQuote(quote);
    // You might want to update transaction with the selected quote
    // e.g., if a quote is accepted and booked, update transaction.transport_status
    // This depends on how RealTimeLogistics communicates booking status.
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentDealer || sendingMessage) return;

    setSendingMessage(true);
    try {
      const updatedMessages = [
        ...(transaction.messages || []),
        {
          sender_id: currentDealer.id,
          message: newMessage,
          timestamp: new Date().toISOString()
        }
      ];

      await Transaction.update(transaction.id, { messages: updatedMessages });

      setTransaction(prev => ({ ...prev, messages: updatedMessages }));
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!transaction || processingAction) return;

    setProcessingAction(true);
    try {
      const updatedMessages = [
        ...(transaction.messages || []),
        {
          sender_id: currentDealer.id,
          message: `Offer of ₹${((transaction.offer_amount || 0) / 100000).toFixed(1)}L has been accepted!`,
          timestamp: new Date().toISOString()
        }
      ];

      const updatedTransaction = {
        ...transaction,
        status: 'accepted',
        final_amount: transaction.offer_amount,
        messages: updatedMessages
      };

      await Transaction.update(transaction.id, updatedTransaction);
      setTransaction(updatedTransaction);

      const buyerUser = findUserForDealer(transaction.buyer_id);
      if (buyerUser) {
        const message = `Your offer for the ${vehicle.year} ${vehicle.make} ${vehicle.model} has been accepted!`;
        await Notification.create({
          user_email: buyerUser.email,
          message: message,
          link: createPageUrl(`DealRoom?transactionId=${transaction.id}`),
          type: 'deal_update',
          icon: 'ThumbsUp'
        });
        await SendEmail({
          to: buyerUser.email,
          subject: "Offer Accepted!",
          body: `<p>${message} Please proceed to payment to secure the deal.</p>`
        });
      }

      await loadDealRoomData(transaction.id);
    } catch (error) {
      console.error('Error accepting offer:', error);
      alert('Failed to accept offer. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!transaction || processingAction) return;

    setProcessingAction(true);
    try {
      const updatedMessages = [
        ...(transaction.messages || []),
        {
          sender_id: currentDealer.id,
          message: `Offer of ₹${((transaction.offer_amount || 0) / 100000).toFixed(1)}L has been rejected.`,
          timestamp: new Date().toISOString()
        }
      ];

      const updatedTransaction = {
        ...transaction,
        status: 'cancelled',
        messages: updatedMessages
      };

      await Transaction.update(transaction.id, updatedTransaction);
      setTransaction(updatedTransaction); // Update local state immediately

      // Update vehicle status back to live
      if (vehicle) {
        await Vehicle.update(vehicle.id, { status: 'live' });
      }

      // Reload the transaction to get updated data
      await loadDealRoomData(transaction.id);
    } catch (error) {
      console.error('Error rejecting offer:', error);
      alert('Failed to reject offer. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCounterOffer = async () => {
    if (!counterOffer || !transaction || makingCounterOffer) return;

    const counterAmount = parseFloat(counterOffer) * 100000;
    if (isNaN(counterAmount) || counterAmount <= 0) {
      alert('Please enter a valid counter offer amount');
      return;
    }

    setMakingCounterOffer(true);
    try {
      const updatedMessages = [
        ...(transaction.messages || []),
        {
          sender_id: currentDealer.id,
          message: `Counter-offer: ₹${counterOffer}L`,
          timestamp: new Date().toISOString()
        }
      ];

      const updatedTransaction = {
        ...transaction,
        status: 'negotiating',
        offer_amount: counterAmount,
        messages: updatedMessages
      };

      await Transaction.update(transaction.id, updatedTransaction);
      setTransaction(updatedTransaction); // Update local state immediately
      setCounterOffer('');

      // --- NOTIFICATION TRIGGER ---
      const otherPartyUser = findUserForDealer(isSellerView ? transaction.buyer_id : transaction.seller_id);
      if (otherPartyUser) {
        const message = `${currentDealer.business_name} sent a counter-offer of ₹${(counterAmount / 100000).toFixed(1)}L for ${vehicle.year} ${vehicle.make} ${vehicle.model}.`;
        await Notification.create({
          user_email: otherPartyUser.email,
          message: message,
          link: createPageUrl(`DealRoom?transactionId=${transaction.id}`),
          type: 'deal_update',
          icon: 'ArrowLeftRight'
        });
        await SendEmail({
          to: otherPartyUser.email,
          subject: `Counter-offer received for ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          body: `<p>${message} You can review and respond in the Deal Room.</p>`
        });
      }
      // --- END NOTIFICATION TRIGGER ---

      // Reload the transaction to get updated data
      await loadDealRoomData(transaction.id);
    } catch (error) {
      console.error('Error making counter offer:', error);
      alert('Failed to make counter offer. Please try again.');
    } finally {
      setMakingCounterOffer(false);
    }
  };

  // handleProcessPayment and handleReleaseFunds are removed as per outline
  // and replaced by the PaymentGatewayIntegration component.

  // handleRTOApplicationCreated, handleTransportBooked, handleTransportStatusUpdate are removed
  // as the components they serviced are replaced by new Phase 3 components.

  const handleCompletionModalClose = (completed) => {
    setShowCompletionModal(false);
    if (completed) {
      setDealCompleted(true);
      // Reload transaction data to reflect updates
      loadDealRoomData(transaction.id);
    }
  };

  const handleArchiveStatusChange = (archived) => {
    // Reload transaction data to reflect archive status change
    loadDealRoomData(transaction.id);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-lg text-gray-600">Loading Deal Room...</span>
        </div>
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="momentum-h3 text-red-700 mb-2">Error Loading Deal Room</h3>
          <p className="momentum-body text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate(createPageUrl('Transactions'))} className="momentum-btn-primary">
            Back to Transactions
          </Button>
        </div>
      </div>
    );
  }

  if (!transaction || !vehicle) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="momentum-h3 text-gray-700 mb-2">Deal Room Not Found</h3>
          <p className="momentum-body text-gray-600 mb-6">
            The requested deal room could not be found.
          </p>
          <Button onClick={() => navigate(createPageUrl('Transactions'))} className="momentum-btn-primary">
            Back to Transactions
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      offer_made: { color: 'bg-blue-100 text-blue-800', text: 'Offer Made' },
      negotiating: { color: 'bg-yellow-100 text-yellow-800', text: 'Negotiating' },
      accepted: { color: 'bg-green-100 text-green-800', text: 'Accepted' },
      payment_pending: { color: 'bg-orange-100 text-orange-800', text: 'Payment Pending' },
      in_escrow: { color: 'bg-purple-100 text-purple-800', text: 'In Escrow' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  return (
    <div className="h-full flex">
      {/* Main Deal Room Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 bg-white">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error} Some information may be unavailable.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="momentum-h1">Deal Room</h1>
              <p className="momentum-body text-gray-600">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(transaction.status)}
              <Button variant="outline" onClick={() => navigate(createPageUrl('Transactions'))}>
                Back to Transactions
              </Button>
            </div>
          </div>

          {/* Deal Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-medium">
                    {transaction.final_amount ? 'Final Amount' : 'Current Offer'}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  ₹{((transaction.final_amount || transaction.offer_amount) / 100000).toFixed(1)}L
                </div>
                <div className="text-sm text-gray-600">
                  Listed: ₹{(vehicle.price / 100000).toFixed(1)}L
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Vehicle</span>
                </div>
                <div className="font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                <div className="text-sm text-gray-600">
                  {vehicle.kilometers?.toLocaleString()} km • {vehicle.fuel_type}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">{isSellerView ? 'Buyer' : 'Seller'}</span>
                </div>
                <div className="font-semibold">{otherParty?.business_name || 'Unknown Dealer'}</div>
                {otherParty ? (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{(otherParty.rating || 0).toFixed(1)}</span>
                    <span>•</span>
                    <span>{otherParty.completed_deals || 0} deals</span>
                  </div>
                ) : (
                  <div className="text-xs text-red-500 mt-1">Dealer info unavailable</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mx-6 mt-6">
              <TabsTrigger value="negotiation">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat & Negotiation
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="w-4 h-4 mr-2" />
                Payments & Escrow
              </TabsTrigger>
              <TabsTrigger value="logistics">
                <Truck className="w-4 h-4 mr-2" />
                Logistics & Transport
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="w-4 h-4 mr-2" />
                Documents & Legal
              </TabsTrigger>
              <TabsTrigger value="overview">
                <Eye className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
            </TabsList>

            {/* Negotiation Tab */}
            <TabsContent value="negotiation" className="flex-1 overflow-scroll p-6 pt-4">
              <div className="flex gap-6">
                {/* Chat Messages */}
                <div className="flex-1 flex flex-col">
                  <Card className="flex-1 flex flex-col"> {/* Added flex-1 and flex flex-col for proper height */}
                    <CardHeader>
                      <CardTitle className="text-lg">Messages</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <div className="flex-1 overflow-y-auto mb-4 space-y-3 max-h-96"> {/* Added max-h-96 for scrollable area */}
                        {transaction.messages && transaction.messages.length > 0 ? (
                          transaction.messages.map((message, index) => {
                            const isCurrentUser = message.sender_id === currentDealer?.id;
                            const senderName = isCurrentUser ? 'You' : (otherParty?.business_name) || 'Other Party';

                            return (
                              <div key={index} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-lg p-3 ${
                                  isCurrentUser
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}>
                                  <div className="font-medium text-sm mb-1">{senderName}</div>
                                  <div>{message.message}</div>
                                  <div className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                                    {new Date(message.timestamp).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              <p>No messages yet. Start the conversation!</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          disabled={sendingMessage}
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sendingMessage}
                          className="momentum-btn-primary"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Simplified Negotiation Panel */}
                <div className="w-80 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5" />
                        Negotiation Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          {transaction.final_amount ? 'Agreed Amount' : 'Current Offer'}
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          ₹{((transaction.final_amount || transaction.offer_amount) / 100000).toFixed(1)}L
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Listed Price: ₹{(vehicle.price / 100000).toFixed(1)}L
                        </div>
                        {vehicle.price !== (transaction.final_amount || transaction.offer_amount) && (
                          <div className={`text-sm mt-1 ${(transaction.final_amount || transaction.offer_amount) < vehicle.price ? 'text-red-600' : 'text-green-600'}`}>
                            {(transaction.final_amount || transaction.offer_amount) < vehicle.price
                              ? `₹${((vehicle.price - (transaction.final_amount || transaction.offer_amount)) / 100000).toFixed(1)}L below asking`
                              : `₹${(((transaction.final_amount || transaction.offer_amount) - vehicle.price) / 100000).toFixed(1)}L above asking`
                            }
                          </div>
                        )}
                      </div>

                      {/* Action Buttons based on user role and transaction status */}
                      {transaction.status === 'offer_made' && isSellerView && (
                        <div className="space-y-3">
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              You have received an offer. You can accept, reject, or make a counter-offer.
                            </AlertDescription>
                          </Alert>

                          <div className="flex gap-2">
                            <Button
                              onClick={handleAcceptOffer}
                              disabled={processingAction}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              onClick={handleRejectOffer}
                              disabled={processingAction}
                              variant="outline"
                              className="flex-1"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Counter Offer (₹ Lakhs)</label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="e.g., 9.5"
                                step="0.1"
                                value={counterOffer}
                                onChange={(e) => setCounterOffer(e.target.value)}
                                disabled={makingCounterOffer}
                              />
                              <Button
                                onClick={handleCounterOffer}
                                disabled={!counterOffer || makingCounterOffer}
                                className="momentum-btn-accent"
                              >
                                Counter
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {transaction.status === 'negotiating' && (
                        <div className="space-y-3">
                          <Alert>
                            <Clock className="h-4 w-4" />
                            <AlertDescription>
                              Negotiation in progress. {isSellerView ? 'Buyer' : 'Seller'} may respond with acceptance or another counter-offer.
                            </AlertDescription>
                          </Alert>

                          {/* Allow continued negotiation */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              {isSellerView ? 'Counter Offer' : 'New Offer'} (₹ Lakhs)
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="e.g., 9.5"
                                step="0.1"
                                value={counterOffer}
                                onChange={(e) => setCounterOffer(e.target.value)}
                                disabled={makingCounterOffer}
                              />
                              <Button
                                onClick={handleCounterOffer}
                                disabled={!counterOffer || makingCounterOffer}
                                className="momentum-btn-accent"
                              >
                                Send
                              </Button>
                            </div>
                          </div>

                          {isSellerView && (
                            <div className="flex gap-2">
                              <Button
                                onClick={handleAcceptOffer}
                                disabled={processingAction}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Accept Current
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {transaction.status === 'accepted' && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Offer accepted! Final amount: ₹{((transaction.final_amount || transaction.offer_amount) / 100000).toFixed(1)}L
                            <br />
                            <span className="text-sm text-gray-600 mt-1 block">
                              Next step: {isBuyerView ? 'Process payment' : 'Wait for payment'}
                            </span>
                          </AlertDescription>
                        </Alert>
                      )}

                      {['payment_pending', 'in_escrow'].includes(transaction.status) && (
                        <Alert>
                          <Shield className="h-4 w-4" />
                          <AlertDescription>
                            {transaction.status === 'payment_pending'
                              ? 'Payment is being processed...'
                              : 'Funds are secure in escrow.'
                            }
                            <br />
                            <span className="text-sm text-gray-600 mt-1 block">
                              {isSellerView
                                ? 'You will be notified when funds are ready for release.'
                                : 'Your payment is protected by Momentum Escrow.'
                              }
                            </span>
                          </AlertDescription>
                        </Alert>
                      )}

                      {transaction.status === 'completed' && (
                        <Alert>
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertDescription>
                            Deal completed successfully!
                            {isSellerView
                              ? ' Funds have been transferred to your account.'
                              : ' Vehicle ownership transfer is in progress.'
                            }
                          </AlertDescription>
                        </Alert>
                      )}

                      {transaction.status === 'cancelled' && (
                        <Alert>
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            This deal has been cancelled.
                          </AlertDescription>
                        </Alert>
                      )}

                      {transaction.status === 'accepted' && isBuyerView && (
                        <Button
                          onClick={() => setShowPaymentGateway(true)}
                          className="w-full momentum-btn-accent"
                          size="lg"
                        >
                          <CreditCard className="w-5 h-5 mr-2" />
                          Process Payment - ₹{((transaction.final_amount || transaction.offer_amount) / 100000).toFixed(1)}L
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* NEW: Market Insights */}
                  <MarketInsights
                    vehicle={vehicle}
                    currentOfferAmount={(transaction.final_amount || transaction.offer_amount) / 100000}
                    listedPrice={vehicle.price}
                  />

                  {/* NEW: Offer History Tracker */}
                  <OfferHistoryTracker
                    messages={transaction.messages || []}
                    currentUser={currentDealer}
                    seller={seller}
                    buyer={buyer}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Phase 3: Enhanced Payments Tab */}
            <TabsContent value="payments" className="flex-1 overflow-scroll p-6 pt-4">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Secure Payment & Escrow Management</h3>
                  <p className="text-gray-600">All payments are protected by our secure escrow system</p>
                </div>

                {transaction.status === 'accepted' && isBuyerView && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        <h4 className="font-semibold text-lg mb-2">Ready for Payment</h4>
                        <p className="text-gray-600 mb-4">
                          Your payment will be held securely in escrow until delivery confirmation
                        </p>
                        <Button
                          onClick={() => setShowPaymentGateway(true)}
                          className="momentum-btn-accent"
                          size="lg"
                        >
                          <CreditCard className="w-5 h-5 mr-2" />
                          Pay ₹{((transaction.final_amount || transaction.offer_amount) / 100000).toFixed(1)}L
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {['in_escrow', 'completed'].includes(transaction.status) && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h4 className="font-semibold text-lg mb-2">Payment Secured</h4>
                        <p className="text-gray-600">
                          ₹{((transaction.final_amount || transaction.offer_amount) / 100000).toFixed(1)}L is held securely in escrow
                        </p>
                        {transaction.escrow_status === 'paid' && isSellerView && (
                          <div className="mt-4">
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Funds are in escrow. Once vehicle delivery is confirmed, you can initiate fund release.
                              </AlertDescription>
                            </Alert>
                            <Button
                              onClick={() => setShowReleaseDialog(true)} // Retaining the state/dialog for fund release if needed
                              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white"
                              size="lg"
                            >
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              Release Funds
                            </Button>
                          </div>
                        )}
                        {transaction.escrow_status === 'released' && (
                          <div className="mt-4 text-green-600 font-medium">Funds Released to Seller.</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Bank Details (for seller when payment is made) - Re-added as this is important functionality*/}
                {isSellerView && ['payment_pending', 'in_escrow', 'completed'].includes(transaction.status) && seller && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          Your Bank Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-gray-600 mb-3">
                          Funds will be transferred to this account upon completion:
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Bank Name</span>
                            <span className="font-medium">{seller.bank_name || 'Not provided'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Account Number</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">
                                {seller.account_number ? `****${seller.account_number.slice(-4)}` : 'Not provided'}
                              </span>
                              {seller.account_number && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(seller.account_number)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">IFSC Code</span>
                            <span className="font-mono">{seller.ifsc_code || 'Not provided'}</span>
                          </div>
                        </div>
                        {(!seller.bank_name || !seller.account_number || !seller.ifsc_code) && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Please update your bank details in Settings to receive payments.
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )}
              </div>
            </TabsContent>

            {/* Phase 3: Enhanced Logistics Tab */}
            <TabsContent value="logistics" className="flex-1 overflow-scroll p-6 pt-4">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Real-Time Logistics & Transport</h3>
                  <p className="text-gray-600">Get live quotes from verified transport partners and track vehicle movement.</p>
                </div>

                {seller && buyer && (
                  <RealTimeLogistics
                    transaction={transaction}
                    vehicle={vehicle}
                    seller={seller}
                    buyer={buyer}
                    currentUser={currentUser}
                    onQuoteUpdate={handleLogisticsQuoteUpdate}
                    onStatusUpdate={loadDealRoomData} // Trigger reload of main transaction data on status change
                  />
                )}
              </div>
            </TabsContent>

            {/* Phase 3: Documents Tab */}
            <TabsContent value="documents" className="flex-1 overflow-scroll p-6 pt-4">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Digital Document Management</h3>
                  <p className="text-gray-600">Generate, sign, and manage all transaction documents and RTO paperwork.</p>
                </div>

                {seller && buyer && currentUser && (
                  <DigitalDocumentManager
                    transaction={transaction}
                    vehicle={vehicle}
                    seller={seller}
                    buyer={buyer}
                    currentUser={currentUser}
                    isSellerView={isSellerView}
                    rtoApplication={rtoApplication} // Pass existing RTO application
                    onRTOApplicationCreated={loadDealRoomData} // Reload data when RTO app is created
                    onRTOStatusUpdate={loadDealRoomData} // Reload data when RTO status changes
                  />
                )}
              </div>
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 overflow-scroll p-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Deal Overview */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Complete Deal Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Transaction Timeline */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Transaction Timeline</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-gray-600">Offer Made:</span>
                            <span className="font-medium">{new Date(transaction.created_date).toLocaleDateString()}</span>
                          </div>
                          {transaction.status !== 'offer_made' && (
                            <div className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-gray-600">Deal Accepted:</span>
                              <span className="font-medium">{new Date(transaction.updated_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {transaction.transport_status === 'delivered' && (
                            <div className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-gray-600">Vehicle Delivered:</span>
                              <span className="font-medium">
                                {transaction.delivery_confirmed_at
                                  ? new Date(transaction.delivery_confirmed_at).toLocaleDateString()
                                  : 'Recently'
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Deal Metrics */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            ₹{((transaction.final_amount || transaction.offer_amount) / 100000).toFixed(1)}L
                          </div>
                          <div className="text-sm text-gray-600">Final Amount</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {Math.ceil((new Date() - new Date(transaction.created_date)) / (1000 * 60 * 60 * 24))}
                          </div>
                          <div className="text-sm text-gray-600">Days Active</div>
                        </div>
                      </div>

                      {/* Ratings Summary */}
                      {(transaction.seller_rating || transaction.buyer_rating) && (
                        <div className="pt-4 border-t">
                          <h4 className="font-medium mb-3">Deal Ratings</h4>
                          <div className="space-y-2">
                            {transaction.seller_rating && (
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm">Seller Rating:</span>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: transaction.seller_rating.rating }).map((_, i) => (
                                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    ))}
                                  </div>
                                  <span className="text-sm font-medium">{transaction.seller_rating.rating}/5</span>
                                </div>
                              </div>
                            )}
                            {transaction.buyer_rating && (
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm">Buyer Rating:</span>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: transaction.buyer_rating.rating }).map((_, i) => (
                                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    ))}
                                  </div>
                                  <span className="text-sm font-medium">{transaction.buyer_rating.rating}/5</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Deal Management Sidebar */}
                <div className="space-y-6">
                  <DealArchiveManager
                    transaction={transaction}
                    vehicle={vehicle}
                    otherParty={otherParty}
                    isSellerView={isSellerView}
                    onArchiveStatusChange={handleArchiveStatusChange}
                  />

                  {/* Other Party Profile Summary */}
                  {otherParty && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {isSellerView ? 'Buyer' : 'Seller'} Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="font-medium">{otherParty.business_name}</div>
                          <div className="text-sm text-gray-600">{otherParty.address || 'Address not provided'}</div>
                        </div>

                        <div className="flex items-center gap-4 pt-2 border-t">
                          <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-bold">{(otherParty.rating || 0).toFixed(1)}</span>
                            </div>
                            <div className="text-xs text-gray-600">Rating</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold">{otherParty.completed_deals || 0}</div>
                            <div className="text-xs text-gray-600">Deals</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Deal Completion Modal */}
      {transaction && vehicle && currentUser && currentDealer && otherParty && (
        <DealCompletionModal
          isOpen={showCompletionModal}
          onClose={handleCompletionModalClose}
          transaction={transaction}
          vehicle={vehicle}
          currentUser={currentUser}
          currentDealer={currentDealer}
          otherParty={otherParty}
          isSellerView={isSellerView}
        />
      )}

      {/* Phase 3: Payment Gateway Integration */}
      {showPaymentGateway && (
        <PaymentGatewayIntegration
          transaction={transaction}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
          isOpen={showPaymentGateway}
          onClose={() => setShowPaymentGateway(false)}
        />
      )}

      {/* Release Funds Dialog - Retained as it's critical for seller and not replaced by PaymentGatewayIntegration */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Release Escrow Funds
            </DialogTitle>
            <DialogDescription>
              Confirm that you have delivered the vehicle and are ready to complete this transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="font-medium text-green-900 mb-2">Amount to Release</div>
              <div className="text-2xl font-bold text-green-600">
                ₹{((transaction.final_amount || transaction.offer_amount) / 100000).toFixed(1)} Lakhs
              </div>
              <div className="text-sm text-green-700 mt-1">
                Will be transferred to your registered bank account
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Only release funds after confirming:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Vehicle has been delivered to buyer</li>
                  <li>All paperwork is complete</li>
                  <li>Buyer has taken possession</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => { // Direct implementation of release funds here
                setReleasingFunds(true);
                try {
                  const updatedMessages = [
                    ...(transaction.messages || []),
                    {
                      sender_id: currentDealer.id,
                      message: `Funds have been released. Deal completed successfully! ₹${((transaction.final_amount || transaction.offer_amount) / 100000).toFixed(1)}L transferred to seller.`,
                      timestamp: new Date().toISOString()
                    }
                  ];

                  const updatedTransaction = {
                    ...transaction,
                    status: 'completed',
                    escrow_status: 'released',
                    messages: updatedMessages
                  };

                  await Transaction.update(transaction.id, updatedTransaction);
                  setTransaction(updatedTransaction); // Update local state immediately

                  // Update vehicle status to sold
                  if (vehicle) {
                    await Vehicle.update(vehicle.id, { status: 'sold' });
                  }

                  setShowReleaseDialog(false);

                  // --- NOTIFICATION TRIGGER ---
                  const buyerUser = findUserForDealer(transaction.buyer_id);
                  if (buyerUser) {
                    const message = `Funds for the ${vehicle.year} ${vehicle.make} ${vehicle.model} have been released to the seller.`;
                    await Notification.create({
                      user_email: buyerUser.email,
                      message: message,
                      link: createPageUrl(`DealRoom?transactionId=${transaction.id}`),
                      type: 'payment',
                      icon: 'CheckCircle2'
                    });
                     await SendEmail({
                      to: buyerUser.email,
                      subject: `Funds Released for ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                      body: `<p>${message} This deal is now nearing completion.</p>`
                    });
                  }
                  // --- END NOTIFICATION TRIGGER ---

                  await loadDealRoomData(transaction.id);
                } catch (error) {
                  console.error('Error releasing funds:', error);
                  alert('Failed to release funds. Please try again.');
                } finally {
                  setReleasingFunds(false);
                }
              }}
              disabled={releasingFunds}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {releasingFunds ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Release Funds
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
