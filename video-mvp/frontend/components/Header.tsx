'use client';

import Link from 'next/link';
import { Crop, Settings, User } from 'lucide-react';

interface HeaderProps {
  onLogoClick?: () => void;
  showProjectLabel?: boolean;
}

const Header = ({ onLogoClick, showProjectLabel = false }: HeaderProps) => {
  const handleClick = () => {
    if (onLogoClick) {
      onLogoClick();
    }
  };

  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-50">
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={handleClick}
      >
        <div className="w-10 h-10 bg-[#3b2bee] rounded-lg flex items-center justify-center neon-glow group-hover:scale-105 transition-transform">
          <Crop className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none text-white">VideoConverter</h1>
          <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase mt-1">AI Video Resizer</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {showProjectLabel && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#3b2bee]/10 rounded-full border border-[#3b2bee]/20">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold text-[#3b2bee]">PROJECT_V01.MP4</span>
          </div>
        )}

        <nav className="hidden md:block">
          <ul className="flex space-x-6">
            <li><Link href="/" className="text-slate-400 hover:text-white transition-colors">Inicio</Link></li>
            <li><Link href="/editor" className="text-slate-400 hover:text-white transition-colors">Editor</Link></li>
            <li><Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">Dashboard</Link></li>
            <li><Link href="/auth" className="text-slate-400 hover:text-white transition-colors">Cuenta</Link></li>
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <button className="text-slate-400 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-[#3b2bee]/20 border border-[#3b2bee]/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#3b2bee]/60 transition-colors">
            <img
              className="w-full h-full object-cover"
              src="https://picsum.photos/seed/user/100/100"
              alt="User profile"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;