import React from "react";

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6 transition-all duration-300">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {subtitle}
              </p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
