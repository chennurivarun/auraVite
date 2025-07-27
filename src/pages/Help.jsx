import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, LifeBuoy, Mail } from 'lucide-react';

const faqItems = [
  {
    question: "How do I list a vehicle for sale?",
    answer: "Navigate to 'My Inventory' from the sidebar and click the 'List Vehicle' button. Follow the steps in the Listing Wizard to provide vehicle details, upload photos, and set your price. You can save it as a draft or publish it directly to the marketplace."
  },
  {
    question: "How does the offer and negotiation process work?",
    answer: "When you find a vehicle on the Marketplace, you can make an offer. The seller will be notified and can accept, reject, or make a counter-offer. All communications happen in real-time within the 'Deal Room' for that specific transaction."
  },
  {
    question: "How is my dealer rating calculated?",
    answer: "Your rating is the average of all star ratings you've received from other dealers after completing a transaction. The more deals you complete with positive feedback, the higher your rating will be."
  },
  {
    question: "What is a 'Platform Certified' vehicle?",
    answer: "A 'Platform Certified' badge indicates that a vehicle has passed a comprehensive inspection (high inspection score) and has its key documents, like the RC, verified by our team. It's a sign of a high-quality, trustworthy listing."
  },
  {
    question: "How do I complete my business verification?",
    answer: "Go to Settings > Verification. You will be prompted to complete the onboarding wizard where you need to provide your business details and upload required documents like your GST certificate and PAN card. Our team will review your submission within 1-2 business days."
  },
  {
    question: "How can I report a bug or suggest a feature?",
    answer: "We'd love to hear from you! Click the 'Feedback' (life buoy) icon in the bottom-left of the sidebar to open the feedback form. Select the appropriate category and provide as much detail as you can."
  }
];

export default function HelpPage() {
  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <BookOpen className="w-10 h-10 text-blue-600" />
          <div>
            <h1 className="momentum-h1">Help Center</h1>
            <p className="momentum-body">
              Find answers to common questions about using the platform.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <Card className="momentum-card">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="momentum-body">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Support Section */}
        <Card className="momentum-card mt-8">
          <CardHeader>
            <CardTitle>Still Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <LifeBuoy className="w-6 h-6 text-orange-500" />
                <h3 className="font-semibold">Submit Feedback</h3>
              </div>
              <p className="momentum-small">
                Have a suggestion or found a bug? Let us know directly through the app.
              </p>
              <p className="font-medium text-sm text-blue-600">Click the feedback icon in the sidebar.</p>
            </div>
            <div className="flex flex-col items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-green-500" />
                <h3 className="font-semibold">Contact Support</h3>
              </div>
              <p className="momentum-small">
                For urgent issues or account-specific questions, please email our support team.
              </p>
              <a href="mailto:support@aura.auto" className="font-medium text-sm text-blue-600">
                support@aura.auto
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}