import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell,
  DollarSign,
  ThumbsUp,
  ArrowLeftRight,
  Lock,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

const iconMap = {
  offer: DollarSign,
  deal_update: ThumbsUp,
  payment: Lock,
  logistics: ArrowLeftRight, // Example, adjust as needed
  rto: CheckCircle2, // Example, adjust as needed
  verification: ShieldCheck,
  system: Bell,
  // Add specific icons from triggers
  DollarSign: DollarSign,
  ThumbsUp: ThumbsUp,
  ArrowLeftRight: ArrowLeftRight,
  Lock: Lock,
  CheckCircle2: CheckCircle2,
  ShieldCheck: ShieldCheck,
};

export default function NotificationItem({ notification, onClick }) {
  const { icon, message, link, read_status, created_date, type } = notification;

  // Use the specific icon string if provided, otherwise fallback to type, then default to Bell
  const IconComponent = iconMap[icon] || iconMap[type] || Bell;

  const timeSince = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  return (
    <Link 
      to={link || '#'} 
      onClick={() => onClick(notification)}
      className={`flex items-start gap-4 p-3 hover:bg-gray-50 transition-colors duration-150 ${!read_status ? 'bg-blue-50' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${!read_status ? 'bg-blue-100' : 'bg-gray-100'}`}>
        <IconComponent className={`w-4 h-4 ${!read_status ? 'text-blue-600' : 'text-gray-500'}`} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-800">{message}</p>
        <p className="text-xs text-gray-500 mt-1">{timeSince(created_date)}</p>
      </div>
      {!read_status && (
        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full self-center" />
      )}
    </Link>
  );
}
