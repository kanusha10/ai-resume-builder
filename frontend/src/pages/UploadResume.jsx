
import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
  Sparkles,
  ClipboardPaste,
} from "lucide-react";
import { getToken } from "../utils/auth";
import "./UploadResume.css";

export default function UploadResume() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState("file");
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allowedExtensions = ["pdf", "txt", "docx"];

  const validateFile = (file) => {
    if (!file) return false;

    const extension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setError("Please upload a PDF, DOCX, or TXT file.");
      return false;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("File size exceeds 15MB limit.");
      return false;
    }

    setError("");
    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleProcessResume = async () => {
    setError("");

    if (mode === "file" && !selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    if (mode === "paste" && !pastedText.trim()) {
      setError("Please paste your resume text below.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      if (mode === "file") {
        formData.append("file", selectedFile);
      } else {
        const textBlob = new Blob([pastedText], {
          type: "text/plain",
        });

        formData.append("file", textBlob, "pasted-resume.txt");
      }

      const token = localStorage.getItem("token") || getToken();

      const response = await fetch(
        "http://localhost:8080/api/resumes/upload",
        {
          method: "POST",
          headers: {
            ...(token
              ? { Authorization: `Bearer ${token.trim()}` }
              : {}),
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));

        throw new Error(
          errJson.message || `Upload failed (Status ${response.status})`
        );
      }

      const parsedData = await response.json();

      console.log("Parsed resume API response:", parsedData);

      // Normalize personal information to match emptyResume.personal.
      // The parser currently returns these fields at the top level.
      const normalizedData = {
        ...parsedData,

        personal: {
          fullName:
            parsedData.personal?.fullName ||
            parsedData.fullName ||
            parsedData.name ||
            "",
          email:
            parsedData.personal?.email ||
            parsedData.email ||
            "",
          phone:
            parsedData.personal?.phone ||
            parsedData.phone ||
            "",
          location:
            parsedData.personal?.location ||
            parsedData.location ||
            "",
          linkedin:
            parsedData.personal?.linkedin ||
            (parsedData.linkedin === "LinkedIn"
              ? ""
              : parsedData.linkedin || ""),
          github:
            parsedData.personal?.github ||
            (parsedData.github === "GitHub"
              ? ""
              : parsedData.github || ""),
          website:
            parsedData.personal?.website ||
            parsedData.website ||
            "",
        },
      };

      console.log(
        "Normalized resume data for editor:",
        normalizedData
      );

      sessionStorage.setItem(
        "importedResumeData",
        JSON.stringify(normalizedData)
      );

      sessionStorage.setItem(
        "pendingResumeName",
        normalizedData.name ||
          (selectedFile
            ? selectedFile.name.replace(/\.[^/.]+$/, "")
            : "Pasted Resume")
      );

      sessionStorage.setItem(
        "pendingResumeRole",
        normalizedData.role || "Software Engineer"
      );

      navigate("/resume/new");
    } catch (err) {
      console.error("Resume upload error:", err);
      setError(err.message || "Failed to process resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <header className="upload-header">
        <Link to="/dashboard" className="btn-back">
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </Link>

        <div className="badge-ai">
          <Sparkles size={14} />
          <span>AI Resume Parser</span>
        </div>
      </header>

      <main className="upload-container">
        <div className="upload-card">
          <div className="upload-heading">
            <h2>Add Your Resume</h2>
            <p>
              Upload a document or paste raw text to populate the
              resume editor automatically.
            </p>
          </div>

          {/* Mode toggle tabs */}
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-btn ${mode === "file" ? "active" : ""}`}
              onClick={() => {
                setMode("file");
                setError("");
              }}
            >
              <UploadCloud size={16} />
              <span>Upload Document</span>
            </button>

            <button
              type="button"
              className={`mode-btn ${mode === "paste" ? "active" : ""}`}
              onClick={() => {
                setMode("paste");
                setError("");
              }}
            >
              <ClipboardPaste size={16} />
              <span>Paste Text</span>
            </button>
          </div>

          {error && (
            <div className="upload-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* File upload mode */}
          {mode === "file" && (
            <>
              {!selectedFile ? (
                <div
                  className={`dropzone ${dragActive ? "active" : ""}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: "none" }}
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (file && validateFile(file)) {
                        setSelectedFile(file);
                      }
                    }}
                  />

                  <div className="dropzone-icon">
                    <UploadCloud size={32} />
                  </div>

                  <h3>Drag &amp; Drop your resume here</h3>
                  <p>Supports PDF, DOCX, and TXT (Max 15MB)</p>
                </div>
              ) : (
                <div className="file-chip">
                  <div className="file-chip-info">
                    <FileText size={22} color="#4f46e5" />

                    <div>
                      <strong>{selectedFile.name}</strong>
                      <span>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>

                  {!loading && (
                    <button
                      type="button"
                      className="btn-icon-danger"
                      aria-label="Remove selected file"
                      onClick={() => {
                        setSelectedFile(null);

                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Paste text mode */}
          {mode === "paste" && (
            <div className="paste-area">
              <label>Paste your full resume text below:</label>

              <textarea
                rows={10}
                placeholder="Paste work experience, education, skills, contact info..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
            </div>
          )}

          <div className="upload-footer">
            <button
              type="button"
              className="btn-submit"
              disabled={
                loading ||
                (mode === "file" && !selectedFile) ||
                (mode === "paste" && !pastedText.trim())
              }
              onClick={handleProcessResume}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Parsing Resume...</span>
                </>
              ) : (
                <>
                  <span>Extract &amp; Open in Editor</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
