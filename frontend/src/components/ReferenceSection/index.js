// src/components/ReferenceSection/index.js
import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { fetchPdf } from '../../services/referenceApi';

const ReferenceSection = ({ sources = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);
  const [error, setError] = useState(null);

  // Function to extract file name without page number and clean it
  const extractFileName = (reference) => {
    try {
      // Remove (Page X) and trim
      const match = reference.match(/(.*?)(?:\s*\(Page \d+\))?$/);
      const baseName = match ? match[1].trim() : reference;
      
      // Format filename to match backend naming convention
      return `${baseName}.pdf`;
    } catch (error) {
      console.error('Error processing filename:', error);
      return reference;
    }
  };

  const handlePdfClick = async (source) => {
    console.log('🔵 handlePdfClick called with:', { source });
    setIsLoading(true);
    setError(null);
    setActiveDocument(source);

    try {
      const cleanFileName = extractFileName(source);
      console.log('📄 Requesting PDF:', cleanFileName);

      const pdfBlob = await fetchPdf(cleanFileName);
      
      if (pdfBlob) {
        const url = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
        window.open(url, '_blank');
      } else {
        throw new Error('Failed to fetch PDF');
      }
    } catch (error) {
      console.error('Error fetching PDF:', error);
      setError(
        error.message === 'Session expired. Please login again.' ||
        error.message === 'No authentication token found. Please login again.'
          ? 'Authentication failed. Please log in again.'
          : 'Error loading PDF. Please try again.'
      );
    } finally {
      setIsLoading(false);
      setActiveDocument(null);
    }
  };

  if (!sources || sources.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">Reference List</h2>
          </div>
          <div className="p-4">
            <p className="text-gray-500 text-sm">No references available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Reference List</h2>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-700">{source}</p>
                  <button
                    onClick={() => handlePdfClick(source)}
                    disabled={isLoading && activeDocument === source}
                    className={`ml-2 p-2 rounded-md transition-colors ${
                      isLoading && activeDocument === source
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-blue-50 text-blue-600'
                    }`}
                    title="View PDF"
                  >
                    {isLoading && activeDocument === source ? (
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {error && activeDocument === source && (
                  <div className="mt-2 text-sm text-red-500">{error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferenceSection;