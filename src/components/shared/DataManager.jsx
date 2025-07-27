/**
 * Centralized Data Management Layer
 * Handles all entity operations with proper error handling and validation
 * Serves as abstraction layer between UI components and Base44 SDK
 */

import { User, Dealer, Vehicle, Transaction, Notification, Feedback, RTOApplication, SystemConfig, MarketingAsset } from '@/api/entities';
import { SecurityValidator } from './SecurityValidator';
import { InvokeLLM } from '@/api/integrations';

export class DataManager {
  // =============================================================================
  // USER MANAGEMENT
  // =============================================================================
  
  /**
   * Get current authenticated user
   * @returns {Promise<object|null>} - User object or null if not authenticated
   */
  static async getCurrentUser() {
    try {
      const user = await User.me();
      return user;
    } catch (error) {
      console.warn('User not authenticated:', error.message);
      return null;
    }
  }

  /**
   * Update current user profile data
   * @param {object} userData - User data to update
   * @returns {Promise<object>} - Updated user object
   */
  static async updateUserProfile(userData) {
    try {
      // Sanitize input data
      const sanitizedData = {
        ...userData,
        full_name: userData.full_name ? SecurityValidator.sanitizeInput(userData.full_name) : undefined,
        phone: userData.phone ? SecurityValidator.formatPhone(userData.phone) : undefined
      };

      // Validate phone if provided
      if (sanitizedData.phone && !SecurityValidator.validatePhone(sanitizedData.phone)) {
        throw new Error('Invalid phone number format');
      }

      return await User.updateMyUserData(sanitizedData);
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  // =============================================================================
  // DEALER MANAGEMENT
  // =============================================================================
  
  /**
   * Get dealer profile for current user
   * @param {string} userEmail - User's email address
   * @returns {Promise<object|null>} - Dealer object or null if not found
   */
  static async getDealerByUserEmail(userEmail) {
    try {
      if (!userEmail || !SecurityValidator.validateEmail(userEmail)) {
        throw new Error('Valid user email is required');
      }

      const dealers = await Dealer.filter({ created_by: userEmail });
      return dealers.length > 0 ? dealers[0] : null;
    } catch (error) {
      console.error('Failed to get dealer profile:', error);
      throw new Error(`Failed to retrieve dealer profile: ${error.message}`);
    }
  }

  /**
   * Create new dealer profile
   * @param {object} dealerData - Dealer profile data
   * @param {string} userEmail - User's email address
   * @returns {Promise<object>} - Created dealer object
   */
  static async createDealerProfile(dealerData, userEmail) {
    try {
      // Validate input
      const validation = SecurityValidator.validateDealerProfile(dealerData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }

      if (!SecurityValidator.validateEmail(userEmail)) {
        throw new Error('Valid user email is required');
      }

      // Sanitize and prepare data
      const sanitizedData = {
        ...dealerData,
        created_by: userEmail,
        business_name: SecurityValidator.sanitizeInput(dealerData.business_name),
        address: SecurityValidator.sanitizeInput(dealerData.address),
        city: SecurityValidator.sanitizeInput(dealerData.city),
        state: SecurityValidator.sanitizeInput(dealerData.state),
        phone: SecurityValidator.formatPhone(dealerData.phone),
        email: dealerData.email ? dealerData.email.toLowerCase().trim() : undefined,
        gstin: dealerData.gstin ? dealerData.gstin.toUpperCase() : undefined,
        pan: dealerData.pan ? dealerData.pan.toUpperCase() : undefined,
        ifsc_code: dealerData.ifsc_code ? dealerData.ifsc_code.toUpperCase() : undefined,
        verification_status: 'provisional',
        rating: 0,
        completed_deals: 0,
        total_sales_value: 0,
        is_active: true,
        last_activity: new Date().toISOString()
      };

      return await Dealer.create(sanitizedData);
    } catch (error) {
      console.error('Failed to create dealer profile:', error);
      throw new Error(`Dealer profile creation failed: ${error.message}`);
    }
  }

  /**
   * Update dealer profile
   * @param {string} dealerId - Dealer ID
   * @param {object} updateData - Data to update
   * @returns {Promise<object>} - Updated dealer object
   */
  static async updateDealerProfile(dealerId, updateData) {
    try {
      if (!dealerId) {
        throw new Error('Dealer ID is required');
      }

      // Validate and sanitize update data
      const validation = SecurityValidator.validateDealerProfile(updateData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }

      const sanitizedData = {
        ...updateData,
        business_name: updateData.business_name ? SecurityValidator.sanitizeInput(updateData.business_name) : undefined,
        address: updateData.address ? SecurityValidator.sanitizeInput(updateData.address) : undefined,
        phone: updateData.phone ? SecurityValidator.formatPhone(updateData.phone) : undefined,
        last_activity: new Date().toISOString()
      };

      return await Dealer.update(dealerId, sanitizedData);
    } catch (error) {
      console.error('Failed to update dealer profile:', error);
      throw new Error(`Dealer profile update failed: ${error.message}`);
    }
  }

  // =============================================================================
  // VEHICLE MANAGEMENT
  // =============================================================================
  
  /**
   * Get vehicles for a specific dealer
   * @param {string} dealerId - Dealer ID
   * @param {object} options - Query options (limit, sort, status filter)
   * @returns {Promise<array>} - Array of vehicle objects
   */
  static async getVehiclesByDealer(dealerId, options = {}) {
    try {
      if (!dealerId) {
        throw new Error('Dealer ID is required');
      }

      const { limit = null, sort = '-created_date', status = null } = options;
      
      const filterParams = { dealer_id: dealerId };
      if (status) {
        filterParams.status = status;
      }

      return await Vehicle.filter(filterParams, sort, limit);
    } catch (error) {
      console.error('Failed to get vehicles by dealer:', error);
      throw new Error(`Failed to retrieve vehicles: ${error.message}`);
    }
  }

  /**
   * Get all live vehicles (for marketplace)
   * @param {string} excludeDealerId - Dealer ID to exclude from results
   * @param {object} options - Query options
   * @returns {Promise<array>} - Array of live vehicle objects
   */
  static async getLiveVehicles(excludeDealerId = null, options = {}) {
    try {
      const { limit = null, sort = '-created_date' } = options;
      
      const vehicles = await Vehicle.filter({ status: 'live' }, sort, limit);
      
      // Filter out vehicles from excluded dealer (client-side filtering)
      if (excludeDealerId) {
        return vehicles.filter(vehicle => vehicle.dealer_id !== excludeDealerId);
      }
      
      return vehicles;
    } catch (error) {
      console.error('Failed to get live vehicles:', error);
      throw new Error(`Failed to retrieve marketplace vehicles: ${error.message}`);
    }
  }

  /**
   * Create new vehicle listing
   * @param {object} vehicleData - Vehicle data
   * @param {string} dealerId - Dealer ID
   * @returns {Promise<object>} - Created vehicle object
   */
  static async createVehicle(vehicleData, dealerId) {
    try {
      // Validate input
      const validation = SecurityValidator.validateVehicleData(vehicleData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }

      if (!dealerId) {
        throw new Error('Dealer ID is required');
      }

      // Sanitize and prepare data
      const sanitizedData = {
        ...vehicleData,
        dealer_id: dealerId,
        make: SecurityValidator.sanitizeInput(vehicleData.make),
        model: SecurityValidator.sanitizeInput(vehicleData.model),
        description: vehicleData.description ? SecurityValidator.sanitizeInput(vehicleData.description) : undefined,
        vin: vehicleData.vin ? vehicleData.vin.toUpperCase() : undefined,
        year: parseInt(vehicleData.year),
        price: parseFloat(vehicleData.price),
        kilometers: vehicleData.kilometers ? parseInt(vehicleData.kilometers) : 0,
        days_in_stock: 0,
        views: 0,
        inquiries: 0,
        is_featured: false,
        priority_score: 0
      };

      return await Vehicle.create(sanitizedData);
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      throw new Error(`Vehicle creation failed: ${error.message}`);
    }
  }

  /**
   * Update vehicle listing
   * @param {string} vehicleId - Vehicle ID
   * @param {object} updateData - Data to update
   * @returns {Promise<object>} - Updated vehicle object
   */
  static async updateVehicle(vehicleId, updateData) {
    try {
      if (!vehicleId) {
        throw new Error('Vehicle ID is required');
      }

      // Validate update data
      if (Object.keys(updateData).length === 0) {
        throw new Error('No update data provided');
      }

      // Sanitize relevant fields
      const sanitizedData = { ...updateData };
      if (updateData.description) {
        sanitizedData.description = SecurityValidator.sanitizeInput(updateData.description);
      }
      if (updateData.price) {
        sanitizedData.price = parseFloat(updateData.price);
        if (!SecurityValidator.validatePrice(sanitizedData.price)) {
          throw new Error('Invalid price value');
        }
      }

      return await Vehicle.update(vehicleId, sanitizedData);
    } catch (error) {
      console.error('Failed to update vehicle:', error);
      throw new Error(`Vehicle update failed: ${error.message}`);
    }
  }

  /**
   * Delete vehicle listing
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteVehicle(vehicleId) {
    try {
      if (!vehicleId) {
        throw new Error('Vehicle ID is required');
      }

      await Vehicle.delete(vehicleId);
      return true;
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      throw new Error(`Vehicle deletion failed: ${error.message}`);
    }
  }

  // =============================================================================
  // TRANSACTION MANAGEMENT
  // =============================================================================
  
  /**
   * Create new transaction (offer)
   * @param {object} transactionData - Transaction data
   * @returns {Promise<object>} - Created transaction object
   */
  static async createTransaction(transactionData) {
    try {
      // Validate required fields
      if (!transactionData.vehicle_id || !transactionData.buyer_id || 
          !transactionData.seller_id || !transactionData.offer_amount) {
        throw new Error('Vehicle ID, buyer ID, seller ID, and offer amount are required');
      }

      // Validate offer amount
      if (!SecurityValidator.validatePrice(transactionData.offer_amount)) {
        throw new Error('Invalid offer amount');
      }

      // Prevent self-offers
      if (transactionData.buyer_id === transactionData.seller_id) {
        throw new Error('Cannot make offer on your own vehicle');
      }

      const sanitizedData = {
        ...transactionData,
        offer_amount: parseFloat(transactionData.offer_amount),
        status: 'offer_made',
        escrow_status: 'none',
        transport_status: 'pending',
        documents_transferred: false,
        rto_transfer_initiated: false,
        rto_transfer_completed: false,
        deal_archived: false,
        messages: transactionData.messages || []
      };

      return await Transaction.create(sanitizedData);
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw new Error(`Transaction creation failed: ${error.message}`);
    }
  }

  /**
   * Update transaction status
   * @param {string} transactionId - Transaction ID
   * @param {object} updateData - Data to update
   * @returns {Promise<object>} - Updated transaction object
   */
  static async updateTransaction(transactionId, updateData) {
    try {
      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      return await Transaction.update(transactionId, updateData);
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw new Error(`Transaction update failed: ${error.message}`);
    }
  }

  /**
   * Get transactions for a dealer
   * @param {string} dealerId - Dealer ID
   * @param {object} options - Query options
   * @returns {Promise<array>} - Array of transaction objects
   */
  static async getTransactionsByDealer(dealerId, options = {}) {
    try {
      if (!dealerId) {
        throw new Error('Dealer ID is required');
      }

      const { limit = null, sort = '-created_date' } = options;
      
      // Get transactions where dealer is either buyer or seller
      const [buyerTransactions, sellerTransactions] = await Promise.all([
        Transaction.filter({ buyer_id: dealerId }, sort, limit),
        Transaction.filter({ seller_id: dealerId }, sort, limit)
      ]);

      // Combine and sort by created_date
      const allTransactions = [...buyerTransactions, ...sellerTransactions];
      return allTransactions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } catch (error) {
      console.error('Failed to get transactions by dealer:', error);
      throw new Error(`Failed to retrieve transactions: ${error.message}`);
    }
  }

  // =============================================================================
  // NOTIFICATION MANAGEMENT
  // =============================================================================
  
  /**
   * Create notification for user
   * @param {object} notificationData - Notification data
   * @returns {Promise<object>} - Created notification object
   */
  static async createNotification(notificationData) {
    try {
      if (!notificationData.user_email || !notificationData.message || !notificationData.type) {
        throw new Error('User email, message, and type are required');
      }

      if (!SecurityValidator.validateEmail(notificationData.user_email)) {
        throw new Error('Invalid user email format');
      }

      const sanitizedData = {
        ...notificationData,
        message: SecurityValidator.sanitizeInput(notificationData.message),
        title: notificationData.title ? SecurityValidator.sanitizeInput(notificationData.title) : undefined,
        read_status: false,
        priority: notificationData.priority || 'normal',
        action_required: notificationData.action_required || false
      };

      return await Notification.create(sanitizedData);
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw new Error(`Notification creation failed: ${error.message}`);
    }
  }

  /**
   * Get notifications for user
   * @param {string} userEmail - User email
   * @param {object} options - Query options
   * @returns {Promise<array>} - Array of notification objects
   */
  static async getNotificationsByUser(userEmail, options = {}) {
    try {
      if (!SecurityValidator.validateEmail(userEmail)) {
        throw new Error('Valid user email is required');
      }

      const { limit = 50, sort = '-created_date', unreadOnly = false } = options;
      
      const filterParams = { user_email: userEmail };
      if (unreadOnly) {
        filterParams.read_status = false;
      }

      return await Notification.filter(filterParams, sort, limit);
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw new Error(`Failed to retrieve notifications: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<object>} - Updated notification object
   */
  static async markNotificationAsRead(notificationId) {
    try {
      if (!notificationId) {
        throw new Error('Notification ID is required');
      }

      return await Notification.update(notificationId, {
        read_status: true,
        read_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw new Error(`Failed to update notification: ${error.message}`);
    }
  }

  // =============================================================================
  // FEEDBACK MANAGEMENT
  // =============================================================================
  
  /**
   * Submit feedback
   * @param {object} feedbackData - Feedback data
   * @param {string} userEmail - User email
   * @returns {Promise<object>} - Created feedback object
   */
  static async submitFeedback(feedbackData, userEmail = null) {
    try {
      if (!feedbackData.type || !feedbackData.message) {
        throw new Error('Feedback type and message are required');
      }

      const sanitizedData = {
        ...feedbackData,
        user_email: userEmail,
        message: SecurityValidator.sanitizeInput(feedbackData.message),
        title: feedbackData.title ? SecurityValidator.sanitizeInput(feedbackData.title) : undefined,
        page_context: feedbackData.page_context ? SecurityValidator.sanitizeInput(feedbackData.page_context) : undefined,
        status: 'new',
        public_visible: false,
        votes: 0
      };

      return await Feedback.create(sanitizedData);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw new Error(`Feedback submission failed: ${error.message}`);
    }
  }

  // =============================================================================
  // CUSTOMER MODE ENHANCEMENTS
  // =============================================================================
  
  /**
   * Get estimated logistics cost between two dealers
   * @param {string} originDealerId - ID of the sourcing dealer
   * @param {string} destinationVehicleId - ID of the vehicle (to get seller dealer)
   * @returns {Promise<number>} - Estimated logistics cost in INR
   */
  static async getEstimatedLogisticsCost(originDealerId, destinationVehicleId) {
    try {
      // In a real app, this would involve a complex lookup or API call.
      // For now, let's simulate based on city names from dealer profiles.
      const originDealer = await Dealer.get(originDealerId);
      const destinationVehicle = await Vehicle.get(destinationVehicleId);
      const destinationDealer = await Dealer.get(destinationVehicle.dealer_id);

      if (originDealer && destinationDealer) {
        const originCity = originDealer.city || 'DefaultCityA';
        const destCity = destinationDealer.city || 'DefaultCityB';
        const originState = originDealer.state || 'DefaultStateA';
        const destState = destinationDealer.state || 'DefaultStateB';

        // Enhanced logic: different states cost more than different cities
        if (originState !== destState) {
          return 12000 + Math.floor(Math.random() * 8000); // Between 12,000 and 20,000 for inter-state
        } else if (originCity !== destCity) {
          return 7000 + Math.floor(Math.random() * 5000); // Between 7,000 and 12,000 for intra-state
        } else {
          return 3000 + Math.floor(Math.random() * 2000); // Between 3,000 and 5,000 for same city
        }
      }
      return 8000; // Fallback if data is missing
    } catch (error) {
      console.error("Error getting estimated logistics cost:", error);
      return 8000; // Default fallback
    }
  }

  /**
   * Get platform fee (configurable constant for now)
   * @returns {number} - Platform fee in INR
   */
  static getPlatformFee() {
    return 13000; // Currently a fixed value, could be dynamic in future
  }

  /**
   * Calculate dynamic profit margins based on vehicle price bracket
   * This follows industry standards for different price categories
   * @param {number} vehiclePrice - Vehicle D2D price in INR
   * @returns {object} - Object containing desired and minimum margin amounts and percentages
   */
  static getDynamicMargins(vehiclePrice) {
    try {
      const price = parseFloat(vehiclePrice) || 0;
      let desiredPercent = 10; // Default 10%
      let minimumPercent = 6;  // Default 6%

      // Industry standard margin brackets
      if (price <= 300000) { // ≤ ₹3 Lakhs (Budget cars)
        desiredPercent = 15;
        minimumPercent = 10;
      } else if (price <= 800000) { // ₹3L - ₹8L (Mid-range cars)
        desiredPercent = 12;
        minimumPercent = 8;
      } else { // > ₹8L (Premium cars)
        desiredPercent = 10;
        minimumPercent = 6;
      }

      const desiredAmount = Math.round(price * (desiredPercent / 100));
      const minimumAmount = Math.round(price * (minimumPercent / 100));

      return {
        desiredPercent,
        minimumPercent,
        desiredAmount,
        minimumAmount,
        priceCategory: price <= 300000 ? 'Budget' : price <= 800000 ? 'Mid-Range' : 'Premium'
      };
    } catch (error) {
      console.error('Error calculating dynamic margins:', error);
      return {
        desiredPercent: 10,
        minimumPercent: 6,
        desiredAmount: 0,
        minimumAmount: 0,
        priceCategory: 'Unknown'
      };
    }
  }

  /**
   * Verify PIN and get private pricing data (simulated backend call)
   * IMPORTANT: In production, this verification MUST be done server-side
   * @param {string} transactionId - Transaction ID
   * @param {string} pin - 4-digit PIN entered by user
   * @returns {Promise<object>} - Private pricing data
   */
  static async verifyPinAndGetPrivatePricing(transactionId, pin) {
    try {
      const currentUser = await User.me();
      const dealers = await Dealer.filter({ created_by: currentUser.email });
      const currentDealer = dealers.length > 0 ? dealers[0] : null;

      if (!currentDealer || !currentDealer.private_view_pin_hash) {
        throw new Error("Private view PIN not set for this dealer.");
      }

      // Simulate backend hashing and comparison
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashedPin = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashedPin === currentDealer.private_view_pin_hash) {
        // If PIN matches, retrieve the transaction and return the private fields
        const transaction = await Transaction.get(transactionId);
        if (transaction) {
          return {
            minimum_margin_amount: transaction.minimum_margin_amount,
            final_floor_price: transaction.final_floor_price
          };
        } else {
          throw new Error("Transaction not found.");
        }
      } else {
        throw new Error("Incorrect PIN.");
      }
    } catch (error) {
      console.error("Error verifying PIN or fetching private data:", error);
      throw error;
    }
  }

  /**
   * Finalize transaction for customer (complete the deal)
   * @param {string} transactionId - Transaction ID
   * @param {number} finalShowroomPrice - Final agreed showroom price
   * @returns {Promise<object>} - Updated transaction object
   */
  static async finalizeTransactionForCustomer(transactionId, finalShowroomPrice) {
    try {
      // Update transaction status and final amount
      const updatedTransaction = await Transaction.update(transactionId, {
        status: 'accepted', // Deal agreed with customer
        final_amount: finalShowroomPrice, // Capture the agreed showroom price
        customer_mode_active: false, // Exit customer mode after finalization
        deal_archived: false // Ensure it's not archived immediately
      });

      // Update vehicle status to indicate it's in transaction
      if (updatedTransaction.vehicle_id) {
        await Vehicle.update(updatedTransaction.vehicle_id, {
          status: 'in_transaction'
        });
      }

      // Create success notification
      const currentUser = await this.getCurrentUser();
      if (currentUser) {
        await this.createNotification({
          user_email: currentUser.email,
          type: 'deal_update',
          title: 'Deal Finalized!',
          message: `Customer deal finalized for ₹${(finalShowroomPrice / 100000).toFixed(2)}L`,
          link: `/DealRoom?transactionId=${transactionId}`,
          priority: 'high'
        });
      }

      return updatedTransaction;
    } catch (error) {
      console.error("Error finalizing transaction:", error);
      throw error;
    }
  }

  /**
   * Get all transactions for a specific vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {string} dealerId - Current dealer ID (optional filter)
   * @returns {Promise<array>} - Array of transaction objects
   */
  static async getTransactionsForVehicle(vehicleId, dealerId = null) {
    try {
      if (!vehicleId) {
        throw new Error('Vehicle ID is required');
      }

      const transactions = await Transaction.filter({ vehicle_id: vehicleId });
      
      // Filter by dealer if provided (either as buyer or seller)
      if (dealerId) {
        return transactions.filter(t => 
          t.buyer_id === dealerId || t.seller_id === dealerId
        );
      }
      
      return transactions;
    } catch (error) {
      console.error('Failed to get transactions for vehicle:', error);
      throw new Error(`Failed to retrieve vehicle transactions: ${error.message}`);
    }
  }

  // =============================================================================
  // ADVANCED MARKETING & BATCH PROCESSING FEATURES (PHASE 2)
  // =============================================================================
  
  /**
   * Generate marketing reel for vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {array} imageUrls - Array of image URLs for reel generation
   * @param {object} options - Generation options (music, duration, style)
   * @returns {Promise<object>} - Generation result
   */
  static async generateMarketingReel(vehicleId, imageUrls = [], options = {}) {
    try {
      if (!vehicleId) {
        throw new Error('Vehicle ID is required');
      }

      if (!imageUrls || imageUrls.length < 3) {
        throw new Error('At least 3 images are required for reel generation');
      }

      console.log(`[DataManager] Starting marketing reel generation for vehicle ${vehicleId} with ${imageUrls.length} images`);

      // Update status to processing
      await Vehicle.update(vehicleId, {
        reel_processing_status: 'processing',
        last_processed_at: new Date().toISOString()
      });

      // Default options for reel generation
      const reelOptions = {
        duration: options.duration || 15, // seconds
        music_style: options.music_style || 'upbeat',
        transition_style: options.transition_style || 'smooth',
        include_text: options.include_text !== false,
        branding: options.branding !== false,
        ...options
      };

      // Simulate reel generation with external platform using InvokeLLM as proxy
      const generationPrompt = `
        Generate marketing reel/short video for vehicle using provided images.
        
        Vehicle ID: ${vehicleId}
        Images for reel: ${imageUrls.length}
        Image URLs: ${imageUrls.join(', ')}
        
        Reel Options: ${JSON.stringify(reelOptions)}
        
        Create a dynamic, engaging short video perfect for social media marketing.
        Include smooth transitions, background music, and text overlays highlighting key features.
        Return mock embeddable video URL and metadata.
      `;

      const result = await InvokeLLM({
        prompt: generationPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            job_id: { type: "string" },
            reel_url: { type: "string" },
            duration: { type: "number" },
            file_size_mb: { type: "number" },
            resolution: { type: "string" },
            status: { type: "string" }
          },
          required: ["job_id", "reel_url"]
        }
      });

      // Generate mock reel URL (in real implementation, this would come from the external platform)
      const reelUrl = `https://marketing-platform.example.com/reels/${vehicleId}?autoplay=true&muted=true`;

      // Update vehicle with reel URL
      await Vehicle.update(vehicleId, {
        reel_url: reelUrl,
        reel_processing_status: 'completed',
        processing_job_id: result.job_id || `reel_job_${Date.now()}`,
        last_processed_at: new Date().toISOString()
      });

      console.log(`[DataManager] Marketing reel generation completed for vehicle ${vehicleId}`);

      return {
        success: true,
        vehicleId,
        reelUrl,
        jobId: result.job_id || `reel_job_${Date.now()}`,
        duration: result.duration || reelOptions.duration,
        message: 'Marketing reel generated successfully'
      };

    } catch (error) {
      console.error(`[DataManager] Marketing reel generation failed for vehicle ${vehicleId}:`, error);
      
      // Update status to failed
      if (vehicleId) {
        await Vehicle.update(vehicleId, {
          reel_processing_status: 'failed',
          last_processed_at: new Date().toISOString()
        });
      }

      throw new Error(`Marketing reel generation failed: ${error.message}`);
    }
  }

  /**
   * Generate marketing content (social posts, brochures, ad creatives)
   * @param {string} vehicleId - Vehicle ID
   * @param {array} imageUrls - Array of image URLs for content generation
   * @param {object} options - Generation options (platforms, formats)
   * @returns {Promise<object>} - Generation result
   */
  static async generateMarketingContent(vehicleId, imageUrls = [], options = {}) {
    try {
      if (!vehicleId) {
        throw new Error('Vehicle ID is required');
      }

      if (!imageUrls || imageUrls.length === 0) {
        throw new Error('At least one image is required for marketing content generation');
      }

      console.log(`[DataManager] Starting marketing content generation for vehicle ${vehicleId}`);

      // Update status to processing
      await Vehicle.update(vehicleId, {
        marketing_content_processing_status: 'processing',
        last_processed_at: new Date().toISOString()
      });

      // Default options for marketing content generation
      const contentOptions = {
        platforms: options.platforms || ['instagram', 'facebook', 'whatsapp'],
        content_types: options.content_types || ['social_post', 'story_template', 'ad_creative'],
        include_branding: options.include_branding !== false,
        include_price: options.include_price !== false,
        include_features: options.include_features !== false,
        ...options
      };

      // Get vehicle data for content generation
      const vehicle = await Vehicle.get(vehicleId);

      // Simulate marketing content generation with external platform
      const generationPrompt = `
        Generate marketing content for vehicle listing using provided images and vehicle data.
        
        Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
        Price: ₹${(vehicle.price / 100000).toFixed(1)}L
        Vehicle ID: ${vehicleId}
        Images: ${imageUrls.length}
        Image URLs: ${imageUrls.join(', ')}
        
        Content Options: ${JSON.stringify(contentOptions)}
        
        Generate multiple marketing assets optimized for different social media platforms.
        Include eye-catching designs, proper dimensions, and compelling copy.
        Return URLs and metadata for generated assets.
      `;

      const result = await InvokeLLM({
        prompt: generationPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            job_id: { type: "string" },
            generated_assets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  platform: { type: "string" },
                  url: { type: "string" },
                  dimensions: { type: "string" }
                }
              }
            },
            status: { type: "string" }
          },
          required: ["job_id", "generated_assets"]
        }
      });

