import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import "./Navbar.css"; // custom CSS if needed

const Navbar = () => {
  const { user, logout, isVPEducation } = useAuth();
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
      <div className="container-fluid">
        {/* Brand */}
        <Link className="navbar-brand fw-bold" to="/">
          Toastmasters Club
        </Link>

        {/* Toggle for mobile */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Links */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className="nav-link me-4" to="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link me-4" to="/members">
                Members
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link me-4" to="/meetings">
                Meetings
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link me-4" to="/roles">
                Roles
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link me-4" to="/available-members">
                Available Members
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/agenda-list">
                Agenda
              </Link>
            </li>
          </ul>
          <ul className="navbar-nav ms-3">
            {!user ? (
              <li className="nav-item">
                <Link className="btn btn-outline-light btn-sm" to="/login">
                  Login
                </Link>
              </li>
            ) : (
              <li className="nav-item d-flex align-items-center gap-2">
                <span className="navbar-text text-white small">
                  {user.name ? `${user.name} · ` : ""}{isVPEducation ? "VP Education" : "Member"}
                </span>
                <Link className="btn btn-outline-info btn-sm" to="/profile">
                  My Profile
                </Link>
                <button className="btn btn-outline-light btn-sm" onClick={logout}>
                  Logout
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;