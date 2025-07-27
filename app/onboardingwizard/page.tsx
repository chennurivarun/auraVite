
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Dealer, Notification } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { SendEmail } from '@/api/integrations';
import ProgressBar from '../components/shared/ProgressBar';
import FileUploader from '../components/shared/FileUploader';
import { ArrowLeft, Shield, CreditCard } from 'lucide-react';

const TOTAL_STEPS = 4; // Updated to 4 steps

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [dealer, setDealer] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    business_type: '',
    gstin: '',
    pan: '',
    address: '',
    kyb_documents: [],
    // New fields for Phase 2
    account_number: '',
    ifsc_code: '',
    bank_name: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        const dealers = await Dealer.filter({ created_by: user.email });
        if (dealers.length > 0) {
          const currentDealer = dealers[0];
          setDealer(currentDealer);
          setFormData({
            business_type: currentDealer.business_type || '',
            gstin: currentDealer.gstin || '',
            pan: currentDealer.pan || '',
            address: currentDealer.address || '',
            kyb_documents: currentDealer.kyb_documents || [],
            account_number: currentDealer.account_number || '',
            ifsc_code: currentDealer.ifsc_code || '',
            bank_name: currentDealer.bank_name || '',
          });
        }
      } catch (error) {
        console.error("Failed to load user/dealer data", error);
      }
    };
    loadData();
  }, []);
  
  const handleFileUpload = (docType) => async (file) => {
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        kyb_documents: [
          ...prev.kyb_documents.filter(doc => doc.type !== docType),
          { type: docType, url: file_url, name: file.name }
        ]
      }));
    } catch (error) {
      console.error("File upload failed:", error);
    }
  };

  const findDocument = (docType) => {
    return formData.kyb_documents.find(doc => doc.type === docType);
  };

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      // Save progress
      await Dealer.update(dealer.id, { ...formData });
      setCurrentStep(prev => prev + 1);
    } else {
      // Final submission
      await Dealer.update(dealer.id, { 
        ...formData,
        verification_status: 'in_review'
      });

      // --- NOTIFICATION TRIGGER ---
      if (currentUser) {
        const message = "Your business verification details have been submitted and are now under review.";
        await Notification.create({
          user_email: currentUser.email,
          message: message,
          link: createPageUrl('Settings'),
          type: 'verification',
          icon: 'ShieldCheck'
        });
        await SendEmail({
          to: currentUser.email,
          subject: "Verification Submitted Successfully",
          body: `<p>${message} We will notify you once the process is complete, typically within 1-2 business days.</p>`
        });
      }
      // --- END NOTIFICATION TRIGGER ---

      alert('Verification details submitted successfully! You will be notified once the review is complete.');
      navigate(createPageUrl('Dashboard'));
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate(createPageUrl('Dashboard'));
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Business Type</CardTitle>
              <CardDescription>Tell us about your business structure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Business Structure</label>
                <Select
                  value={formData.business_type}
                  onValueChange={(value) => setFormData({ ...formData, business_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="private_limited">Private Limited</SelectItem>
                    <SelectItem value="public_limited">Public Limited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Business Details</CardTitle>
              <CardDescription>Provide your business registration and address information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div>
                <label className="block text-sm font-medium mb-2">GSTIN</label>
                <Input
                  placeholder="Your 15-digit GSTIN"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Address</label>
                <Input
                  placeholder="Full business address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <FileUploader
                fileTypeLabel="Upload GST Certificate"
                onUpload={handleFileUpload('gst_certificate')}
                uploadedFile={findDocument('gst_certificate')}
              />
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Step 3: Owner KYC
              </CardTitle>
              <CardDescription>Upload your identity verification documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">PAN Number</label>
                <Input
                  placeholder="Your 10-digit PAN number"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                />
              </div>
              <FileUploader
                fileTypeLabel="Upload PAN Card"
                onUpload={handleFileUpload('pan_card')}
                uploadedFile={findDocument('pan_card')}
              />
              <FileUploader
                fileTypeLabel="Upload Aadhar Card"
                onUpload={handleFileUpload('aadhar_card')}
                uploadedFile={findDocument('aadhar_card')}
              />
            </CardContent>
          </Card>
        );
      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Step 4: Bank Details
              </CardTitle>
              <CardDescription>Provide your bank account details for payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Bank Name</label>
                <Input
                  placeholder="Your bank name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Account Number</label>
                <Input
                  placeholder="Your account number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">IFSC Code</label>
                <Input
                  placeholder="Your bank's IFSC code"
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                />
              </div>
              <FileUploader
                fileTypeLabel="Upload Cancelled Cheque"
                onUpload={handleFileUpload('cancelled_cheque')}
                uploadedFile={findDocument('cancelled_cheque')}
              />
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-momentum-surface-1 flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="momentum-h2">Business Verification</h1>
            <span className="momentum-small text-gray-500">Step {currentStep} of {TOTAL_STEPS}</span>
          </div>
          <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </div>

        {renderStep()}

        <div className="mt-8 flex justify-between">
           <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button className="momentum-btn-accent" onClick={handleNext}>
            {currentStep === TOTAL_STEPS ? 'Submit for Verification' : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
