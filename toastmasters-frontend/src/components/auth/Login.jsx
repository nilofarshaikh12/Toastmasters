import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Using query parameters in the URL
      const response = await axios.post(
        `http://localhost:8080/api/members/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      );
      
      if (response.data && response.data.data) {
        const payload = response.data.data;
        const { role, name, email: respEmail, id, userId, memberId } = payload;
        const effectiveEmail = respEmail || email; // fall back to entered email
        console.log('Login successful, role:', role); // Debug log

        // Pass richer user object so AuthContext can enrich memberId by email
        login({ role, name, email: effectiveEmail, id, userId, memberId });
        
        // Redirect based on role - ensure the role matches exactly
        if (role === 'VP_EDUCATION' || role === 'VP EDUCATION') {
          console.log('Redirecting to VP Education dashboard');
          navigate('/vp-dashboard');
        } else {
          console.log('Redirecting to Member dashboard');
          navigate('/member-dashboard');
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError("Invalid email or password");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 480 }}>
      <h2 className="fw-bold mb-4">Login</h2>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button 
          type="submit" 
          className="btn btn-primary w-100"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;
