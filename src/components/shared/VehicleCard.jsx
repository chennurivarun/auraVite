import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Fuel, 
  Settings, 
  MapPin, 
  Shield, 
  CheckCircle2,
  MessageSquare,
  Heart,
  Share2,
  Eye,
  Car,
  Star,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Wand2,
  RotateCcw
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LazyImage from './LazyImage';
import { SecurityValidator } from './SecurityValidator';

export default function VehicleCard({ 
  vehicle, 
  dealer = null,
  onClick, 
  isSelected = false, 
  showActions = false,
  showCredibility = false,
  size = "default",
  matchScore = null,
  matchJustification = null
}) {
  if (!vehicle) {
    return (
      <Card className="momentum-card">
        <CardContent className="p-4">
          <div className="text-center py-8">
            <Car className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Vehicle data not available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sanitize display data for security
  const sanitizedVehicle = {
    ...vehicle,
    make: SecurityValidator.sanitizeInput(vehicle.make),
    model: SecurityValidator.sanitizeInput(vehicle.model),
    description: SecurityValidator.sanitizeInput(vehicle.description)
  };

  const isPlatformCertified = vehicle.rc_verified && vehicle.inspection_score >= 85;

  // Check for AI-enhanced features
  const hasProcessedImages = vehicle.processed_image_urls && vehicle.processed_image_urls.length > 0;
  const has360View = vehicle['360_view_url'];
  const imageProcessingStatus = vehicle.image_processing_status || 'none';
  const view360Status = vehicle['360_processing_status'] || 'none';

  const getStatusBadge = (status) => {
    const statusColors = {
      draft: "bg-gray-100 text-gray-800",
      live: "bg-green-100 text-green-800",
      in_transaction: "bg-blue-100 text-blue-800",
      sold: "bg-purple-100 text-purple-800"
    };

    return (
      <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
        {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
      </Badge>
    );
  };

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return 'Price not set';
    return `₹${(price / 100000).toFixed(1)}L`;
  };

  const renderDealerRating = () => {
    if (!dealer || !showCredibility) return null;
    
    return (
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        <span className="font-medium">{(dealer.rating || 0).toFixed(1)}</span>
        <span>•</span>
        <TrendingUp className="w-3 h-3" />
        <span>{dealer.completed_deals || 0} deals</span>
      </div>
    );
  };

  const renderMatchScore = () => {
    if (typeof matchScore !== 'number' || matchScore === null) return null;
    
    let colorClass = 'text-gray-600 bg-gray-100';
    if (matchScore >= 80) colorClass = 'text-green-800 bg-green-100';
    else if (matchScore >= 60) colorClass = 'text-yellow-800 bg-yellow-100';

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 font-bold p-2 rounded-lg ${colorClass}`}>
              <Sparkles className="w-5 h-5" />
              <span>{matchScore}% Match</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{matchJustification || 'AI-generated match score based on your search.'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Determine which image to show: processed or original
  const displayImageUrl = hasProcessedImages && vehicle.processed_image_urls[0] 
    ? vehicle.processed_image_urls[0] 
    : (sanitizedVehicle.image_urls?.[0] || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400');

  return (
    <div 
      className={`momentum-card cursor-pointer transition-all duration-300 hover:shadow-lg relative group ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      } ${size === 'compact' ? 'p-3' : 'p-4'}`}
      onClick={() => onClick(sanitizedVehicle)}
    >
      {/* Vehicle Image with Lazy Loading */}
      <div className={`relative ${size === 'compact' ? 'aspect-[16/9]' : 'aspect-[4/3]'} rounded-lg overflow-hidden bg-gray-100 mb-4`}>
        <LazyImage
          src={displayImageUrl}
          alt={`${sanitizedVehicle.year || ''} ${sanitizedVehicle.make || ''} ${sanitizedVehicle.model || ''}`}
          className="w-full h-full object-cover"
          fallback={
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Car className="w-8 h-8 mb-2" />
              <span className="text-sm">No Image</span>
            </div>
          }
        />
        
        {/* Status Badge Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {getStatusBadge(sanitizedVehicle.status)}
          {isPlatformCertified && (
            <Badge className="bg-indigo-100 text-indigo-800">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Certified
            </Badge>
          )}
        </div>
        
        {/* AI Enhancement Indicators */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          {/* Verification Badge */}
          {sanitizedVehicle.rc_verified && !isPlatformCertified && (
            <Badge className="bg-blue-100 text-blue-800">
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
          
          {/* AI Enhancement Badges */}
          {hasProcessedImages && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-purple-100 text-purple-800">
                    <Wand2 className="w-3 h-3 mr-1" />
                    AI Enhanced
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Images processed with uniform background</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {has360View && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-cyan-100 text-cyan-800">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    360° View
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Interactive 360-degree view available</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Processing Status Indicator */}
        {(imageProcessingStatus === 'processing' || view360Status === 'processing') && (
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-blue-100 text-blue-800 animate-pulse">
              <Wand2 className="w-3 h-3 mr-1 animate-spin" />
              Processing...
            </Badge>
          </div>
        )}
      </div>

      {/* Vehicle Info */}
      <div className="p-4 space-y-3 -mt-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg truncate">
              {sanitizedVehicle.year || 'N/A'} {sanitizedVehicle.make || 'Unknown'} {sanitizedVehicle.model || 'Model'}
            </h3>
            <div className="text-2xl font-bold text-blue-600">
              {formatPrice(sanitizedVehicle.price)}
            </div>
          </div>
          {renderMatchScore()}
        </div>

        {/* Vehicle Details */}
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{sanitizedVehicle.year || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Fuel className="w-3 h-3" />
            <span className="capitalize">{sanitizedVehicle.fuel_type || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Settings className="w-3 h-3" />
            <span className="capitalize">{sanitizedVehicle.transmission || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{sanitizedVehicle.kilometers ? `${sanitizedVehicle.kilometers.toLocaleString()} km` : 'N/A'}</span>
          </div>
        </div>

        {/* Features */}
        {sanitizedVehicle.features && sanitizedVehicle.features.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex flex-wrap gap-2">
              {sanitizedVehicle.features.slice(0, 4).map(feature => (
                <Badge key={feature} variant="secondary">{feature}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Inspection Score */}
        {sanitizedVehicle.inspection_score > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">
              Inspection Score: {sanitizedVehicle.inspection_score}/100
            </span>
          </div>
        )}

        {/* Dealer Credibility (if marketplace context) */}
        {showCredibility && renderDealerRating()}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-2 pt-3 border-t">
            <Button className="flex-1 momentum-btn-accent" size="sm">
              <MessageSquare className="w-4 h-4 mr-1" />
              Make Offer
            </Button>
            <Button variant="outline" size="sm">
              <Heart className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Days in Stock */}
        {sanitizedVehicle.days_in_stock > 0 && (
          <div className="text-xs text-gray-500 pt-2">
            Listed {sanitizedVehicle.days_in_stock} days ago
          </div>
        )}
      </div>
    </div>
  );
}
