/**
 * Connection Status Indicator
 * 
 * Shows real-time connection status
 */

import React from 'react';

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

interface ConnectionStatusProps {
  status: ConnectionState;
  className?: string;
}

export function ConnectionStatus({ status, className = '' }: ConnectionStatusProps) {
  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
      pulse: false,
    },
    reconnecting: {
      color: 'bg-yellow-500',
      text: 'Reconnecting...',
      pulse: true,
    },
    disconnected: {
      color: 'bg-red-500',
      text: 'Disconnected',
      pulse: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.pulse && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full ${config.color} animate-ping opacity-75`} />
        )}
      </div>
      <span className="text-gray-700">{config.text}</span>
    </div>
  );
}
