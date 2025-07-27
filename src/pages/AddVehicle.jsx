
import React, { useState } from "react";
import { Vehicle, User, Dealer } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadFile, InvokeLLM } from "@/api/integrations";
import ImageProcessingControls from '../components/shared/ImageProcessingControls';
import { 
  Upload, 
  X, 
  Car, 
  FileText, 
  Camera, 
  CheckCircle,
  AlertCircle,
  Save,
  Eye,
  BookOpen,
  Zap,
  DollarSign,
  Loader2,
  ArrowLeft 
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SecurityValidator from "../components/shared/SecurityValidator";

// Placeholder components as they are referenced in the outline but not provided in full context.
// In a real application, these would be properly implemented or imported from a library.
const ErrorBoundary = ({ children }) => {
  // A basic error boundary. In production, this would catch JS errors.
  return <>{children}</>;
};

const PermissionGuard = ({ requireDealer, children }) => {
  // This component would typically check user roles/permissions.
  // For this context, it just renders its children.
  return <>{children}</>;
};


export default function AddVehicle() {
  const navigate = useNavigate();
  const { id: vehicleIdParam } = useParams(); // Get ID from URL for editing mode
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [currentDealer, setCurrentDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // For multi-step form navigation

  const [uploadingImages, setUploadingImages] = useState(false);
  const [generatingPrice, setGeneratingPrice] = useState(false);
  
  // Renamed vehicleData to formData for consistency with the outline's implied structure
  const [formData, setFormData] = useState({
    // Basic Info
    make: "",
    model: "",
    year: new Date().getFullYear(),
    price: "",
    kilometers: "",
    fuel_type: "",
    transmission: "",
    color: "",
    
    // Details
    description: "",
    vin: "",
    
    // Media
    image_urls: [],
    video_url: "",
    document_urls: [],
    
    // Inspection
    inspection_checklist: {
      body_condition: false,
      engine_condition: false,
      interior_condition: false,
      electrical_systems: false,
      tires_condition: false,
      brakes_condition: false,
    },
    
    // Status
    status: "draft",
    
    // Verification (will be set by system, not directly by user)
    rc_verified: false,
    insurance_verified: false,
    inspection_score: 0
  });

  const [errors, setErrors] = useState({});

  // Effect to set editingVehicleId from URL parameter and trigger data load
  React.useEffect(() => {
    if (vehicleIdParam) {
      setEditingVehicleId(vehicleIdParam);
    }
  }, [vehicleIdParam]);

  // Effect to load user/dealer data and vehicle data (if in editing mode)
  React.useEffect(() => {
    const initializeData = async () => {
      await loadUserData();
      if (editingVehicleId) {
        await loadVehicleData(editingVehicleId);
      } else {
        setLoading(false); // If not editing, initial loading is done after user data
      }
    };
    initializeData();
  }, [editingVehicleId]); // Re-run if editingVehicleId changes (e.g., component loads with ID)

  const loadUserData = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const dealers = await Dealer.filter({ created_by: user.email });
      if (dealers.length > 0) {
        setCurrentDealer(dealers[0]);
      } else {
        // If no dealer profile, redirect to onboarding
        navigate(createPageUrl('DealerOnboarding'));
        return;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setError(error.message);
      // Navigate to AuthHub if user data cannot be loaded, suggesting re-authentication
      navigate(createPageUrl('AuthHub'));
    } finally {
      // setLoading(false) is handled in the outer useEffect to ensure vehicle data loads if editing
    }
  };

  // Function to load vehicle data when editing an existing vehicle
  const loadVehicleData = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const vehicle = await Vehicle.get(id); // Assuming Vehicle.get method exists
      setFormData({
        make: vehicle.make || "",
        model: vehicle.model || "",
        year: vehicle.year || new Date().getFullYear(),
        price: vehicle.price ? vehicle.price.toString() : "",
        kilometers: vehicle.kilometers ? vehicle.kilometers.toString() : "",
        fuel_type: vehicle.fuel_type || "",
        transmission: vehicle.transmission || "",
        color: vehicle.color || "",
        description: vehicle.description || "",
        vin: vehicle.vin || "",
        image_urls: vehicle.image_urls || [],
        video_url: vehicle.video_url || "",
        document_urls: vehicle.document_urls || [],
        inspection_checklist: vehicle.inspection_checklist || { // Ensure checklist is an object
          body_condition: false, engine_condition: false, interior_condition: false,
          electrical_systems: false, tires_condition: false, brakes_condition: false,
        },
        status: vehicle.status || "draft",
        rc_verified: vehicle.rc_verified || false,
        insurance_verified: vehicle.insurance_verified || false,
        inspection_score: vehicle.inspection_score || 0
      });
    } catch (err) {
      console.error("Error loading vehicle data for editing:", err);
      setError("Failed to load vehicle data for editing.");
    } finally {
      setLoading(false);
    }
  };

  // Generic handler for input changes, updating formData state
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Perform validation based on the current step
    if (currentStep === 1) { // Basic Info
      if (!formData.make) newErrors.make = "Make is required";
      if (!formData.model) newErrors.model = "Model is required";
      if (!formData.year || !SecurityValidator.validateYear(formData.year)) newErrors.year = "A valid year is required";
      if (formData.kilometers && !SecurityValidator.validateKilometers(formData.kilometers)) newErrors.kilometers = "Invalid kilometers value";
      if (!formData.fuel_type) newErrors.fuel_type = "Fuel type is required";
      if (!formData.transmission) newErrors.transmission = "Transmission is required";
    } else if (currentStep === 2) { // Pricing
      if (!formData.price || !SecurityValidator.validatePrice(formData.price)) newErrors.price = "A valid price is required";
    } else if (currentStep === 3) { // Photos & Documents
      if (formData.image_urls.length === 0) newErrors.image_urls = "At least one photo is required";
      const hasRC = formData.document_urls.some(doc => doc.type === 'rc');
      if (!hasRC) newErrors.rc_doc = "Registration Certificate is required";
      const hasInsurance = formData.document_urls.some(doc => doc.type === 'insurance');
      if (!hasInsurance) newErrors.insurance_doc = "Insurance Paper is required";
    } else if (currentStep === 4) { // Details & Inspection
      if (formData.vin && !SecurityValidator.validateVIN(formData.vin)) newErrors.vin = "Invalid VIN format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (files) => {
    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await UploadFile({ file });
        return result.file_url;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploadedUrls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images.');
    } finally {
      setUploadingImages(false);
    }
  };

  // Modified handleDocumentUpload to accept file and type directly
  const handleDocumentUpload = async (file, type) => {
    if (!file) return; // Exit if no file is selected
    try {
      const result = await UploadFile({ file });
      const { file_url } = result;
      setFormData(prev => ({
        ...prev,
        document_urls: [
          ...prev.document_urls.filter(doc => doc.type !== type), // Replace if type already exists
          { type, url: file_url, name: file.name }
        ]
      }));
    } catch (error) {
      console.error("Document upload failed:", error);
      alert('Failed to upload document.');
    }
  };

  const findDocument = (docType) => {
    return formData.document_urls.find(doc => doc.type === docType);
  };

  const removeImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, index) => index !== indexToRemove)
    }));
  };

  const generateAIPrice = async () => {
    if (!formData.make || !formData.model || !formData.year) {
      alert('Please fill in Make, Model, and Year first');
      return;
    }
    
    setGeneratingPrice(true);
    try {
      const prompt = `Given a ${formData.year} ${formData.make} ${formData.model} with ${formData.kilometers || 'unknown'} kilometers, what would be a fair market price in Indian Rupees? Consider current market conditions, depreciation, and typical pricing for this vehicle. Also provide a brief justification.`;
      
      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_price: { type: "number" },
            price_range_min: { type: "number" },
            price_range_max: { type: "number" },
            justification: { type: "string" }
          }
        }
      });
      
      setFormData(prev => ({
        ...prev,
        price: response.suggested_price.toString()
      }));
      
      alert(`AI Suggested Price: ₹${(response.suggested_price / 100000).toFixed(1)}L\n\nRange: ₹${(response.price_range_min / 100000).toFixed(1)}L - ₹${(response.price_range_max / 100000).toFixed(1)}L\n\nJustification: ${response.justification}`);
    } catch (error) {
      console.error('Error generating AI price:', error);
      alert('Failed to generate AI price suggestion. Please try again.');
    } finally {
      setGeneratingPrice(false);
    }
  };

  const handleInspectionChange = (item, checked) => {
    setFormData(prev => ({
      ...prev,
      inspection_checklist: {
        ...prev.inspection_checklist,
        [item]: checked
      }
    }));
  };

  const getInspectionScore = () => {
    const checkedItems = Object.values(formData.inspection_checklist).filter(Boolean).length;
    const totalItems = Object.keys(formData.inspection_checklist).length;
    return totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  };

  // NEW function: Handles updates from the ImageProcessingControls component
  const handleProcessingUpdate = (vehicleId, type) => {
    console.log(`[AddVehicle] Processing update for vehicle ${vehicleId}, type: ${type}`);
    // If the updated vehicle is the one currently being edited, reload its data
    if (vehicleId === editingVehicleId) {
      loadVehicleData(vehicleId); // Reload to reflect any changes like new image URLs
    }
  };

  const nextStep = () => {
    if (validateForm()) {
      setCurrentStep(prev => prev + 1);
      setErrors({}); // Clear errors when moving to the next step
    } else {
      alert("Please fill in all required fields and correct errors before proceeding.");
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    setErrors({}); // Clear errors when moving to the previous step
  };

  // Handles submitting the form (either creating a new vehicle or updating an existing one)
  const handleSubmit = async (status = "draft") => {
    if (!validateForm()) {
        alert("Please fill in all required fields and correct errors.");
        return;
    }
    if (!currentDealer) {
        alert("Could not find your dealer profile. Please try again.");
        return;
    }
    
    setLoading(true);
    try {
      const finalData = {
        ...formData,
        status,
        dealer_id: currentDealer.id, 
        price: parseFloat(formData.price),
        kilometers: formData.kilometers ? parseFloat(formData.kilometers) : 0,
        year: parseInt(formData.year),
        days_in_stock: formData.days_in_stock || 0, // Preserve if exists, otherwise default
        inspection_score: getInspectionScore()
      };
      
      if (editingVehicleId) {
        await Vehicle.update(editingVehicleId, finalData); // Assuming Vehicle.update method exists
      } else {
        await Vehicle.create(finalData); // Assuming Vehicle.create method exists
      }
      navigate(createPageUrl("Inventory"));
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('Failed to save vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to save the form as a draft and exit
  const handleSaveAndExit = async () => {
    await handleSubmit("draft");
  };

  const makes = [
    "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Toyota", "Honda", 
    "Ford", "Volkswagen", "Skoda", "Nissan", "Renault", "Kia", "MG", 
    "BMW", "Mercedes-Benz", "Audi", "Volvo", "Jeep", "Other"
  ];

  const fuelTypes = [
    { value: "petrol", label: "Petrol" },
    { value: "diesel", label: "Diesel" },
    { value: "cng", label: "CNG" },
    { value: "electric", label: "Electric" },
    { value: "hybrid", label: "Hybrid" }
  ];

  const transmissionTypes = [
    { value: "manual", label: "Manual" },
    { value: "automatic", label: "Automatic" },
    { value: "amt", label: "AMT" }
  ];

  const inspectionItems = [
    { key: 'body_condition', label: 'Body Condition', description: 'No major dents, scratches, or rust' },
    { key: 'engine_condition', label: 'Engine Condition', description: 'Engine runs smoothly, no unusual noises' },
    { key: 'interior_condition', label: 'Interior Condition', description: 'Seats, dashboard, and controls in good condition' },
    { key: 'electrical_systems', label: 'Electrical Systems', description: 'Lights, AC, radio, and other electronics working' },
    { key: 'tires_condition', label: 'Tires Condition', description: 'Good tread depth, no visible damage' },
    { key: 'brakes_condition', label: 'Brakes Condition', description: 'Brakes responsive, no grinding noises' },
  ];

  // Renders the content for the current step of the multi-step form
  const renderStep = () => {
    switch (currentStep) {
      case 1: // Basic Information
        return (
          <Card className="momentum-card">
            <CardHeader>
              <CardTitle>Basic Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Make *</label>
                  <Select 
                    value={formData.make} 
                    onValueChange={(value) => handleInputChange('make', value)}
                  >
                    <SelectTrigger className={errors.make ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select make" />
                    </SelectTrigger>
                    <SelectContent>
                      {makes.map((make) => (
                        <SelectItem key={make} value={make}>{make}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.make && <p className="text-red-500 text-sm mt-1">{errors.make}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model *</label>
                  <Input
                    placeholder="e.g., Swift, City, Nexon"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    className={errors.model ? 'border-red-500' : ''}
                  />
                  {errors.model && <p className="text-red-500 text-sm mt-1">{errors.model}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Year *</label>
                  <Select 
                    value={formData.year.toString()} 
                    onValueChange={(value) => handleInputChange('year', parseInt(value))}
                  >
                    <SelectTrigger className={errors.year ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 25}, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Kilometers Driven</label>
                  <Input
                    type="number"
                    placeholder="e.g., 45000"
                    value={formData.kilometers}
                    onChange={(e) => handleInputChange('kilometers', e.target.value)}
                    className={errors.kilometers ? 'border-red-500' : ''}
                  />
                  {errors.kilometers && <p className="text-red-500 text-sm mt-1">{errors.kilometers}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <Input
                    placeholder="e.g., White, Red, Blue"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Fuel Type *</label>
                  <Select 
                    value={formData.fuel_type} 
                    onValueChange={(value) => handleInputChange('fuel_type', value)}
                  >
                    <SelectTrigger className={errors.fuel_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((fuel) => (
                        <SelectItem key={fuel.value} value={fuel.value}>{fuel.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fuel_type && <p className="text-red-500 text-sm mt-1">{errors.fuel_type}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Transmission *</label>
                  <Select 
                    value={formData.transmission} 
                    onValueChange={(value) => handleInputChange('transmission', value)}
                  >
                    <SelectTrigger className={errors.transmission ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select transmission" />
                    </SelectTrigger>
                    <SelectContent>
                      {transmissionTypes.map((trans) => (
                        <SelectItem key={trans.value} value={trans.value}>{trans.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.transmission && <p className="text-red-500 text-sm mt-1">{errors.transmission}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Pricing Information
        return (
          <Card className="momentum-card">
            <CardHeader>
              <CardTitle>Pricing Information</CardTitle>
              <CardDescription>Set your asking price with AI assistance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Asking Price (₹) *</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 850000"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className={`flex-1 ${errors.price ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateAIPrice}
                    disabled={generatingPrice}
                    className="whitespace-nowrap"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {generatingPrice ? 'Generating...' : 'AI Suggest'}
                  </Button>
                </div>
                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                {formData.price && (
                  <p className="text-sm text-gray-600 mt-1">
                    ₹{(parseFloat(formData.price) / 100000).toFixed(1)} Lakhs
                  </p>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-800">AI Price Suggestion</div>
                    <p className="text-sm text-blue-700 mt-1">
                      Get an AI-powered price recommendation based on current market conditions, vehicle age, mileage, and similar listings.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3: // Photos & Documents (Implementation as per the outline)
        return (
          <Card className="momentum-card">
            <CardHeader>
              <CardTitle>Step 3: Photos & Documents</CardTitle>
              <CardDescription>Upload vehicle photos and important documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Photo Upload Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Vehicle Photos</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="text-lg font-medium text-gray-900 mb-2">
                      Upload Vehicle Photos
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload high-quality photos from multiple angles. JPG, PNG up to 10MB each.
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleImageUpload(Array.from(e.target.files))}
                      className="hidden"
                      id="photo-upload"
                      disabled={uploadingImages}
                    />
                    <label htmlFor="photo-upload">
                      <Button type="button" className="cursor-pointer" disabled={uploadingImages}>
                        {uploadingImages ? 'Uploading...' : 'Select Photos'}
                      </Button>
                    </label>
                    {errors.image_urls && <p className="text-red-500 text-sm mt-2">{errors.image_urls}</p>}
                  </div>
                  {formData.image_urls && formData.image_urls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                      {formData.image_urls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Vehicle ${index + 1}`}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {index === 0 && (
                            <Badge className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs">
                              Main Photo
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Enhancement Section - Only show if vehicle exists and has images */}
              {editingVehicleId && formData.image_urls && formData.image_urls.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">AI Enhancement</h3>
                  <ImageProcessingControls 
                    vehicle={{ ...formData, id: editingVehicleId }} // Pass the vehicle object including its ID
                    onProcessingUpdate={handleProcessingUpdate}
                  />
                </div>
              )}

              {/* Document Upload Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Vehicle Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'rc', label: 'Registration Certificate (RC)', required: true, errorKey: 'rc_doc' },
                    { key: 'insurance', label: 'Insurance Papers', required: true, errorKey: 'insurance_doc' },
                    { key: 'puc', label: 'Pollution Certificate', required: false },
                    { key: 'service_records', label: 'Service Records', required: false }
                  ].map((doc) => (
                    <div key={doc.key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">
                          {doc.label}
                          {doc.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload(e.target.files[0], doc.key)}
                        className="hidden"
                        id={`${doc.key}-upload`}
                      />
                      <label htmlFor={`${doc.key}-upload`}>
                        <Button type="button" size="sm" variant="outline" className="cursor-pointer w-full">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload {doc.label}
                        </Button>
                      </label>
                      {findDocument(doc.key) && (
                        <p className="text-xs text-green-600 mt-1">✓ Document uploaded: {findDocument(doc.key).name}</p>
                      )}
                      {doc.errorKey && errors[doc.errorKey] && <p className="text-red-500 text-sm mt-1">{errors[doc.errorKey]}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4: // Additional Details & Inspection
        return (
          <>
            <Card className="momentum-card mb-6">
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    placeholder="Describe the vehicle's condition, features, service history, etc."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">VIN/Chassis Number</label>
                  <Input
                    placeholder="Vehicle identification number (17 characters)"
                    value={formData.vin}
                    onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
                    className={errors.vin ? 'border-red-500' : ''}
                  />
                  {errors.vin && <p className="text-red-500 text-sm mt-1">{errors.vin}</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="momentum-card">
              <CardHeader>
                <CardTitle>Vehicle Inspection</CardTitle>
                <CardDescription>Complete this checklist to improve your listing quality</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <div className="font-medium text-blue-800">Inspection Score: {getInspectionScore()}%</div>
                  </div>
                  <p className="text-sm text-blue-700">
                    Higher scores increase buyer confidence and may result in better offers.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {inspectionItems.map((item) => (
                    <div key={item.key} className="flex items-start gap-3 p-4 border rounded-lg">
                      <Checkbox
                        id={item.key}
                        checked={formData.inspection_checklist[item.key]}
                        onCheckedChange={(checked) => handleInspectionChange(item.key, checked)}
                      />
                      <div className="flex-1">
                        <label htmlFor={item.key} className="font-medium cursor-pointer">
                          {item.label}
                        </label>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        );

      default:
        return null;
    }
  };

  // Renders the step indicator UI
  const renderStepIndicator = () => {
    const totalSteps = 4;
    const steps = [
      { name: "Basic Info", icon: <Car className="w-4 h-4" /> },
      { name: "Pricing", icon: <DollarSign className="w-4 h-4" /> },
      { name: "Photos & Docs", icon: <Camera className="w-4 h-4" /> },
      { name: "Details & Insp.", icon: <FileText className="w-4 h-4" /> },
    ];

    return (
      <div className="mb-8">
        <ol className="flex items-center w-full text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-base">
          {steps.map((step, index) => (
            <li 
              key={index} 
              className={`flex md:w-full items-center ${index < totalSteps - 1 ? 'sm:after:content-[\'\'] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10 dark:after:border-gray-700' : ''} ${currentStep > index + 1 ? 'text-blue-600 dark:text-blue-500' : ''}`}
            >
              <span className={`flex items-center after:content-[\'/\'] sm:after:hidden after:mx-2 after:text-gray-200 dark:after:text-gray-500 ${currentStep >= index + 1 ? 'text-blue-600' : ''}`}>
                {currentStep > index + 1 ? (
                  <CheckCircle className="w-4 h-4 me-2 sm:w-5 sm:h-5" />
                ) : (
                  <span className={`me-2 ${currentStep === index + 1 ? 'w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center' : 'w-5 h-5 border border-gray-400 rounded-full flex items-center justify-center'}`}>
                    {index + 1}
                  </span>
                )}
                <span className="hidden sm:inline-flex sm:ms-2">{step.name}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  // Initial loading state display
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xl font-semibold text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state display
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="momentum-h3 text-red-700 mb-2">Error Loading</h3>
          <p className="momentum-body text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="momentum-btn-primary">
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  // If no current dealer is found, prompt for onboarding
  if (!currentDealer) {
    return (
      <div className="flex justify-center items-center h-screen p-8">
        <div className="text-center">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="momentum-h3 text-gray-700 mb-2">No Dealer Profile</h3>
          <p className="momentum-body text-gray-600 mb-6">
            You need a dealer profile to list vehicles.
          </p>
          <Button onClick={() => navigate(createPageUrl('DealerOnboarding'))} className="momentum-btn-primary">
            Create Dealer Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PermissionGuard requireDealer={true}>
        <div className="min-h-screen bg-momentum-surface-1 p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header section as per outline */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="momentum-h1">
                  {editingVehicleId ? 'Edit Vehicle' : 'List New Vehicle'}
                </h1>
                <p className="momentum-body">
                  {editingVehicleId ? 'Update your vehicle details' : 'Add a new vehicle to your inventory with AI enhancement'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => navigate(createPageUrl('Inventory'))}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Inventory
                </Button>
                {editingVehicleId && (
                  <Button variant="outline" onClick={handleSaveAndExit} disabled={loading}>
                    Save & Exit
                  </Button>
                )}
              </div>
            </div>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Form Content (renders current step's content) */}
            <div className="mb-8">
              {renderStep()}
            </div>

            {/* Navigation Buttons for steps */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 -mx-8"> {/* Adjusted margin to align with parent padding */}
              <div className="flex gap-4 justify-between">
                {currentStep > 1 && (
                  <Button variant="outline" onClick={prevStep} disabled={loading}>
                    Previous
                  </Button>
                )}
                {currentStep < 4 && ( // Max 4 steps
                  <Button className="momentum-btn-primary ml-auto" onClick={nextStep} disabled={loading}>
                    Next Step
                  </Button>
                )}
                {currentStep === 4 && ( // Final step - show Save/Publish buttons
                  <div className="flex gap-4 ml-auto">
                    <Button
                      onClick={() => handleSubmit("draft")}
                      disabled={loading}
                      className="momentum-btn-primary"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Saving...' : 'Save as Draft'}
                    </Button>
                    <Button
                      onClick={() => handleSubmit("live")}
                      disabled={loading || !validateForm() || !currentDealer}
                      className="momentum-btn-accent"
                    >
                      {loading ? 'Publishing...' : 'Publish Live'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="w-96 bg-gray-50 border-l border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Live Preview</h3>
          <div className="momentum-card p-4">
            {/* Preview Image */}
            <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-4 overflow-hidden">
              {formData.image_urls.length > 0 ? (
                <img 
                  src={formData.image_urls[0]} 
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Preview Content */}
            <div className="space-y-2">
              <h4 className="font-semibold">
                {formData.year || 'YYYY'} {formData.make || 'Make'} {formData.model || 'Model'}
              </h4>
              <div className="text-xl font-bold text-blue-600">
                ₹{formData.price ? (parseFloat(formData.price) / 100000).toFixed(1) : '0.0'}L
              </div>
              <div className="text-sm text-gray-600">
                {formData.kilometers || 'N/A'} km • {formData.fuel_type || 'Fuel'} • {formData.transmission || 'Trans'}
              </div>
              {getInspectionScore() > 0 && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">Inspection Score: {getInspectionScore()}%</span>
                </div>
              )}
              {formData.description && (
                <p className="text-sm text-gray-600 line-clamp-3">
                  {formData.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </PermissionGuard>
    </ErrorBoundary>
  );
}
