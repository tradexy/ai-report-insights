import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer id="app-footer" className="bg-slate-700 text-slate-300 p-4 text-center text-sm">
      <div className="container mx-auto">
        &copy; {new Date().getFullYear()} AI Report Insights. All rights reserved.
      </div>
    </footer>
  );
};