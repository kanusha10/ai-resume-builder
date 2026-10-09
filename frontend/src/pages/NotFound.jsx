import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8f9fc",
        padding: "30px",
        textAlign: "center",
      }}
    >
      <div>
        <div
          style={{
            color: "#5b5bd6",
            fontWeight: 900,
            fontSize: "70px",
          }}
        >
          404
        </div>

        <h1>Page not found</h1>

        <p style={{ color: "#667085" }}>
          The page you're looking for doesn't exist.
        </p>

        <Link
          to="/"
          className="primary-button"
          style={{
            display: "inline-block",
            textDecoration: "none",
          }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;