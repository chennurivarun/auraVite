import React from 'react';
import { Button } from '@/components/ui/button';
import { User } from '@/api/entities';

export default function AuthHub() {
  const handleLogin = async () => {
    // This single function handles both new user sign-up and returning user login via Google SSO.
    // After login, the user is automatically redirected back to the app.
    await User.login();
  };

  return (
    <div className="relative min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1553440569-b5f63955a04a?q=80&w=2070&auto=format&fit=crop)',
          filter: 'brightness(0.4)',
        }}
      />
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="bg-white/10 backdrop-blur-lg p-8 md:p-12 rounded-2xl shadow-2xl border border-white/20">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-3xl">A</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            The Future of Auto Trading
          </h1>
          <p className="text-lg text-gray-200 mb-10">
            Welcome to Momentum. Your new competitive edge.
          </p>
          <div className="space-y-4">
            <Button onClick={handleLogin} className="w-full h-14 text-lg momentum-btn-accent flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0 0 48 48" className="fill-current text-white">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.49,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
              </svg>
              Sign In / Sign Up with Google
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}