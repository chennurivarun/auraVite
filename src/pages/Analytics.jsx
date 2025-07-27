import React, { useState, useEffect, useMemo } from "react";
import { Vehicle, Transaction, Dealer, User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdvancedMetricsCards from "../components/analytics/AdvancedMetricsCards";
import InventoryTurnoverChart from "../components/analytics/InventoryTurnoverChart";
import ProfitAnalysisChart from "../components/analytics/ProfitAnalysisChart";
import DateRangeSelector from "../components/analytics/DateRangeSelector";
import ReportExporter from "../components/analytics/ReportExporter";
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  DollarSign, 
  AlertCircle,
  RefreshCw,
  Loader2,
  Target,
  Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, startOfMonth, endOfMonth, format, isWithinInterval } from 'date-fns';

export default function Analytics() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]); // For market comparison
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDealer, setCurrentDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
    label: 'Last 30 Days'
  });

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const dealerData = await Dealer.filter({ created_by: user.email });
      if (dealerData.length === 0) {
        navigate(createPageUrl('DealerOnboarding'));
        return;
      }
      
      const dealer = dealerData[0];
      setCurrentDealer(dealer);

      // Load dealer's vehicles and transactions
      const [vehicleData, transactionData, allVehicleData] = await Promise.all([
        Vehicle.filter({ dealer_id: dealer.id }, '-created_date', 100),
        Transaction.list('-created_date', 100),
        Vehicle.list('-created_date', 500) // For market comparison
      ]);
      
      setVehicles(vehicleData || []);
      setTransactions(transactionData || []);
      setAllVehicles(allVehicleData || []);
      
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  // Filter data by date range
  const filteredData = useMemo(() => {
    const isInDateRange = (date) => {
      if (!date) return false;
      const itemDate = new Date(date);
      return isWithinInterval(itemDate, { start: dateRange.start, end: dateRange.end });
    };

    const filteredVehicles = vehicles.filter(v => isInDateRange(v.created_date));
    const filteredTransactions = transactions.filter(t => 
      (t.seller_id === currentDealer?.id || t.buyer_id === currentDealer?.id) &&
      isInDateRange(t.created_date)
    );

    return { vehicles: filteredVehicles, transactions: filteredTransactions };
  }, [vehicles, transactions, currentDealer, dateRange]);

  // Advanced metrics calculations
  const advancedMetrics = useMemo(() => {
    const { vehicles: filteredVehicles, transactions: filteredTransactions } = filteredData;
    const soldVehicles = filteredVehicles.filter(v => v.status === 'sold');
    
    // Average days in stock for sold vehicles
    const avgDaysInStockSold = soldVehicles.length > 0 
      ? soldVehicles.reduce((sum, v) => sum + (v.days_in_stock || 0), 0) / soldVehicles.length
      : 0;

    // Average profit margin
    const profitableVehicles = soldVehicles.filter(v => v.cost_price && v.final_sale_price);
    const avgProfitMargin = profitableVehicles.length > 0
      ? profitableVehicles.reduce((sum, v) => {
          const profit = v.final_sale_price - v.cost_price;
          const margin = (profit / v.cost_price) * 100;
          return sum + margin;
        }, 0) / profitableVehicles.length
      : 0;

    // Inventory turnover rate (annualized)
    const avgInventoryValue = filteredVehicles.reduce((sum, v) => sum + (v.price || 0), 0) / Math.max(filteredVehicles.length, 1);
    const totalSalesValue = soldVehicles.reduce((sum, v) => sum + (v.final_sale_price || v.price || 0), 0);
    const daysCovered = Math.max((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24), 1);
    const inventoryTurnover = avgInventoryValue > 0 ? (totalSalesValue / avgInventoryValue) * (365 / daysCovered) : 0;

    // Average sale price premium (requires market data)
    const avgSalePricePremium = 0; // Will be calculated with market comparison

    return {
      avgDaysInStockSold,
      avgProfitMargin,
      inventoryTurnover,
      avgSalePricePremium,
      totalSales: soldVehicles.length,
      totalRevenue: totalSalesValue,
      activeInventory: filteredVehicles.filter(v => v.status === 'live').length
    };
  }, [filteredData, dateRange]);

  // Market comparison calculations
  const marketComparison = useMemo(() => {
    if (!currentDealer || allVehicles.length === 0) return null;

    const marketVehicles = allVehicles.filter(v => v.dealer_id !== currentDealer.id && v.status === 'sold');
    const dealerSoldVehicles = vehicles.filter(v => v.status === 'sold');

    if (marketVehicles.length === 0 || dealerSoldVehicles.length === 0) return null;

    // Market average days in stock
    const marketAvgDays = marketVehicles.reduce((sum, v) => sum + (v.days_in_stock || 0), 0) / marketVehicles.length;
    const dealerAvgDays = advancedMetrics.avgDaysInStockSold;
    const avgDaysComparison = marketAvgDays > 0 ? ((dealerAvgDays - marketAvgDays) / marketAvgDays) * 100 : 0;

    // Market average profit margin (where data is available)
    const marketProfitableVehicles = marketVehicles.filter(v => v.cost_price && v.final_sale_price);
    const marketAvgProfit = marketProfitableVehicles.length > 0
      ? marketProfitableVehicles.reduce((sum, v) => {
          const profit = v.final_sale_price - v.cost_price;
          const margin = (profit / v.cost_price) * 100;
          return sum + margin;
        }, 0) / marketProfitableVehicles.length
      : 0;
    
    const profitComparison = marketAvgProfit > 0 ? ((advancedMetrics.avgProfitMargin - marketAvgProfit) / marketAvgProfit) * 100 : 0;

    return {
      avgDaysComparison,
      profitComparison,
      turnoverComparison: 0, // Placeholder
      priceComparison: 0 // Placeholder
    };
  }, [allVehicles, vehicles, currentDealer, advancedMetrics]);

  // Chart data preparation
  const inventoryByMakeData = useMemo(() => {
    const makeCount = {};
    filteredData.vehicles.forEach(vehicle => {
      const make = vehicle.make || 'Unknown';
      makeCount[make] = (makeCount[make] || 0) + 1;
    });

    return Object.entries(makeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredData.vehicles]);

  const daysByMakeData = useMemo(() => {
    const makeData = {};
    const soldVehicles = filteredData.vehicles.filter(v => v.status === 'sold');
    
    soldVehicles.forEach(vehicle => {
      const make = vehicle.make || 'Unknown';
      if (!makeData[make]) {
        makeData[make] = { total: 0, count: 0 };
      }
      makeData[make].total += vehicle.days_in_stock || 0;
      makeData[make].count += 1;
    });

    return Object.entries(makeData)
      .map(([name, data]) => ({
        name,
        value: Math.round(data.total / data.count)
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => a.value - b.value)
      .slice(0, 8);
  }, [filteredData.vehicles]);

  // Monthly sales data
  const monthlySalesData = useMemo(() => {
    const monthlyData = {};
    const soldVehicles = filteredData.vehicles.filter(v => v.status === 'sold');
    
    soldVehicles.forEach(vehicle => {
      const month = format(new Date(vehicle.date_sold || vehicle.updated_date), 'MMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, revenue: 0 };
      }
      monthlyData[month].sales += 1;
      monthlyData[month].revenue += vehicle.final_sale_price || vehicle.price || 0;
    });

    return Object.entries(monthlyData)
      .map(([name, data]) => ({
        name,
        sales: data.sales,
        revenue: data.revenue
      }))
      .sort((a, b) => new Date(a.name) - new Date(b.name))
      .slice(-6);
  }, [filteredData.vehicles]);

  // Profit analysis data
  const profitByMonthData = useMemo(() => {
    const monthlyProfit = {};
    const profitableVehicles = filteredData.vehicles.filter(v => 
      v.status === 'sold' && v.cost_price && v.final_sale_price
    );
    
    profitableVehicles.forEach(vehicle => {
      const month = format(new Date(vehicle.date_sold || vehicle.updated_date), 'MMM yyyy');
      const profit = vehicle.final_sale_price - vehicle.cost_price;
      
      if (!monthlyProfit[month]) {
        monthlyProfit[month] = { totalProfit: 0, count: 0 };
      }
      monthlyProfit[month].totalProfit += profit;
      monthlyProfit[month].count += 1;
    });

    return Object.entries(monthlyProfit)
      .map(([name, data]) => ({
        name,
        value: data.totalProfit,
        margin: data.count > 0 ? (data.totalProfit / data.count) / 10000 : 0 // Rough margin calculation
      }))
      .sort((a, b) => new Date(a.name) - new Date(b.name))
      .slice(-6);
  }, [filteredData.vehicles]);

  // Scatter plot data for profit vs days in stock
  const profitVsDaysData = useMemo(() => {
    return filteredData.vehicles
      .filter(v => v.status === 'sold' && v.cost_price && v.final_sale_price && v.days_in_stock)
      .map(vehicle => {
        const profit = vehicle.final_sale_price - vehicle.cost_price;
        const margin = (profit / vehicle.cost_price) * 100;
        return {
          x: vehicle.days_in_stock,
          y: margin,
          make: vehicle.make,
          model: vehicle.model
        };
      })
      .slice(0, 50); // Limit to avoid clutter
  }, [filteredData.vehicles]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-lg text-gray-600">Loading Analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="momentum-h3 text-red-700 mb-2">Error Loading Analytics</h3>
          <p className="momentum-body text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="momentum-btn-primary">
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  if (!currentDealer) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete your dealer onboarding to access analytics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const reportData = {
    ...advancedMetrics,
    inventoryByMake: inventoryByMakeData,
    monthlySales: monthlySalesData,
    profitByMonth: profitByMonthData,
    daysByMake: daysByMakeData
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 ">
      {/* Header with Date Range and Export */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="momentum-h1">Advanced Analytics</h1>
          <p className="momentum-body">
            Comprehensive insights into your business performance and market position
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ReportExporter
            data={reportData}
            dealerName={currentDealer.business_name}
            dateRange={dateRange}
            onExport={(exportData) => console.log('Export requested:', exportData)}
          />
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="mb-8">
        <Card className="momentum-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Analysis Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DateRangeSelector
              onDateRangeChange={setDateRange}
              currentRange={dateRange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Advanced Metrics Cards */}
      <div className="mb-8">
        <AdvancedMetricsCards
          metrics={advancedMetrics}
          marketComparison={marketComparison}
          isLoading={loading}
        />
      </div>

      {/* Market Position Summary */}
      {marketComparison && (
        <div className="mb-8">
          <Card className="momentum-card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Award className="w-5 h-5" />
                Market Position Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Inventory Efficiency: </span>
                  <span className={marketComparison.avgDaysComparison < 0 ? 'text-green-600' : 'text-red-600'}>
                    {marketComparison.avgDaysComparison < 0 ? 'Above Average' : 'Below Average'}
                  </span>
                  <span className="text-gray-600 ml-1">
                    ({marketComparison.avgDaysComparison.toFixed(1)}% vs market)
                  </span>
                </div>
                <div>
                  <span className="font-medium">Profitability: </span>
                  <span className={marketComparison.profitComparison > 0 ? 'text-green-600' : 'text-red-600'}>
                    {marketComparison.profitComparison > 0 ? 'Above Average' : 'Below Average'}
                  </span>
                  <span className="text-gray-600 ml-1">
                    ({marketComparison.profitComparison.toFixed(1)}% vs market)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Sales Performance */}
        <Card className="momentum-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Sales Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'sales' ? value : `₹${(value / 100000).toFixed(1)}L`,
                  name === 'sales' ? 'Sales Count' : 'Revenue'
                ]} />
                <Line type="monotone" dataKey="sales" stroke="#0066CC" strokeWidth={2} name="sales" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Distribution */}
        <InventoryTurnoverChart data={inventoryByMakeData} type="pie" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Days to Sell by Make */}
        <InventoryTurnoverChart data={daysByMakeData} type="bar" />

        {/* Profit Analysis */}
        <ProfitAnalysisChart data={profitByMonthData} type="line" title="Monthly Profit Trends" />
      </div>

      {/* Profit vs Performance Analysis */}
      {profitVsDaysData.length > 0 && (
        <div className="mb-8">
          <ProfitAnalysisChart 
            data={profitVsDaysData} 
            type="scatter" 
            title="Profit Margin vs Days in Stock Analysis" 
          />
        </div>
      )}

      {/* Data Summary Footer */}
      <div className="mt-8 pt-6 border-t">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm text-gray-600">
          <div>
            <div className="font-medium text-gray-800">{filteredData.vehicles.length}</div>
            <div>Total Vehicles</div>
          </div>
          <div>
            <div className="font-medium text-gray-800">{filteredData.vehicles.filter(v => v.status === 'sold').length}</div>
            <div>Sold in Period</div>
          </div>
          <div>
            <div className="font-medium text-gray-800">{filteredData.transactions.length}</div>
            <div>Total Transactions</div>
          </div>
          <div>
            <div className="font-medium text-gray-800">
              ₹{((filteredData.vehicles.filter(v => v.status === 'sold').reduce((sum, v) => sum + (v.final_sale_price || v.price || 0), 0)) / 100000).toFixed(1)}L
            </div>
            <div>Total Revenue</div>
          </div>
        </div>
      </div>
    </div>
  );
}