import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Car,
  Star,
  Calendar,
  DollarSign,
  Eye,
  Archive,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TransactionCard({ 
  transaction, 
  vehicle, 
  otherParty, 
  isSellerView,
  showArchived = false 
}) {
  const getStatusBadge = (status) => {
    const statusColors = {
      offer_made: "bg-blue-100 text-blue-800",
      negotiating: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      payment_pending: "bg-orange-100 text-orange-800",
      in_escrow: "bg-purple-100 text-purple-800",
      in_transit: "bg-indigo-100 text-indigo-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };

    const statusLabels = {
      offer_made: "Offer Made",
      negotiating: "Negotiating", 
      accepted: "Accepted",
      payment_pending: "Payment Pending",
      in_escrow: "In Escrow",
      in_transit: "In Transit",
      completed: "Completed",
      cancelled: "Cancelled"
    };

    return (
      <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
        {statusLabels[status] || status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const dealValue = (transaction.final_amount || transaction.offer_amount) / 100000;
  const hasRating = isSellerView ? transaction.seller_rating : transaction.buyer_rating;

  return (
    <Card className={`momentum-card ${transaction.deal_archived ? 'opacity-75 bg-gray-50' : ''}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold">
                  {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle Not Found'}
                </h3>
                {transaction.deal_archived && (
                  <Archive className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(transaction.status)}
                <Badge variant={isSellerView ? 'destructive' : 'default'}>
                  {isSellerView ? 'Selling' : 'Buying'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-600">
                ₹{dealValue.toFixed(1)}L
              </div>
              {transaction.final_amount && transaction.final_amount !== transaction.offer_amount && (
                <div className="text-xs text-gray-500">
                  Listed: ₹{(vehicle?.price / 100000).toFixed(1)}L
                </div>
              )}
            </div>
          </div>

          {/* Other Party Info */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">
                {isSellerView ? 'Buyer' : 'Seller'}: {otherParty?.business_name || 'Unknown Dealer'}
              </div>
              {otherParty && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{(otherParty.rating || 0).toFixed(1)}</span>
                  <span>•</span>
                  <span>{otherParty.completed_deals || 0} deals</span>
                </div>
              )}
            </div>
            
            {/* Rating Display */}
            {hasRating && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">Rated:</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: hasRating.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Transaction Timeline */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(transaction.created_date).toLocaleDateString()}</span>
            </div>
            {transaction.status === 'completed' && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>Completed</span>
              </div>
            )}
            {transaction.deal_archived && (
              <div className="flex items-center gap-1">
                <Archive className="w-3 h-3 text-gray-400" />
                <span>Archived</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Link to={createPageUrl(`DealRoom?transactionId=${transaction.id}`)}>
              <Button size="sm" variant="outline">
                <Eye className="w-4 h-4 mr-1" />
                View Deal
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}