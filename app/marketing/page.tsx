
import React, { useState, useEffect, useCallback } from 'react';
import { Vehicle, Dealer } from '@/api/entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Wand2,
  Video,
  Image as ImageIcon,
  RotateCcw,
  Download,
  Share2,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Eye,
  ExternalLink,
  TrendingUp, // New import for analytics
  Star // New import for feedback/rating
} from 'lucide-react';
import { DataManager } from '../components/shared/DataManager';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import PermissionGuard from '../components/shared/PermissionGuard';
import SocialMediaIntegration from '../components/marketing/SocialMediaIntegration';
import EnhancedAssetGallery from '../components/marketing/EnhancedAssetGallery';
import AIFeedbackSystem from '../components/marketing/AIFeedbackSystem';

/**
 * @typedef {object} MarketingAsset
 * @property {string} id - Unique ID for this specific asset
 * @property {string} vehicleId
 * @property {string} vehicleName
 * @property {'enhanced_image' | '360_view' | 'marketing_reel' | 'marketing_content'} asset_type
 * @property {string} url - The primary URL for the asset (if applicable)
 * @property {string} thumbnail_url - A URL for a smaller preview
 * @property {string} [platform] - e.g., 'website', 'facebook', 'instagram', 'youtube'
 * @property {string} [created_date] - ISO date string
 * @property {number} [dealer_rating] - 1-5
 * @property {object} [performance_metrics]
 * @property {number} performance_metrics.views
 * @property {number} performance_metrics.shares
 * @property {number} performance_metrics.clicks
 * @property {number} performance_metrics.leads_generated
 * @property {Array<{platform: string, url: string, date: string}>} [social_media_posts]
 */

/**
 * Helper function to generate dummy asset data from vehicles.
 * @param {import('@/api/entities').Vehicle[]} vehicles - An array of vehicle objects.
 * @returns {MarketingAsset[]} An array of marketing asset objects.
 */
const generateAssetsFromVehicles = (vehicles) => {
  const assets = [];
  vehicles.forEach(vehicle => {
    const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const baseThumbnail = vehicle.processed_image_urls?.[0] || vehicle.image_urls?.[0] || '';

    // Enhanced Images
    vehicle.processed_image_urls?.forEach((url, index) => {
      assets.push({
        id: `${vehicle.id}-image-${index}`,
        vehicleId: vehicle.id,
        vehicleName: vehicleName,
        asset_type: 'enhanced_image',
        url: url,
        thumbnail_url: url,
        created_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date in last 30 days
        dealer_rating: Math.floor(Math.random() * 5) + 1,
        performance_metrics: {
          views: Math.floor(Math.random() * 10000),
          shares: Math.floor(Math.random() * 500),
          clicks: Math.floor(Math.random() * 200),
          leads_generated: Math.floor(Math.random() * 10)
        },
        social_media_posts: Math.random() > 0.5 ? [{ platform: 'facebook', url: 'https://example.com/fb-post', date: new Date().toISOString() }] : [],
        platform: 'website'
      });
    });

    // 360 View
    if (vehicle['360_view_url']) {
      assets.push({
        id: `${vehicle.id}-360`,
        vehicleId: vehicle.id,
        vehicleName: vehicleName,
        asset_type: '360_view',
        url: vehicle['360_view_url'],
        thumbnail_url: baseThumbnail, // Use a base image as thumbnail
        created_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        dealer_rating: Math.floor(Math.random() * 5) + 1,
        performance_metrics: {
          views: Math.floor(Math.random() * 5000),
          shares: Math.floor(Math.random() * 200),
          clicks: Math.floor(Math.random() * 100),
          leads_generated: Math.floor(Math.random() * 5)
        },
        social_media_posts: Math.random() > 0.5 ? [{ platform: 'website', url: 'https://example.com/360-link', date: new Date().toISOString() }] : [],
        platform: 'website'
      });
    }

    // Marketing Reel
    if (vehicle.reel_url) {
      assets.push({
        id: `${vehicle.id}-reel`,
        vehicleId: vehicle.id,
        vehicleName: vehicleName,
        asset_type: 'marketing_reel',
        url: vehicle.reel_url,
        thumbnail_url: baseThumbnail, // Use a base image as thumbnail
        created_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        dealer_rating: Math.floor(Math.random() * 5) + 1,
        performance_metrics: {
          views: Math.floor(Math.random() * 8000),
          shares: Math.floor(Math.random() * 300),
          clicks: Math.floor(Math.random() * 150),
          leads_generated: Math.floor(Math.random() * 8)
        },
        social_media_posts: Math.random() > 0.5 ? [{ platform: 'youtube', url: 'https://example.com/yt-link', date: new Date().toISOString() }] : [],
        platform: 'youtube'
      });
    }

    // Marketing Content (assuming it's text snippets or similar with potential URLs)
    vehicle.marketing_content_urls?.forEach((content, index) => {
      assets.push({
        id: `${vehicle.id}-content-${index}`,
        vehicleId: vehicle.id,
        vehicleName: vehicleName,
        asset_type: 'marketing_content',
        url: content.url || '', // Use the content's URL if available
        thumbnail_url: baseThumbnail, // For display in gallery if needed
        created_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        dealer_rating: Math.floor(Math.random() * 5) + 1,
        performance_metrics: {
          views: Math.floor(Math.random() * 3000),
          shares: Math.floor(Math.random() * 100),
          clicks: Math.floor(Math.random() * 50),
          leads_generated: Math.floor(Math.random() * 3)
        },
        social_media_posts: Math.random() > 0.5 ? [{ platform: 'linkedin', url: 'https://example.com/li-post', date: new Date().toISOString() }] : [],
        platform: 'website'
      });
    });
  });
  return assets;
};

