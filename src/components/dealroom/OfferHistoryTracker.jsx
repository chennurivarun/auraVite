import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowUp, 
  ArrowDown, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  Clock,
  Handshake
} from 'lucide-react';

export default function OfferHistoryTracker({ messages = [], currentUser, seller, buyer }) {
  // Parse messages to extract only negotiation-related events
  const parseOfferHistory = () => {
    const offerEvents = [];
    
    messages.forEach((message, index) => {
      const msg = message.message.toLowerCase();
      const isCurrentUserSender = message.sender_id === currentUser?.id;
      const senderName = isCurrentUserSender ? 'You' : 
        (message.sender_id === seller?.id ? seller?.business_name : buyer?.business_name) || 'Unknown';
      
      // Detect different types of negotiation events
      if (msg.includes('initial offer') || msg.includes('offer of ₹')) {
        const priceMatch = message.message.match(/₹([\d.]+)L/);
        const amount = priceMatch ? priceMatch[1] : 'N/A';
        
        offerEvents.push({
          id: `${message.timestamp}-${index}`,
          type: 'offer_made',
          amount: amount,
          sender: senderName,
          timestamp: message.timestamp,
          isCurrentUser: isCurrentUserSender,
          message: message.message
        });
      } else if (msg.includes('counter-offer') || msg.includes('counter offer')) {
        const priceMatch = message.message.match(/₹([\d.]+)L/);
        const amount = priceMatch ? priceMatch[1] : 'N/A';
        
        offerEvents.push({
          id: `${message.timestamp}-${index}`,
          type: 'counter_offer',
          amount: amount,
          sender: senderName,
          timestamp: message.timestamp,
          isCurrentUser: isCurrentUserSender,
          message: message.message
        });
      } else if (msg.includes('accepted') || msg.includes('has been accepted')) {
        const priceMatch = message.message.match(/₹([\d.]+)L/);
        const amount = priceMatch ? priceMatch[1] : 'N/A';
        
        offerEvents.push({
          id: `${message.timestamp}-${index}`,
          type: 'offer_accepted',
          amount: amount,
          sender: senderName,
          timestamp: message.timestamp,
          isCurrentUser: isCurrentUserSender,
          message: message.message
        });
      } else if (msg.includes('rejected') || msg.includes('has been rejected')) {
        const priceMatch = message.message.match(/₹([\d.]+)L/);
        const amount = priceMatch ? priceMatch[1] : 'N/A';
        
        offerEvents.push({
          id: `${message.timestamp}-${index}`,
          type: 'offer_rejected',
          amount: amount,
          sender: senderName,
          timestamp: message.timestamp,
          isCurrentUser: isCurrentUserSender,
          message: message.message
        });
      }
    });
    
    // Sort by timestamp (oldest first)
    return offerEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'offer_made':
        return <ArrowUp className="w-4 h-4 text-blue-600" />;
      case 'counter_offer':
        return <ArrowDown className="w-4 h-4 text-orange-600" />;
      case 'offer_accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'offer_rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventBadge = (type) => {
    const configs = {
      offer_made: { color: 'bg-blue-100 text-blue-800', text: 'Offer Made' },
      counter_offer: { color: 'bg-orange-100 text-orange-800', text: 'Counter Offer' },
      offer_accepted: { color: 'bg-green-100 text-green-800', text: 'Accepted' },
      offer_rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };
    
    const config = configs[type] || { color: 'bg-gray-100 text-gray-800', text: 'Unknown' };
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const offerHistory = parseOfferHistory();

  if (offerHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Handshake className="w-5 h-5" />
            Negotiation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">No negotiation events yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Offers, counter-offers, and decisions will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Handshake className="w-5 h-5" />
          Negotiation History
          <Badge variant="outline" className="ml-auto">
            {offerHistory.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-64 overflow-y-auto">
          {offerHistory.map((event, index) => (
            <div key={event.id}>
              <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                event.isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {event.sender}
                      </span>
                      {getEventBadge(event.type)}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 mb-1">
                    ₹{event.amount}L
                  </div>
                  <div className="text-xs text-gray-600">
                    {event.message}
                  </div>
                </div>
              </div>
              {index < offerHistory.length - 1 && (
                <div className="flex justify-center my-2">
                  <div className="w-px h-4 bg-gray-300"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}