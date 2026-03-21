import { useState, useRef } from 'react';
import { FiUploadCloud, FiFile, FiX } from 'react-icons/fi';
import './FileUpload.css';

function FileUpload({ onFileSelect, accept, maxSize }) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleFile = (file) => {
    if (!file) return;
    if (maxSize && file.size > maxSize) {
      alert(`File too large. Maximum size is ${formatSize(maxSize)}.`);
      return;
    }
    setSelectedFile(file);
    if (onFileSelect) onFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
    if (onFileSelect) onFileSelect(null);
  };

  return (
    <div
      className={`file-upload-zone ${dragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        className="file-upload-input"
        accept={accept}
        onChange={handleChange}
      />

      {!selectedFile ? (
        <>
          <div className="file-upload-icon">
            <FiUploadCloud size={40} />
          </div>
          <div className="file-upload-text">
            Drag files here or <span>click to browse</span>
          </div>
          <div className="file-upload-hint">
            {accept && `Accepted: ${accept}`}
            {maxSize && ` | Max: ${formatSize(maxSize)}`}
          </div>
        </>
      ) : (
        <div className="file-upload-preview">
          <div className="file-preview-icon">
            <FiFile size={20} />
          </div>
          <div className="file-preview-info">
            <div className="file-preview-name">{selectedFile.name}</div>
            <div className="file-preview-size">{formatSize(selectedFile.size)}</div>
          </div>
          <button className="file-preview-remove" onClick={handleRemove} title="Remove file">
            <FiX size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
