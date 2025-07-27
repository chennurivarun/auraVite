export interface Dealer {
  id: string
  business_name: string
  address: string
  city: string
  state: string
  phone: string
  email: string
  created_by: string
  verification_status: string
  rating: number
  completed_deals: number
  total_sales_value: number
  is_active: boolean
  last_activity: string
}

export interface Vehicle {
  id: string
  dealer_id: string
  make: string
  model: string
  year: number
  price: number
  description?: string
  status: string
  kilometers?: number
  fuel_type?: string
  transmission?: string
  date_listed?: string
  date_sold?: string
}

export interface Transaction {
  id: string
  vehicle_id: string
  seller_id: string
  buyer_id: string
  offer_amount: number
  status: string
  escrow_status?: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_email: string
  type: string
  title: string
  message: string
  link?: string
  priority?: string
  created_at: string
}

export interface MarketingAsset {
  id: string
  dealer_id: string
  type: string
  url: string
  created_at: string
  performance_metrics?: Record<string, unknown>
}

export interface RTOApplication {
  id: string
  transaction_id: string
  status: string
  submitted_at: string
}

export interface SocialMediaAccount {
  id: string
  dealer_id: string
  platform: string
  handle: string
  created_at: string
}

export interface PaymentGateway {
  id: string
  dealer_id: string
  provider: string
  connected: boolean
  created_at: string
}

export interface DigitalDocument {
  id: string
  dealer_id: string
  type: string
  url: string
  created_at: string
}

export interface LogisticsPartner {
  id: string
  name: string
  contact: string
  created_at: string
}

export interface Feedback {
  id: string
  user_email: string
  message: string
  rating?: number
  created_at: string
}

export interface SystemConfig {
  id: string
  key: string
  value: string
  created_at: string
}

export interface SystemLog {
  id: string
  level: string
  message: string
  created_at: string
}
