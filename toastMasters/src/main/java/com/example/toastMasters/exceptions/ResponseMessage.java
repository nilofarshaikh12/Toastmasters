package com.example.toastMasters.exceptions;

import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResponseMessage<T> {

    private String message;
    private int status;
    private LocalDateTime timestamp;
    private T data;

    public ResponseMessage(String message, int status, T data) {
        this.message = message;
        this.status = status;
        this.data = data;
        this.timestamp = LocalDateTime.now();
    }

    public ResponseMessage(String message, int status) {
        this(message, status, null);
    }

}
