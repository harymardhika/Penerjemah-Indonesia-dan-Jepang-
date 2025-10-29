
import React from 'react';
import { Status } from '../types';

interface ControlPanelProps {
  status: Status;
  onStart: () => void;
  onStop: () => void;
}

const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z" />
    </svg>
);

const ConnectingIcon = () => (
    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const ControlPanel: React.FC<ControlPanelProps> = ({ status, onStart, onStop }) => {
    const isBusy = status === Status.CONNECTING || status === Status.LISTENING;

    const getButtonContent = () => {
        switch(status) {
            case Status.CONNECTING:
                return <ConnectingIcon />;
            case Status.LISTENING:
                return <StopIcon />;
            case Status.IDLE:
            case Status.ERROR:
            default:
                return <MicIcon />;
        }
    }
    
    return (
        <div className="bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-700 flex justify-center items-center">
            <button
                onClick={isBusy ? onStop : onStart}
                disabled={status === Status.CONNECTING}
                className={`
                    w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 ease-in-out
                    focus:outline-none focus:ring-4
                    ${status === Status.LISTENING ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400'}
                    ${status === Status.CONNECTING ? 'bg-gray-500 cursor-not-allowed' : ''}
                    shadow-lg shadow-black/30 transform hover:scale-105 active:scale-100
                `}
            >
                {getButtonContent()}
            </button>
        </div>
    );
};
