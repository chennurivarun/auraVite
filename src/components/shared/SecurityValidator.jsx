/**
 * Comprehensive Security Validation Utilities
 * Provides client-side validation that mirrors backend schema constraints
 * This serves as the first line of defense for user experience and reduces invalid API calls
 */

export class SecurityValidator {
  // =============================================================================
  // CORE INPUT SANITIZATION
  // =============================================================================
  
  /**
   * Sanitizes general text input to prevent XSS and trim whitespace
   * @param {string} input - Raw input string
   * @returns {string} - Sanitized string
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .replace(/[<>&"']/g, (match) => { // Escape remaining dangerous characters
        const escapeMap = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return escapeMap[match];
      })
      .trim()
      .slice(0, 2000); // Limit length to prevent abuse
  }

  /**
   * Sanitizes and validates text with specific length constraints
   * @param {string} input - Raw input
   * @param {number} minLength - Minimum allowed length
   * @param {number} maxLength - Maximum allowed length
   * @returns {object} - {isValid: boolean, sanitized: string, error?: string}
   */
  static sanitizeAndValidateText(input, minLength = 0, maxLength = 1000) {
    const sanitized = this.sanitizeInput(input);
    
    if (minLength > 0 && sanitized.length < minLength) {
      return {
        isValid: false,
        sanitized,
        error: `Text must be at least ${minLength} characters long`
      };
    }
    
    if (sanitized.length > maxLength) {
      return {
        isValid: false,
        sanitized: sanitized.slice(0, maxLength),
        error: `Text must not exceed ${maxLength} characters`
      };
    }
    
    return { isValid: true, sanitized };
  }

  // =============================================================================
  // CONTACT & IDENTITY VALIDATION
  // =============================================================================
  
