
import React, { useState, useEffect, useMemo } from "react";
import VehicleCard from "../components/shared/VehicleCard";
import VehicleDetailPanel from "../components/shared/VehicleDetailPanel";
import FilterPills from "../components/shared/FilterPills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Plus, Edit, Trash2, Copy, Upload, Download, Car } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { DataManager } from "../components/shared/DataManager";
import ErrorBoundary from "../components/shared/ErrorBoundary";
import PermissionGuard from "../components/shared/PermissionGuard";
import LoadingSpinner from "../components/shared/LoadingSpinner";

export default function Inventory() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedVehicles, setSelectedVehicles] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDealer, setCurrentDealer] = useState(null);
  const [initializationError, setInitializationError] = useState(null);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    setLoading(true);
    setInitializationError(null);
    try {
      console.log('[Inventory] Loading inventory data...');
      
      // Get current user using DataManager
      const user = await DataManager.getCurrentUser();
      if (!user) {
        throw new Error("Could not retrieve user information. Please try logging in again.");
      }
      
      console.log(`[Inventory] User authenticated: ${user.email}`);
      setCurrentUser(user);
      
      // Get dealer profile using DataManager
      const dealer = await DataManager.getDealerByUserEmail(user.email);
      if (!dealer) {
        const errorMsg = `No dealer profile is associated with the email ${user.email}. Please ensure your account is set up correctly.`;
        console.error('[Inventory]', errorMsg);
        setInitializationError(errorMsg);
        setVehicles([]);
        return;
      }
      
      console.log(`[Inventory] Dealer found: ${dealer.business_name} (ID: ${dealer.id})`);
      setCurrentDealer(dealer);
      
      // Get vehicles using DataManager
      const vehicleData = await DataManager.getVehiclesByDealer(dealer.id);
      console.log(`[Inventory] Loaded ${vehicleData.length} vehicles for dealer`);
      
      setVehicles(vehicleData);
      
      if (vehicleData.length > 0) {
        setSelectedVehicleId(vehicleData[0].id);
      }
    } catch (error) {
      console.error('[Inventory] Error loading inventory data:', error);
      const errorMsg = `A critical error occurred: ${error.message}`;
      setInitializationError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filters = useMemo(() => {
    const statusCounts = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
      return acc;
    }, {});

    return [
      { key: "all", label: "All Vehicles", count: vehicles.length },
      { key: "live", label: "Live", count: statusCounts.live || 0 },
      { key: "draft", label: "Draft", count: statusCounts.draft || 0 },
      { key: "in_transaction", label: "In Deal", count: statusCounts.in_transaction || 0 },
      { key: "sold", label: "Sold", count: statusCounts.sold || 0 }
    ];
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    let filtered = vehicles.filter(vehicle => {
      const matchesSearch = `${vehicle.make} ${vehicle.model} ${vehicle.year}`.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === "all" || vehicle.status === activeFilter;
      return matchesSearch && matchesFilter;
    });

    // Sorting
    switch (sortBy) {
      case "price_low": filtered.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
      case "price_high": filtered.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
      case "year_new": filtered.sort((a, b) => (b.year || 0) - (a.year || 0)); break;
      case "alphabetical": filtered.sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`)); break;
      case "oldest": filtered.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)); break;
      default: filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); break;
    }

    return filtered;
  }, [vehicles, searchTerm, activeFilter, sortBy]);

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      await DataManager.deleteVehicle(vehicleId);
      await loadInventoryData(); // Reload data
      if (selectedVehicleId === vehicleId) {
        const remainingVehicles = vehicles.filter(v => v.id !== vehicleId);
        setSelectedVehicleId(remainingVehicles.length > 0 ? remainingVehicles[0].id : null);
      }
    } catch (error) {
      console.error('[Inventory] Error deleting vehicle:', error);
      alert(`Failed to delete vehicle: ${error.message}`);
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    try {
      const updatePromises = Array.from(selectedVehicles).map(vehicleId => 
        DataManager.updateVehicle(vehicleId, { status: newStatus })
      );
      await Promise.all(updatePromises);
      
      setSelectedVehicles(new Set());
      setBulkActionMode(false);
      await loadInventoryData(); // Reload data
    } catch (error) {
      console.error('[Inventory] Error updating vehicles:', error);
      alert(`Failed to update vehicles: ${error.message}`);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const deletePromises = Array.from(selectedVehicles).map(vehicleId => 
        DataManager.deleteVehicle(vehicleId)
      );
      await Promise.all(deletePromises);
      
      setSelectedVehicles(new Set());
      setBulkActionMode(false);
      setSelectedVehicleId(null);
      await loadInventoryData(); // Reload data
    } catch (error) {
      console.error('[Inventory] Error deleting vehicles:', error);
      alert(`Failed to delete vehicles: ${error.message}`);
    }
  };

  const handleDuplicateVehicle = async (vehicle) => {
    try {
      if (!currentDealer) {
        throw new Error('Current dealer not found');
      }

      const duplicateData = { 
        ...vehicle, 
        status: 'draft',
        days_in_stock: 0,
        views: 0,
        inquiries: 0
      };
      
      // Remove system-generated fields
      delete duplicateData.id;
      delete duplicateData.created_date;
      delete duplicateData.updated_date;
      delete duplicateData.created_by;
      
      await DataManager.createVehicle(duplicateData, currentDealer.id);
      await loadInventoryData(); // Reload data
    } catch (error) {
      console.error('[Inventory] Error duplicating vehicle:', error);
      alert(`Failed to duplicate vehicle: ${error.message}`);
    }
  };

  const toggleVehicleSelection = (vehicleId) => {
    const newSelection = new Set(selectedVehicles);
    if (newSelection.has(vehicleId)) {
      newSelection.delete(vehicleId);
    } else {
      newSelection.add(vehicleId);
    }
    setSelectedVehicles(newSelection);
  };

  const selectAllVisible = () => {
    const visibleVehicleIds = filteredVehicles.map(v => v.id);
    setSelectedVehicles(new Set(visibleVehicleIds));
  };

  const clearSelection = () => {
    setSelectedVehicles(new Set());
    setBulkActionMode(false);
  };

  // New function to handle processing updates
  const handleProcessingUpdate = (vehicleId, type) => {
    console.log(`[Inventory] Processing update for vehicle ${vehicleId}, type: ${type}`);
    // Reload inventory data to reflect processing status changes
    loadInventoryData();
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading Inventory..." />;
  }
  
  if (initializationError) {
    return (
        <div className="flex h-full p-8 items-center justify-center">
            <Alert variant="destructive" className="max-w-lg">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Account Configuration Error</AlertTitle>
              <AlertDescription>
                {initializationError}
                <div className="mt-4">
                    <Button onClick={() => window.location.reload()}>Reload Page</Button>
                </div>
              </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <ErrorBoundary>
      <PermissionGuard requireDealer={true}>
        <div className="flex h-full">
          {/* Context Zone */}
          <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="momentum-h1">My Inventory</h1>
                <p className="momentum-body">
                  Manage your {vehicles.length} vehicle listings with AI enhancement features.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setBulkActionMode(!bulkActionMode)}>
                  <Checkbox className="w-4 h-4 mr-2" />
                  Bulk Actions
                </Button>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Link to={createPageUrl("AddVehicle")}>
                  <Button className="momentum-btn-accent">
                    <Plus className="w-4 h-4 mr-2" />
                    List Vehicle
                  </Button>
                </Link>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {bulkActionMode && selectedVehicles.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-blue-800">
                      {selectedVehicles.size} vehicle(s) selected
                    </span>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={handleBulkStatusChange}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selected Vehicles</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedVehicles.size} vehicle(s)? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search your inventory by make, model, or year..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-12 rounded-lg"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                    <SelectItem value="year_new">Year: Newest First</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <FilterPills
                  filters={filters}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />
                
                {bulkActionMode && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllVisible}>
                      Select All Visible ({filteredVehicles.length})
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Grid */}
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-12 momentum-card">
                <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="momentum-h3 mb-2">No Vehicles Found</h3>
                <p className="momentum-body mb-6">
                  {searchTerm ? 'Try a different search term.' : 'Click "List Vehicle" to add your first car.'}
                </p>
                {!searchTerm && (
                  <Link to={createPageUrl("AddVehicle")}>
                    <Button className="momentum-btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      List First Vehicle
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="relative group">
                    {bulkActionMode && (
                      <div className="absolute top-4 left-4 z-10">
                        <Checkbox
                          checked={selectedVehicles.has(vehicle.id)}
                          onCheckedChange={() => toggleVehicleSelection(vehicle.id)}
                          className="bg-white shadow-md"
                        />
                      </div>
                    )}
                    
                    <VehicleCard
                      vehicle={vehicle}
                      onClick={(v) => setSelectedVehicleId(v.id)}
                      isSelected={selectedVehicleId === vehicle.id}
                      showActions={false}
                    />
                    
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                      <Link to={createPageUrl(`AddVehicle?id=${vehicle.id}`)}>
                        <button className="w-9 h-9 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-md">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                      </Link>
                      
                      <button 
                        onClick={() => handleDuplicateVehicle(vehicle)}
                        className="w-9 h-9 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-md"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4 text-green-600" />
                      </button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="w-9 h-9 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-md">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{vehicle.year} {vehicle.make} {vehicle.model}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteVehicle(vehicle.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Focus Zone */}
          <div className="w-[400px] bg-momentum-surface-0 border-l border-momentum-surface-3 shrink-0 hidden lg:block">
            <VehicleDetailPanel
              vehicleId={selectedVehicleId}
              onMakeOffer={(vehicle) => console.log('Make offer for:', vehicle)}
              viewContext="inventory"
              currentDealer={currentDealer}
              onProcessingUpdate={handleProcessingUpdate}
            />
          </div>
        </div>
      </PermissionGuard>
    </ErrorBoundary>
  );
}