      // Generate mock marketing content URLs (in real implementation, these would come from the external platform)
      const marketingAssets = [
        {
          type: 'social_post',
          platform: 'instagram',
          url: `https://marketing-platform.example.com/posts/${vehicleId}/instagram_post.jpg`,
          dimensions: '1080x1080',
          generated_at: new Date().toISOString()
        },
        {
          type: 'story_template',
          platform: 'instagram',
          url: `https://marketing-platform.example.com/stories/${vehicleId}/instagram_story.jpg`,
          dimensions: '1080x1920',
          generated_at: new Date().toISOString()
        },
        {
          type: 'ad_creative',
          platform: 'facebook',
          url: `https://marketing-platform.example.com/ads/${vehicleId}/facebook_ad.jpg`,
          dimensions: '1200x628',
          generated_at: new Date().toISOString()
        },
        {
          type: 'brochure',
          platform: 'general',
          url: `https://marketing-platform.example.com/brochures/${vehicleId}/vehicle_brochure.pdf`,
          dimensions: 'A4',
          generated_at: new Date().toISOString()
        }
      ];

      // Update vehicle with marketing content URLs
      await Vehicle.update(vehicleId, {
        marketing_content_urls: marketingAssets,
        marketing_content_processing_status: 'completed',
        processing_job_id: result.job_id || `marketing_job_${Date.now()}`,
        last_processed_at: new Date().toISOString()
      });

