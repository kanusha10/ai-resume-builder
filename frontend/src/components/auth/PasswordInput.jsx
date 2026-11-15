import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import "./AuthExtras.css";

export default function PasswordInput(props) {
  const [show, setShow] = useState(false);

  return (
    <div className="input-wrapper pw-wrapper">
      <Lock size={16} className="input-icon" />
      <input {...props} type={show ? "text" : "password"} className="form-input pw-input" />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}