package com.example.toastMasters.controller;

import java.util.List;
import com.example.toastMasters.constants.MemberConstants;
import com.example.toastMasters.exceptions.ResponseMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.toastMasters.dto.MemberRequestDTO;
import com.example.toastMasters.dto.MemberResponseDTO;
import com.example.toastMasters.services.MemberService;
import jakarta.validation.Valid;

//@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/members")
public class MemberController {

    @Autowired
    MemberService memberService;

    @PostMapping("/add")
    public ResponseEntity<ResponseMessage<Void>> addMembers(@Valid @RequestBody MemberRequestDTO memberRequestDTO) {
        memberService.addMember(memberRequestDTO);
        ResponseMessage<Void> response=new ResponseMessage<>(MemberConstants.MEMBER_ADDED, HttpStatus.CREATED.value());
        return new ResponseEntity<>(response,HttpStatus.CREATED);
    }

    @GetMapping("/getMembers")
    public ResponseEntity<ResponseMessage<List<MemberResponseDTO>>> getAllMembers() {
        List<MemberResponseDTO> allMembers = memberService.getAllMembers();
        ResponseMessage<List<MemberResponseDTO>> response=new ResponseMessage<>(MemberConstants.MEMBERS_FETCHED, HttpStatus.OK.value(),allMembers);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/getMemberById/{memberId}")
    public ResponseEntity<ResponseMessage<MemberResponseDTO>> getMemberById(@PathVariable Integer memberId){
        MemberResponseDTO memberById = memberService.getMemberById(memberId);
        ResponseMessage<MemberResponseDTO> response=new ResponseMessage<>(MemberConstants.MEMBER_FETCHED, HttpStatus.OK.value(),memberById);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PatchMapping("/updateMember/{memberId}")
    public ResponseEntity<ResponseMessage<MemberResponseDTO>> updateMember(@PathVariable Integer memberId, @Valid @RequestBody MemberRequestDTO memberRequestDTO){
        MemberResponseDTO memberResponseDTO = memberService.updateMember(memberId, memberRequestDTO);
        ResponseMessage<MemberResponseDTO> response=new ResponseMessage<>(MemberConstants.MEMBER_UPDATED, HttpStatus.OK.value(),memberResponseDTO);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @DeleteMapping("/deleteMember/{memberId}")
    public ResponseEntity<ResponseMessage<Void>> deleteMember(@PathVariable Integer memberId){
        memberService.deleteMember(memberId);
        ResponseMessage<Void> response=new ResponseMessage<>(MemberConstants.MEMBER_DELETED, HttpStatus.OK.value());
        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}
