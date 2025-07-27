import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare,
  Sparkles,
  TrendingUp,
  Brain,
  Lightbulb,
  Target
} from 'lucide-react';
import supabase from '@/api/supabaseClient';

export default function AIFeedbackSystem({ assets, currentDealer, onFeedbackSubmitted }) {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [feedback, setFeedback] = useState({
    rating: 0,
    liked: null,
    feedback_text: '',
    improvement_suggestions: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const feedbackCategories = [
    { id: 'color_scheme', label: 'Color Scheme', icon: '🎨' },
    { id: 'composition', label: 'Composition', icon: '📐' },
    { id: 'text_placement', label: 'Text Placement', icon: '📝' },
    { id: 'brand_consistency', label: 'Brand Consistency', icon: '🏢' },
    { id: 'visual_appeal', label: 'Visual Appeal', icon: '✨' },
    { id: 'message_clarity', label: 'Message Clarity', icon: '💬' }
  ];

  const submitFeedback = async () => {
    if (!selectedAsset || feedback.rating === 0) {
      alert('Please select an asset and provide a rating');
      return;
    }

    setSubmitting(true);
    try {
      // Update asset with feedback
      const { data: updatedAsset, error } = await supabase
        .from('MarketingAsset')
        .update({
          dealer_rating: feedback.rating,
          dealer_feedback: feedback.feedback_text,
          status: feedback.rating >= 4 ? 'approved' : (feedback.rating <= 2 ? 'rejected' : 'generated')
        })
        .eq('id', selectedAsset.id)
        .select()
        .single();
      if (error) throw error;

      // Send feedback to AI system for learning
      await processAIFeedback(selectedAsset, feedback);

      // Reset form
      setSelectedAsset(null);
      setFeedback({ rating: 0, liked: null, feedback_text: '', improvement_suggestions: [] });
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(updatedAsset);
      }

      alert('Feedback submitted successfully! Our AI will learn from your input.');

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const processAIFeedback = async (asset, feedbackData) => {
    try {
      const feedbackPrompt = `
        Analyze dealer feedback for AI-generated marketing asset improvement:
        
        Asset Details:
        - Type: ${asset.asset_type}
        - Platform: ${asset.platform}
        - Dimensions: ${asset.dimensions}
        - Tags: ${(asset.tags || []).join(', ')}
        
        Dealer Feedback:
        - Rating: ${feedbackData.rating}/5 stars
        - Liked: ${feedbackData.liked ? 'Yes' : 'No'}
        - Feedback: "${feedbackData.feedback_text}"
        - Improvement Areas: ${feedbackData.improvement_suggestions.join(', ')}
        
        Please analyze this feedback and provide insights for improving future AI generation.
        Focus on actionable improvements and pattern recognition.
      `;

      await supabase.rpc('invoke_llm', {
        prompt: feedbackPrompt,
        schema: {
          type: 'object',
          properties: {
            insights: { type: 'array', items: { type: 'string' } },
            improvement_areas: { type: 'array', items: { type: 'string' } },
            learning_points: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      console.log('AI feedback processed successfully');
    } catch (error) {
      console.error('Failed to process AI feedback:', error);
    }
  };

  const generatePersonalizedInsights = async () => {
    setLoadingInsights(true);
    try {
      const dealerAssets = assets.filter(a => a.dealer_rating > 0);
      
      const insightsPrompt = `
        Analyze dealer's marketing asset preferences and provide personalized insights:
        
        Dealer Business: ${currentDealer.business_name}
        Total Rated Assets: ${dealerAssets.length}
        
        Asset Ratings:
        ${dealerAssets.map(asset => 
          `- ${asset.asset_type} (${asset.platform}): ${asset.dealer_rating}/5 stars${asset.dealer_feedback ? ` - Feedback: "${asset.dealer_feedback}"` : ''}`
        ).join('\n')}
        
        Provide personalized insights about:
        1. Preferred asset types and styles
        2. Most effective platforms for this dealer
        3. Recommended content strategies
        4. Areas for improvement
        5. Trending opportunities
      `;

      const { data: insights } = await supabase.rpc('invoke_llm', {
        prompt: insightsPrompt,
        schema: {
          type: 'object',
          properties: {
            preferred_styles: { type: 'array', items: { type: 'string' } },
            effective_platforms: { type: 'array', items: { type: 'string' } },
            content_strategies: { type: 'array', items: { type: 'string' } },
            improvement_areas: { type: 'array', items: { type: 'string' } },
            trending_opportunities: { type: 'array', items: { type: 'string' } },
            overall_score: { type: 'number' }
          }
        }
      });

      setAiInsights(insights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      alert('Failed to generate insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  const getAssetPreview = (asset) => {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
           onClick={() => setSelectedAsset(asset)}>
        {asset.thumbnail_url && (
          <img src={asset.thumbnail_url} alt="Asset" className="w-16 h-16 object-cover rounded" />
        )}
        <div className="flex-1">
          <div className="font-medium capitalize">{asset.asset_type.replace('_', ' ')}</div>
          <div className="text-sm text-gray-600">{asset.platform} • {asset.dimensions}</div>
          <div className="flex items-center gap-1 mt-1">
            {asset.dealer_rating ? (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs">{asset.dealer_rating}/5</span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs">Not Rated</Badge>
            )}
          </div>
        </div>
        {selectedAsset?.id === asset.id && (
          <Badge className="bg-blue-100 text-blue-800">Selected</Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* AI Insights Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Learning Dashboard
              </CardTitle>
              <CardDescription>
                Help our AI learn your preferences and improve content generation
              </CardDescription>
            </div>
            <Button 
              onClick={generatePersonalizedInsights}
              disabled={loadingInsights}
              className="momentum-btn-accent"
            >
              {loadingInsights ? (
                <>
                  <Brain className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Get AI Insights
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiInsights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Your Preferences
                </h4>
                <div className="space-y-2">
                  {aiInsights.preferred_styles?.map((style, index) => (
                    <Badge key={index} variant="secondary" className="mr-2 mb-2">
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Recommendations
                </h4>
                <div className="space-y-2">
                  {aiInsights.content_strategies?.slice(0, 3).map((strategy, index) => (
                    <div key={index} className="text-sm p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                      {strategy}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Rate more assets to unlock personalized AI insights</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Asset to Review</CardTitle>
            <CardDescription>
              Choose an asset to provide feedback and help improve AI generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {assets.slice(0, 10).map(asset => getAssetPreview(asset))}
            </div>
            {assets.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No assets available for feedback</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Form */}
        <Card>
          <CardHeader>
            <CardTitle>Provide Feedback</CardTitle>
            <CardDescription>
              Your feedback helps our AI learn and improve future generations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedAsset ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>Select an asset to provide feedback</p>
              </div>
            ) : (
              <>
                {/* Rating */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Overall Rating</label>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                        className="focus:outline-none"
                      >
                        <Star 
                          className={`w-6 h-6 transition-colors ${
                            star <= feedback.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300 hover:text-yellow-200'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {feedback.rating > 0 && (
                    <div className="text-sm text-gray-600">
                      {feedback.rating === 1 && "Poor - Needs significant improvement"}
                      {feedback.rating === 2 && "Fair - Some issues to address"}
                      {feedback.rating === 3 && "Good - Acceptable with minor improvements"}
                      {feedback.rating === 4 && "Very Good - Minor tweaks needed"}
                      {feedback.rating === 5 && "Excellent - Perfect for use"}
                    </div>
                  )}
                </div>

                {/* Like/Dislike */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Quick Reaction</label>
                  <div className="flex gap-2">
                    <Button
                      variant={feedback.liked === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFeedback(prev => ({ ...prev, liked: true }))}
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Like
                    </Button>
                    <Button
                      variant={feedback.liked === false ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFeedback(prev => ({ ...prev, liked: false }))}
                    >
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      Dislike
                    </Button>
                  </div>
                </div>

                {/* Improvement Areas */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Areas for Improvement</label>
                  <div className="grid grid-cols-2 gap-2">
                    {feedbackCategories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => {
                          const suggestions = feedback.improvement_suggestions;
                          if (suggestions.includes(category.id)) {
                            setFeedback(prev => ({
                              ...prev,
                              improvement_suggestions: suggestions.filter(s => s !== category.id)
                            }));
                          } else {
                            setFeedback(prev => ({
                              ...prev,
                              improvement_suggestions: [...suggestions, category.id]
                            }));
                          }
                        }}
                        className={`p-2 text-sm border rounded transition-colors ${
                          feedback.improvement_suggestions.includes(category.id)
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span className="mr-1">{category.icon}</span>
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detailed Feedback */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Detailed Feedback (Optional)</label>
                  <Textarea
                    placeholder="What specifically did you like or dislike? How can we improve?"
                    value={feedback.feedback_text}
                    onChange={(e) => setFeedback(prev => ({ ...prev, feedback_text: e.target.value }))}
                    className="h-20"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={submitFeedback}
                  disabled={feedback.rating === 0 || submitting}
                  className="w-full momentum-btn-accent"
                >
                  {submitting ? (
                    <>
                      <Brain className="w-4 h-4 mr-2 animate-pulse" />
                      Teaching AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Learning Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            AI Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Assets Rated</div>
              <div className="flex items-center gap-2">
                <Progress value={(assets.filter(a => a.dealer_rating > 0).length / Math.max(assets.length, 1)) * 100} className="flex-1" />
                <span className="text-sm font-medium">
                  {assets.filter(a => a.dealer_rating > 0).length}/{assets.length}
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Approval Rate</div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={assets.length > 0 ? (assets.filter(a => a.dealer_rating >= 4).length / assets.length) * 100 : 0} 
                  className="flex-1" 
                />
                <span className="text-sm font-medium">
                  {assets.length > 0 ? Math.round((assets.filter(a => a.dealer_rating >= 4).length / assets.length) * 100) : 0}%
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">AI Learning Score</div>
              <div className="flex items-center gap-2">
                <Progress value={Math.min(assets.filter(a => a.dealer_rating > 0).length * 10, 100)} className="flex-1" />
                <span className="text-sm font-medium">
                  {Math.min(assets.filter(a => a.dealer_rating > 0).length * 10, 100)}/100
                </span>
              </div>
            </div>
          </div>

          <Alert className="mt-4">
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              The more feedback you provide, the better our AI becomes at generating content that matches your style and preferences.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
