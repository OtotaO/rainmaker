// START: [01-CTXINT-FE-2.1, 01-CTXINT-FE-2.2]
import React, { useState } from 'react';
import { FileSelector } from './FileSelector';

interface ContextInitializationFormProps {
  onComplete: (selectedFiles: SelectedFile[]) => void;
}

export const ContextInitializationForm: React.FC<ContextInitializationFormProps> = ({ onComplete }) => {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [regexPatterns, setRegexPatterns] = useState(['']);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/context-initialization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, regexPatterns }),
      });
      const data = await response.json();
      setFiles(data.files);
    } catch (error) {
      console.error('Failed to initialize context:', error);
    }
  };

  const handleFileSelection = (selectedFiles: SelectedFile[]) => {
    setSelectedFiles(selectedFiles);
    onComplete(selectedFiles);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        placeholder="GitHub Owner"
        required
      />
      <input
        type="text"
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        placeholder="Repository Name"
        required
      />
      {regexPatterns.map((pattern, index) => (
        <input
          key={index}
          type="text"
          value={pattern}
          onChange={(e) => {
            const newPatterns = [...regexPatterns];
            newPatterns[index] = e.target.value;
            setRegexPatterns(newPatterns);
          }}
          placeholder="Regex Pattern"
        />
      ))}
      <button type="button" onClick={() => setRegexPatterns([...regexPatterns, ''])}>
        Add Regex Pattern
      </button>
      <button type="submit">Initialize Context</button>
      {files.length > 0 && (
        <FileSelector files={files} onSelect={handleFileSelection} />
      )}
    </form>
  );
};

interface FileSelectorProps {
  files: File[];
  onSelect: (selectedFiles: SelectedFile[]) => void;
}

export const FileSelector: React.FC<FileSelectorProps> = ({ files, onSelect }) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const handleFileToggle = (file: File) => {
    const index = selectedFiles.findIndex(f => f.path === file.path);
    if (index === -1) {
      setSelectedFiles([...selectedFiles, file as SelectedFile]);
    } else {
      setSelectedFiles(selectedFiles.filter(f => f.path !== file.path));
    }
  };

  const handleSubmit = () => {
    onSelect(selectedFiles);
  };

  return (
    <div>
      <ul>
        {files.map(file => (
          <li key={file.path}>
            <label>
              <input
                type="checkbox"
                checked={selectedFiles.some(f => f.path === file.path)}
                onChange={() => handleFileToggle(file)}
              />
              {file.path}
            </label>
          </li>
        ))}
      </ul>
      <button onClick={handleSubmit}>Confirm Selection</button>
    </div>
  );
};
// END: [01-CTXINT-FE-2.1, 01-CTXINT-FE-2.2] [double check: The code implements the ContextInitializationForm component as specified in 01-CTXINT-FE-2.1, including the required props and state. It also implements the FileSelector component as specified in 01-CTXINT-FE-2.2 with the required props. The implementation appears to fully and faithfully adhere to the specifications.]