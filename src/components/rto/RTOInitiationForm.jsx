import React, { useState } from 'react';
import { RTOApplication } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import { UploadFile } from '@/api/integrations';

export default function RTOInitiationForm({ transaction, vehicle, seller, buyer, onApplicationCreated }) {
  const [formData, setFormData] = useState({
    application_fee: '',
    document_urls: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (docType) => async (file) => {
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        document_urls: [
          ...prev.document_urls.filter(doc => doc.type !== docType),
          { type: docType, url: file_url, name: file.name }
        ]
      }));
    } catch (err) {
      console.error("File upload failed:", err);
      alert(`Upload failed for ${file.name}.`);
    }
  };

  const findDocument = (docType) => {
    return formData.document_urls.find(doc => doc.type === docType);
  };
  
  const handleSubmit = async () => {
    if (!seller || !buyer) {
      setError("Seller or Buyer information is missing.");
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const newApplication = await RTOApplication.create({
        transaction_id: transaction.id,
        vehicle_id: vehicle.id,
        seller_name: seller.business_name,
        seller_address: seller.address,
        buyer_name: buyer.business_name,
        buyer_address: buyer.address,
        application_fee: parseFloat(formData.application_fee) || 0,
        document_urls: formData.document_urls,
        status: 'submitted',
      });
      onApplicationCreated(newApplication);
    } catch (err) {
      console.error('Failed to submit RTO application:', err);
      setError('Failed to submit RTO application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          RTO Transfer Application
        </CardTitle>
        <CardDescription>
          Complete the vehicle ownership transfer process
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Application Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Seller Information</label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium">{seller?.business_name || 'N/A'}</div>
              <div className="text-sm text-gray-600">{seller?.address || 'Address not provided'}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Buyer Information</label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium">{buyer?.business_name || 'N/A'}</div>
              <div className="text-sm text-gray-600">{buyer?.address || 'Address not provided'}</div>
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Vehicle Details</label>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="font-medium">{vehicle?.year} {vehicle?.make} {vehicle?.model}</div>
            <div className="text-sm text-gray-600">VIN: {vehicle?.vin || 'Not provided'}</div>
          </div>
        </div>

        {/* Application Fee */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Application Fee (₹)</label>
          <Input
            type="number"
            placeholder="Enter RTO application fee"
            value={formData.application_fee}
            onChange={(e) => setFormData(prev => ({ ...prev, application_fee: e.target.value }))}
          />
        </div>

        {/* Document Uploads */}
        <div className="space-y-4">
          <h4 className="font-medium">Required Documents</h4>
          
          <FileUploader
            fileTypeLabel="Form 29 (Notice of Transfer)"
            description="Upload completed Form 29"
            onUpload={handleFileUpload('form_29')}
            uploadedFile={findDocument('form_29')}
          />
          
          <FileUploader
            fileTypeLabel="Form 30 (Application for Transfer)"
            description="Upload completed Form 30"
            onUpload={handleFileUpload('form_30')}
            uploadedFile={findDocument('form_30')}
          />
          
          <FileUploader
            fileTypeLabel="NOC (No Objection Certificate)"
            description="Upload NOC from original RTO (if applicable)"
            onUpload={handleFileUpload('noc')}
            uploadedFile={findDocument('noc')}
          />
          
          <FileUploader
            fileTypeLabel="Other Documents"
            description="Any additional supporting documents"
            onUpload={handleFileUpload('other')}
            uploadedFile={findDocument('other')}
          />
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={loading || !formData.application_fee}
          className="w-full momentum-btn-accent"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting Application...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Submit RTO Application
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}