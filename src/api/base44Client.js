import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "688119e4c7f15b9f5fe60d44", 
  requiresAuth: true // Ensure authentication is required for all operations
});
