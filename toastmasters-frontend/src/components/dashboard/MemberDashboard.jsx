import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const MemberDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container mt-4">
      <h2>Welcome, {user?.name || 'Member'}</h2>
      <p className="lead">Your Toastmasters Dashboard</p>
      
      <div className="row mt-4">
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Your Assigned Roles</h5>
              <p className="card-text">View your upcoming speaking and meeting roles.</p>
              <Link to="/assigned-roles" className="btn btn-primary">
                View Your Roles
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Meeting Schedule</h5>
              <p className="card-text">Check upcoming meeting dates and details.</p>
              <Link to="/meetings" className="btn btn-primary">
                View Meetings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;
