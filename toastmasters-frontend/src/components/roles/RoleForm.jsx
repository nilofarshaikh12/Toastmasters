import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import roleService from "../../api/roleService.js";
import { ROLE_CATEGORIES, ROLE_CATEGORY_LABELS } from "../../constants/meetingCategories.js";

function RoleForm() {
  const { roleId } = useParams();
  const navigate = useNavigate();

  const [role, setRole] = useState({
    roleName: "",
    roleDescription: "",
    rolePlayerDocument: "",
    category: "", // empty represents None in the form
  });

  useEffect(() => {
    if (roleId) {
      const fetchRole = async () => {
        try {
          const roleData = await roleService.getRoleById(roleId); // returns role object or null
          if (!roleData) {
            console.warn("Role not found for id:", roleId);
            return;
          }
          console.log("Fetched role for editing:", roleData);
          // Normalize and enforce Speaker category
          const isSpeaker = String(roleData.roleName || '').toLowerCase() === 'speaker';
          setRole({
            roleName: roleData.roleName || "",
            roleDescription: roleData.roleDescription || "",
            rolePlayerDocument: roleData.rolePlayerDocument || "",
            // preserve None if backend has null/undefined/""
            category: isSpeaker ? ROLE_CATEGORIES.REGULAR_AND_SPECIAL : (roleData.category ?? "")
          });
        } catch (error) {
          console.error("Error fetching role for edit:", error);
        }
      };
      fetchRole();
    }
  }, [roleId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRole((prevRole) => {
      const next = { ...prevRole, [name]: value };
      // If name is set to Speaker, auto-set category to REGULAR_AND_SPECIAL
      if (name === 'roleName' && String(value).toLowerCase() === 'speaker') {
        next.category = ROLE_CATEGORIES.REGULAR_AND_SPECIAL;
      }
      return next;
    });
  };

  const generateRoleId = async () => {
    try {
      const response = await roleService.getAllRoles();
      const existingRoles = Array.isArray(response) ? response : [];
      
      // Extract numeric parts from existing role IDs (R1, R2, etc.)
      const existingNumbers = existingRoles
        .map(role => {
          const match = String(role.roleId || '').match(/^R(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(num => num > 0);
      
      // Find the next available number
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      return `R${maxNumber + 1}`;
    } catch (error) {
      console.error("Error generating role ID:", error);
      // Fallback to timestamp-based ID
      return `R${Date.now()}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let roleData = { ...role };
      // Enforce Speaker category before saving
      if (String(roleData.roleName || '').toLowerCase() === 'speaker') {
        roleData.category = ROLE_CATEGORIES.REGULAR_AND_SPECIAL;
      }
      // Convert None (empty string) to null for backend
      if (roleData.category === '') {
        roleData.category = null;
      }
      
      if (roleId) {
        // Editing existing role
        console.log("Updating role data:", roleData);
        await roleService.updateRole(roleId, roleData);
        Swal.fire("Success", "Role updated successfully!", "success");
      } else {
        // Adding new role - generate unique ID
        roleData.roleId = await generateRoleId();
        console.log("Adding new role data:", JSON.stringify(roleData, null, 2));
        await roleService.addRole(roleData);
        Swal.fire("Success", "Role added successfully!", "success");
      }
      navigate("/roles");
    } catch (error) {
      console.error("Error saving role:", error.response?.data || error.message);
      console.error("Full error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error headers:", error.response?.headers);
      Swal.fire("Error", `Failed to save role: ${error.response?.data?.message || error.message}`, "error");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="fw-bold">{roleId ? "Edit Role" : "Add Role"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="roleName" className="form-label">Role Name</label>
            <input type="text" className="form-control" id="roleName" name="roleName" value={role.roleName} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="roleDescription" className="form-label">Description</label>
            <input type="text" className="form-control" id="roleDescription" name="roleDescription" value={role.roleDescription} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="rolePlayerDocument" className="form-label">Player Document</label>
            <input type="text" className="form-control" id="rolePlayerDocument" name="rolePlayerDocument" value={role.rolePlayerDocument} onChange={handleChange} />
          </div>
          <div className="col-md-6">
            <label htmlFor="category" className="form-label">Meeting Category</label>
            <select className="form-control" id="category" name="category" value={role.category} onChange={handleChange}>
              <option value="">None</option>
              {Object.entries(ROLE_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-12 mt-4">
          <button type="submit" className="btn btn-primary me-2">
            {roleId ? "Update Role" : "Add Role"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/roles")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default RoleForm;