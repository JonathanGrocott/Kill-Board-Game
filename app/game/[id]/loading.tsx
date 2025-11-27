'use client';

/**
 * Loading State for Game Pages
 * 
 * Skeleton UI while game data loads
 */

import React from 'react';
import { Card } from '@/components/ui/card';

export default function GameLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        {/* Header skeleton */}
        <div className="p-4 border-b bg-white">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-3 lg:gap-6 lg:p-6">
          {/* Board skeleton */}
          <div className="flex-1 lg:col-span-2 flex items-center justify-center p-4">
            <div className="w-full aspect-square max-w-3xl bg-gray-200 rounded-lg animate-pulse" />
          </div>

          {/* Controls skeleton */}
          <div className="lg:space-y-4 bg-white border-t lg:border-t-0 p-4">
            <Card className="p-4">
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
              </div>
            </Card>

            <Card className="p-4 hidden lg:block">
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
