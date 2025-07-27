
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Star,
  MoreVertical,
  Tag,
  Calendar,
  Image as ImageIcon,
  Video,
  RotateCcw,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Archive,
  Edit
} from 'lucide-react';
import supabase from '@/api/supabaseClient';
import { DataManager } from '../shared/DataManager';

export default function EnhancedAssetGallery({ currentDealer }) {
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('created_date');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // assetTypes declared as state to allow dynamic count updates
  const [assetTypes, setAssetTypes] = useState([
    { id: 'all', label: 'All Assets', count: 0, icon: null }, // Added icon: null for consistency, though not directly used for 'all'
    { id: 'enhanced_image', label: 'Enhanced Images', icon: Sparkles, count: 0 },
    { id: 'reel', label: 'Video Reels', icon: Video, count: 0 },
    { id: '360_view', label: '360° Views', icon: RotateCcw, count: 0 },
    { id: 'social_post', label: 'Social Posts', icon: ImageIcon, count: 0 },
    { id: 'ad_creative', label: 'Ad Creatives', icon: Star, count: 0 }
  ]);

  // Only load assets if currentDealer and its ID are available
  useEffect(() => {
    if (currentDealer && currentDealer.id) {
      loadAssets();
    } else {
      // If no dealer, set loading to false and clear assets
      setLoading(false);
      setAssets([]);
      setFilteredAssets([]);
      setAssetTypes(prevTypes => prevTypes.map(type => ({...type, count: 0}))); // Reset counts
    }
  }, [currentDealer]); // Dependency changed to currentDealer object

  useEffect(() => {
    applyFilters();
  }, [assets, searchQuery, selectedTags, sortBy, filterBy]);

  const loadAssets = async () => {
    // Guard clause: ensure currentDealer and currentDealer.id are defined before proceeding
    if (!currentDealer || !currentDealer.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: assetData, error } = await supabase
        .from('MarketingAsset')
        .select('*')
        .eq('dealer_id', currentDealer.id);
      if (error) throw error;
      setAssets(assetData);
      
      // Calculate and update asset type counts
      const newCounts = {};
      newCounts['all'] = assetData.length; // Count for 'all' assets
      
      // Iterate over current assetTypes to calculate counts for specific types
      assetTypes.forEach(type => {
        if (type.id !== 'all') { // Skip 'all' as its count is already handled
          newCounts[type.id] = assetData.filter(asset => asset.asset_type === type.id).length;
        }
      });

      // Update the assetTypes state with new counts
      setAssetTypes(prevTypes => 
        prevTypes.map(type => ({
            ...type, 
            count: newCounts[type.id] !== undefined ? newCounts[type.id] : 0
        }))
      );

    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assets];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset => 
        (asset.tags || []).some(tag => tag.toLowerCase().includes(query)) ||
        asset.asset_type.toLowerCase().includes(query) ||
        asset.platform.toLowerCase().includes(query)
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(asset => 
        selectedTags.every(tag => (asset.tags || []).includes(tag))
      );
    }

    // Type filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(asset => asset.asset_type === filterBy);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_date':
          return new Date(b.created_date) - new Date(a.created_date);
        case 'last_used':
          return new Date(b.last_used_at || 0) - new Date(a.last_used_at || 0);
        case 'performance':
          return (b.performance_metrics?.views || 0) - (a.performance_metrics?.views || 0);
        case 'rating':
          return (b.dealer_rating || 0) - (a.dealer_rating || 0);
        default:
          return 0;
      }
    });

    setFilteredAssets(filtered);
  };

  const getAllTags = () => {
    const tagSet = new Set();
    assets.forEach(asset => {
      (asset.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const rateAsset = async (assetId, rating) => {
    try {
      await supabase
        .from('MarketingAsset')
        .update({
          dealer_rating: rating,
          status: rating >= 4 ? 'approved' : 'generated'
        })
        .eq('id', assetId);
      
      // Simulate AI feedback processing
      console.log(`Asset ${assetId} rated ${rating} stars - AI will learn from this feedback`);
      
      await loadAssets();
      setShowFeedback(false);
    } catch (error) {
      console.error('Failed to rate asset:', error);
      alert('Failed to submit rating');
    }
  };

  const downloadAsset = (asset) => {
    // Simulate download
    const link = document.createElement('a');
    link.href = asset.asset_url;
    link.download = `${asset.asset_type}_${asset.id}`;
    link.click();
  };

  const createVariation = async (asset) => {
    try {
      // Simulate creating a variation of the asset
      console.log(`Creating variation of asset ${asset.id}`);
      alert('Asset variation request submitted. Processing will begin shortly.');
    } catch (error) {
      console.error('Failed to create variation:', error);
    }
  };

  const getAssetIcon = (type) => {
    const typeConfig = {
      enhanced_image: Sparkles,
      reel: Video,
      '360_view': RotateCcw,
      social_post: ImageIcon,
      ad_creative: Star,
      story_template: ImageIcon,
      brochure: ImageIcon,
      banner: ImageIcon
    };
    return typeConfig[type] || ImageIcon;
  };

  const getStatusBadge = (asset) => {
    const statusConfig = {
      generated: { color: 'bg-blue-100 text-blue-800', text: 'Generated' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
      published: { color: 'bg-purple-100 text-purple-800', text: 'Published' },
      archived: { color: 'bg-gray-100 text-gray-800', text: 'Archived' }
    };
    
    const config = statusConfig[asset.status] || statusConfig.generated;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading asset gallery...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by tags, type, or platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {/* Map over assetTypes from state to display counts */}
                {assetTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label} ({type.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date">Newest First</SelectItem>
                <SelectItem value="last_used">Recently Used</SelectItem>
                <SelectItem value="performance">Best Performance</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tag Filters */}
          {getAllTags().length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Filter by tags:</div>
              <div className="flex flex-wrap gap-2">
                {getAllTags().slice(0, 20).map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (selectedTags.includes(tag)) {
                        setSelectedTags(prev => prev.filter(t => t !== tag));
                      } else {
                        setSelectedTags(prev => [...prev, tag]);
                      }
                    }}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <Tag className="w-3 h-3 inline mr-1" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAssets.map(asset => {
          const AssetIcon = getAssetIcon(asset.asset_type);
          
          return (
            <Card key={asset.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                {/* Asset Preview */}
                <div className="relative aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                  {asset.thumbnail_url ? (
                    <img 
                      src={asset.thumbnail_url} 
                      alt={`${asset.asset_type} preview`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <AssetIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setSelectedAsset(asset)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => downloadAsset(asset)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(asset)}
                  </div>

                  {/* Asset Type Icon */}
                  <div className="absolute top-2 left-2">
                    <div className="w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                      <AssetIcon className="w-4 h-4 text-gray-700" />
                    </div>
                  </div>
                </div>

                {/* Asset Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize text-sm">
                      {asset.asset_type.replace('_', ' ')}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {asset.platform}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600 mb-2">
                    {asset.dimensions && (
                      <span>{asset.dimensions} • </span>
                    )}
                    {asset.file_size_mb && (
                      <span>{asset.file_size_mb.toFixed(1)}MB</span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(asset.tags || []).slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {(asset.tags || []).length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{(asset.tags || []).length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Performance Metrics */}
                  {asset.performance_metrics && (
                    <div className="grid grid-cols-3 gap-2 text-xs text-center mb-3">
                      <div>
                        <div className="font-medium">{asset.performance_metrics.views || 0}</div>
                        <div className="text-gray-500">Views</div>
                      </div>
                      <div>
                        <div className="font-medium">{asset.performance_metrics.shares || 0}</div>
                        <div className="text-gray-500">Shares</div>
                      </div>
                      <div>
                        <div className="font-medium">{asset.performance_metrics.leads_generated || 0}</div>
                        <div className="text-gray-500">Leads</div>
                      </div>
                    </div>
                  )}

                  {/* Rating */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => rateAsset(asset.id, star)}
                          className="focus:outline-none"
                        >
                          <Star 
                            className={`w-3 h-3 ${
                              star <= (asset.dealer_rating || 0)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {new Date(asset.created_date).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 text-xs">
                      <Edit className="w-3 h-3 mr-1" />
                      Vary
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs">
                      <Archive className="w-3 h-3 mr-1" />
                      Archive
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Assets Found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || selectedTags.length > 0 || filterBy !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Generate some marketing assets to get started'
            }
          </p>
          {(searchQuery || selectedTags.length > 0 || filterBy !== 'all') && (
            <Button 
              onClick={() => {
                setSearchQuery('');
                setSelectedTags([]);
                setFilterBy('all');
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* AI Feedback Alert */}
      {showFeedback && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Your ratings help our AI learn your preferences and generate better content in the future. 
            Keep rating assets to improve quality!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
