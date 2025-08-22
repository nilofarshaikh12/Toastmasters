package com.example.toastMasters.controller;

import com.example.toastMasters.constants.RoleConstants;
import com.example.toastMasters.dto.RoleRequestDTO;
import com.example.toastMasters.dto.RoleResponseDTO;
import com.example.toastMasters.exceptions.ResponseMessage;
import com.example.toastMasters.services.RoleService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

//@CrossOrigin(origins = "http://localhost:5173/")
@RestController
@RequestMapping("/roles")
public class RolesController {

    @Autowired
    RoleService roleService;


    @PostMapping("/addRoles")
    public ResponseEntity<ResponseMessage<Void>> addRole(@Valid @RequestBody RoleRequestDTO roleRequestDTO) {
        roleService.addRole(roleRequestDTO);
        ResponseMessage<Void> response = new ResponseMessage<>(RoleConstants.ROLE_ADDED, HttpStatus.CREATED.value());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/getRoles")
    public ResponseEntity<ResponseMessage<List<RoleResponseDTO>>> getAllRoles() {
        List<RoleResponseDTO> allRoles = roleService.getAllRoles();
        ResponseMessage<List<RoleResponseDTO>> response = new ResponseMessage<>(RoleConstants.ROLES_FETCHED, HttpStatus.OK.value(), allRoles);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/getRoleById/{roleId}")
    public ResponseEntity<ResponseMessage<RoleResponseDTO>> getRoleById(@PathVariable String roleId) {
        RoleResponseDTO roleById = roleService.getRoleById(roleId);
        ResponseMessage<RoleResponseDTO> response = new ResponseMessage<>(RoleConstants.ROLE_FETCHED, HttpStatus.OK.value(), roleById);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PatchMapping("/updateRole/{roleId}")
    public ResponseEntity<ResponseMessage<RoleResponseDTO>> updateRole(@PathVariable String roleId, @Valid @RequestBody RoleRequestDTO roleRequestDTO) {
        RoleResponseDTO updatedRole = roleService.updateRole(roleId, roleRequestDTO);
        ResponseMessage<RoleResponseDTO> response = new ResponseMessage<>(RoleConstants.ROLE_UPDATED, HttpStatus.OK.value(), updatedRole);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @DeleteMapping("/deleteRole/{roleId}")
    public ResponseEntity<ResponseMessage<Void>> deleteRole(@PathVariable String roleId) {
        roleService.deleteRole(roleId);
        ResponseMessage<Void> response = new ResponseMessage<>(RoleConstants.ROLE_DELETED, HttpStatus.OK.value());
        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}


