import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  Truck, 
  FileCheck, 
  XCircle,
  AlertCircle,
  Package
} from 'lucide-react';

export default function RTOStatusTracker({ application }) {
  if (!application) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <FileCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p>No RTO application found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusSteps = () => {
    return [
      {
        key: 'submitted',
        title: 'Application Submitted',
        description: 'Your RTO application has been submitted',
        icon: FileCheck,
        completed: ['submitted', 'in_process', 'dispatch', 'completed'].includes(application.status),
        active: application.status === 'submitted'
      },
      {
        key: 'in_process',
        title: 'Under Review',
        description: 'RTO office is processing your application',
        icon: Clock,
        completed: ['in_process', 'dispatch', 'completed'].includes(application.status),
        active: application.status === 'in_process'
      },
      {
        key: 'dispatch',
        title: 'Documents Dispatched',
        description: 'New RC and documents are being prepared',
        icon: Package,
        completed: ['dispatch', 'completed'].includes(application.status),
        active: application.status === 'dispatch'
      },
      {
        key: 'completed',
        title: 'Transfer Complete',
        description: 'Vehicle ownership has been successfully transferred',
        icon: CheckCircle,
        completed: application.status === 'completed',
        active: application.status === 'completed'
      }
    ];
  };

  const getStatusBadge = (status) => {
    const configs = {
      submitted: { color: 'bg-blue-100 text-blue-800', text: 'Submitted' },
      in_process: { color: 'bg-yellow-100 text-yellow-800', text: 'In Process' },
      dispatch: { color: 'bg-purple-100 text-purple-800', text: 'Dispatched' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };
    
    const config = configs[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const getProgressPercentage = () => {
    switch (application.status) {
      case 'submitted': return 25;
      case 'in_process': return 50;
      case 'dispatch': return 75;
      case 'completed': return 100;
      case 'rejected': return 0;
      default: return 0;
    }
  };

  const steps = getStatusSteps();

  return (
    <div className="space-y-6">
      {/* Status Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              RTO Application Status
            </CardTitle>
            {getStatusBadge(application.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-3" />
          </div>

          {/* Tracking Number */}
          {application.tracking_number && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-800 mb-1">Tracking Number</div>
              <div className="font-mono text-lg text-blue-900">{application.tracking_number}</div>
            </div>
          )}

          {/* Application Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Application Fee:</span>
              <div className="font-medium">₹{application.application_fee?.toLocaleString() || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-600">Submitted:</span>
              <div className="font-medium">
                {new Date(application.created_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.completed 
                      ? 'bg-green-100 text-green-600' 
                      : step.active
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      step.completed ? 'text-green-700' :
                      step.active ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-sm text-gray-600">{step.description}</div>
                    {step.completed && (
                      <div className="text-xs text-green-600 mt-1">✓ Completed</div>
                    )}
                    {step.active && (
                      <div className="text-xs text-blue-600 mt-1">● In Progress</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Notice */}
      {application.status === 'rejected' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Your RTO application has been rejected. Please contact support for more information and to resubmit with corrections.
          </AlertDescription>
        </Alert>
      )}

      {/* Help Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Need Help?</strong> RTO processing times typically range from 7-15 business days. 
          You'll receive notifications as your application progresses through each stage.
        </AlertDescription>
      </Alert>
    </div>
  );
}