export default function Marketing() {
  const [loading, setLoading] = useState(true);
  const [currentDealer, setCurrentDealer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [marketingSummary, setMarketingSummary] = useState({});
  const [processingQueue, setProcessingQueue] = useState({});
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  // New states from outline
  const [assets, setAssets] = useState([]); // Derived assets for gallery/feedback/analytics
  const [selectedAssets, setSelectedAssets] = useState([]); // Placeholder for potential asset selection
  const [showFeedbackSystem, setShowFeedbackSystem] = useState(false); // Placeholder for potential feedback system display toggle

  const loadMarketingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await DataManager.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const dealer = await DataManager.getDealerByUserEmail(user.email);
      if (!dealer) throw new Error('Dealer profile not found');

      setCurrentDealer(dealer);

      // Load vehicles and marketing data in parallel
      const [vehiclesData, summaryData, queueData] = await Promise.all([
        DataManager.getVehiclesByDealer(dealer.id),
        DataManager.getMarketingAssetsSummary(dealer.id),
        DataManager.getProcessingQueue(dealer.id)
      ]);

      setVehicles(vehiclesData);
      // Generate assets from vehicles for the new sections
      setAssets(generateAssetsFromVehicles(vehiclesData));
      setMarketingSummary(summaryData);
      setProcessingQueue(queueData);

    } catch (error) {
      console.error('Error loading marketing data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarketingData();
  }, [loadMarketingData]);

  const handleVehicleSelection = (vehicleId, checked) => {
    setSelectedVehicles(prev =>
      checked
        ? [...prev, vehicleId]
        : prev.filter(id => id !== vehicleId)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedVehicles(checked ? vehicles.map(v => v.id) : []);
  };

  const handleBatchProcess = async (actionType) => {
    if (selectedVehicles.length === 0) {
      alert('Please select at least one vehicle to process.');
      return;
    }

    setBatchProcessing(true);
    try {
      console.log(`Starting batch ${actionType} for ${selectedVehicles.length} vehicles`);

      const result = await DataManager.batchProcessVehicles(selectedVehicles, actionType);

      console.log('Batch processing completed:', result);

      alert(`Batch processing completed! Success: ${result.successful}, Failed: ${result.failed}`);

      setSelectedVehicles([]);
      await loadMarketingData();

    } catch (error) {
      console.error('Batch processing failed:', error);
      alert('Batch processing failed: ' + error.message);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleSingleVehicleProcess = async (vehicleId, actionType) => {
    try {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (!vehicle) return;

      const imageUrls = vehicle.processed_image_urls?.length > 0
        ? vehicle.processed_image_urls
        : vehicle.image_urls || [];

      if (imageUrls.length === 0 && actionType !== 'marketing') { // Marketing content might not need images directly if it's text-based
        alert('This vehicle has no images to process for this action.');
        return;
      }

      let result;
      switch (actionType) {
        case 'images':
          result = await DataManager.processVehicleImages(vehicleId, imageUrls);
          break;
        case '360':
          if (imageUrls.length < 8) {
            alert('At least 8 images are required for 360° view generation.');
            return;
          }
          result = await DataManager.generate360View(vehicleId, imageUrls);
          break;
        case 'reel':
          if (imageUrls.length < 3) {
            alert('At least 3 images are required for reel generation.');
            return;
          }
          result = await DataManager.generateMarketingReel(vehicleId, imageUrls);
          break;
        case 'marketing':
          // Assume DataManager.generateMarketingContent can work with an empty image array if needed, or specific text input
          result = await DataManager.generateMarketingContent(vehicleId, imageUrls);
          break;
        default:
          console.warn(`Unknown action type: ${actionType}`);
          return;
      }

      console.log(`Single vehicle ${actionType} processing completed:`, result);
      await loadMarketingData();

    } catch (error) {
      console.error(`Single vehicle ${actionType} processing failed:`, error);
      alert(`Processing failed: ${error.message}`);
    }
  };

  const handleAssetFeedback = useCallback(async (updatedAsset) => {
    // In a real app, this would send feedback to the backend.
    // For now, we'll just log and reload data.
    console.log('Feedback submitted for asset:', updatedAsset);
    // Refresh assets after feedback (re-fetches all data)
    await loadMarketingData();
  }, [loadMarketingData]);


  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatVehicleName = (vehicle) => {
    return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading Marketing Hub..." />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="momentum-h3 text-red-700 mb-2">Error Loading Marketing Hub</h3>
          <p className="momentum-body text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="momentum-btn-primary">
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PermissionGuard requireDealer={true} requireVerification={true}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-7xl mx-auto p-6 md:p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="momentum-h1 flex items-center gap-3">
                  <Wand2 className="w-8 h-8" />
                  Marketing Hub
                </h1>
                <p className="momentum-body">
                  AI-powered content generation for your vehicle inventory.
                </p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="generate">Generate Assets</TabsTrigger>
                <TabsTrigger value="gallery">Asset Gallery</TabsTrigger>
                <TabsTrigger value="queue">Processing Queue</TabsTrigger>
                <TabsTrigger value="social">Social Media</TabsTrigger>
                <TabsTrigger value="feedback">AI Feedback</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                          <p className="text-2xl font-bold">{marketingSummary.totalVehicles || 0}</p>
                        </div>
                        <ImageIcon className="w-8 h-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">AI Enhanced</p>
                          <p className="text-2xl font-bold">{marketingSummary.vehiclesWithProcessedImages || 0}</p>
                        </div>
                        <Sparkles className="w-8 h-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">360° Views</p>
                          <p className="text-2xl font-bold">{marketingSummary.vehiclesWith360View || 0}</p>
                        </div>
                        <RotateCcw className="w-8 h-8 text-cyan-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Marketing Reels</p>
                          <p className="text-2xl font-bold">{marketingSummary.vehiclesWithReels || 0}</p>
                        </div>
                        <Video className="w-8 h-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Processing Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(marketingSummary.processingStats || {}).map(([type, stats]) => (
                          <div key={type} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium capitalize">{type.replace('_', ' ')}</span>
                              <span className="text-sm text-gray-600">
                                {stats.completed || 0} / {Object.values(stats).reduce((a, b) => a + b, 0)}
                              </span>
                            </div>
                            <Progress
                              value={Object.values(stats).reduce((a, b) => a + b, 0) > 0
                                ? ((stats.completed || 0) / Object.values(stats).reduce((a, b) => a + b, 0)) * 100
                                : 0
                              }
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recently Generated</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {marketingSummary.recentlyGenerated?.length > 0 ? (
                          marketingSummary.recentlyGenerated.slice(0, 5).map((item) => (
                            <div key={item.vehicleId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{item.vehicleName}</p>
                                <div className="flex gap-2 mt-1">
                                  {item.hasProcessedImages && <Badge variant="secondary" className="text-xs">Enhanced</Badge>}
                                  {item.has360View && <Badge variant="secondary" className="text-xs">360°</Badge>}
                                  {item.hasReel && <Badge variant="secondary" className="text-xs">Reel</Badge>}
                                </div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(item.processedAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No recent activity</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Generate Assets Tab (formerly Vehicle Assets Tab) */}
              <TabsContent value="generate">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Vehicle Marketing Assets</CardTitle>
                        <CardDescription>
                          Select vehicles to batch process or manage individual assets.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedVehicles.length === vehicles.length && vehicles.length > 0}
                          onCheckedChange={handleSelectAll}
                          id="select-all"
                        />
                        <label htmlFor="select-all" className="text-sm font-medium">
                          Select All ({vehicles.length})
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedVehicles.length > 0 && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-800">
                            {selectedVehicles.length} vehicle{selectedVehicles.length > 1 ? 's' : ''} selected
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBatchProcess('images')}
                              disabled={batchProcessing}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Batch Enhance
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBatchProcess('360')}
                              disabled={batchProcessing}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Batch 360°
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleBatchProcess('reel')}
                              disabled={batchProcessing}
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Batch Reels
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleBatchProcess('all')}
                              disabled={batchProcessing}
                              className="momentum-btn-accent"
                            >
                              {batchProcessing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Wand2 className="w-4 h-4 mr-2" />
                              )}
                              Process All
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {vehicles.map(vehicle => (
                        <div key={vehicle.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Checkbox
                                checked={selectedVehicles.includes(vehicle.id)}
                                onCheckedChange={(checked) => handleVehicleSelection(vehicle.id, checked)}
                              />
                              <div className="flex items-center gap-4">
                                {vehicle.image_urls && vehicle.image_urls[0] && (
                                  <img
                                    src={vehicle.image_urls[0]}
                                    alt={formatVehicleName(vehicle)}
                                    className="w-16 h-16 object-cover rounded-lg"
                                  />
                                )}
                                <div>
                                  <p className="font-semibold">{formatVehicleName(vehicle)}</p>
                                  <p className="text-sm text-gray-600">
                                    {vehicle.image_urls?.length || 0} images
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Asset Status Indicators */}
                              <div className="flex gap-2">
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(vehicle.image_processing_status)}
                                  <span className="text-xs">Enhanced</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(vehicle['360_processing_status'])}
                                  <span className="text-xs">360°</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(vehicle.reel_processing_status)}
                                  <span className="text-xs">Reel</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(vehicle.marketing_content_processing_status)}
                                  <span className="text-xs">Marketing</span>
                                </div>
                              </div>

                              {/* Individual Action Buttons */}
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSingleVehicleProcess(vehicle.id, 'images')}
                                  disabled={vehicle.image_processing_status === 'processing'}
                                >
                                  <Sparkles className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSingleVehicleProcess(vehicle.id, '360')}
                                  disabled={vehicle['360_processing_status'] === 'processing'}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSingleVehicleProcess(vehicle.id, 'reel')}
                                  disabled={vehicle.reel_processing_status === 'processing'}
                                >
                                  <Video className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {vehicles.length === 0 && (
                      <div className="text-center py-12">
                        <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="momentum-h3 mb-2">No Vehicles Found</h3>
                        <p className="momentum-body mb-6">Add some vehicles to your inventory to start generating marketing content.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Asset Gallery Tab - Now using EnhancedAssetGallery component */}
              <TabsContent value="gallery">
                {currentDealer && <EnhancedAssetGallery assets={assets} currentDealer={currentDealer} />}
              </TabsContent>

              {/* Processing Queue Tab */}
              <TabsContent value="queue">
                <div className="space-y-6">
                  {processingQueue.activeJobs?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          Active Jobs ({processingQueue.activeJobs.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {processingQueue.activeJobs.map((job, index) => (
                            <div key={`${job.vehicleId}-${job.type}-${index}`} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                              <div>
                                <p className="font-medium">{job.vehicleName}</p>
                                <p className="text-sm text-gray-600">
                                  {job.type.charAt(0).toUpperCase() + job.type.slice(1)} processing...
                                </p>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800">
                                {job.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Recently Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {processingQueue.completedJobs?.slice(0, 10).map((job, index) => (
                          <div key={`${job.vehicleId}-${job.type}-${index}`} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div>
                              <p className="font-medium">{job.vehicleName}</p>
                              <p className="text-sm text-gray-600">
                                {job.type.charAt(0).toUpperCase() + job.type.slice(1)} completed
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-100 text-green-800">Completed</Badge>
                              {job.lastProcessedAt && (
                                <span className="text-xs text-gray-500">
                                  {new Date(job.lastProcessedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )) || <p className="text-sm text-gray-500">No completed jobs yet</p>}
                      </div>
                    </CardContent>
                  </Card>

                  {processingQueue.failedJobs?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                          <XCircle className="w-5 h-5" />
                          Failed Jobs ({processingQueue.failedJobs.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {processingQueue.failedJobs.map((job, index) => (
                            <div key={`${job.vehicleId}-${job.type}-${index}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                              <div>
                                <p className="font-medium">{job.vehicleName}</p>
                                <p className="text-sm text-gray-600">
                                  {job.type.charAt(0).toUpperCase() + job.type.slice(1)} failed
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive">Failed</Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSingleVehicleProcess(job.vehicleId, job.type)}
                                >
                                  Retry
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Phase 4: Social Media Integration Tab */}
              <TabsContent value="social">
                {currentDealer && <SocialMediaIntegration currentDealer={currentDealer} />}
              </TabsContent>

              {/* Phase 4: AI Feedback System Tab */}
              <TabsContent value="feedback">
                {currentDealer && <AIFeedbackSystem
                  assets={assets}
                  currentDealer={currentDealer}
                  onFeedbackSubmitted={handleAssetFeedback}
                />}
              </TabsContent>

              {/* Enhanced Analytics Tab */}
              <TabsContent value="analytics">
                <div className="grid gap-6">
                  {/* Phase 4: Enhanced Performance Tracking */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Marketing Performance Analytics
                      </CardTitle>
                      <CardDescription>
                        Track performance of AI-generated content across platforms
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {assets.reduce((sum, asset) => sum + (asset.performance_metrics?.views || 0), 0)}
                          </div>
                          <div className="text-sm text-gray-600">Total Views</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {assets.reduce((sum, asset) => sum + (asset.performance_metrics?.shares || 0), 0)}
                          </div>
                          <div className="text-sm text-gray-600">Total Shares</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {assets.reduce((sum, asset) => sum + (asset.performance_metrics?.leads_generated || 0), 0)}
                          </div>
                          <div className="text-sm text-gray-600">Leads Generated</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {assets.filter(a => a.social_media_posts && a.social_media_posts.length > 0).length}
                          </div>
                          <div className="text-sm text-gray-600">Published Assets</div>
                        </div>
                      </div>

                      {/* Performance Chart */}
                      <div className="space-y-4">
                        {assets.filter(a => a.performance_metrics).map(asset => (
                          <div key={asset.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                {asset.thumbnail_url && (
                                  <img
                                    src={asset.thumbnail_url}
                                    alt="Asset"
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <div className="font-medium capitalize">
                                    {asset.asset_type.replace('_', ' ')} - {asset.vehicleName}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {asset.created_date ? `Created ${new Date(asset.created_date).toLocaleDateString()}` : 'N/A'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= (asset.dealer_rating || 0)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="text-sm ml-1">{asset.dealer_rating || 0}/5</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-center">
                              <div>
                                <div className="font-bold text-blue-600">{asset.performance_metrics?.views || 0}</div>
                                <div className="text-xs text-gray-600">Views</div>
                              </div>
                              <div>
                                <div className="font-bold text-green-600">{asset.performance_metrics?.shares || 0}</div>
                                <div className="text-xs text-gray-600">Shares</div>
                              </div>
                              <div>
                                <div className="font-bold text-purple-600">{asset.performance_metrics?.clicks || 0}</div>
                                <div className="text-xs text-gray-600">Clicks</div>
                              </div>
                              <div>
                                <div className="font-bold text-orange-600">{asset.performance_metrics?.leads_generated || 0}</div>
                                <div className="text-xs text-gray-600">Leads</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </PermissionGuard>
    </ErrorBoundary>
  );
}
