package com.example.toastMasters.exceptions;

import com.example.toastMasters.constants.MeetingConstants;
import com.example.toastMasters.constants.RoleConstants;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.example.toastMasters.constants.MemberConstants;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MemberAddFailedException.class)
    public ResponseEntity<ResponseMessage<Void>> handleMemberAddFailedException(MemberAddFailedException ex){
        ResponseMessage<Void> response=new ResponseMessage<>(MemberConstants.MEMBER_ADD_FAILED, HttpStatus.BAD_REQUEST.value());
        return new ResponseEntity<>(response,HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MemberNotFoundException.class)
    public ResponseEntity<ResponseMessage<Void>> handleMemberNotFoundException(MemberNotFoundException ex){
        ResponseMessage<Void> response=new ResponseMessage<>(MemberConstants.MEMBER_NOT_FOUND, HttpStatus.NOT_FOUND.value());
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(MemberUpdateFailedException.class)
    public ResponseEntity<ResponseMessage<Void>> handleMemberUpdateFailedException(MemberUpdateFailedException ex){
        ResponseMessage<Void> response=new ResponseMessage<>(MemberConstants.MEMBER_UPDATE_FAILED, HttpStatus.BAD_REQUEST.value());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MemberDeleteFailedException.class)
    public ResponseEntity<ResponseMessage<Void>> handleMemberDeleteFailedException(MemberDeleteFailedException ex){
        ResponseMessage<Void> response=new ResponseMessage<>(MemberConstants.MEMBER_DELETE_FAILED, HttpStatus.BAD_REQUEST.value());
        return new ResponseEntity<>(response,HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(RoleNotFoundException.class)
    public ResponseEntity<ResponseMessage<Void>> handleRoleNotFoundException(RoleNotFoundException ex){
        ResponseMessage<Void> response=new ResponseMessage<>(RoleConstants.ROLE_NOT_FOUND, HttpStatus.NOT_FOUND.value());
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(MeetingNotFoundException.class)
    public ResponseEntity<ResponseMessage<Void>> handleRoleNotFoundException(MeetingNotFoundException ex){
        ResponseMessage<Void> response=new ResponseMessage<>(MeetingConstants.MEETING_NOT_FOUND, HttpStatus.NOT_FOUND.value());
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

}
