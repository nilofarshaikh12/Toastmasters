import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const Login = () => {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [role, setRole] = useState("MEMBER");
	const [name, setName] = useState("");

	const handleSubmit = (e) => {
		e.preventDefault();
		login(role, name.trim());
		navigate("/");
	};

	return (
		<div className="container mt-5" style={{ maxWidth: 480 }}>
			<h2 className="fw-bold mb-4">Login</h2>
			<form onSubmit={handleSubmit}>
				<div className="mb-3">
					<label className="form-label">Name (optional)</label>
					<input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
				</div>
				<div className="mb-3">
					<label className="form-label">Role</label>
					<select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
						<option value="VP_EDUCATION">VP Education</option>
						<option value="MEMBER">Member</option>
					</select>
				</div>
				<button className="btn btn-primary">Login</button>
			</form>
		</div>
	);
};

export default Login;


