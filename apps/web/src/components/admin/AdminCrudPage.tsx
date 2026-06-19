import React from 'react';

interface AdminCrudPageProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function AdminCrudPage({ title, description, children }: AdminCrudPageProps) {
  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-default-500">{description}</p>}
      </div>
      <div className="flex-1 bg-content1 rounded-large p-4">
        {children}
      </div>
    </div>
  );
}
