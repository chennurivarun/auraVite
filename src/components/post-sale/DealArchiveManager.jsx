import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Star
} from 'lucide-react';
import { Transaction } from '@/api/entities';

export default function DealArchiveManager({ 
  transaction, 
  vehicle, 
  otherParty, 
  isSellerView,
  onArchiveStatusChange 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleArchiveToggle = async () => {
    setLoading(true);
    setError('');

    try {
      const newArchivedStatus = !transaction.deal_archived;
      
      await Transaction.update(transaction.id, {
        ...transaction,
        deal_archived: newArchivedStatus,
        archived_at: newArchivedStatus ? new Date().toISOString() : null
      });

      onArchiveStatusChange(newArchivedStatus);
    } catch (err) {
      console.error('Failed to update archive status:', err);
      setError('Failed to update archive status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = transaction.status === 'completed' && transaction.transport_status === 'delivered';
  const hasRating = isSellerView ? transaction.seller_rating : transaction.buyer_rating;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="w-5 h-5" />
          Deal Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Deal Status Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Deal Status:</span>
            <Badge className={isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {isCompleted ? 'Completed' : 'In Progress'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Delivery Status:</span>
            <Badge className={transaction.transport_status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
              {transaction.transport_status === 'delivered' ? 'Delivered' : 'In Transit'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Rating Status:</span>
            <div className="flex items-center gap-2">
              {hasRating ? (
                <>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: hasRating.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <Badge className="bg-green-100 text-green-800">Rated</Badge>
                </>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">Not Rated</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Archive Actions */}
        {isCompleted ? (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              This deal is ready for archiving
            </div>
            
            <Button
              onClick={handleArchiveToggle}
              disabled={loading}
              variant={transaction.deal_archived ? "outline" : "default"}
              className="w-full"
            >
              {loading ? (
                <Clock className="w-4 h-4 mr-2 animate-spin" />
              ) : transaction.deal_archived ? (
                <RotateCcw className="w-4 h-4 mr-2" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              {transaction.deal_archived ? 'Restore from Archive' : 'Archive This Deal'}
            </Button>

            {transaction.deal_archived && (
              <Alert>
                <Archive className="h-4 w-4" />
                <AlertDescription>
                  This deal is archived and hidden from your active transactions. 
                  You can restore it anytime or view it in your archived deals.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Deal archiving will be available once the transaction is completed and delivery is confirmed.
            </AlertDescription>
          </Alert>
        )}

        {/* Deal Summary for Reference */}
        <div className="bg-gray-50 rounded-lg p-3 mt-4">
          <h4 className="font-medium text-sm mb-2">Deal Summary</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Vehicle:</span>
              <span>{vehicle?.year} {vehicle?.make} {vehicle?.model}</span>
            </div>
            <div className="flex justify-between">
              <span>Final Amount:</span>
              <span className="font-medium">₹{((transaction.final_amount || transaction.offer_amount) / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex justify-between">
              <span>{isSellerView ? 'Buyer' : 'Seller'}:</span>
              <span>{otherParty?.business_name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed:</span>
              <span>{new Date(transaction.updated_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}