      console.log(`[DataManager] Marketing content generation completed for vehicle ${vehicleId}`);

      return {
        success: true,
        vehicleId,
        marketingAssets,
        jobId: result.job_id || `marketing_job_${Date.now()}`,
        message: `Generated ${marketingAssets.length} marketing assets successfully`
      };

    } catch (error) {
      console.error(`[DataManager] Marketing content generation failed for vehicle ${vehicleId}:`, error);
      
      // Update status to failed
      if (vehicleId) {
        await Vehicle.update(vehicleId, {
          marketing_content_processing_status: 'failed',
          last_processed_at: new Date().toISOString()
        });
      }

      throw new Error(`Marketing content generation failed: ${error.message}`);
    }
  }

  /**
   * Batch process vehicles with specified action
   * @param {array} vehicleIds - Array of vehicle IDs to process
   * @param {string} actionType - Type of processing ('images', '360', 'reel', 'marketing', 'all')
   * @param {object} options - Processing options
   * @returns {Promise<object>} - Batch processing result
   */
  static async batchProcessVehicles(vehicleIds = [], actionType = 'all', options = {}) {
    try {
      if (!vehicleIds || vehicleIds.length === 0) {
        throw new Error('At least one vehicle ID is required for batch processing');
      }

      if (!['images', '360', 'reel', 'marketing', 'all'].includes(actionType)) {
        throw new Error('Invalid action type for batch processing');
      }

      console.log(`[DataManager] Starting batch ${actionType} processing for ${vehicleIds.length} vehicles`);

      const batchResults = {
        total: vehicleIds.length,
        successful: 0,
        failed: 0,
        results: [],
        startedAt: new Date().toISOString()
      };

      // Process each vehicle sequentially to avoid overwhelming the external platform
      for (const vehicleId of vehicleIds) {
        try {
          console.log(`[DataManager] Processing vehicle ${vehicleId} for batch ${actionType}`);
          
          // Get vehicle data to determine available images
          const vehicle = await Vehicle.get(vehicleId);
          if (!vehicle) {
            throw new Error(`Vehicle ${vehicleId} not found`);
          }

          const imageUrls = vehicle.processed_image_urls && vehicle.processed_image_urls.length > 0 
            ? vehicle.processed_image_urls 
            : vehicle.image_urls || [];

          if (imageUrls.length === 0) {
            throw new Error(`No images available for vehicle ${vehicleId}`);
          }

          let processingResult = null;

          // Execute the appropriate processing based on action type
          switch (actionType) {
            case 'images':
              processingResult = await this.processVehicleImages(vehicleId, imageUrls, options);
              break;
            
            case '360':
              if (imageUrls.length >= 8) {
                processingResult = await this.generate360View(vehicleId, imageUrls, options);
              } else {
                throw new Error(`Vehicle ${vehicleId} needs at least 8 images for 360° view`);
              }
              break;
            
            case 'reel':
              if (imageUrls.length >= 3) {
                processingResult = await this.generateMarketingReel(vehicleId, imageUrls, options);
              } else {
                throw new Error(`Vehicle ${vehicleId} needs at least 3 images for reel generation`);
              }
              break;
            
            case 'marketing':
              processingResult = await this.generateMarketingContent(vehicleId, imageUrls, options);
              break;
            
            case 'all':
              // Process all types sequentially
              const allResults = {};
              
              // Images processing
              try {
                allResults.images = await this.processVehicleImages(vehicleId, imageUrls, options);
              } catch (err) {
                allResults.images = { success: false, error: err.message };
              }
              
              // 360 view (if enough images)
              if (imageUrls.length >= 8) {
                try {
                  allResults.view360 = await this.generate360View(vehicleId, imageUrls, options);
                } catch (err) {
                  allResults.view360 = { success: false, error: err.message };
                }
              }
              
              // Marketing reel (if enough images)
              if (imageUrls.length >= 3) {
                try {
                  allResults.reel = await this.generateMarketingReel(vehicleId, imageUrls, options);
                } catch (err) {
                  allResults.reel = { success: false, error: err.message };
                }
              }
              
              // Marketing content
              try {
                allResults.marketing = await this.generateMarketingContent(vehicleId, imageUrls, options);
              } catch (err) {
                allResults.marketing = { success: false, error: err.message };
              }
              
              processingResult = {
                success: Object.values(allResults).some(r => r.success),
                vehicleId,
                results: allResults,
                message: 'Batch processing completed'
              };
              break;
          }

          batchResults.results.push({
            vehicleId,
            success: true,
            result: processingResult,
            processedAt: new Date().toISOString()
          });
          
          batchResults.successful++;
          console.log(`[DataManager] Successfully processed vehicle ${vehicleId}`);

        } catch (error) {
          console.error(`[DataManager] Failed to process vehicle ${vehicleId}:`, error);
          
          batchResults.results.push({
            vehicleId,
            success: false,
            error: error.message,
            processedAt: new Date().toISOString()
          });
          
          batchResults.failed++;
        }

        // Add a small delay between vehicles to prevent overwhelming the system
        if (vehicleIds.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      batchResults.completedAt = new Date().toISOString();
      
      console.log(`[DataManager] Batch processing completed. Success: ${batchResults.successful}, Failed: ${batchResults.failed}`);

      return batchResults;

    } catch (error) {
      console.error(`[DataManager] Batch processing failed:`, error);
      throw new Error(`Batch processing failed: ${error.message}`);
    }
  }

  /**
   * Get marketing assets summary for a dealer
   * @param {string} dealerId - Dealer ID
   * @returns {Promise<object>} - Marketing assets summary
   */
  static async getMarketingAssetsSummary(dealerId) {
    try {
      if (!dealerId) {
        throw new Error('Dealer ID is required');
      }

      const vehicles = await this.getVehiclesByDealer(dealerId);
      
      const summary = {
        totalVehicles: vehicles.length,
        vehiclesWithImages: 0,
        vehiclesWithProcessedImages: 0,
        vehiclesWith360View: 0,
        vehiclesWithReels: 0,
        vehiclesWithMarketingContent: 0,
        processingStats: {
          images: { pending: 0, processing: 0, completed: 0, failed: 0 },
          view360: { pending: 0, processing: 0, completed: 0, failed: 0 },
          reel: { pending: 0, processing: 0, completed: 0, failed: 0 },
          marketing: { pending: 0, processing: 0, completed: 0, failed: 0 }
        },
        recentlyGenerated: []
      };

      vehicles.forEach(vehicle => {
        // Count assets
        if (vehicle.image_urls && vehicle.image_urls.length > 0) {
          summary.vehiclesWithImages++;
        }
        if (vehicle.processed_image_urls && vehicle.processed_image_urls.length > 0) {
          summary.vehiclesWithProcessedImages++;
        }
        if (vehicle['360_view_url']) {
          summary.vehiclesWith360View++;
        }
        if (vehicle.reel_url) {
          summary.vehiclesWithReels++;
        }
        if (vehicle.marketing_content_urls && vehicle.marketing_content_urls.length > 0) {
          summary.vehiclesWithMarketingContent++;
        }

        // Count processing statuses
        ['image_processing_status', '360_processing_status', 'reel_processing_status', 'marketing_content_processing_status'].forEach(statusField => {
          const status = vehicle[statusField] || 'none';
          const category = statusField.replace('_processing_status', '').replace('_content', '');
          
          if (status !== 'none' && summary.processingStats[category]) {
            summary.processingStats[category][status] = (summary.processingStats[category][status] || 0) + 1;
          }
        });

        // Collect recently generated assets
        if (vehicle.last_processed_at) {
          const processedDate = new Date(vehicle.last_processed_at);
          const daysSinceProcessed = (new Date() - processedDate) / (1000 * 60 * 60 * 24);
          
          if (daysSinceProcessed <= 7) { // Within last 7 days
            summary.recentlyGenerated.push({
              vehicleId: vehicle.id,
              vehicleName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              processedAt: vehicle.last_processed_at,
              hasProcessedImages: !!(vehicle.processed_image_urls && vehicle.processed_image_urls.length > 0),
              has360View: !!vehicle['360_view_url'],
              hasReel: !!vehicle.reel_url,
              hasMarketingContent: !!(vehicle.marketing_content_urls && vehicle.marketing_content_urls.length > 0)
            });
          }
        }
      });

      // Sort recently generated by date (newest first)
      summary.recentlyGenerated.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
      
      return summary;

    } catch (error) {
      console.error('Failed to get marketing assets summary:', error);
      throw new Error(`Failed to retrieve marketing assets summary: ${error.message}`);
    }
  }

  /**
   * Get processing queue status (mock implementation for UI feedback)
   * @param {string} dealerId - Dealer ID
   * @returns {Promise<object>} - Processing queue information
   */
  static async getProcessingQueue(dealerId) {
    try {
      if (!dealerId) {
        throw new Error('Dealer ID is required');
      }

      const vehicles = await this.getVehiclesByDealer(dealerId);
      
      const queue = {
        activeJobs: [],
        completedJobs: [],
        failedJobs: []
      };

      vehicles.forEach(vehicle => {
        const statuses = {
          images: vehicle.image_processing_status,
          view360: vehicle['360_processing_status'],
          reel: vehicle.reel_processing_status,
          marketing: vehicle.marketing_content_processing_status
        };

        Object.entries(statuses).forEach(([type, status]) => {
          if (status && status !== 'none') {
            const job = {
              vehicleId: vehicle.id,
              vehicleName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              type,
              status,
              lastProcessedAt: vehicle.last_processed_at,
              jobId: vehicle.processing_job_id
            };

            if (status === 'processing' || status === 'pending') {
              queue.activeJobs.push(job);
            } else if (status === 'completed') {
              queue.completedJobs.push(job);
            } else if (status === 'failed') {
              queue.failedJobs.push(job);
            }
          }
        });
      });

      // Sort by last processed time
      queue.completedJobs.sort((a, b) => new Date(b.lastProcessedAt || 0) - new Date(a.lastProcessedAt || 0));
      queue.failedJobs.sort((a, b) => new Date(b.lastProcessedAt || 0) - new Date(a.lastProcessedAt || 0));

      return queue;

    } catch (error) {
      console.error('Failed to get processing queue:', error);
      throw new Error(`Failed to retrieve processing queue: ${error.message}`);
    }
  }

  // =============================================================================
  // IMAGE PROCESSING & 360 VIEW FEATURES
  // =============================================================================
  
  /**
   * Process vehicle images for uniform background
   * @param {string} vehicleId - Vehicle ID
   * @param {array} imageUrls - Array of image URLs to process
   * @param {object} options - Processing options
   * @returns {Promise<object>} - Processing result
   */
  static async processVehicleImages(vehicleId, imageUrls = [], options = {}) {
    try {
      if (!vehicleId) {
        throw new Error('Vehicle ID is required');
      }

      if (!imageUrls || imageUrls.length === 0) {
        throw new Error('At least one image URL is required for processing');
      }

      console.log(`[DataManager] Starting image processing for vehicle ${vehicleId} with ${imageUrls.length} images`);

      // Update status to processing
      await Vehicle.update(vehicleId, {
        image_processing_status: 'processing',
        last_processed_at: new Date().toISOString()
      });

      // Simulate processing with external platform using InvokeLLM as proxy
      const processingPrompt = `
        Process vehicle images for uniform background removal and professional presentation.
        
        Vehicle ID: ${vehicleId}
        Images to process: ${imageUrls.length}
        Image URLs: ${imageUrls.join(', ')}
        
        Options: ${JSON.stringify(options)}
        
        Please simulate the processing and return mock URLs for processed images with uniform backgrounds.
        Return in JSON format with processed_urls array.
      `;

      const result = await InvokeLLM({
        prompt: processingPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            job_id: { type: "string" },
            processed_urls: { 
              type: "array", 
              items: { type: "string" } 
            },
            processing_time: { type: "number" },
            status: { type: "string" }
          },
          required: ["job_id", "processed_urls"]
        }
      });

      // Generate mock processed URLs (in real implementation, these would come from the external platform)
      const processedUrls = imageUrls.map((url, index) => 
        `https://processed-images.example.com/uniform-bg/${vehicleId}_${index + 1}_processed.jpg`
      );

      // Update vehicle with processed images
      await Vehicle.update(vehicleId, {
        processed_image_urls: processedUrls,
        image_processing_status: 'completed',
        processing_job_id: result.job_id || `job_${Date.now()}`,
        last_processed_at: new Date().toISOString()
      });

      console.log(`[DataManager] Image processing completed for vehicle ${vehicleId}`);

      return {
        success: true,
        vehicleId,
        processedUrls,
        jobId: result.job_id || `job_${Date.now()}`,
        message: 'Images processed successfully with uniform backgrounds'
      };

    } catch (error) {
      console.error(`[DataManager] Image processing failed for vehicle ${vehicleId}:`, error);
      
      // Update status to failed
      if (vehicleId) {
        await Vehicle.update(vehicleId, {
          image_processing_status: 'failed',
          last_processed_at: new Date().toISOString()
        });
      }

      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Generate 360-degree view for vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {array} imageUrls - Array of image URLs for 360 generation
   * @param {object} options - Generation options
   * @returns {Promise<object>} - Generation result
   */
  static async generate360View(vehicleId, imageUrls = [], options = {}) {
    try {
      if (!vehicleId) {
        throw new Error('Vehicle ID is required');
      }

      if (!imageUrls || imageUrls.length < 8) {
        throw new Error('At least 8 images are required for 360-degree view generation');
      }

      console.log(`[DataManager] Starting 360-degree view generation for vehicle ${vehicleId} with ${imageUrls.length} images`);

      // Update status to processing
      await Vehicle.update(vehicleId, {
        "360_processing_status": 'processing',
        last_processed_at: new Date().toISOString()
      });

      // Simulate 360 generation with external platform using InvokeLLM as proxy
      const generationPrompt = `
        Generate 360-degree interactive view for vehicle using provided images.
        
        Vehicle ID: ${vehicleId}
        Images for 360 generation: ${imageUrls.length}
        Image URLs: ${imageUrls.join(', ')}
        
        Options: ${JSON.stringify(options)}
        
        Please simulate the 360-degree view generation and return mock embeddable player URL.
        Return in JSON format with view_url and embedding details.
      `;

      const result = await InvokeLLM({
        prompt: generationPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            job_id: { type: "string" },
            view_url: { type: "string" },
            embed_code: { type: "string" },
            processing_time: { type: "number" },
            status: { type: "string" }
          },
          required: ["job_id", "view_url"]
        }
      });

      // Generate mock 360 view URL (in real implementation, this would come from the external platform)
      const view360Url = `https://360-viewer.example.com/embed/${vehicleId}?autoplay=true&controls=true`;

      // Update vehicle with 360 view URL
      await Vehicle.update(vehicleId, {
        "360_view_url": view360Url,
        "360_processing_status": 'completed',
        processing_job_id: result.job_id || `360_job_${Date.now()}`,
        last_processed_at: new Date().toISOString()
      });

      console.log(`[DataManager] 360-degree view generation completed for vehicle ${vehicleId}`);

      return {
        success: true,
        vehicleId,
        view360Url,
        jobId: result.job_id || `360_job_${Date.now()}`,
        embedCode: result.embed_code || `<iframe src="${view360Url}" width="100%" height="400px" frameborder="0"></iframe>`,
        message: '360-degree view generated successfully'
      };

    } catch (error) {
      console.error(`[DataManager] 360-degree view generation failed for vehicle ${vehicleId}:`, error);
      
      // Update status to failed
      if (vehicleId) {
        await Vehicle.update(vehicleId, {
          "360_processing_status": 'failed',
          last_processed_at: new Date().toISOString()
        });
      }

      throw new Error(`360-degree view generation failed: ${error.message}`);
    }
  }

  /**
   * Get processing status for a vehicle
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<object>} - Processing status information
   */
  static async getProcessingStatus(vehicleId) {
    try {
      const vehicle = await Vehicle.get(vehicleId);
      
      return {
        vehicleId,
        imageProcessing: {
          status: vehicle.image_processing_status || 'none',
          processedCount: vehicle.processed_image_urls ? vehicle.processed_image_urls.length : 0,
          originalCount: vehicle.image_urls ? vehicle.image_urls.length : 0
        },
        view360: {
          status: vehicle["360_processing_status"] || 'none',
          url: vehicle["360_view_url"] || null
        },
        lastProcessedAt: vehicle.last_processed_at,
        jobId: vehicle.processing_job_id
      };
    } catch (error) {
      console.error(`[DataManager] Failed to get processing status for vehicle ${vehicleId}:`, error);
      throw error;
    }
  }

  /**
   * Reset processing status (useful for retry scenarios)
   * @param {string} vehicleId - Vehicle ID
   * @param {string} type - Type to reset ('images' or '360' or 'all')
   * @returns {Promise<boolean>} - Success status
   */
  static async resetProcessingStatus(vehicleId, type = 'all') {
    try {
      if (!vehicleId) {
        throw new Error('Vehicle ID is required');
      }

      const updateData = {};

      if (type === 'images' || type === 'all') {
        updateData.image_processing_status = 'none';
        updateData.processed_image_urls = [];
      }

      if (type === '360' || type === 'all') {
        updateData['360_processing_status'] = 'none';
        updateData['360_view_url'] = '';
      }

      if (type === 'all') {
        updateData.processing_job_id = '';
        updateData.last_processed_at = '';
      }

      await Vehicle.update(vehicleId, updateData);
      console.log(`[DataManager] Processing status reset for vehicle ${vehicleId}, type: ${type}`);
      return true;
    } catch (error) {
      console.error(`[DataManager] Failed to reset processing status for vehicle ${vehicleId}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // ADMIN FUNCTIONALITY
  // =============================================================================

  /**
   * Setup platform admin user on first login
   * @param {string} userEmail - User email to grant admin privileges
   * @returns {Promise<boolean>} - Success status
   */
  static async setupPlatformAdmin(userEmail = 'whitedevil1309@gmail.com') {
    try {
      // Check if user exists
      const users = await User.filter({ email: userEmail });
      let user = users.length > 0 ? users[0] : null;

      if (!user) {
        console.log(`[DataManager] Creating platform admin user: ${userEmail}`);
        
        // Create the user if it doesn't exist
        user = await User.create({
          email: userEmail,
          full_name: 'Platform Administrator',
          platform_admin: true,
          custom_margin_enabled: true,
          onboarding_completed: true,
          last_login: new Date().toISOString()
        });
      } else if (!user.platform_admin) {
        console.log(`[DataManager] Upgrading user to platform admin: ${userEmail}`);
        
        // Update existing user to be platform admin
        await User.update(user.id, {
          platform_admin: true,
          custom_margin_enabled: true,
          margin_override_history: [
            ...(user.margin_override_history || []),
            {
              changed_by: 'system',
              change_date: new Date().toISOString(),
              old_permission: user.custom_margin_enabled || false,
              new_permission: true,
              reason: 'Platform admin setup'
            }
          ]
        });
      }

      // Create initial system configurations if they don't exist
      const existingConfigs = await SystemConfig.list();
      if (existingConfigs.length === 0) {
        console.log('[DataManager] Creating initial system configurations');
        
        await SystemConfig.bulkCreate([
          {
            config_key: 'platform_fee',
            config_value: '13000',
            description: 'Fixed platform fee in INR charged per transaction',
            data_type: 'number',
            category: 'platform_fees'
          },
          {
            config_key: 'default_logistics_cost',
            config_value: '8000',
            description: 'Default logistics cost in INR when calculation fails',
            data_type: 'number',
            category: 'logistics'
          },
          {
            config_key: 'margin_brackets',
            config_value: JSON.stringify({
              budget: { max: 300000, desired: 15, minimum: 10 },
              midrange: { min: 300000, max: 800000, desired: 12, minimum: 8 },
              premium: { min: 800000, desired: 10, minimum: 6 }
            }),
            description: 'Dynamic margin calculation brackets',
            data_type: 'json',
            category: 'margin_settings'
          }
        ]);
      }

      console.log(`[DataManager] Platform admin setup completed for: ${userEmail}`);
      return true;

    } catch (error) {
      console.error('[DataManager] Failed to setup platform admin:', error);
      throw new Error(`Platform admin setup failed: ${error.message}`);
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================
  
  /**
   * Get comprehensive dashboard data for a dealer
   * @param {string} dealerId - Dealer ID
   * @returns {Promise<object>} - Dashboard data object
   */
  static async getDashboardData(dealerId) {
    try {
      if (!dealerId) {
        throw new Error('Dealer ID is required');
      }

      const [vehicles, transactions] = await Promise.all([
        this.getVehiclesByDealer(dealerId, { limit: 20 }),
        this.getTransactionsByDealer(dealerId, { limit: 10 })
      ]);

      // Calculate statistics
      const stats = {
        totalInventory: vehicles.length,
        liveListings: vehicles.filter(v => v.status === 'live').length,
        inTransaction: vehicles.filter(v => v.status === 'in_transaction').length,
        soldThisMonth: vehicles.filter(v => {
          if (v.status !== 'sold' || !v.date_sold) return false;
          const soldDate = new Date(v.date_sold);
          const currentMonth = new Date().getMonth();
          return soldDate.getMonth() === currentMonth;
        }).length,
        pendingOffers: transactions.filter(t => t.seller_id === dealerId && t.status === 'offer_made').length,
        pendingPayments: transactions.filter(t => 
          t.seller_id === dealerId && 
          t.escrow_status === 'paid' && 
          t.status === 'in_escrow'
        ).length
      };

      return {
        vehicles,
        transactions,
        stats
      };
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw new Error(`Dashboard data retrieval failed: ${error.message}`);
    }
  }

  /**
   * Search vehicles with advanced filters
   * @param {object} searchParams - Search parameters
   * @returns {Promise<array>} - Filtered vehicle results
   */
  static async searchVehicles(searchParams = {}) {
    try {
      // Get all live vehicles first
      const vehicles = await this.getLiveVehicles(searchParams.excludeDealerId);
      
      // Apply client-side filtering for complex search
      let filtered = vehicles;

      // Text search
      if (searchParams.query) {
        const query = searchParams.query.toLowerCase();
        filtered = filtered.filter(vehicle => 
          `${vehicle.make} ${vehicle.model} ${vehicle.year}`.toLowerCase().includes(query) ||
          (vehicle.description && vehicle.description.toLowerCase().includes(query))
        );
      }

      // Price range
      if (searchParams.priceMin || searchParams.priceMax) {
        filtered = filtered.filter(vehicle => {
          const price = vehicle.price || 0;
          const minCheck = !searchParams.priceMin || price >= searchParams.priceMin;
          const maxCheck = !searchParams.priceMax || price <= searchParams.priceMax;
          return minCheck && maxCheck;
        });
      }

      // Year range
      if (searchParams.yearMin || searchParams.yearMax) {
        filtered = filtered.filter(vehicle => {
          const year = vehicle.year || 0;
          const minCheck = !searchParams.yearMin || year >= searchParams.yearMin;
          const maxCheck = !searchParams.yearMax || year <= searchParams.yearMax;
          return minCheck && maxCheck;
        });
      }

      // Fuel type
      if (searchParams.fuelTypes && searchParams.fuelTypes.length > 0) {
        filtered = filtered.filter(vehicle => 
          searchParams.fuelTypes.includes(vehicle.fuel_type)
        );
      }

      // Make
      if (searchParams.makes && searchParams.makes.length > 0) {
        filtered = filtered.filter(vehicle => 
          searchParams.makes.includes(vehicle.make)
        );
      }

      // Verified only
      if (searchParams.verifiedOnly) {
        filtered = filtered.filter(vehicle => vehicle.rc_verified);
      }

      // Sort results
      if (searchParams.sortBy) {
        filtered.sort((a, b) => {
          switch (searchParams.sortBy) {
            case 'price_low':
              return (a.price || 0) - (b.price || 0);
            case 'price_high':
              return (b.price || 0) - (a.price || 0);
            case 'year_new':
              return (b.year || 0) - (a.year || 0);
            case 'km_low':
              return (a.kilometers || 0) - (b.kilometers || 0);
            default:
              return new Date(b.created_date) - new Date(a.created_date);
          }
        });
      }

      return filtered;
    } catch (error) {
      console.error('Failed to search vehicles:', error);
      throw new Error(`Vehicle search failed: ${error.message}`);
    }
  }

  // =============================================================================
  // PHASE 3: PAYMENT & LOGISTICS ENHANCEMENTS
  // =============================================================================

  /**
   * Process secure payment through integrated gateway
   * @param {object} paymentData - Payment details
   * @returns {Promise<object>} - Payment result
   */
  static async processSecurePayment(paymentData) {
    try {
      // This would integrate with actual payment gateways
      // For now, simulate the process
      const paymentResult = {
        success: true,
        paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: paymentData.amount,
        method: paymentData.method,
        escrowReference: `escrow_${Date.now()}`,
        timestamp: new Date().toISOString()
      };

      return paymentResult;
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw new Error(`Payment failed: ${error.message}`);
    }
  }

  /**
   * Get real-time logistics quotes
   * @param {object} quoteRequest - Quote request details
   * @returns {Promise<array>} - Array of logistics quotes
   */
  static async getRealTimeLogisticsQuotes(quoteRequest) {
    try {
      // This would integrate with logistics partners' APIs
      // For now, simulate multiple quotes
      const mockQuotes = [
        {
          partnerId: 'partner_1',
          partnerName: 'Swift Transport',
          totalCost: 8500,
          estimatedDays: 2,
          rating: 4.8,
          features: ['Insurance Included', 'GPS Tracking', 'Express Delivery']
        },
        {
          partnerId: 'partner_2',
          partnerName: 'Reliable Logistics',
          totalCost: 7200,
          estimatedDays: 3,
          rating: 4.5,
          features: ['Insurance Optional', 'Standard Delivery', 'Experienced']
        },
        {
          partnerId: 'partner_3',
          partnerName: 'Premium Carriers',
          totalCost: 12000,
          estimatedDays: 1,
          rating: 4.9,
          features: ['Premium Service', 'Same Day', 'White Glove']
        }
      ];

      return mockQuotes;
    } catch (error) {
      console.error('Failed to get logistics quotes:', error);
      throw new Error(`Logistics quotes failed: ${error.message}`);
    }
  }

  /**
   * Generate digital document
   * @param {object} documentRequest - Document generation request
   * @returns {Promise<object>} - Generated document details
   */
  static async generateDigitalDocument(documentRequest) {
    try {
      // This would integrate with document generation service
      const documentResult = {
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        documentUrl: `https://documents.aura.com/generated/${documentRequest.transactionId}/${documentRequest.type}_${Date.now()}.pdf`,
        documentHash: await this.generateDocumentHash(documentRequest),
        generatedAt: new Date().toISOString(),
        legalValidity: 'draft'
      };

      return documentResult;
    } catch (error) {
      console.error('Document generation failed:', error);
      throw new Error(`Document generation failed: ${error.message}`);
    }
  }

  /**
   * Generate document hash for integrity
   * @param {object} documentData - Document data
   * @returns {Promise<string>} - Document hash
   */
  static async generateDocumentHash(documentData) {
    try {
      const documentString = JSON.stringify(documentData);
      const encoder = new TextEncoder();
      const data = encoder.encode(documentString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Hash generation failed:', error);
      return `hash_${Date.now()}`;
    }
  }

  // =============================================================================
  // PHASE 4: ENHANCED MARKETING & AI FEATURES
  // =============================================================================

  /**
   * Generate AI-powered marketing content with feedback learning
   * @param {object} contentRequest - Content generation request
   * @returns {Promise<object>} - Generated marketing content
   */
  static async generateAIMarketingContent(contentRequest) {
    try {
      const { vehicleId, contentType, platform, dealerPreferences } = contentRequest;

      // Get vehicle data for context
      const vehicle = await Vehicle.get(vehicleId);
      const dealer = await Dealer.get(vehicle.dealer_id);

      // Build AI prompt with context
      const prompt = `
        Generate ${contentType} marketing content for a ${vehicle.year} ${vehicle.make} ${vehicle.model}.
        
        Vehicle Details:
        - Price: ₹${(vehicle.price / 100000).toFixed(1)}L
        - Kilometers: ${vehicle.kilometers?.toLocaleString()}
        - Fuel: ${vehicle.fuel_type}
        - Color: ${vehicle.color}
        - Condition: ${vehicle.condition_rating}
        
        Dealer: ${dealer.business_name}
        Platform: ${platform}
        Content Type: ${contentType}
        
        Dealer Preferences: ${JSON.stringify(dealerPreferences)}
        
        Create engaging, professional content that highlights the vehicle's best features.
        Include relevant hashtags and call-to-action appropriate for ${platform}.
      `;

      const aiResponse = await InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            call_to_action: { type: "string" },
            target_audience: { type: "string" },
            estimated_reach: { type: "number" }
          }
        }
      });

      // Simulate asset generation
      const assetResult = {
        assetId: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assetUrl: `https://assets.aura.com/generated/${vehicleId}/${contentType}_${Date.now()}.jpg`,
        thumbnailUrl: `https://assets.aura.com/thumbnails/${vehicleId}/${contentType}_${Date.now()}_thumb.jpg`,
        contentType: contentType,
        platform: platform,
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
        ...aiResponse
      };

      return assetResult;
    } catch (error) {
      console.error('AI marketing content generation failed:', error);
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  /**
   * Process AI feedback for learning
   * @param {object} feedbackData - Feedback data from dealer
   * @returns {Promise<object>} - Processing result
   */
  static async processAIFeedback(feedbackData) {
    try {
      const { assetId, rating, feedback, dealerId } = feedbackData;

      // Analyze feedback for AI learning
      const feedbackPrompt = `
        Analyze dealer feedback for AI improvement:
        
        Asset ID: ${assetId}
        Dealer Rating: ${rating}/5 stars
        Dealer Feedback: "${feedback}"
        
        Extract key insights for improving future AI generation:
        1. What worked well?
        2. What needs improvement?
        3. Specific recommendations for future content
      `;

      const insights = await InvokeLLM({
        prompt: feedbackPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            positive_aspects: { type: "array", items: { type: "string" } },
            improvement_areas: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            confidence_score: { type: "number" }
          }
        }
      });

      // Store learning data for future improvements
      const learningResult = {
        processed: true,
        insights: insights,
        processedAt: new Date().toISOString()
      };

      return learningResult;
    } catch (error) {
      console.error('AI feedback processing failed:', error);
      throw new Error(`Feedback processing failed: ${error.message}`);
    }
  }

  /**
   * Get personalized marketing recommendations
   * @param {string} dealerId - Dealer ID
   * @returns {Promise<object>} - Marketing recommendations
   */
  static async getPersonalizedMarketingRecommendations(dealerId) {
    try {
      const dealer = await Dealer.get(dealerId);
      const vehicles = await Vehicle.filter({ dealer_id: dealerId });
      const assets = await MarketingAsset.filter({ dealer_id: dealerId });

      const recommendationPrompt = `
        Generate personalized marketing recommendations for dealer:
        
        Dealer: ${dealer.business_name}
        Location: ${dealer.city}, ${dealer.state}
        Vehicle Inventory: ${vehicles.length} vehicles
        Generated Assets: ${assets.length} assets
        
        Vehicle Types: ${vehicles.map(v => `${v.year} ${v.make} ${v.model}`).slice(0, 5).join(', ')}
        
        Based on inventory and location, recommend:
        1. Best content types to generate
        2. Optimal posting times
        3. Target audience strategies
        4. Trending vehicle categories to focus on
      `;

      const recommendations = await InvokeLLM({
        prompt: recommendationPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_content_types: { type: "array", items: { type: "string" } },
            optimal_posting_times: { type: "array", items: { type: "string" } },
            target_strategies: { type: "array", items: { type: "string" } },
            trending_focus: { type: "array", items: { type: "string" } },
            priority_vehicles: { type: "array", items: { type: "string" } }
          }
        }
      });

      return recommendations;
    } catch (error) {
      console.error('Failed to generate marketing recommendations:', error);
      throw new Error(`Recommendations failed: ${error.message}`);
    }
  }

  /**
   * Track marketing performance metrics
   * @param {string} assetId - Marketing asset ID
   * @param {object} metrics - Performance metrics
   * @returns {Promise<object>} - Updated metrics
   */
  static async trackMarketingPerformance(assetId, metrics) {
    try {
      const asset = await MarketingAsset.get(assetId);
      
      const updatedMetrics = {
        ...asset.performance_metrics,
        ...metrics,
        last_updated: new Date().toISOString()
      };

      await MarketingAsset.update(assetId, {
        performance_metrics: updatedMetrics,
        last_used_at: new Date().toISOString()
      });

      return updatedMetrics;
    } catch (error) {
      console.error('Failed to track marketing performance:', error);
      throw new Error(`Performance tracking failed: ${error.message}`);
    }
  }
}

export default DataManager;
