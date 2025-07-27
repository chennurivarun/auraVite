import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Table, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportExporter({ 
  data, 
  dealerName, 
  dateRange,
  onExport 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [selectedSections, setSelectedSections] = useState({
    summary: true,
    inventory: true,
    sales: true,
    profit: true,
    market_comparison: true
  });

  const availableSections = [
    { key: 'summary', label: 'Executive Summary', description: 'Key metrics and KPIs' },
    { key: 'inventory', label: 'Inventory Analysis', description: 'Stock levels and turnover rates' },
    { key: 'sales', label: 'Sales Performance', description: 'Revenue and transaction data' },
    { key: 'profit', label: 'Profit Analysis', description: 'Margins and profitability metrics' },
    { key: 'market_comparison', label: 'Market Benchmarks', description: 'Performance vs market averages' }
  ];

  const handleSectionToggle = (sectionKey, checked) => {
    setSelectedSections(prev => ({
      ...prev,
      [sectionKey]: checked
    }));
  };

  const generateCSV = (data, sections) => {
    let csvContent = '';
    
    // Header
    csvContent += `${dealerName} - Business Analytics Report\n`;
    csvContent += `Generated: ${format(new Date(), 'PPP')}\n`;
    csvContent += `Period: ${dateRange?.label || 'All Time'}\n\n`;

    if (sections.summary) {
      csvContent += 'EXECUTIVE SUMMARY\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Sales,${data.totalSales || 0}\n`;
      csvContent += `Total Revenue,₹${((data.totalRevenue || 0) / 100000).toFixed(1)}L\n`;
      csvContent += `Active Inventory,${data.activeInventory || 0}\n`;
      csvContent += `Avg Days in Stock (Sold),${(data.avgDaysInStockSold || 0).toFixed(1)} days\n`;
      csvContent += `Avg Profit Margin,${(data.avgProfitMargin || 0).toFixed(1)}%\n\n`;
    }

    if (sections.inventory && data.inventoryByMake) {
      csvContent += 'INVENTORY BY MAKE\n';
      csvContent += 'Make,Count,Percentage\n';
      data.inventoryByMake.forEach(item => {
        const percentage = ((item.value / data.activeInventory) * 100).toFixed(1);
        csvContent += `${item.name},${item.value},${percentage}%\n`;
      });
      csvContent += '\n';
    }

    if (sections.sales && data.monthlySales) {
      csvContent += 'MONTHLY SALES PERFORMANCE\n';
      csvContent += 'Month,Sales Count,Revenue (₹L)\n';
      data.monthlySales.forEach(item => {
        csvContent += `${item.name},${item.sales},${(item.revenue / 100000).toFixed(1)}\n`;
      });
      csvContent += '\n';
    }

    if (sections.profit && data.profitByMonth) {
      csvContent += 'MONTHLY PROFIT ANALYSIS\n';
      csvContent += 'Month,Profit (₹L),Margin (%)\n';
      data.profitByMonth.forEach(item => {
        csvContent += `${item.name},${(item.value / 100000).toFixed(1)},${(item.margin || 0).toFixed(1)}%\n`;
      });
      csvContent += '\n';
    }

    return csvContent;
  };

  const handleExport = async () => {
    setExporting(true);
    
    try {
      const selectedSectionKeys = Object.keys(selectedSections).filter(key => selectedSections[key]);
      
      if (exportFormat === 'csv') {
        const csvContent = generateCSV(data, selectedSections);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dealerName.replace(/\s+/g, '_')}_Analytics_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      if (onExport) {
        onExport({
          format: exportFormat,
          sections: selectedSectionKeys,
          dateRange: dateRange
        });
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = Object.values(selectedSections).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Analytics Report
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive report of your business analytics and performance metrics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Export Format</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    CSV (Excel Compatible)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Section Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Report Sections</label>
              <Badge variant="secondary">{selectedCount} selected</Badge>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {availableSections.map((section) => (
                <div key={section.key} className="flex items-start space-x-3">
                  <Checkbox
                    id={section.key}
                    checked={selectedSections[section.key]}
                    onCheckedChange={(checked) => handleSectionToggle(section.key, checked)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={section.key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {section.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm">
              <div className="font-medium text-blue-800">Report Details</div>
              <div className="text-blue-700 mt-1">
                <div>Period: {dateRange?.label || 'All Time'}</div>
                <div>Generated: {format(new Date(), 'PPP')}</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={selectedCount === 0 || exporting}
            className="gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
