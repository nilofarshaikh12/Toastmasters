package com.example.toastMasters.exceptions;

public class MemberUpdateFailedException extends RuntimeException {

    public MemberUpdateFailedException(String message) {
        super(message);
    }
}
