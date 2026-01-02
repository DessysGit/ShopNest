import { X } from 'lucide-react';
import { useState } from 'react';

const DemoBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  if (!isDemoMode || !isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <p className="text-sm md:text-base">
              <span className="font-bold">🎓 Demo</span>
              {' '}-{' '}
              <span className="hidden sm:inline">
                This is a demonstration project using Stripe test mode.
              </span>
              {' '}
              Use card: <strong>4242 4242 4242 4242</strong>
              {' '}
              <span className="hidden md:inline">(any CVV, any future date)</span>
              {' '}|{' '}
              Login: <strong>buyer@demo.com / Buyer123!</strong>
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Close banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
