package com.example.toastMasters.exceptions;

public class MeetingNotFoundException extends RuntimeException{
    public MeetingNotFoundException(String message){
        super(message);
    }
}
