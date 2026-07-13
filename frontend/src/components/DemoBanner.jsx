import { X, Copy } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const DemoBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  if (!isDemoMode || !isVisible) return null;

  const demoAccounts = [
    { role: 'Admin', icon: '👨‍💼', email: 'admin@demo.com', password: 'Admin123!', color: 'bg-red-500' },
    { role: 'Seller', icon: '💼', email: 'seller1@demo.com', password: 'Seller123!', color: 'bg-green-500' },
    { role: 'Buyer', icon: '🛒', email: 'buyer@demo.com', password: 'Buyer123!', color: 'bg-blue-500' },
  ];

  const copyCredentials = (email, password) => {
    navigator.clipboard.writeText(`${email} / ${password}`);
    toast.success('Credentials copied to clipboard!');
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 overflow-x-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-6">
              <span className="font-bold text-sm sm:text-base flex-shrink-0">🎓 Demo Mode</span>
              
              {/* Demo Accounts - Horizontal on mobile, Grid on larger screens */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                {demoAccounts.map((account) => (
                  <div key={account.role} className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className={`hidden sm:inline-block ${account.color} text-white px-2 py-0.5 rounded font-medium`}>
                      {account.role}
                    </span>
                    <code className="bg-white/20 px-2 py-1 rounded font-mono">
                      {account.email} / {account.password}
                    </code>
                    <button
                      onClick={() => copyCredentials(account.email, account.password)}
                      className="hidden sm:inline p-1 hover:bg-white/20 rounded transition-colors"
                      title="Copy credentials"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Test Card Info */}
              <div className="text-xs sm:text-sm opacity-90">
                Test Card: <strong>4242 4242 4242 4242</strong>
                <span className="hidden md:inline"> (any future date, any CVV)</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors mt-0.5"
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