import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wand2, 
  RotateCcw, 
  Video, 
  Image, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { DataManager } from './DataManager';

export default function ImageProcessingControls({ vehicle, onProcessingUpdate }) {
  const [processing, setProcessing] = useState({
    images: false,
    view360: false,
    reel: false,
    marketing: false
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const hasImages = vehicle.image_urls && vehicle.image_urls.length > 0;
  const hasProcessedImages = vehicle.processed_image_urls && vehicle.processed_image_urls.length > 0;
  const has360View = vehicle['360_view_url'];
  const hasReel = vehicle.reel_url;
  const hasMarketingContent = vehicle.marketing_content_urls && vehicle.marketing_content_urls.length > 0;

  const handleProcessImages = async () => {
    if (!hasImages) {
      setError('No images available for processing');
      return;
    }

    setProcessing(prev => ({ ...prev, images: true }));
    setError(null);
    setSuccess(null);

    try {
      console.log(`[ImageProcessingControls] Processing images for vehicle ${vehicle.id}`);
      
      const result = await DataManager.processVehicleImages(
        vehicle.id, 
        vehicle.image_urls,
        { uniform_background: true, enhance_quality: true }
      );
      
      console.log('[ImageProcessingControls] Image processing result:', result);
      setSuccess(`Successfully processed ${result.processedUrls?.length || 0} images with uniform backgrounds`);
      
      // Notify parent component
      if (onProcessingUpdate) {
        onProcessingUpdate(vehicle.id, 'images');
      }
      
    } catch (error) {
      console.error('[ImageProcessingControls] Image processing error:', error);
      setError(`Image processing failed: ${error.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, images: false }));
    }
  };

  const handleGenerate360View = async () => {
    if (!hasImages || vehicle.image_urls.length < 8) {
      setError('At least 8 images are required for 360° view generation');
      return;
    }

    setProcessing(prev => ({ ...prev, view360: true }));
    setError(null);
    setSuccess(null);

    try {
      console.log(`[ImageProcessingControls] Generating 360° view for vehicle ${vehicle.id}`);
      
      const result = await DataManager.generate360View(
        vehicle.id, 
        vehicle.image_urls,
        { autoplay: true, controls: true }
      );
      
      console.log('[ImageProcessingControls] 360° view generation result:', result);
      setSuccess('Successfully generated interactive 360° view');
      
      // Notify parent component
      if (onProcessingUpdate) {
        onProcessingUpdate(vehicle.id, '360');
      }
      
    } catch (error) {
      console.error('[ImageProcessingControls] 360° view generation error:', error);
      setError(`360° view generation failed: ${error.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, view360: false }));
    }
  };

  const handleGenerateReel = async () => {
    if (!hasImages || vehicle.image_urls.length < 3) {
      setError('At least 3 images are required for reel generation');
      return;
    }

    setProcessing(prev => ({ ...prev, reel: true }));
    setError(null);
    setSuccess(null);

    try {
      console.log(`[ImageProcessingControls] Generating marketing reel for vehicle ${vehicle.id}`);
      
      const imageUrls = hasProcessedImages ? vehicle.processed_image_urls : vehicle.image_urls;
      
      const result = await DataManager.generateMarketingReel(
        vehicle.id, 
        imageUrls,
        { 
          duration: 15, 
          music_style: 'upbeat', 
          transition_style: 'smooth',
          include_text: true,
          branding: true
        }
      );
      
      console.log('[ImageProcessingControls] Marketing reel generation result:', result);
      setSuccess('Successfully generated marketing reel for social media');
      
      // Notify parent component
      if (onProcessingUpdate) {
        onProcessingUpdate(vehicle.id, 'reel');
      }
      
    } catch (error) {
      console.error('[ImageProcessingControls] Marketing reel generation error:', error);
      setError(`Marketing reel generation failed: ${error.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, reel: false }));
    }
  };

  const handleGenerateMarketingContent = async () => {
    if (!hasImages) {
      setError('No images available for marketing content generation');
      return;
    }

    setProcessing(prev => ({ ...prev, marketing: true }));
    setError(null);
    setSuccess(null);

    try {
      console.log(`[ImageProcessingControls] Generating marketing content for vehicle ${vehicle.id}`);
      
      const imageUrls = hasProcessedImages ? vehicle.processed_image_urls : vehicle.image_urls;
      
      const result = await DataManager.generateMarketingContent(
        vehicle.id, 
        imageUrls,
        { 
          platforms: ['instagram', 'facebook', 'whatsapp'],
          content_types: ['social_post', 'story_template', 'ad_creative', 'brochure'],
          include_branding: true,
          include_price: true,
          include_features: true
        }
      );
      
      console.log('[ImageProcessingControls] Marketing content generation result:', result);
      setSuccess(`Successfully generated ${result.marketingAssets?.length || 0} marketing assets`);
      
      // Notify parent component
      if (onProcessingUpdate) {
        onProcessingUpdate(vehicle.id, 'marketing');
      }
      
    } catch (error) {
      console.error('[ImageProcessingControls] Marketing content generation error:', error);
      setError(`Marketing content generation failed: ${error.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, marketing: false }));
    }
  };

  const getProcessingStatus = (type) => {
    const statusField = type === '360' ? '360_processing_status' : `${type}_processing_status`;
    return vehicle[statusField] || 'none';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processing':
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 animate-pulse">Processing...</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Enhancement & Marketing Tools
          </CardTitle>
          <p className="text-sm text-gray-600">
            Transform your vehicle images into professional marketing assets using AI.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Messages */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Processing Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image Processing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">Uniform Background</span>
                </div>
                {getStatusBadge(getProcessingStatus('image'))}
              </div>
              <p className="text-sm text-gray-600">
                Remove backgrounds and create professional uniform look
              </p>
              <Button
                onClick={handleProcessImages}
                disabled={!hasImages || processing.images || getProcessingStatus('image') === 'processing'}
                variant={hasProcessedImages ? "outline" : "default"}
                className="w-full"
              >
                {processing.images ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Images...
                  </>
                ) : hasProcessedImages ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reprocess Images
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Process Images ({vehicle.image_urls?.length || 0})
                  </>
                )}
              </Button>
            </div>

            {/* 360 View Generation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-cyan-600" />
                  <span className="font-medium">360° View</span>
                </div>
                {getStatusBadge(getProcessingStatus('360'))}
              </div>
              <p className="text-sm text-gray-600">
                Create interactive 360° view (requires 8+ images)
              </p>
              <Button
                onClick={handleGenerate360View}
                disabled={!hasImages || vehicle.image_urls?.length < 8 || processing.view360 || getProcessingStatus('360') === 'processing'}
                variant={has360View ? "outline" : "default"}
                className="w-full"
              >
                {processing.view360 ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating 360° View...
                  </>
                ) : has360View ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate 360° View
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Generate 360° View
                  </>
                )}
              </Button>
              {hasImages && vehicle.image_urls?.length < 8 && (
                <p className="text-xs text-orange-600">
                  Need {8 - (vehicle.image_urls?.length || 0)} more images for 360° view
                </p>
              )}
            </div>

            {/* Marketing Reel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-pink-600" />
                  <span className="font-medium">Marketing Reel</span>
                </div>
                {getStatusBadge(getProcessingStatus('reel'))}
              </div>
              <p className="text-sm text-gray-600">
                Generate short video reel for social media (requires 3+ images)
              </p>
              <Button
                onClick={handleGenerateReel}
                disabled={!hasImages || vehicle.image_urls?.length < 3 || processing.reel || getProcessingStatus('reel') === 'processing'}
                variant={hasReel ? "outline" : "default"}
                className="w-full"
              >
                {processing.reel ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Reel...
                  </>
                ) : hasReel ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Reel
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Generate Marketing Reel
                  </>
                )}
              </Button>
            </div>

            {/* Marketing Content */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-orange-600" />
                  <span className="font-medium">Marketing Content</span>
                </div>
                {getStatusBadge(getProcessingStatus('marketing_content'))}
              </div>
              <p className="text-sm text-gray-600">
                Generate social posts, brochures, and ad creatives
              </p>
              <Button
                onClick={handleGenerateMarketingContent}
                disabled={!hasImages || processing.marketing || getProcessingStatus('marketing_content') === 'processing'}
                variant={hasMarketingContent ? "outline" : "default"}
                className="w-full"
              >
                {processing.marketing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Content...
                  </>
                ) : hasMarketingContent ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Content
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4 mr-2" />
                    Generate Marketing Content
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Processing Progress Info */}
          {Object.values(processing).some(p => p) && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="font-medium text-blue-800">Processing in progress...</span>
              </div>
              <p className="text-sm text-blue-700">
                AI enhancement is being applied to your vehicle images. This may take a few moments.
              </p>
            </div>
          )}

          {/* Assets Summary */}
          {(hasProcessedImages || has360View || hasReel || hasMarketingContent) && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Generated Assets:</h4>
              <div className="flex flex-wrap gap-2">
                {hasProcessedImages && (
                  <Badge className="bg-purple-100 text-purple-800">
                    <Wand2 className="w-3 h-3 mr-1" />
                    Processed Images ({vehicle.processed_image_urls?.length})
                  </Badge>
                )}
                {has360View && (
                  <Badge className="bg-cyan-100 text-cyan-800">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    360° View
                  </Badge>
                )}
                {hasReel && (
                  <Badge className="bg-pink-100 text-pink-800">
                    <Video className="w-3 h-3 mr-1" />
                    Marketing Reel
                  </Badge>
                )}
                {hasMarketingContent && (
                  <Badge className="bg-orange-100 text-orange-800">
                    <Image className="w-3 h-3 mr-1" />
                    Marketing Content ({vehicle.marketing_content_urls?.length})
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}