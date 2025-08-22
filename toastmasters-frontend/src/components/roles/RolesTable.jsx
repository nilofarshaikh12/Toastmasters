import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import roleService from "../../api/roleService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLE_CATEGORY_LABELS, MEETING_CATEGORIES, MEETING_CATEGORY_LABELS } from "../../constants/meetingCategories.js";

function RolesTable() {
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const { isVPEducation } = useAuth();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await roleService.getAllRoles();
      console.log("Fetched roles data:", response.data.data); // Debug log
      console.log("Sample role structure:", response.data.data[0]); // Debug log
      const rolesData = response.data.data || [];
      setRoles(rolesData);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  useEffect(() => {
    // Only filter if we have roles data loaded
    if (roles.length > 0) {
      console.log("Filtering roles by category:", selectedCategory, "Total roles:", roles.length);
      
      if (selectedCategory === 'ALL') {
        setFilteredRoles(roles);
      } else {
        const filtered = roles.filter(role => {
          // Handle roles with category field
          if (role.category) {
            // If it's a shared role, show it for all categories
            if (role.category === ROLE_CATEGORIES.SHARED_ALL_MEETINGS) {
              return true;
            }
            // Otherwise, show only if category matches
            return role.category === selectedCategory;
          }
          // Handle roles without category (legacy data)
          return selectedCategory === 'ALL';
        });
        console.log("Filtered roles count:", filtered.length);
        setFilteredRoles(filtered);
      }
    } else {
      // If no roles data yet, show empty array and don't log
      setFilteredRoles([]);
    }
  }, [roles, selectedCategory]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const deleteRole = async (roleId) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      try {
        await roleService.deleteRole(roleId);
        Swal.fire("Deleted!", "Role has been deleted.", "success");
        fetchRoles();
      } catch (error) {
        console.error("Error deleting role:", error);
        Swal.fire("Error", "Failed to delete role. Please try again.", "error");
      }
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="fw-bold mb-2">Roles List</h2>
          <p className="text-muted mb-0">
            {filteredRoles.length} of {roles.length} roles displayed
          </p>
        </div>
        {isVPEducation && (
          <Link to="/roles/add" className="btn btn-success">
            + Add Role
          </Link>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <div className="row">
          <div className="col-md-6">
            <label htmlFor="categoryFilter" className="form-label fw-bold">Filter by Category:</label>
            <select 
              id="categoryFilter" 
              className="form-select" 
              value={selectedCategory} 
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {Object.entries(ROLE_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <table className="table table-striped table-hover table-bordered shadow-sm">
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th className="col-md-3">Description</th>
            <th className="col-md-2">Document</th>
            <th className="col-md-2">Category</th>
            {isVPEducation && <th className="col-md-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredRoles.length > 0 ? (
            filteredRoles.map((role) => (
              <tr key={role.roleId}>
                <td>{role.roleId}</td>
                <td className="col-md-2">{role.roleName}</td>
                <td className="col-md-3">{role.roleDescription}</td>
                <td className="col-md-2">{role.rolePlayerDocument}</td>
                <td className="col-md-2">
                  <span className={`badge ${role.category ? 'bg-primary' : 'bg-secondary'}`}>
                    {role.category ? (ROLE_CATEGORY_LABELS[role.category] || role.category) : 'Not Set'}
                  </span>
                </td>
                {isVPEducation && (
                  <td className="col-md-2">
                    <Link
                      to={`/roles/edit/${role.roleId}`}
                      className="btn btn-primary btn-sm me-1"
                    >
                      Edit
                    </Link>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteRole(role.roleId)}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={isVPEducation ? "6" : "5"} className="text-center text-muted">
                No roles found for the selected category.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RolesTable;