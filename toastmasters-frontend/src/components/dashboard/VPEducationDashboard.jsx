import React from 'react';
import { Link } from 'react-router-dom';

const VPEducationDashboard = () => {
  return (
    <div className="container mt-4">
      <h2>VP Education Dashboard</h2>
      <p className="lead">Manage your Toastmasters club activities</p>
      
      <div className="row mt-4">
        <div className="col-md-4 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Manage Members</h5>
              <p className="card-text">View and manage club members.</p>
              <Link to="/members" className="btn btn-primary">
                Go to Members
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Meetings</h5>
              <p className="card-text">Schedule and manage club meetings.</p>
              <Link to="/meetings" className="btn btn-primary">
                Manage Meetings
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Roles</h5>
              <p className="card-text">Manage meeting roles and assignments.</p>
              <Link to="/roles" className="btn btn-primary">
                Manage Roles
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Available Members</h5>
              <p className="card-text">View member availability for meetings.</p>
              <Link to="/available-members" className="btn btn-primary">
                View Availability
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Assign Roles</h5>
              <p className="card-text">Assign roles to members for upcoming meetings.</p>
              <Link to="/assign-roles" className="btn btn-primary">
                Assign Roles
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-12 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Meeting Agenda Management</h5>
              <p className="card-text">Create and manage comprehensive meeting agendas with all related data including speeches, grammarian content, and club information.</p>
              <div className="btn-group">
                <Link to="/agenda-list" className="btn btn-primary">
                  <i className="fas fa-list me-2"></i>Manage Agendas
                </Link>
                <Link to="/agenda/new" className="btn btn-outline-primary">
                  <i className="fas fa-plus me-2"></i>Add Agenda Item
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VPEducationDashboard;