  /**
   * Validates email address format and length
   * @param {string} email - Email to validate
   * @returns {boolean} - Whether email is valid
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validates Indian phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} - Whether phone number is valid
   */
  static validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    
    // Remove all spaces, hyphens, parentheses for validation
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // Check for Indian phone patterns
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Formats phone number to standard display format
   * @param {string} phone - Raw phone number
   * @returns {string} - Formatted phone number
   */
  static formatPhone(phone) {
    if (!phone) return '';
    
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    if (cleanPhone.startsWith('+91')) {
      const number = cleanPhone.slice(3);
      return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
    } else if (cleanPhone.length === 10) {
      return `${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
    }
    
    return phone; // Return as-is if format not recognized
  }

  // =============================================================================
  // BUSINESS DOCUMENT VALIDATION (INDIA-SPECIFIC)
  // =============================================================================
  
  /**
   * Validates PAN (Permanent Account Number) format
   * @param {string} pan - PAN to validate
   * @returns {boolean} - Whether PAN is valid
   */
  static validatePAN(pan) {
    if (!pan || typeof pan !== 'string') return true; // Optional field
    
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase()) && pan.length === 10;
  }

  /**
   * Validates GSTIN (Goods and Services Tax Identification Number) format
   * @param {string} gstin - GSTIN to validate
   * @returns {boolean} - Whether GSTIN is valid
   */
  static validateGSTIN(gstin) {
    if (!gstin || typeof gstin !== 'string') return true; // Optional field
    
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin.toUpperCase()) && gstin.length === 15;
  }

  /**
   * Validates Indian bank account number
   * @param {string} accountNumber - Account number to validate
   * @returns {boolean} - Whether account number is valid
   */
  static validateBankAccount(accountNumber) {
    if (!accountNumber || typeof accountNumber !== 'string') return false;
    
    const cleanAccount = accountNumber.replace(/[\s\-]/g, '');
    return /^[0-9]{9,18}$/.test(cleanAccount);
  }

  /**
   * Validates IFSC (Indian Financial System Code)
   * @param {string} ifsc - IFSC to validate
   * @returns {boolean} - Whether IFSC is valid
   */
  static validateIFSC(ifsc) {
    if (!ifsc || typeof ifsc !== 'string') return false;
    
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase()) && ifsc.length === 11;
  }

  /**
   * Validates Indian pincode
   * @param {string} pincode - Pincode to validate
   * @returns {boolean} - Whether pincode is valid
   */
  static validatePincode(pincode) {
    if (!pincode || typeof pincode !== 'string') return false;
    
    return /^[0-9]{6}$/.test(pincode);
  }

  // =============================================================================
  // VEHICLE-SPECIFIC VALIDATION
  // =============================================================================
  
  /**
   * Validates VIN (Vehicle Identification Number)
   * @param {string} vin - VIN to validate
   * @returns {boolean} - Whether VIN is valid
   */
  static validateVIN(vin) {
    if (!vin || typeof vin !== 'string') return true; // Optional field
    
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(vin.toUpperCase()) && vin.length === 17;
  }

  /**
   * Validates vehicle price
   * @param {number|string} price - Price to validate
   * @returns {boolean} - Whether price is valid
   */
  static validatePrice(price) {
    const numPrice = parseFloat(price);
    return !isNaN(numPrice) && numPrice >= 10000 && numPrice <= 100000000;
  }

  /**
   * Validates vehicle year
   * @param {number|string} year - Year to validate
   * @returns {boolean} - Whether year is valid
   */
  static validateYear(year) {
    const currentYear = new Date().getFullYear();
    const numYear = parseInt(year);
    return !isNaN(numYear) && numYear >= 1990 && numYear <= currentYear + 1;
  }

  /**
   * Validates kilometers/mileage
   * @param {number|string} km - Kilometers to validate
   * @returns {boolean} - Whether kilometers value is valid
   */
  static validateKilometers(km) {
    if (!km && km !== 0) return true; // Optional field
    
    const numKm = parseFloat(km);
    return !isNaN(numKm) && numKm >= 0 && numKm <= 2000000;
  }

  /**
   * Validates engine capacity in liters
   * @param {number|string} capacity - Engine capacity to validate
   * @returns {boolean} - Whether capacity is valid
   */
  static validateEngineCapacity(capacity) {
    if (!capacity && capacity !== 0) return true; // Optional field
    
    const numCapacity = parseFloat(capacity);
    return !isNaN(numCapacity) && numCapacity >= 0.1 && numCapacity <= 20.0;
  }

  /**
   * Validates horsepower
   * @param {number|string} power - Power to validate
   * @returns {boolean} - Whether power is valid
   */
  static validatePower(power) {
    if (!power && power !== 0) return true; // Optional field
    
    const numPower = parseFloat(power);
    return !isNaN(numPower) && numPower >= 1 && numPower <= 2000;
  }

  // =============================================================================
  // BUSINESS LOGIC VALIDATION
  // =============================================================================
  
  /**
   * Validates offer amount in context of vehicle price
   * @param {number} offerAmount - Offer amount
   * @param {number} vehiclePrice - Vehicle asking price
   * @returns {object} - Validation result with suggestions
   */
  static validateOffer(offerAmount, vehiclePrice) {
    const offer = parseFloat(offerAmount);
    const price = parseFloat(vehiclePrice);
    
    if (isNaN(offer) || offer <= 0) {
      return {
        isValid: false,
        error: 'Offer amount must be greater than 0',
        suggestion: null
      };
    }
    
    if (isNaN(price) || price <= 0) {
      return {
        isValid: true,
        warning: 'Unable to compare with asking price',
        suggestion: null
      };
    }
    
    const percentage = ((price - offer) / price) * 100;
    
    if (offer > price * 1.1) {
      return {
        isValid: true,
        warning: 'Your offer is significantly above asking price',
        suggestion: `Consider offering closer to ₹${(price / 100000).toFixed(1)}L`
      };
    }
    
    if (percentage > 30) {
      return {
        isValid: true,
        warning: 'Your offer is significantly below asking price and may be rejected',
        suggestion: `Consider offering at least ₹${((price * 0.8) / 100000).toFixed(1)}L`
      };
    }
    
    return {
      isValid: true,
      suggestion: percentage > 15 ? 
        `Your offer is ${percentage.toFixed(1)}% below asking price` : 
        'Your offer is within reasonable range'
    };
  }

  /**
   * Validates dealer rating
   * @param {number} rating - Rating to validate (1-5)
   * @returns {boolean} - Whether rating is valid
   */
  static validateRating(rating) {
    const numRating = parseFloat(rating);
    return !isNaN(numRating) && numRating >= 1 && numRating <= 5;
  }

  /**
   * Validates inspection score
   * @param {number} score - Score to validate (0-100)
   * @returns {boolean} - Whether score is valid
   */
  static validateInspectionScore(score) {
    const numScore = parseInt(score);
    return !isNaN(numScore) && numScore >= 0 && numScore <= 100;
  }

  // =============================================================================
  // URL & FILE VALIDATION
  // =============================================================================
  
  /**
   * Validates URL format
   * @param {string} url - URL to validate
   * @returns {boolean} - Whether URL is valid
   */
  static validateURL(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  /**
   * Validates file type for vehicle images
   * @param {File} file - File to validate
   * @returns {object} - Validation result
   */
  static validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Only JPEG, PNG, and WebP images are allowed'
      };
    }
    
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Image size must be less than 10MB'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validates file type for documents
   * @param {File} file - File to validate
   * @returns {object} - Validation result
   */
  static validateDocumentFile(file) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Only PDF, JPEG, and PNG files are allowed for documents'
      };
    }
    
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Document size must be less than 5MB'
      };
    }
    
    return { isValid: true };
  }

  // =============================================================================
  // DATE & TIME VALIDATION
  // =============================================================================
  
  /**
   * Validates date string and checks if it's not in the past (for future dates)
   * @param {string} dateString - Date to validate
   * @param {boolean} allowPast - Whether past dates are allowed
   * @returns {boolean} - Whether date is valid
   */
  static validateDate(dateString, allowPast = true) {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) return false;
    
    if (!allowPast && date < new Date()) return false;
    
    return true;
  }

  /**
   * Validates date range
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {boolean} - Whether date range is valid
   */
  static validateDateRange(startDate, endDate) {
    if (!this.validateDate(startDate) || !this.validateDate(endDate)) {
      return false;
    }
    
    return new Date(startDate) <= new Date(endDate);
  }

  // =============================================================================
  // COMPREHENSIVE FORM VALIDATION
  // =============================================================================
  
  /**
   * Validates complete dealer profile data
   * @param {object} dealerData - Dealer profile data
   * @returns {object} - Comprehensive validation result
   */
  static validateDealerProfile(dealerData) {
    const errors = {};
    
    // Required fields
    if (!dealerData.business_name || dealerData.business_name.length < 2) {
      errors.business_name = 'Business name must be at least 2 characters';
    }
    
    if (!dealerData.phone || !this.validatePhone(dealerData.phone)) {
      errors.phone = 'Please enter a valid Indian phone number';
    }
    
    if (!dealerData.business_type) {
      errors.business_type = 'Please select a business type';
    }
    
    if (!dealerData.address || dealerData.address.length < 10) {
      errors.address = 'Please enter a complete address (minimum 10 characters)';
    }
    
    if (!dealerData.city) {
      errors.city = 'City is required';
    }
    
    if (!dealerData.state) {
      errors.state = 'State is required';
    }
    
    // Optional but validated if provided
    if (dealerData.gstin && !this.validateGSTIN(dealerData.gstin)) {
      errors.gstin = 'Invalid GSTIN format (15 characters: 2 digits + 10 alphanumeric + 1 check digit + 2 alphanumeric)';
    }
    
    if (dealerData.pan && !this.validatePAN(dealerData.pan)) {
      errors.pan = 'Invalid PAN format (10 characters: 5 letters + 4 digits + 1 letter)';
    }
    
    if (dealerData.pincode && !this.validatePincode(dealerData.pincode)) {
      errors.pincode = 'Invalid pincode (must be 6 digits)';
    }
    
    if (dealerData.account_number && !this.validateBankAccount(dealerData.account_number)) {
      errors.account_number = 'Bank account number must be 9-18 digits';
    }
    
    if (dealerData.ifsc_code && !this.validateIFSC(dealerData.ifsc_code)) {
      errors.ifsc_code = 'Invalid IFSC code format (11 characters: 4 letters + 0 + 6 alphanumeric)';
    }
    
    if (dealerData.email && !this.validateEmail(dealerData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validates complete vehicle data
   * @param {object} vehicleData - Vehicle data
   * @returns {object} - Comprehensive validation result
   */
  static validateVehicleData(vehicleData) {
    const errors = {};
    
    // Required fields
    if (!vehicleData.make || vehicleData.make.length < 2) {
      errors.make = 'Vehicle make is required';
    }
    
    if (!vehicleData.model || vehicleData.model.length < 1) {
      errors.model = 'Vehicle model is required';
    }
    
    if (!vehicleData.year || !this.validateYear(vehicleData.year)) {
      errors.year = 'Please enter a valid year (1990-2030)';
    }
    
    if (!vehicleData.price || !this.validatePrice(vehicleData.price)) {
      errors.price = 'Price must be between ₹10,000 and ₹10 crores';
    }
    
    if (!vehicleData.fuel_type) {
      errors.fuel_type = 'Fuel type is required';
    }
    
    if (!vehicleData.transmission) {
      errors.transmission = 'Transmission type is required';
    }
    
    // Optional but validated if provided
    if (vehicleData.kilometers && !this.validateKilometers(vehicleData.kilometers)) {
      errors.kilometers = 'Kilometers must be between 0 and 20 lakhs';
    }
    
    if (vehicleData.vin && !this.validateVIN(vehicleData.vin)) {
      errors.vin = 'Invalid VIN format (17 characters, no I, O, or Q)';
    }
    
    if (vehicleData.engine_capacity && !this.validateEngineCapacity(vehicleData.engine_capacity)) {
      errors.engine_capacity = 'Engine capacity must be between 0.1L and 20L';
    }
    
    if (vehicleData.power && !this.validatePower(vehicleData.power)) {
      errors.power = 'Power must be between 1 HP and 2000 HP';
    }
    
    if (vehicleData.seating_capacity) {
      const seats = parseInt(vehicleData.seating_capacity);
      if (isNaN(seats) || seats < 1 || seats > 50) {
        errors.seating_capacity = 'Seating capacity must be between 1 and 50';
      }
    }
    
    if (vehicleData.owners) {
      const owners = parseInt(vehicleData.owners);
      if (isNaN(owners) || owners < 0 || owners > 20) {
        errors.owners = 'Number of owners must be between 0 and 20';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================
  
  /**
   * Formats price for display
   * @param {number} price - Price in INR
   * @returns {string} - Formatted price string
   */
  static formatPrice(price) {
    if (!price || isNaN(price)) return 'Price not set';
    
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)} L`;
    } else {
      return `₹${price.toLocaleString('en-IN')}`;
    }
  }

  /**
   * Formats kilometers for display
   * @param {number} km - Kilometers
   * @returns {string} - Formatted kilometers string
   */
  static formatKilometers(km) {
    if (!km && km !== 0) return 'N/A';
    
    return `${parseInt(km).toLocaleString('en-IN')} km`;
  }

  /**
   * Generates a random placeholder for sensitive data in development
   * @param {string} type - Type of placeholder needed
   * @returns {string} - Placeholder value
   */
  static generatePlaceholder(type) {
    const placeholders = {
      pan: 'ABCDE1234F',
      gstin: '27ABCDE1234F1Z5',
      phone: '+91 98765 43210',
      account: '1234567890123456',
      ifsc: 'SBIN0001234',
      vin: '1HGBH41JXMN109186'
    };
    
    return placeholders[type] || '';
  }
}

export default SecurityValidator;