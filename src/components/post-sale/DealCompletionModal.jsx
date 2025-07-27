import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  CheckCircle2, 
  PartyPopper, 
  Trophy,
  DollarSign,
  Clock,
  MessageSquare,
  ThumbsUp,
  Loader2,
  Award
} from 'lucide-react';
import { Transaction, Dealer, Vehicle } from '@/api/entities';

export default function DealCompletionModal({ 
  isOpen, 
  onClose, 
  transaction, 
  vehicle, 
  currentUser, 
  currentDealer,
  otherParty,
  isSellerView 
}) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleStarClick = (starNumber) => {
    setRating(starNumber);
  };

  const handleStarHover = (starNumber) => {
    setHoveredRating(starNumber);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      setError('Please provide a star rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Update the other party's rating and completed deals
      if (otherParty) {
        const currentRating = otherParty.rating || 0;
        const currentDeals = otherParty.completed_deals || 0;
        
        // Calculate new average rating
        const newTotalRating = (currentRating * currentDeals) + rating;
        const newDealsCount = currentDeals + 1;
        const newAverageRating = newTotalRating / newDealsCount;

        await Dealer.update(otherParty.id, {
          rating: newAverageRating,
          completed_deals: newDealsCount
        });
      }

      // Update current dealer's completed deals count
      if (currentDealer) {
        const currentDeals = currentDealer.completed_deals || 0;
        await Dealer.update(currentDealer.id, {
          completed_deals: currentDeals + 1
        });
      }

      // Update vehicle status to sold
      if (vehicle) {
        await Vehicle.update(vehicle.id, {
          status: 'sold'
        });
      }

      // Mark transaction as fully completed with rating
      const ratingData = {
        rating: rating,
        review: review,
        rated_by: currentDealer?.id,
        rated_at: new Date().toISOString()
      };

      const updatedMessages = [
        ...transaction.messages,
        {
          sender_id: currentDealer?.id,
          message: `Deal completed successfully! ${currentDealer?.business_name} rated ${otherParty?.business_name} ${rating} stars.`,
          timestamp: new Date().toISOString(),
          type: 'system'
        }
      ];

      await Transaction.update(transaction.id, {
        ...transaction,
        status: 'completed',
        [isSellerView ? 'seller_rating' : 'buyer_rating']: ratingData,
        deal_archived: false, // Ready for archiving but not yet archived
        messages: updatedMessages
      });

      onClose(true); // Pass true to indicate successful completion
    } catch (err) {
      console.error('Failed to submit rating:', err);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (stars) => {
    const labels = {
      1: 'Poor',
      2: 'Fair', 
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return labels[stars] || '';
  };

  const dealValue = (transaction.final_amount || transaction.offer_amount) / 100000;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="text-center">
            <PartyPopper className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <DialogTitle className="text-2xl mb-2">Deal Completed Successfully!</DialogTitle>
            <DialogDescription>
              Congratulations on completing your ₹{dealValue.toFixed(1)}L transaction
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Deal Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Transaction Summary</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle:</span>
                <span className="font-medium">{vehicle?.year} {vehicle?.make} {vehicle?.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Final Price:</span>
                <span className="font-bold text-green-600">₹{dealValue.toFixed(1)}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{isSellerView ? 'Buyer' : 'Seller'}:</span>
                <span className="font-medium">{otherParty?.business_name || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Rating Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium mb-2">
                Rate Your Experience with {otherParty?.business_name}
              </h4>
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => handleStarHover(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition-colors"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        star <= (hoveredRating || rating) 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-gray-300'
                      }`} 
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  {rating} Star{rating !== 1 ? 's' : ''} - {getRatingLabel(rating)}
                </Badge>
              )}
            </div>

            {/* Review Text */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Review (Optional)
              </label>
              <Textarea
                placeholder={`Share your experience working with ${otherParty?.business_name}...`}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Benefits Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">What Happens Next</span>
            </div>
            <ul className="space-y-1 text-sm text-blue-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" />
                Your rating builds {otherParty?.business_name}'s reputation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" />
                Your completed deals count increases
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" />
                This transaction will be archived automatically
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={submitting}>
            Skip Rating
          </Button>
          <Button onClick={handleSubmitRating} disabled={submitting} className="momentum-btn-accent">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ThumbsUp className="w-4 h-4 mr-2" />
                Complete Deal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}