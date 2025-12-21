
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 focus:ring-blue-500 border-b-4 border-blue-800 hover:border-blue-900 active:border-b-0 active:translate-y-1",
    secondary: "bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/30 focus:ring-purple-500 border-b-4 border-purple-700 hover:border-purple-800 active:border-b-0 active:translate-y-1",
    outline: "bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 focus:ring-gray-400",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 border-b-4 border-red-700 active:border-b-0 active:translate-y-1",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
