
package com.anusha.resume_builder.auth.controller;

import com.anusha.resume_builder.auth.dto.AuthResponse;
import com.anusha.resume_builder.auth.dto.LoginRequest;
import com.anusha.resume_builder.auth.dto.RegisterRequest;
import com.anusha.resume_builder.auth.dto.VerifyOtpRequest;
import com.anusha.resume_builder.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.anusha.resume_builder.auth.dto.ForgotPasswordRequest;
import com.anusha.resume_builder.auth.dto.ResetPasswordRequest;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register/request-otp")
    public ResponseEntity<Map<String, String>> requestOtp(
            @Valid @RequestBody RegisterRequest request
    ) {
        authService.requestRegistrationOtp(request);

        return ResponseEntity.ok(Map.of(
                "message",
                "Verification code sent. Please check your email."
        ));
    }

    @PostMapping("/register/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request
    ) {
        AuthResponse response = authService.verifyRegistrationOtp(
                request.getEmail(),
                request.getOtp()
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(authService.login(request));
    }


    @PostMapping("/forgot-password/request-otp")
    public ResponseEntity<Map<String, String>> requestPasswordResetOtp(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        authService.requestPasswordResetOtp(request);

        return ResponseEntity.ok(Map.of(
                "message",
                "If an account exists for this email, a reset code will be sent."
        ));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        authService.resetPassword(
                request.getEmail(),
                request.getOtp(),
                request.getNewPassword()
        );

        return ResponseEntity.ok(Map.of(
                "message",
                "Password reset successfully. Please log in with your new password."
        ));
    }


    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<Map<String, String>> verifyPasswordResetOtp(
            @Valid @RequestBody VerifyOtpRequest request
    ) {
        authService.verifyPasswordResetOtp(
                request.getEmail(),
                request.getOtp()
        );

        return ResponseEntity.ok(Map.of(
                "message",
                "Email verified successfully. You can now reset your password."
        ));
    }


}
