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
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border-default bg-surface shadow-xl p-8 space-y-6 transition-theme duration-300">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
            {subtitle && (
              <p className="text-text-secondary text-sm">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
