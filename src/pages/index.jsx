import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Inventory from "./Inventory";

import Marketplace from "./Marketplace";

import AddVehicle from "./AddVehicle";

import SplashScreen from "./SplashScreen";

import AuthHub from "./AuthHub";

import DealerOnboarding from "./DealerOnboarding";

import OnboardingWizard from "./OnboardingWizard";

import Transactions from "./Transactions";

import Settings from "./Settings";

import DealRoom from "./DealRoom";

import Analytics from "./Analytics";

import Welcome from "./Welcome";

import ListingWizard from "./ListingWizard";

import Help from "./Help";

import Marketing from "./Marketing";

import PlatformAdmin from "./PlatformAdmin";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Inventory: Inventory,
    
    Marketplace: Marketplace,
    
    AddVehicle: AddVehicle,
    
    SplashScreen: SplashScreen,
    
    AuthHub: AuthHub,
    
    DealerOnboarding: DealerOnboarding,
    
    OnboardingWizard: OnboardingWizard,
    
    Transactions: Transactions,
    
    Settings: Settings,
    
    DealRoom: DealRoom,
    
    Analytics: Analytics,
    
    Welcome: Welcome,
    
    ListingWizard: ListingWizard,
    
    Help: Help,
    
    Marketing: Marketing,
    
    PlatformAdmin: PlatformAdmin,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Inventory" element={<Inventory />} />
                
                <Route path="/Marketplace" element={<Marketplace />} />
                
                <Route path="/AddVehicle" element={<AddVehicle />} />
                
                <Route path="/SplashScreen" element={<SplashScreen />} />
                
                <Route path="/AuthHub" element={<AuthHub />} />
                
                <Route path="/DealerOnboarding" element={<DealerOnboarding />} />
                
                <Route path="/OnboardingWizard" element={<OnboardingWizard />} />
                
                <Route path="/Transactions" element={<Transactions />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/DealRoom" element={<DealRoom />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/Welcome" element={<Welcome />} />
                
                <Route path="/ListingWizard" element={<ListingWizard />} />
                
                <Route path="/Help" element={<Help />} />
                
                <Route path="/Marketing" element={<Marketing />} />
                
                <Route path="/PlatformAdmin" element={<PlatformAdmin />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}