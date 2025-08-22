package com.example.toastMasters.dto;


import com.example.toastMasters.validators.Adult;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MemberRequestDTO {

    @NotBlank(message = "Member name is required")
    private String memberName;

    @Email(message = "Invalid email format")
    @Pattern(
            regexp = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$",
            message = "Email must be a valid format like user@example.com"
    )
    @NotBlank(message = "Email is required")
    private String email;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Contact must be a valid 10-digit Indian mobile number")
    @NotBlank(message = "Contact number is required")
    private String contact;

    private String address;

    @Pattern(regexp = "Male|Female|Other", flags = Pattern.Flag.CASE_INSENSITIVE,
            message = "Gender must be Male, Female, or Other")
    private String gender;

    @Adult(message = "Member must be at least 18 years old")
    @NotNull(message = "Date of birth is required")
    private LocalDate dob;

    @NotNull(message = "Joining date is required")
    private LocalDate joiningDate;

    private String hobbies;

    private String role;

    private String password;

    @PositiveOrZero(message = "Mentor ID must be 0 or a positive number")
    private Integer mentorId;
}
