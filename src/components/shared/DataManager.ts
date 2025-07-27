import supabase from '@/api/supabaseClient'
import type { Dealer, Vehicle, Transaction, Notification } from '@/api/types'

export class DataManager {
  // Authentication
  static async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user
  }

  static async signInWithOAuth(provider: string) {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider })
    if (error) throw error
    return data
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Dealer operations
  static async getDealerByUserEmail(email: string): Promise<Dealer | null> {
    const { data, error } = await supabase
      .from('Dealer')
      .select('*')
      .eq('created_by', email)
      .maybeSingle()
    if (error) throw error
    return data
  }

  static async createDealerProfile(profile: Omit<Dealer, 'id'>, userEmail: string) {
    const { data, error } = await supabase
      .from('Dealer')
      .insert({ ...profile, created_by: userEmail })
      .select()
      .single()
    if (error) throw error
    return data
  }

  static async updateDealerProfile(dealerId: string, update: Partial<Dealer>) {
    const { data, error } = await supabase
      .from('Dealer')
      .update(update)
      .eq('id', dealerId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  // Vehicle operations
  static async getVehiclesByDealer(dealerId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('Vehicle')
      .select('*')
      .eq('dealer_id', dealerId)
    if (error) throw error
    return data as Vehicle[]
  }

  static async getLiveVehicles(excludeDealerId?: string): Promise<Vehicle[]> {
    let query = supabase.from('Vehicle').select('*').eq('status', 'live')
    if (excludeDealerId) {
      query = query.neq('dealer_id', excludeDealerId)
    }
    const { data, error } = await query
    if (error) throw error
    return data as Vehicle[]
  }

  static async createVehicle(vehicle: Omit<Vehicle, 'id'>) {
    const { data, error } = await supabase
      .from('Vehicle')
      .insert(vehicle)
      .select()
      .single()
    if (error) throw error
    return data
  }

  static async updateVehicle(vehicleId: string, update: Partial<Vehicle>) {
    const { data, error } = await supabase
      .from('Vehicle')
      .update(update)
      .eq('id', vehicleId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  static async deleteVehicle(vehicleId: string) {
    const { error } = await supabase
      .from('Vehicle')
      .delete()
      .eq('id', vehicleId)
    if (error) throw error
  }

  // Transactions
  static async getTransactionsByDealer(dealerId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('Transaction')
      .select('*')
      .or(`seller_id.eq.${dealerId},buyer_id.eq.${dealerId}`)
    if (error) throw error
    return data as Transaction[]
  }

  // Notifications
  static async createNotification(notification: Omit<Notification, 'id'>) {
    const { data, error } = await supabase
      .from('Notification')
      .insert(notification)
      .select()
      .single()
    if (error) throw error
    return data
  }

  // Utility
  static async getDashboardData(dealerId: string) {
    const [vehicles, transactions] = await Promise.all([
      this.getVehiclesByDealer(dealerId),
      this.getTransactionsByDealer(dealerId)
    ])
    return { vehicles, transactions }
  }

  static async setupPlatformAdmin() {
    // Example placeholder: ensure admin exists (implementation may vary)
    return
  }
}

export default DataManager
