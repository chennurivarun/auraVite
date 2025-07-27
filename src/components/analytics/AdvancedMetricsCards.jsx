import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  BarChart3, 
  Target,
  Trophy,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';

export default function AdvancedMetricsCards({ 
  metrics, 
  marketComparison = null,
  isLoading = false 
}) {
  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${(amount / 100000).toFixed(1)}L`;
  };

  const formatPercentage = (percentage) => {
    if (percentage === null || percentage === undefined) return 'N/A';
    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  const getComparisonIcon = (value) => {
    if (value > 0) return <ArrowUpCircle className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  const metricsData = [
    {
      title: 'Avg. Days in Stock (Sold)',
      value: metrics.avgDaysInStockSold || 0,
      suffix: ' days',
      icon: Clock,
      description: 'How quickly your vehicles sell',
      comparison: marketComparison?.avgDaysComparison,
      isGoodWhenLower: true
    },
    {
      title: 'Avg. Profit Margin',
      value: metrics.avgProfitMargin || 0,
      suffix: '%',
      icon: Target,
      description: 'Average profit per sale',
      comparison: marketComparison?.profitComparison,
      isGoodWhenLower: false
    },
    {
      title: 'Inventory Turnover Rate',
      value: metrics.inventoryTurnover || 0,
      suffix: 'x/year',
      icon: BarChart3,
      description: 'How often inventory cycles',
      comparison: marketComparison?.turnoverComparison,
      isGoodWhenLower: false
    },
    {
      title: 'Avg. Sale Price Premium',
      value: metrics.avgSalePricePremium || 0,
      suffix: '%',
      icon: Trophy,
      description: 'Vs. market average for similar vehicles',
      comparison: marketComparison?.priceComparison,
      isGoodWhenLower: false
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="momentum-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricsData.map((metric, index) => {
        const IconComponent = metric.icon;
        const hasComparison = metric.comparison !== null && metric.comparison !== undefined;
        const comparisonValue = metric.comparison || 0;
        const isPositiveComparison = metric.isGoodWhenLower ? comparisonValue < 0 : comparisonValue > 0;
        
        return (
          <Card key={index} className="momentum-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <IconComponent className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline gap-2 mb-1">
                <div className="text-2xl font-bold">
                  {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
                  <span className="text-sm font-normal text-gray-500">
                    {metric.suffix}
                  </span>
                </div>
                {hasComparison && getComparisonIcon(comparisonValue)}
              </div>
              
              <p className="text-xs text-gray-600 mb-2">
                {metric.description}
              </p>
              
              {hasComparison && (
                <div className={`text-xs flex items-center gap-1 ${
                  isPositiveComparison ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span>
                    {formatPercentage(comparisonValue)} vs market avg
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}