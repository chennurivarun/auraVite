import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Feedback } from '@/api/entities';
import { Loader2, CheckCircle2, LifeBuoy } from 'lucide-react';

export default function FeedbackModal({ isOpen, onClose }) {
  const [feedbackType, setFeedbackType] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setFeedbackType('');
    setMessage('');
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!feedbackType || !message) {
      setError('Please select a feedback type and provide a message.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await Feedback.create({
        type: feedbackType,
        message: message,
        page_context: window.location.pathname,
      });
      setSuccess(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LifeBuoy className="w-6 h-6 text-blue-600" />
                Submit Feedback
              </DialogTitle>
              <DialogDescription>
                We value your input! Help us improve the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div>
                <label htmlFor="feedback-type" className="text-sm font-medium">Feedback Type</label>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger id="feedback-type">
                    <SelectValue placeholder="Select a type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug_report">Bug Report</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="general_comment">General Comment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="message" className="text-sm font-medium">Message</label>
                <Textarea
                  id="message"
                  placeholder="Please provide as much detail as possible..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="momentum-btn-primary">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Thank you for your feedback!</h3>
            <p className="text-gray-600 mb-6">Our team will review your submission.</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={resetForm}>Submit Another</Button>
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}