import React from 'react';
import { Snowflake, Sun } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  hideText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', hideText = false }) => {
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-20 h-20' : 'w-12 h-12';
  const textSize = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-2xl';
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 28 : 18;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`relative ${dim} rounded-full overflow-hidden shadow-md border-2 border-white flex flex-col`}>
        {/* Top Half - Orange with Sun/Snowflake */}
        <div className="h-1/2 w-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <Snowflake size={iconSize} className="text-white opacity-90" />
        </div>
        {/* Bottom Half - Blue with Snowflake */}
        <div className="h-1/2 w-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <Snowflake size={iconSize} className="text-white opacity-90" />
        </div>
        {/* Divider Line */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/30 shadow-sm"></div>
      </div>

      {!hideText && (
        <div className="flex flex-col leading-none select-none">
          <span className={`font-black tracking-tight ${textSize} text-brand-blue print:text-black`}>
            SERVICE
          </span>
          {size !== 'sm' && (
            <span className="text-[0.6rem] font-bold tracking-widest uppercase ml-0.5 text-gray-400">
              Refrigeração Ltda
            </span>
          )}
        </div>
      )}
    </div>
  );
};
