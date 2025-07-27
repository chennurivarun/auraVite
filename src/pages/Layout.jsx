

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User } from "@/api/entities";
import { Notification } from "@/api/entities";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { 
  BarChart3, // Used for Dashboard
  Package, // New icon for Inventory
  ShoppingCart, // New icon for Marketplace
  Receipt, // New icon for Transactions
  Megaphone, // New icon for Marketing
  TrendingUp, // New icon for Analytics
  Settings,
  Plus,
  LogOut,
  Bell,
  LifeBuoy,
  Shield
} from "lucide-react";
import FeedbackModal from "@/components/shared/FeedbackModal";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const navigationItems = [
  { href: 'Dashboard', icon: BarChart3, label: 'Dashboard' },
  { href: 'Inventory', icon: Package, label: 'Inventory' },
  { href: 'Marketplace', icon: ShoppingCart, label: 'Marketplace' },
  { href: 'Transactions', icon: Receipt, label: 'Transactions' },
  { href: 'Marketing', icon: Megaphone, label: 'Marketing' }, // Enhanced Marketing Hub
  { href: 'Analytics', icon: TrendingUp, label: 'Analytics' },
  { href: 'Settings', icon: Settings, label: 'Settings' }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const noLayoutPages = ["Welcome", "SplashScreen", "DealerOnboarding", "OnboardingWizard", "ListingWizard"];

  useEffect(() => {
    fetchUserData();
  }, [currentPageName]);

  useEffect(() => {
    if (currentUser) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    setIsLoadingUser(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (e) {
      if (!noLayoutPages.includes(currentPageName)) {
        navigate(createPageUrl('Welcome'));
      }
    } finally {
      setIsLoadingUser(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!currentUser) return;
    try {
      const unreadNotifications = await Notification.filter({ 
        user_email: currentUser.email, 
        read_status: false 
      });
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  const handleLogout = async () => {
    await User.logout();
    navigate(createPageUrl('Welcome'));
  };

  // Render pages without layout immediately
  if (noLayoutPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  // Show a full-page loader for pages that need a layout, while we check for a user.
  if (isLoadingUser) {
    return <LoadingSpinner fullScreen text="Loading Workspace..." />;
  }

  // If loading is done but there's no user, it means we navigated away. Render nothing.
  if (!currentUser) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-momentum-surface-1">
        <style>{`
          :root {
            --momentum-surface-0: #ffffff;
            --momentum-surface-1: #f8fafc;
            --momentum-surface-2: #f1f5f9;
            --momentum-surface-3: #e2e8f0;
            --momentum-primary: #0066cc;
            --momentum-accent: #ff6600;
          }

          .momentum-glass-nav {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            border-right: 1px solid var(--momentum-surface-3);
          }

          .momentum-card {
            background: var(--momentum-surface-0);
            border: 1px solid var(--momentum-surface-3);
            border-radius: 12px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          }

          .momentum-btn-primary {
            background: var(--momentum-primary);
            color: white;
          }

          .momentum-btn-accent {
            background: var(--momentum-accent);
            color: white;
          }

          .momentum-h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #1e293b;
            line-height: 1.2;
          }

          .momentum-h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #334155;
            line-height: 1.3;
          }

          .momentum-h3 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #475569;
            line-height: 1.4;
          }

          .momentum-body {
            font-size: 1rem;
            color: #64748b;
            line-height: 1.5;
          }

          .momentum-small {
            font-size: 0.875rem;
            color: #94a3b8;
            line-height: 1.4;
          }
        `}</style>

        <div className="flex h-screen w-full fixed">
          <nav className="w-20 momentum-glass-nav flex flex-col items-center py-6 space-y-4 shrink-0">
            <Link to={createPageUrl("Dashboard")} className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">A</Link>
            
            <div className="flex-1 flex flex-col items-center space-y-2 mt-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  to={createPageUrl(item.href)}
                  className={`group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${
                    currentPageName === item.href
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  }`}
                  title={item.label}
                >
                  <item.icon className="w-6 h-6" />
                  <div className="absolute left-16 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-gray-800 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100 z-50">
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    title="Notifications"
                  >
                    <Bell className="w-6 h-6" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount}
                      </div>
                    )}
                    <div className="absolute left-16 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-gray-800 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100 z-50">
                      Notifications
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 mr-4" align="end">
                  {currentUser && (
                    <NotificationCenter 
                      userEmail={currentUser.email} 
                      onNotificationsUpdate={fetchUnreadCount} 
                    />
                  )}
                </PopoverContent>
              </Popover>

              <Link
                to={createPageUrl("ListingWizard")}
                className="group relative w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center transition-all duration-200 hover:shadow-lg"
                title="Add Vehicle"
              >
                <Plus className="w-6 h-6" />
                <div className="absolute left-16 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-gray-800 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100 z-50">
                  Add Vehicle
                </div>
              </Link>

              {/* Platform Admin Link - Only show for platform admins */}
              {currentUser?.platform_admin && (
                <Link
                  to={createPageUrl("PlatformAdmin")}
                  className={`group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${
                    currentPageName === 'PlatformAdmin'
                      ? "bg-red-50 text-red-600"
                      : "text-gray-500 hover:bg-red-50 hover:text-red-600"
                  }`}
                  title="Platform Admin"
                >
                  <Shield className="w-6 h-6" />
                  <div className="absolute left-16 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-gray-800 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100 z-50">
                    Platform Admin
                  </div>
                </Link>
              )}
              
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="Feedback"
              >
                <LifeBuoy className="w-6 h-6" />
                <div className="absolute left-16 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-gray-800 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100 z-50">
                  Feedback
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 text-gray-500 hover:bg-red-50 hover:text-red-600"
                title="Sign Out"
              >
                <LogOut className="w-6 h-6" />
                <div className="absolute left-16 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-gray-800 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100 z-50">
                  Sign Out
                </div>
              </button>
            </div>
          </nav>

          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
    </ErrorBoundary>
  );
}

