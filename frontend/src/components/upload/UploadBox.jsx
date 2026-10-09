import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./UploadBox.css";

function UploadBox() {
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  function handleFile(selectedFile) {
    setError("");

    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be below 10 MB.");
      return;
    }

    setFile(selectedFile);
  }

  function handleInput(event) {
    handleFile(event.target.files?.[0]);
  }

  function continueToEditor() {
    if (!file) return;

    /*
      Parsing will be connected when the backend
      receives a dedicated resume-upload endpoint.
    */

    navigate("/resume/new");
  }

  return (
    <div className="upload-box">
      <div className="upload-icon">↑</div>

      <h2>Upload an existing resume</h2>

      <p>
        Upload your current resume to continue working on it.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        hidden
        onChange={handleInput}
      />

      <button
        className="upload-select"
        onClick={() => inputRef.current?.click()}
      >
        Choose file
      </button>

      {file && (
        <div className="selected-file">
          <strong>{file.name}</strong>
          <span>
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      )}

      {error && (
        <div className="upload-error">
          {error}
        </div>
      )}

      <button
        className="upload-continue"
        disabled={!file}
        onClick={continueToEditor}
      >
        Continue
      </button>
    </div>
  );
}

export default UploadBox;