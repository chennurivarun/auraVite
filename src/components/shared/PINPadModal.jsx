import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PINPadModal({ isOpen, onClose, onSubmitPin, error }) {
  const [pin, setPin] = useState('');

  if (!isOpen) {
    return null;
  }

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.length === 4) {
      onSubmitPin(pin);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Enter Private View PIN</h2>
          <p className="text-gray-600 mt-2">Enter your 4-digit PIN to view private margin details.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <Input
            type="password"
            maxLength="4"
            value={pin}
            onChange={handlePinChange}
            className="text-center text-2xl tracking-[1em] h-14"
            placeholder="••••"
            autoFocus
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
            <Button type="submit" disabled={pin.length !== 4} className="w-full momentum-btn-primary">
              Unlock
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}