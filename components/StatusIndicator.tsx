
import React from 'react';
import { Status } from '../types';

interface StatusIndicatorProps {
  status: Status;
  error: string | null;
}

const Dot = ({ color }: { color: string }) => (
  <span className={`w-3 h-3 rounded-full ${color} animate-pulse`}></span>
);

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, error }) => {
  const getStatusContent = () => {
    switch (status) {
      case Status.CONNECTING:
        return {
          text: 'Menghubungkan...',
          dotColor: 'bg-yellow-400',
        };
      case Status.LISTENING:
        return {
          text: 'Mendengarkan...',
          dotColor: 'bg-red-500',
        };
      case Status.ERROR:
        return {
          text: `Error: ${error || 'Unknown error'}`,
          dotColor: 'bg-gray-500',
        };
      case Status.IDLE:
      default:
        return {
          text: 'Tekan untuk mulai berbicara',
          dotColor: 'bg-green-500',
        };
    }
  };

  const { text, dotColor } = getStatusContent();

  return (
    <div className="flex items-center justify-center space-x-3 p-4 text-center">
      <Dot color={dotColor} />
      <p className="text-lg text-gray-300">{text}</p>
    </div>
  );
};
