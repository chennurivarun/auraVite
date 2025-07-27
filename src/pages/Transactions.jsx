
import React, { useState, useEffect } from "react";
import { Transaction, Vehicle, Dealer, User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye, MessageSquare, Car, Star, Archive } from "lucide-react"; // Added Star, Archive
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TransactionCard from '@/components/shared/TransactionCard'; // Added TransactionCard import

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // buying or selling
  const [showArchived, setShowArchived] = useState(false); // Added showArchived state

  useEffect(() => {
    loadTransactionData();
  }, []);

  const loadTransactionData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const [transactionData, vehicleData, dealerData] = await Promise.all([
        Transaction.list('-created_date'),
        Vehicle.list(),
        Dealer.list()
      ]);
      
      setTransactions(transactionData);
      setVehicles(vehicleData);
      setDealers(dealerData);
    } catch (error) {
      console.error('Error loading transaction data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVehicleById = (vehicleId) => {
    return vehicles.find(v => v.id === vehicleId);
  };

  const getDealerById = (dealerId) => {
    return dealers.find(d => d.id === dealerId);
  };

  const getCurrentDealerId = () => {
    return dealers.find(d => d.created_by === currentUser?.email)?.id;
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      offer_made: "bg-blue-100 text-blue-800",
      negotiating: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      payment_pending: "bg-orange-100 text-orange-800",
      in_escrow: "bg-purple-100 text-purple-800",
      in_transit: "bg-indigo-100 text-indigo-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };

    const statusLabels = {
      offer_made: "OFFER MADE",
      negotiating: "NEGOTIATING", 
      accepted: "ACCEPTED",
      payment_pending: "PAYMENT PENDING",
      in_escrow: "IN ESCROW",
      in_transit: "IN TRANSIT",
      completed: "COMPLETED",
      cancelled: "CANCELLED"
    };

    return (
      <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
        {statusLabels[status] || status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredTransactions = transactions.filter(transaction => {
    const vehicle = getVehicleById(transaction.vehicle_id);
    const currentDealerId = getCurrentDealerId();
    
    // Filter by search term
    const matchesSearch = vehicle ? 
      `${vehicle.make} ${vehicle.model} ${vehicle.year}`.toLowerCase().includes(searchTerm.toLowerCase()) :
      false;
    
    // Filter by status
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    
    // Filter by type (buying/selling)
    let matchesType = true;
    if (typeFilter === "buying") {
      matchesType = transaction.buyer_id === currentDealerId;
    } else if (typeFilter === "selling") {
      matchesType = transaction.seller_id === currentDealerId;
    }
    
    // Filter by archive status
    const matchesArchiveFilter = showArchived ? transaction.deal_archived : !transaction.deal_archived;
    
    // Only show transactions where current user is involved
    const isInvolved = transaction.buyer_id === currentDealerId || transaction.seller_id === currentDealerId;
    
    return matchesSearch && matchesStatus && matchesType && matchesArchiveFilter && isInvolved;
  });

  if (loading) {
    return (
      <div className="flex h-full p-8">
        <div className="animate-pulse w-full space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="momentum-h1">Transactions</h1>
            <p className="momentum-body">
              Manage your {transactions.length} deals and negotiations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived(!showArchived)}
              size="sm"
            >
              <Archive className="w-4 h-4 mr-2" />
              {showArchived ? 'Show Active' : 'Show Archived'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-12 rounded-lg"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="buying">Buying</SelectItem>
              <SelectItem value="selling">Selling</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="offer_made">Offer Made</SelectItem>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="payment_pending">Payment Pending</SelectItem>
              <SelectItem value="in_escrow">In Escrow</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction Cards Grid */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 momentum-card">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="momentum-h3 mb-2">
              {showArchived ? 'No Archived Transactions' : 'No Active Transactions Found'}
            </h3>
            <p className="momentum-body mb-6">
              {showArchived 
                ? 'Completed deals will appear here once archived.'
                : searchTerm 
                  ? 'Try a different search term.' 
                  : 'Start by making offers in the marketplace.'
              }
            </p>
            {!searchTerm && !showArchived && (
              <Link to={createPageUrl("Marketplace")}>
                <Button className="momentum-btn-primary">
                  <Car className="w-4 h-4 mr-2" />
                  Browse Marketplace
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTransactions.map((transaction) => {
              const vehicle = getVehicleById(transaction.vehicle_id);
              const currentDealerId = getCurrentDealerId();
              const isSelling = transaction.seller_id === currentDealerId;
              const otherPartyId = isSelling ? transaction.buyer_id : transaction.seller_id;
              const otherParty = getDealerById(otherPartyId);
              
              return (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  vehicle={vehicle}
                  otherParty={otherParty}
                  isSellerView={isSelling}
                  showArchived={showArchived}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
