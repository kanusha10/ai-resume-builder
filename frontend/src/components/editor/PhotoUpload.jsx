import React, { useRef, useState } from "react";
import { Camera, Trash2, User } from "lucide-react";
import "./PhotoUpload.css";

// Center-crops to a square and downsizes so the saved JSON stays small (~15–30 KB).
function resizeImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("This file is not a valid image."));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function PhotoUpload({ value, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is larger than 5 MB. Please choose a smaller one.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      const dataUrl = await resizeImage(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err.message || "Failed to process the image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo-upload">
      <div className="photo-upload-preview">
        {value ? <img src={value} alt="Profile" /> : <User size={30} />}
      </div>

      <div className="photo-upload-body">
        <div className="photo-upload-title">Profile photo (optional)</div>
        <p className="photo-upload-hint">
          Square crop, saved with your resume. Note: many company ATS portals ignore or penalize photos,
          so skip it for those applications.
        </p>
        <div className="photo-upload-actions">
          <button type="button" className="photo-btn primary" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Camera size={14} />
            <span>{busy ? "Processing..." : value ? "Change photo" : "Upload photo"}</span>
          </button>
          {value && (
            <button type="button" className="photo-btn danger" onClick={() => onChange("")}>
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          )}
        </div>
        {error && <div className="photo-upload-error">{error}</div>}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} hidden />
    </div>
  );
}