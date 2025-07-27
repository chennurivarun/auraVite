import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Instagram, 
  Facebook, 
  Youtube, 
  Twitter, 
  Linkedin,
  Calendar,
  Clock,
  Share2,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  TrendingUp
} from 'lucide-react';
import { SocialMediaAccount, MarketingAsset } from '@/api/entities';
import { DataManager } from '../shared/DataManager';

export default function SocialMediaIntegration({ currentDealer }) {
  const [accounts, setAccounts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [postContent, setPostContent] = useState({
    caption: '',
    hashtags: '',
    scheduledFor: '',
    platforms: []
  });
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadSocialMediaData();
  }, [currentDealer.id]);

  const loadSocialMediaData = async () => {
    setLoading(true);
    try {
      const [socialAccounts, marketingAssets] = await Promise.all([
        SocialMediaAccount.filter({ dealer_id: currentDealer.id }),
        MarketingAsset.filter({ dealer_id: currentDealer.id, status: 'approved' })
      ]);

      setAccounts(socialAccounts);
      setAssets(marketingAssets.slice(0, 20)); // Limit for performance
    } catch (error) {
      console.error('Failed to load social media data:', error);
    } finally {
      setLoading(false);
    }
  };

  const platforms = [
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: Instagram, 
      color: 'text-pink-600',
      description: 'Share photos and stories'
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: Facebook, 
      color: 'text-blue-600',
      description: 'Reach wider audience'
    },
    { 
      id: 'youtube', 
      name: 'YouTube', 
      icon: Youtube, 
      color: 'text-red-600',
      description: 'Video marketing'
    },
    { 
      id: 'twitter', 
      name: 'Twitter', 
      icon: Twitter, 
      color: 'text-blue-400',
      description: 'Quick updates'
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: Linkedin, 
      color: 'text-blue-700',
      description: 'Professional network'
    }
  ];

  const connectPlatform = async (platformId) => {
    try {
      // In a real implementation, this would redirect to OAuth flow
      // For demo, we'll simulate a connection
      const newAccount = await SocialMediaAccount.create({
        dealer_id: currentDealer.id,
        platform: platformId,
        account_username: `@${currentDealer.business_name.toLowerCase().replace(/\s+/g, '')}`,
        account_id: `${platformId}_${Date.now()}`,
        connection_status: 'connected',
        permissions: ['publish_posts', 'read_insights'],
        auto_post_enabled: false,
        default_hashtags: ['#cars', '#automotive', '#dealership', '#quality'],
        last_sync_at: new Date().toISOString()
      });

      await loadSocialMediaData();
      alert(`Successfully connected to ${platformId.charAt(0).toUpperCase() + platformId.slice(1)}!`);
    } catch (error) {
      console.error('Failed to connect platform:', error);
      alert('Failed to connect platform: ' + error.message);
    }
  };

  const publishToSocialMedia = async () => {
    if (!selectedAsset || postContent.platforms.length === 0) {
      alert('Please select an asset and at least one platform');
      return;
    }

    setPublishing(true);
    try {
      const publishPromises = postContent.platforms.map(async (platformId) => {
        const account = accounts.find(a => a.platform === platformId);
        if (!account) return;

        // Simulate social media API call
        const postData = {
          platform: platformId,
          post_id: `${platformId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          posted_at: postContent.scheduledFor ? new Date(postContent.scheduledFor).toISOString() : new Date().toISOString(),
          post_url: `https://${platformId}.com/posts/${Date.now()}`,
          status: postContent.scheduledFor ? 'scheduled' : 'published'
        };

        // Update asset with social media post record
        const updatedPosts = [...(selectedAsset.social_media_posts || []), postData];
        
        await MarketingAsset.update(selectedAsset.id, {
          social_media_posts: updatedPosts,
          status: 'published',
          last_used_at: new Date().toISOString()
        });

        return postData;
      });

      await Promise.all(publishPromises);
      
      alert(`Successfully ${postContent.scheduledFor ? 'scheduled' : 'published'} to ${postContent.platforms.length} platform${postContent.platforms.length > 1 ? 's' : ''}!`);
      
      // Reset form
      setSelectedAsset(null);
      setPostContent({ caption: '', hashtags: '', scheduledFor: '', platforms: [] });
      
      await loadSocialMediaData();

    } catch (error) {
      console.error('Failed to publish:', error);
      alert('Failed to publish: ' + error.message);
    } finally {
      setPublishing(false);
    }
  };

  const getAccountStatus = (account) => {
    switch (account.connection_status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'expired':
        return <Badge className="bg-yellow-100 text-yellow-800">Token Expired</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Disconnected</Badge>;
    }
  };

  const generateSuggestedCaption = (asset) => {
    const vehicle = asset.vehicle_id; // In real app, would load vehicle data
    const suggestions = [
      `🚗 Premium ${asset.asset_type === 'enhanced_image' ? 'quality' : 'content'} for your dream car! Contact us for more details. ✨`,
      `Discover excellence in automotive. ${asset.asset_type === 'reel' ? 'Watch our latest showcase!' : 'See the quality difference!'} 🌟`,
      `Your next vehicle awaits! Professional ${asset.asset_type} ready for viewing. 📞 Call now!`
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading social media integration...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Social Media Integration
          </CardTitle>
          <CardDescription>
            Connect your social media accounts and publish AI-generated content directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="accounts">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="publish">Publish Content</TabsTrigger>
              <TabsTrigger value="analytics">Performance</TabsTrigger>
            </TabsList>

            {/* Social Media Accounts */}
            <TabsContent value="accounts" className="space-y-4 mt-6">
              <div className="grid gap-4">
                {platforms.map(platform => {
                  const account = accounts.find(a => a.platform === platform.id);
                  const Icon = platform.icon;
                  
                  return (
                    <div key={platform.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center ${platform.color}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{platform.name}</h4>
                            <p className="text-sm text-gray-600">{platform.description}</p>
                            {account && (
                              <p className="text-sm font-medium mt-1">{account.account_username}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {account ? (
                            <>
                              {getAccountStatus(account)}
                              <Button variant="outline" size="sm">
                                <SettingsIcon className="w-4 h-4 mr-1" />
                                Settings
                              </Button>
                            </>
                          ) : (
                            <Button 
                              onClick={() => connectPlatform(platform.id)}
                              className="momentum-btn-accent"
                            >
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {account && account.auto_post_enabled && (
                        <Alert className="mt-3">
                          <Clock className="h-4 w-4" />
                          <AlertDescription>
                            Auto-posting is enabled. New marketing assets will be automatically shared.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Publish Content */}
            <TabsContent value="publish" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asset Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Select Marketing Asset</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {assets.map(asset => (
                        <div
                          key={asset.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedAsset?.id === asset.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedAsset(asset)}
                        >
                          <div className="flex items-center gap-3">
                            {asset.thumbnail_url && (
                              <img 
                                src={asset.thumbnail_url} 
                                alt="Asset thumbnail"
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium capitalize">
                                {asset.asset_type.replace('_', ' ')}
                              </div>
                              <div className="text-sm text-gray-600">
                                {asset.platform} • {asset.dimensions}
                              </div>
                              <div className="flex gap-1 mt-1">
                                {asset.tags?.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Publishing Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Publish Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Platform Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Platforms</label>
                      <div className="space-y-2">
                        {accounts.filter(a => a.connection_status === 'connected').map(account => {
                          const platform = platforms.find(p => p.id === account.platform);
                          const Icon = platform?.icon;
                          
                          return (
                            <div key={account.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={account.platform}
                                checked={postContent.platforms.includes(account.platform)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPostContent(prev => ({
                                      ...prev,
                                      platforms: [...prev.platforms, account.platform]
                                    }));
                                  } else {
                                    setPostContent(prev => ({
                                      ...prev,
                                      platforms: prev.platforms.filter(p => p !== account.platform)
                                    }));
                                  }
                                }}
                                className="rounded"
                              />
                              <label htmlFor={account.platform} className="flex items-center gap-2 cursor-pointer">
                                {Icon && <Icon className={`w-4 h-4 ${platform.color}`} />}
                                <span>{platform?.name} ({account.account_username})</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Caption */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Caption</label>
                      <Textarea
                        placeholder="Write your post caption..."
                        value={postContent.caption}
                        onChange={(e) => setPostContent(prev => ({ ...prev, caption: e.target.value }))}
                        className="h-20"
                      />
                      {selectedAsset && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => setPostContent(prev => ({ 
                            ...prev, 
                            caption: generateSuggestedCaption(selectedAsset) 
                          }))}
                        >
                          Generate Suggestion
                        </Button>
                      )}
                    </div>

                    {/* Hashtags */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Hashtags</label>
                      <Input
                        placeholder="#cars #automotive #quality"
                        value={postContent.hashtags}
                        onChange={(e) => setPostContent(prev => ({ ...prev, hashtags: e.target.value }))}
                      />
                    </div>

                    {/* Schedule */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Schedule (Optional)</label>
                      <Input
                        type="datetime-local"
                        value={postContent.scheduledFor}
                        onChange={(e) => setPostContent(prev => ({ ...prev, scheduledFor: e.target.value }))}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>

                    {/* Publish Button */}
                    <Button
                      onClick={publishToSocialMedia}
                      disabled={!selectedAsset || postContent.platforms.length === 0 || publishing}
                      className="w-full momentum-btn-accent"
                    >
                      {publishing ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : postContent.scheduledFor ? (
                        <>
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Post
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 mr-2" />
                          Publish Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-8 h-8 text-blue-500" />
                      <div>
                        <div className="text-2xl font-bold">
                          {assets.reduce((sum, asset) => sum + (asset.performance_metrics?.views || 0), 0)}
                        </div>
                        <div className="text-sm text-gray-600">Total Views</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Share2 className="w-8 h-8 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold">
                          {assets.reduce((sum, asset) => sum + (asset.performance_metrics?.shares || 0), 0)}
                        </div>
                        <div className="text-sm text-gray-600">Total Shares</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-purple-500" />
                      <div>
                        <div className="text-2xl font-bold">
                          {assets.filter(a => a.social_media_posts?.length > 0).length}
                        </div>
                        <div className="text-sm text-gray-600">Published Assets</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Asset Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {assets.filter(a => a.performance_metrics).map(asset => (
                      <div key={asset.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {asset.thumbnail_url && (
                              <img 
                                src={asset.thumbnail_url} 
                                alt="Asset"
                                className="w-10 h-10 object-cover rounded"
                              />
                            )}
                            <div>
                              <div className="font-medium capitalize">
                                {asset.asset_type.replace('_', ' ')}
                              </div>
                              <div className="text-sm text-gray-600">{asset.platform}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-6 text-center">
                            <div>
                              <div className="font-bold">{asset.performance_metrics.views || 0}</div>
                              <div className="text-xs text-gray-600">Views</div>
                            </div>
                            <div>
                              <div className="font-bold">{asset.performance_metrics.shares || 0}</div>
                              <div className="text-xs text-gray-600">Shares</div>
                            </div>
                            <div>
                              <div className="font-bold">{asset.performance_metrics.leads_generated || 0}</div>
                              <div className="text-xs text-gray-600">Leads</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}