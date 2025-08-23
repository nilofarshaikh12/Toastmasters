import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import roleService from "../../api/roleService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLE_CATEGORIES, ROLE_CATEGORY_LABELS } from "../../constants/roleCategories";

function RolesTable() {
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const { isVPEducation } = useAuth();

  useEffect(() => {
    fetchRoles();
  }, []);

  // Role categories mapping with shared roles
  const ROLE_CATEGORY_MAP = {
    [ROLE_CATEGORIES.ALL]: {
      // Will be populated dynamically from API
      roles: [],
      // These roles are shared across all meeting types
      sharedRoles: ['Toastmaster', 'Sergeant at Arms', 'Timer', 'Grammarian', 'Ah-Counter']
    },
    [ROLE_CATEGORIES.REGULAR_MEETING]: {
      roles: [
        'Speaker', 'Evaluator', 'Table Topics Master', 'General Evaluator',
        'VP Education', 'VP Membership', 'President', 'Secretary', 'Treasurer'
      ],
      includeShared: true
    },
    [ROLE_CATEGORIES.SPECIAL_MEETING]: {
      roles: [
        'Workshop Facilitator', 'Panel Moderator', 'Keynote Speaker',
        'Roundtable Leader', 'Networking Coordinator'
      ],
      includeShared: true
    },
    [ROLE_CATEGORIES.CONTEST_MEETING]: {
      roles: [
        'Contestant', 'Ballot Counter', 'Chief Judge', 'Tie-Breaking Judge',
        'Tally Counter', 'SAA'
      ],
      includeShared: true
    },
    [ROLE_CATEGORIES.REGULAR_AND_SPECIAL]: {
      roles: ['Speaker'],
      includeShared: true
    }
  };

  // Assign default category to roles
  const getDefaultCategory = (roleName) => {
    // Check if role is in any specific category
    for (const [category, data] of Object.entries(ROLE_CATEGORY_MAP)) {
      if (data.roles && data.roles.includes(roleName)) {
        return category;
      }
    }
    // If not found in any specific category, check if it's a shared role
    if (ROLE_CATEGORY_MAP[ROLE_CATEGORIES.ALL].sharedRoles.includes(roleName)) {
      return ROLE_CATEGORIES.ALL; // Shared roles are available in all categories
    }
    // Default to Regular Meeting if no category found
    return ROLE_CATEGORIES.REGULAR_MEETING;
  };

  const fetchRoles = async () => {
    try {
      const response = await roleService.getAllRoles();
      console.log("Full API response:", response);
      
      // Initialize ROLE_CATEGORY_MAP.ALL.roles if it's empty
      if (ROLE_CATEGORY_MAP[ROLE_CATEGORIES.ALL].roles.length === 0) {
        ROLE_CATEGORY_MAP[ROLE_CATEGORIES.ALL].roles = [
          ...new Set([
            ...ROLE_CATEGORY_MAP[ROLE_CATEGORIES.REGULAR_MEETING].roles,
            ...ROLE_CATEGORY_MAP[ROLE_CATEGORIES.SPECIAL_MEETING].roles,
            ...ROLE_CATEGORY_MAP[ROLE_CATEGORIES.CONTEST_MEETING].roles,
            ...ROLE_CATEGORY_MAP[ROLE_CATEGORIES.ALL].sharedRoles
          ])
        ];
      }
      
      // Process roles to ensure they have a category
      const rolesData = (response.data.data || []).map(role => ({
        ...role,
        roleCategory: role.roleCategory || getDefaultCategory(role.roleName)
      }));
      
      console.log("Processed roles data:", rolesData);
      setRoles(rolesData);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  useEffect(() => {
    if (roles.length === 0) {
      console.log('No roles available to filter');
      setFilteredRoles([]);
      return;
    }

    console.log('=== ROLE FILTERING DEBUG ===');
    console.log('Selected category:', selectedCategory || 'ALL');
    console.log('Available roles:', roles);
    
    let filtered = [];
    
    if (!selectedCategory || selectedCategory === ROLE_CATEGORIES.ALL) {
      // Show all roles that exist in the system
      filtered = [...roles];
      console.log('Showing all roles');
    } else {
      const categoryData = ROLE_CATEGORY_MAP[selectedCategory];
      if (!categoryData) {
        console.log('Unknown category selected');
        setFilteredRoles([]);
        return;
      }
      
      const { roles: categoryRoles, includeShared } = categoryData;
      const sharedRoles = ROLE_CATEGORY_MAP[ROLE_CATEGORIES.ALL].sharedRoles;
      
      // For Regular + Special, only show Speaker role
      if (selectedCategory === ROLE_CATEGORIES.REGULAR_AND_SPECIAL) {
        filtered = roles.filter(role => role.roleName === 'Speaker');
      } else {
        // For other categories, include category-specific roles and shared roles if enabled
        filtered = roles.filter(role => {
          const isInCategory = categoryRoles.includes(role.roleName);
          const isShared = includeShared && sharedRoles.includes(role.roleName);
          return isInCategory || isShared;
        });
      }
      
      console.log(`Filtered roles for ${selectedCategory}:`, filtered);
    }
    
    setFilteredRoles(filtered);
  }, [selectedCategory, roles]);

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
              <option value={ROLE_CATEGORIES.ALL}>All Categories</option>
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