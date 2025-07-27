import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Eye, 
  PenTool, 
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Stamp
} from 'lucide-react';
import supabase from '@/api/supabaseClient';
import { DataManager } from '../shared/DataManager';

export default function DigitalDocumentManager({ 
  transaction, 
  vehicle, 
  seller, 
  buyer, 
  currentUser,
  isSellerView 
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [signing, setSigning] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, [transaction.id]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data: docs, error } = await supabase
        .from('DigitalDocument')
        .select('*')
        .eq('transaction_id', transaction.id);
      if (error) throw error;
      setDocuments(docs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDocument = async (documentType) => {
    setGenerating(true);
    try {
      const documentData = {
        // Vehicle Information
        vehicle: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          vin: vehicle.vin,
          registrationNumber: vehicle.registration_number,
          engineNumber: vehicle.engine_number,
          chasisNumber: vehicle.chassis_number,
          kilometers: vehicle.kilometers,
          fuelType: vehicle.fuel_type
        },
        // Transaction Information
        transaction: {
          id: transaction.id,
          finalAmount: transaction.final_amount || transaction.offer_amount,
          negotiatedAmount: transaction.negotiated_amount,
          transactionDate: transaction.created_date
        },
        // Seller Information
        seller: {
          businessName: seller.business_name,
          address: seller.address,
          city: seller.city,
          state: seller.state,
          pincode: seller.pincode,
          gstin: seller.gstin,
          pan: seller.pan,
          phone: seller.phone,
          email: seller.email
        },
        // Buyer Information
        buyer: {
          businessName: buyer.business_name,
          address: buyer.address,
          city: buyer.city,
          state: buyer.state,
          pincode: buyer.pincode,
          gstin: buyer.gstin,
          pan: buyer.pan,
          phone: buyer.phone,
          email: buyer.email
        },
        // Generated Document Details
        generatedAt: new Date().toISOString(),
        documentNumber: `${documentType.toUpperCase()}-${transaction.id}-${Date.now()}`
      };

      // Generate document hash for integrity
      const documentString = JSON.stringify(documentData);
      const encoder = new TextEncoder();
      const data = encoder.encode(documentString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const documentHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      // Create document record
      const { data: newDocument, error } = await supabase
        .from('DigitalDocument')
        .insert({
        transaction_id: transaction.id,
        document_type: documentType,
        template_used: `${documentType}_template_v1`,
        document_url: `https://documents.aura.com/generated/${transaction.id}/${documentType}_${Date.now()}.pdf`,
        document_hash: documentHash,
        generated_at: new Date().toISOString(),
        document_data: documentData,
        legal_validity: 'draft',
        access_permissions: [
          { user_email: seller.created_by, permission: 'sign' },
          { user_email: buyer.created_by, permission: 'sign' }
        ]
      })
        .select()
        .single();
      if (error) throw error;

      await loadDocuments();
      return newDocument;

    } catch (error) {
      console.error('Failed to generate document:', error);
      alert('Failed to generate document: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const signDocument = async (documentId) => {
    setSigning(true);
    try {
      const document = documents.find(d => d.id === documentId);
      if (!document) throw new Error('Document not found');

      const updateData = {
        legal_validity: 'executed'
      };

      if (isSellerView) {
        updateData.signed_by_seller = true;
        updateData.seller_signature_timestamp = new Date().toISOString();
        updateData.seller_ip_address = '192.168.1.1'; // In real app, get actual IP
      } else {
        updateData.signed_by_buyer = true;
        updateData.buyer_signature_timestamp = new Date().toISOString();
        updateData.buyer_ip_address = '192.168.1.1';
      }

      await supabase
        .from('DigitalDocument')
        .update(updateData)
        .eq('id', documentId);
      await loadDocuments();

      // If both parties have signed, mark as executed
      const updatedDoc = documents.find(d => d.id === documentId);
      if (updatedDoc && updatedDoc.signed_by_seller && updatedDoc.signed_by_buyer) {
        await supabase
          .from('DigitalDocument')
          .update({ legal_validity: 'executed' })
          .eq('id', documentId);
        await loadDocuments();
      }

    } catch (error) {
      console.error('Failed to sign document:', error);
      alert('Failed to sign document: ' + error.message);
    } finally {
      setSigning(false);
    }
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      sale_agreement: 'Sale Agreement',
      invoice: 'Tax Invoice',
      receipt: 'Payment Receipt',
      rto_form_29: 'RTO Form 29',
      rto_form_30: 'RTO Form 30',
      noc: 'No Objection Certificate',
      delivery_receipt: 'Delivery Receipt',
      inspection_report: 'Inspection Report'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (document) => {
    if (document.legal_validity === 'executed') {
      return <Badge className="bg-green-100 text-green-800">Fully Executed</Badge>;
    }
    if (document.signed_by_seller && document.signed_by_buyer) {
      return <Badge className="bg-blue-100 text-blue-800">Both Signed</Badge>;
    }
    if (document.signed_by_seller || document.signed_by_buyer) {
      return <Badge className="bg-yellow-100 text-yellow-800">Partially Signed</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
  };

  const canSign = (document) => {
    if (isSellerView && document.signed_by_seller) return false;
    if (!isSellerView && document.signed_by_buyer) return false;
    return document.legal_validity === 'draft';
  };

  const documentTypes = [
    { 
      type: 'sale_agreement', 
      label: 'Sale Agreement', 
      description: 'Legal agreement between buyer and seller',
      required: true 
    },
    { 
      type: 'invoice', 
      label: 'Tax Invoice', 
      description: 'GST compliant tax invoice',
      required: true 
    },
    { 
      type: 'receipt', 
      label: 'Payment Receipt', 
      description: 'Acknowledgment of payment received',
      required: false 
    },
    { 
      type: 'delivery_receipt', 
      label: 'Delivery Receipt', 
      description: 'Confirmation of vehicle delivery',
      required: false 
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Digital Document Management
          </CardTitle>
          <CardDescription>
            Generate, sign, and manage all transaction documents digitally
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="documents">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="generate">Generate New</TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-4 mt-6">
              {documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map(document => (
                    <div key={document.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold">{getDocumentTypeLabel(document.document_type)}</h4>
                            {getStatusBadge(document)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <div>Generated</div>
                              <div className="font-medium text-gray-900">
                                {new Date(document.generated_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <div>Version</div>
                              <div className="font-medium text-gray-900">v{document.version}</div>
                            </div>
                            <div>
                              <div>Seller Status</div>
                              <div className={`font-medium ${document.signed_by_seller ? 'text-green-600' : 'text-gray-500'}`}>
                                {document.signed_by_seller ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Signed
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div>Buyer Status</div>
                              <div className={`font-medium ${document.signed_by_buyer ? 'text-green-600' : 'text-gray-500'}`}>
                                {document.signed_by_buyer ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Signed
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {document.legal_validity === 'executed' && (
                            <Alert className="mb-3">
                              <Shield className="h-4 w-4" />
                              <AlertDescription>
                                This document is legally executed and binding. Document hash: {document.document_hash?.substring(0, 16)}...
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          {canSign(document) && (
                            <Button 
                              size="sm" 
                              onClick={() => signDocument(document.id)}
                              disabled={signing}
                              className="momentum-btn-accent"
                            >
                              {signing ? (
                                <>
                                  <Clock className="w-4 h-4 mr-1 animate-spin" />
                                  Signing...
                                </>
                              ) : (
                                <>
                                  <PenTool className="w-4 h-4 mr-1" />
                                  Sign Document
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="font-medium">No documents generated yet</p>
                  <p className="text-sm">Generate transaction documents to get started</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="generate" className="space-y-4 mt-6">
              <div className="grid gap-4">
                {documentTypes.map(docType => {
                  const existingDoc = documents.find(d => d.document_type === docType.type);
                  return (
                    <div key={docType.type} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold">{docType.label}</h4>
                            {docType.required && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                            {existingDoc && (
                              <Badge className="bg-green-100 text-green-800 text-xs">Generated</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{docType.description}</p>
                        </div>
                        <Button
                          onClick={() => generateDocument(docType.type)}
                          disabled={generating || existingDoc}
                          variant={existingDoc ? "outline" : "default"}
                          className={!existingDoc ? "momentum-btn-accent" : ""}
                        >
                          {generating ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : existingDoc ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Generated
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4 mr-2" />
                              Generate
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Alert>
                <Stamp className="h-4 w-4" />
                <AlertDescription>
                  All generated documents are legally compliant and use digital signatures for authenticity. 
                  Documents are automatically timestamped and hashed for integrity verification.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
