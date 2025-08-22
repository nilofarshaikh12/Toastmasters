package com.example.toastMasters.exceptions;

public class MemberDeleteFailedException extends RuntimeException{

    public MemberDeleteFailedException(String message){
        super(message);
    }
}
