// components/DownloadButton.tsx
import React from 'react';

interface DownloadButtonProps {
  url: string;
  filename: string;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ url, filename }) => {
  return (
    <a
      href={url}
      download={filename}
      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Descargar video convertido
    </a>
  );
};

export default DownloadButton;