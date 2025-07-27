import React, { useState, useEffect } from 'react';
import { User, Dealer, SystemLog, SystemConfig, Transaction, Vehicle } from '@/api/entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Users, 
  Settings as SettingsIcon, 
  FileText, 
  Download,
  Eye,
  Edit,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import { DataManager } from '../components/shared/DataManager';

export default function PlatformAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [systemConfigs, setSystemConfigs] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadPlatformData();
  }, []);

  const loadPlatformData = async () => {
    setLoading(true);
    try {
      const user = await DataManager.getCurrentUser();
      if (!user || !user.platform_admin) {
        throw new Error('Unauthorized: Platform admin access required');
      }
      setCurrentUser(user);

      // Load all platform data
      const [usersData, dealersData, logsData, configsData] = await Promise.all([
        User.list(),
        Dealer.list(),
        SystemLog.list('-created_date', 100),
        SystemConfig.list()
      ]);

      setUsers(usersData);
      setDealers(dealersData);
      setSystemLogs(logsData);
      setSystemConfigs(configsData);

      // Calculate analytics
      await calculateAnalytics();

    } catch (error) {
      console.error('Error loading platform data:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = async () => {
    try {
      const [transactions, vehicles] = await Promise.all([
        Transaction.list(),
        Vehicle.list()
      ]);

      const analyticsData = {
        totalUsers: users.length,
        totalDealers: dealers.length,
        totalTransactions: transactions.length,
        totalVehicles: vehicles.length,
        activeTransactions: transactions.filter(t => ['offer_made', 'negotiating', 'accepted'].includes(t.status)).length,
        completedDeals: transactions.filter(t => t.status === 'completed').length,
        customMarginUsers: users.filter(u => u.custom_margin_enabled).length,
        verifiedDealers: dealers.filter(d => d.verification_status === 'verified').length,
        totalGMV: transactions
          .filter(t => t.status === 'completed' && t.final_amount)
          .reduce((sum, t) => sum + t.final_amount, 0),
        avgTransactionValue: transactions.length > 0 
          ? transactions.reduce((sum, t) => sum + (t.final_amount || t.offer_amount || 0), 0) / transactions.length 
          : 0
      };

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  };

  const updateUserPermissions = async (userId, customMarginEnabled) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      // Update user permissions
      await User.update(userId, {
        ...user,
        custom_margin_enabled: customMarginEnabled,
        margin_override_history: [
          ...(user.margin_override_history || []),
          {
            changed_by: currentUser.email,
            change_date: new Date().toISOString(),
            old_permission: user.custom_margin_enabled || false,
            new_permission: customMarginEnabled,
            reason: 'Updated by platform admin'
          }
        ]
      });

      // Log the action
      await SystemLog.create({
        admin_email: currentUser.email,
        user_email: user.email,
        action_type: 'margin_permission_change',
        target_entity: userId,
        details: {
          user_email: user.email,
          old_permission: user.custom_margin_enabled || false,
          new_permission: customMarginEnabled,
          changed_by: currentUser.email
        },
        severity: 'info',
        module: 'admin_panel'
      });

      // Reload data
      await loadPlatformData();
      alert('User permissions updated successfully');

    } catch (error) {
      console.error('Error updating user permissions:', error);
      alert('Error updating permissions: ' + error.message);
    }
  };

  const updateSystemConfig = async (configKey, newValue) => {
    try {
      const config = systemConfigs.find(c => c.config_key === configKey);
      if (!config) return;

      await SystemConfig.update(config.id, {
        ...config,
        config_value: newValue,
        last_modified_by: currentUser.email,
        last_modified_at: new Date().toISOString()
      });

      // Log the action
      await SystemLog.create({
        admin_email: currentUser.email,
        action_type: 'system_config_change',
        target_entity: config.id,
        details: {
          config_key: configKey,
          old_value: config.config_value,
          new_value: newValue,
          changed_by: currentUser.email
        },
        severity: 'warning',
        module: 'admin_panel'
      });

      await loadPlatformData();
      alert('System configuration updated successfully');

    } catch (error) {
      console.error('Error updating system config:', error);
      alert('Error updating configuration: ' + error.message);
    }
  };

  const generateReport = async (reportType) => {
    try {
      let reportData = {};
      
      switch (reportType) {
        case 'user_activity':
          reportData = {
            type: 'User Activity Report',
            generated_at: new Date().toISOString(),
            data: {
              total_users: users.length,
              custom_margin_users: users.filter(u => u.custom_margin_enabled).length,
              recent_logins: users.filter(u => {
                if (!u.last_login) return false;
                const lastLogin = new Date(u.last_login);
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return lastLogin > sevenDaysAgo;
              }).length
            }
          };
          break;
        case 'transaction_summary':
          const transactions = await Transaction.list();
          reportData = {
            type: 'Transaction Summary Report',
            generated_at: new Date().toISOString(),
            data: {
              total_transactions: transactions.length,
              completed_transactions: transactions.filter(t => t.status === 'completed').length,
              total_gmv: analytics.totalGMV,
              avg_transaction_value: analytics.avgTransactionValue,
              customer_mode_transactions: transactions.filter(t => t.customer_mode_active).length
            }
          };
          break;
        case 'system_health':
          reportData = {
            type: 'System Health Report',
            generated_at: new Date().toISOString(),
            data: {
              total_logs: systemLogs.length,
              error_logs: systemLogs.filter(l => l.severity === 'error').length,
              warning_logs: systemLogs.filter(l => l.severity === 'warning').length,
              system_configs: systemConfigs.length,
              active_configs: systemConfigs.filter(c => c.is_active).length
            }
          };
          break;
      }

      // Log report generation
      await SystemLog.create({
        admin_email: currentUser.email,
        action_type: 'report_generation',
        target_entity: reportType,
        details: {
          report_type: reportType,
          generated_by: currentUser.email,
          record_count: Object.keys(reportData.data || {}).length
        },
        severity: 'info',
        module: 'admin_panel'
      });

      // Download as JSON file
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + error.message);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '₹0.00L';
    return `₹${(price / 100000).toFixed(2)}L`;
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading Platform Admin..." />;
  }

  if (!currentUser?.platform_admin) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600">
              You don't have platform administrator privileges.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-full">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mb-8">
            <h1 className="momentum-h1 flex items-center gap-3">
              <Shield className="w-8 h-8" />
              Platform Administration
            </h1>
            <p className="momentum-body">
              Manage users, permissions, system configuration, and analytics.
            </p>
          </div>

          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold">{analytics.totalUsers || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Deals</p>
                    <p className="text-2xl font-bold">{analytics.activeTransactions || 0}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total GMV</p>
                    <p className="text-xl font-bold">{formatPrice(analytics.totalGMV)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Custom Margins</p>
                    <p className="text-2xl font-bold">{analytics.customMarginUsers || 0}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="system">System Config</TabsTrigger>
              <TabsTrigger value="logs">System Logs</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management & Permissions</CardTitle>
                  <CardDescription>
                    Manage user permissions, particularly custom margin settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.map(user => {
                      const dealer = dealers.find(d => d.created_by === user.email);
                      return (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-semibold">{user.full_name || 'N/A'}</p>
                                <p className="text-sm text-gray-600">{user.email}</p>
                                {dealer && (
                                  <p className="text-xs text-blue-600">{dealer.business_name}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {user.platform_admin && (
                                  <Badge className="bg-red-100 text-red-800">Admin</Badge>
                                )}
                                {user.custom_margin_enabled && (
                                  <Badge className="bg-green-100 text-green-800">Custom Margins</Badge>
                                )}
                                {dealer?.verification_status === 'verified' && (
                                  <Badge className="bg-blue-100 text-blue-800">Verified</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end text-sm">
                              <span>Custom Margins</span>
                              <Switch
                                checked={user.custom_margin_enabled || false}
                                onCheckedChange={(checked) => updateUserPermissions(user.id, checked)}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Config Tab */}
            <TabsContent value="system">
              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>
                    Manage platform-wide settings and configurations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Margin Configuration */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-4">Dynamic Margin Settings</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Price Bracket: ≤ ₹3L</p>
                          <p>Desired: 15% | Minimum: 10%</p>
                        </div>
                        <div>
                          <p className="font-medium">Price Bracket: ₹3L - ₹8L</p>
                          <p>Desired: 12% | Minimum: 8%</p>
                        </div>
                        <div>
                          <p className="font-medium">Price Bracket: &gt; ₹8L</p>
                          <p>Desired: 10% | Minimum: 6%</p>
                        </div>
                        <div>
                          <p className="font-medium">Platform Fee</p>
                          <p>Fixed: ₹13,000</p>
                        </div>
                      </div>
                      <Alert className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Margin percentages are hardcoded for security. Contact development team to modify.
                        </AlertDescription>
                      </Alert>
                    </div>

                    {/* Other System Configs */}
                    <div className="space-y-4">
                      {systemConfigs.map(config => (
                        <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-semibold">{config.config_key}</p>
                            <p className="text-sm text-gray-600">{config.description}</p>
                            <Badge variant="outline">{config.category}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              value={config.config_value}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                // Update locally first
                                setSystemConfigs(prev => 
                                  prev.map(c => c.id === config.id ? {...c, config_value: newValue} : c)
                                );
                              }}
                              className="w-32"
                            />
                            <Button
                              size="sm"
                              onClick={() => updateSystemConfig(config.config_key, config.config_value)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Logs Tab */}
            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle>System Logs</CardTitle>
                  <CardDescription>
                    Monitor system activities and user actions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {systemLogs.map(log => (
                      <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg text-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={
                              log.severity === 'error' ? 'destructive' :
                              log.severity === 'warning' ? 'default' : 'secondary'
                            }>
                              {log.severity}
                            </Badge>
                            <span className="font-medium">{log.action_type}</span>
                          </div>
                          <p className="text-gray-600 mb-1">
                            {log.user_email && `User: ${log.user_email}`}
                            {log.admin_email && ` | Admin: ${log.admin_email}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(log.created_date), 'MMM d, yyyy HH:mm:ss')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{log.module}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics & Reports</CardTitle>
                  <CardDescription>
                    Generate detailed reports and export data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 border rounded-lg">
                      <FileText className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                      <h4 className="font-semibold mb-2">User Activity Report</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Comprehensive user activity and permissions report.
                      </p>
                      <Button onClick={() => generateReport('user_activity')}>
                        <Download className="w-4 h-4 mr-2" />
                        Generate
                      </Button>
                    </div>

                    <div className="text-center p-6 border rounded-lg">
                      <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h4 className="font-semibold mb-2">Transaction Summary</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Detailed transaction and revenue analytics.
                      </p>
                      <Button onClick={() => generateReport('transaction_summary')}>
                        <Download className="w-4 h-4 mr-2" />
                        Generate
                      </Button>
                    </div>

                    <div className="text-center p-6 border rounded-lg">
                      <Activity className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                      <h4 className="font-semibold mb-2">System Health</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        System logs, errors, and configuration status.
                      </p>
                      <Button onClick={() => generateReport('system_health')}>
                        <Download className="w-4 h-4 mr-2" />
                        Generate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* User Detail Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information and history for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Email</p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="font-semibold">Full Name</p>
                  <p className="text-sm text-gray-600">{selectedUser.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold">Last Login</p>
                  <p className="text-sm text-gray-600">
                    {selectedUser.last_login ? format(new Date(selectedUser.last_login), 'MMM d, yyyy HH:mm') : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Custom Margins Enabled</p>
                  <Badge variant={selectedUser.custom_margin_enabled ? "default" : "secondary"}>
                    {selectedUser.custom_margin_enabled ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>

              {selectedUser.margin_override_history && selectedUser.margin_override_history.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Margin Permission History</p>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {selectedUser.margin_override_history.map((history, index) => (
                      <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                        <p>{format(new Date(history.change_date), 'MMM d, yyyy HH:mm')} - 
                          Changed by: {history.changed_by}</p>
                        <p>Permission: {history.old_permission ? 'Enabled' : 'Disabled'} → {history.new_permission ? 'Enabled' : 'Disabled'}</p>
                        <p>Reason: {history.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}