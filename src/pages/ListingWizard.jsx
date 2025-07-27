
import React, { useState } from "react";
import { Vehicle, User, Dealer } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadFile, InvokeLLM } from "@/api/integrations";
import FileUploader from "../components/shared/FileUploader";
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
  ArrowRight,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ListingWizard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDealer, setCurrentDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [generatingPrice, setGeneratingPrice] = useState(false);
  
  const [vehicleData, setVehicleData] = useState({
    make: "",
    model: "",
    trim_level: "",
    year: new Date().getFullYear(),
    price: "",
    kilometers: "",
    fuel_type: "",
    transmission: "",
    color: "",
    description: "",
    vin: "",
    image_urls: [],
    video_url: "",
    document_urls: [],
    features: [],
    inspection_checklist: {
      body_condition: false,
      engine_condition: false,
      interior_condition: false,
      electrical_systems: false,
      tires_condition: false,
      brakes_condition: false,
    },
    status: "draft",
    rc_verified: false,
    insurance_verified: false,
    inspection_score: 0
  });

  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    loadUserData();
  }, []);

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
        navigate(createPageUrl('DealerOnboarding'));
        return;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setError(error.message);
      navigate(createPageUrl('Welcome'));
    } finally {
      setLoading(false);
    }
  };

  const validateTab = (tab) => {
    const newErrors = {};
    switch (tab) {
        case 'basic':
            if (!vehicleData.make) newErrors.make = "Make is required";
            if (!vehicleData.model) newErrors.model = "Model is required";
            if (!vehicleData.year) newErrors.year = "Year is required";
            if (!vehicleData.fuel_type) newErrors.fuel_type = "Fuel type is required";
            if (!vehicleData.transmission) newErrors.transmission = "Transmission is required";
            break;
        case 'pricing':
            if (!vehicleData.price || parseFloat(vehicleData.price) <= 0) newErrors.price = "A valid price is required";
            break;
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
      setVehicleData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploadedUrls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDocumentUpload = (docType) => async (file) => {
    try {
      const { file_url } = await UploadFile({ file });
      setVehicleData(prev => ({
        ...prev,
        document_urls: [
          ...prev.document_urls.filter(doc => doc.type !== docType),
          { type: docType, url: file_url, name: file.name }
        ]
      }));
    } catch (error) {
      console.error("Document upload failed:", error);
    }
  };

  const findDocument = (docType) => {
    return vehicleData.document_urls.find(doc => doc.type === docType);
  };

  const removeImage = (indexToRemove) => {
    setVehicleData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, index) => index !== indexToRemove)
    }));
  };

  const generateAIPrice = async () => {
    if (!vehicleData.make || !vehicleData.model || !vehicleData.year) {
      alert('Please fill in Make, Model, and Year first');
      return;
    }
    
    setGeneratingPrice(true);
    try {
      const prompt = `Given a ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} with ${vehicleData.kilometers || 'unknown'} kilometers, what would be a fair market price in Indian Rupees? Consider current market conditions, depreciation, and typical pricing for this vehicle. Also provide a brief justification.`;
      
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
      
      setVehicleData(prev => ({
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
    setVehicleData(prev => ({
      ...prev,
      inspection_checklist: {
        ...prev.inspection_checklist,
        [item]: checked
      }
    }));
  };

  const getInspectionScore = () => {
    const checkedItems = Object.values(vehicleData.inspection_checklist).filter(Boolean).length;
    const totalItems = Object.keys(vehicleData.inspection_checklist).length;
    return Math.round((checkedItems / totalItems) * 100);
  };

  const handleSubmit = async (status = "draft") => {
    if (!validateTab('basic') || !validateTab('pricing')) {
        alert("Please ensure all required fields in Basic Info and Pricing are correctly filled.");
        return;
    }
    if (!currentDealer) {
        alert("Could not find your dealer profile. Please try again.");
        return;
    }
    
    setLoading(true);
    try {
      const finalData = {
        ...vehicleData,
        status,
        dealer_id: currentDealer.id, 
        price: parseFloat(vehicleData.price),
        kilometers: vehicleData.kilometers ? parseFloat(vehicleData.kilometers) : 0,
        year: parseInt(vehicleData.year),
        days_in_stock: 0,
        inspection_score: getInspectionScore(),
        features: vehicleData.features || []
      };
      
      await Vehicle.create(finalData);
      navigate(createPageUrl("Inventory"));
    } catch (error) {
      console.error('Error creating vehicle:', error);
      alert('Failed to create vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = ["basic", "pricing", "details", "media", "documents", "inspection"];
  
  const goToNextTab = () => {
    if (!validateTab(activeTab)) return;
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const goToPrevTab = () => {
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const commonFeatures = [
    "Sunroof", "Alloy Wheels", "Touchscreen Display", "Leather Seats", 
    "Cruise Control", "Parking Sensors", "Rear Camera", "Automatic Climate Control"
  ];

  const handleFeatureChange = (feature, checked) => {
    setVehicleData(prev => {
      const currentFeatures = prev.features || [];
      if (checked) {
        return { ...prev, features: [...currentFeatures, feature] };
      } else {
        return { ...prev, features: currentFeatures.filter(f => f !== feature) };
      }
    });
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

  if (loading && !currentDealer) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xl font-semibold text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-momentum-surface-1">
        <div className="max-w-4xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="momentum-h1">Add New Vehicle</h1>
            <p className="momentum-body">
              Create a detailed listing for your vehicle inventory.
            </p>
          </div>

          <div className="mb-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="media">Photos</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="inspection">Inspection</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-6">
                <Card className="momentum-card">
                  <CardHeader>
                    <CardTitle>Basic Vehicle Information</CardTitle>
                    <CardDescription>All fields with * are required to proceed.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Make *</label>
                        <Select 
                          value={vehicleData.make} 
                          onValueChange={(value) => setVehicleData({...vehicleData, make: value})}
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
                          value={vehicleData.model}
                          onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                          className={errors.model ? 'border-red-500' : ''}
                        />
                        {errors.model && <p className="text-red-500 text-sm mt-1">{errors.model}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Trim / Variant</label>
                        <Input
                          placeholder="e.g., VXi, Sportz, Titanium"
                          value={vehicleData.trim_level}
                          onChange={(e) => setVehicleData({...vehicleData, trim_level: e.target.value})}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Year *</label>
                        <Select 
                          value={vehicleData.year.toString()} 
                          onValueChange={(value) => setVehicleData({...vehicleData, year: parseInt(value)})}
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
                          value={vehicleData.kilometers}
                          onChange={(e) => setVehicleData({...vehicleData, kilometers: e.target.value})}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Color</label>
                        <Input
                          placeholder="e.g., White, Red, Blue"
                          value={vehicleData.color}
                          onChange={(e) => setVehicleData({...vehicleData, color: e.target.value})}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Fuel Type *</label>
                        <Select 
                          value={vehicleData.fuel_type} 
                          onValueChange={(value) => setVehicleData({...vehicleData, fuel_type: value})}
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
                          value={vehicleData.transmission} 
                          onValueChange={(value) => setVehicleData({...vehicleData, transmission: value})}
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
              </TabsContent>

              <TabsContent value="pricing" className="mt-6">
                <Card className="momentum-card">
                   <CardHeader>
                    <CardTitle>Pricing Information</CardTitle>
                    <CardDescription>Set your asking price. Use our AI suggestion for help.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Asking Price (₹) *</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="e.g., 850000"
                          value={vehicleData.price}
                          onChange={(e) => setVehicleData({...vehicleData, price: e.target.value})}
                          className={`flex-1 ${errors.price ? 'border-red-500' : ''}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateAIPrice}
                          disabled={generatingPrice}
                          className="whitespace-nowrap"
                        >
                          {generatingPrice ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Zap className="w-4 h-4 mr-2" />}
                          {generatingPrice ? 'Generating...' : 'AI Suggest'}
                        </Button>
                      </div>
                      {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                      {vehicleData.price && (
                        <p className="text-sm text-gray-600 mt-1">
                          ₹{(parseFloat(vehicleData.price) / 100000).toFixed(1)} Lakhs
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="details" className="mt-6">
                <Card className="momentum-card">
                  <CardHeader>
                    <CardTitle>Additional Details & Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Textarea
                        placeholder="Describe the vehicle's condition, features, service history, etc."
                        value={vehicleData.description}
                        onChange={(e) => setVehicleData({...vehicleData, description: e.target.value})}
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">VIN/Chassis Number</label>
                      <Input
                        placeholder="Vehicle identification number"
                        value={vehicleData.vin}
                        onChange={(e) => setVehicleData({...vehicleData, vin: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Key Features</label>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                        {commonFeatures.map(feature => (
                          <div key={feature} className="flex items-center space-x-2">
                            <Checkbox
                              id={`feature-${feature}`}
                              checked={(vehicleData.features || []).includes(feature)}
                              onCheckedChange={(checked) => handleFeatureChange(feature, checked)}
                            />
                            <label htmlFor={`feature-${feature}`} className="text-sm font-medium leading-none">
                              {feature}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="media" className="mt-6">
                <Card className="momentum-card">
                  <CardHeader>
                    <CardTitle>Vehicle Photos</CardTitle>
                    <CardDescription>High-quality photos significantly increase buyer interest.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-4">Upload Photos</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e.target.files)}
                          className="hidden"
                          id="image-upload"
                          disabled={uploadingImages}
                        />
                        <label 
                          htmlFor="image-upload" 
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="w-12 h-12 text-gray-400 mb-4" />
                          <div className="text-lg font-medium mb-2">
                            {uploadingImages ? 'Uploading...' : 'Upload Photos'}
                          </div>
                          <div className="text-sm text-gray-600">Drag and drop or click to select files</div>
                        </label>
                      </div>
                    </div>

                    {vehicleData.image_urls.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-4">Uploaded Photos ({vehicleData.image_urls.length})</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {vehicleData.image_urls.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`Vehicle photo ${index + 1}`}
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                              <button
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <Card className="momentum-card">
                  <CardHeader>
                    <CardTitle>Vehicle Documents</CardTitle>
                    <CardDescription>Upload necessary documents for verification.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <FileUploader
                      fileTypeLabel="Registration Certificate (RC)"
                      onUpload={handleDocumentUpload('rc')}
                      uploadedFile={findDocument('rc')}
                      description="Upload a clear scan or photo of the vehicle's RC."
                    />
                    <FileUploader
                      fileTypeLabel="Insurance Paper"
                      onUpload={handleDocumentUpload('insurance')}
                      uploadedFile={findDocument('insurance')}
                      description="Upload the vehicle's insurance policy document."
                    />
                    <FileUploader
                      fileTypeLabel="Pollution Under Control (PUC) Certificate"
                      onUpload={handleDocumentUpload('puc')}
                      uploadedFile={findDocument('puc')}
                      description="Upload the current PUC certificate."
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inspection" className="mt-6">
                <Card className="momentum-card">
                  <CardHeader>
                    <CardTitle>Self-Inspection Checklist</CardTitle>
                    <CardDescription>Be honest. This builds trust with potential buyers.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {inspectionItems.map(item => (
                        <div key={item.key} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                            <Checkbox 
                                id={item.key} 
                                checked={vehicleData.inspection_checklist[item.key]}
                                onCheckedChange={(checked) => handleInspectionChange(item.key, checked)}
                                className="mt-1"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor={item.key}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {item.label}
                                </label>
                                <p className="text-sm text-muted-foreground">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="flex justify-between items-center pt-6 border-t">
              <Button
                variant="outline"
                onClick={goToPrevTab}
                disabled={tabs.indexOf(activeTab) === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => handleSubmit('draft')} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" /> Save as Draft
                </Button>
                {tabs.indexOf(activeTab) === tabs.length - 1 ? (
                    <Button 
                        className="momentum-btn-primary" 
                        onClick={() => handleSubmit('live')}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        Submit & Publish
                    </Button>
                ) : (
                    <Button
                      onClick={goToNextTab}
                    >
                      Next <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
              </div>
          </div>
        </div>
    </div>
  );
}
