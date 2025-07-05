import React from 'react';
import { Outlet } from 'react-router-dom';
import { Button } from '../../@/components/ui/button';
import { Home, Code } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold text-primary">
              Rainmaker
            </Link>
          </div>
          <div className="flex space-x-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/" className="flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/discover" className="flex items-center">
                <Code className="h-4 w-4 mr-2" />
                Discover Components
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default MainLayout;
