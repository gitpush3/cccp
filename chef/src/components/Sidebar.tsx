import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Info, 
  ChevronLeft, 
  ChevronRight,
  Plane,
  Menu
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/about", label: "About LatitudeGo", icon: Info },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-24 left-4 z-40 p-2 rounded-lg bg-brand-dark/80 backdrop-blur-xl border border-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-20 left-0 h-[calc(100vh-5rem)] z-50 transition-all duration-300 ease-in-out
          ${isOpen ? "w-64" : "w-0 lg:w-16"}
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className={`h-full glass-card rounded-none lg:rounded-r-2xl border-l-0 flex flex-col overflow-hidden
          ${isOpen ? "w-64" : "w-16"}
        `}>
          {/* Toggle button - desktop only */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hidden lg:flex absolute -right-3 top-6 p-1.5 rounded-full bg-brand-dark border border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
          >
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all group
                    ${isActive(item.path) 
                      ? "bg-gradient-to-r from-brand-cyan/20 to-brand-purple/20 text-white border border-brand-cyan/30" 
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive(item.path) ? "text-brand-cyan" : "group-hover:text-brand-cyan"}`} />
                  {isOpen && (
                    <span className="font-medium whitespace-nowrap">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          {isOpen && (
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center space-x-2 text-gray-500 text-xs">
                <Plane className="h-4 w-4 text-brand-cyan/50" />
                <span>LatitudeGo © 2025</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
