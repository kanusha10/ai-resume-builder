
package com.anusha.resume_builder.auth.service;

import com.anusha.resume_builder.auth.dto.AuthResponse;
import com.anusha.resume_builder.auth.dto.ForgotPasswordRequest;
import com.anusha.resume_builder.auth.dto.LoginRequest;
import com.anusha.resume_builder.auth.dto.RegisterRequest;
import com.anusha.resume_builder.auth.entity.PasswordResetOtp;
import com.anusha.resume_builder.auth.entity.PendingRegistration;
import com.anusha.resume_builder.auth.entity.User;
import com.anusha.resume_builder.auth.repository.PasswordResetOtpRepository;
import com.anusha.resume_builder.auth.repository.PendingRegistrationRepository;
import com.anusha.resume_builder.auth.repository.UserRepository;
import com.anusha.resume_builder.auth.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AuthService {

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final PendingRegistrationRepository pendingRepository;
    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ResendEmailService resendEmailService;

    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            PendingRegistrationRepository pendingRepository,
            PasswordResetOtpRepository passwordResetOtpRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            ResendEmailService resendEmailService
    ) {
        this.userRepository = userRepository;
        this.pendingRepository = pendingRepository;
        this.passwordResetOtpRepository = passwordResetOtpRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.resendEmailService = resendEmailService;
    }

    // ---------------- REGISTRATION ----------------

    public void requestRegistrationOtp(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException(
                    "An account with this email already exists"
            );
        }

        String otp = generateOtp();

        PendingRegistration pending = pendingRepository
                .findByEmail(email)
                .orElseGet(PendingRegistration::new);

        pending.setEmail(email);
        pending.setName(request.getName().trim());
        pending.setPasswordHash(
                passwordEncoder.encode(request.getPassword())
        );
        pending.setOtpHash(passwordEncoder.encode(otp));
        pending.setExpiresAt(
                LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );
        pending.setAttempts(0);

        pendingRepository.save(pending);

        try {
            resendEmailService.sendOtpEmail(email, otp);
        } catch (RuntimeException exception) {
            pendingRepository.deleteByEmail(email);
            throw new IllegalStateException(
                    "Unable to send the verification email. Please try again."
            );
        }
    }

    @Transactional
    public AuthResponse verifyRegistrationOtp(
            String emailInput,
            String otp
    ) {
        String email = normalizeEmail(emailInput);

        PendingRegistration pending = pendingRepository
                .findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No pending registration found. Request a new OTP."
                ));

        if (!LocalDateTime.now().isBefore(pending.getExpiresAt())) {
            pendingRepository.deleteByEmail(email);
            throw new IllegalArgumentException(
                    "OTP has expired. Please request a new one."
            );
        }

        if (pending.getAttempts() >= MAX_OTP_ATTEMPTS) {
            pendingRepository.deleteByEmail(email);
            throw new IllegalArgumentException(
                    "Too many incorrect attempts. Please request a new OTP."
            );
        }

        if (!passwordEncoder.matches(otp, pending.getOtpHash())) {
            pending.setAttempts(pending.getAttempts() + 1);
            pendingRepository.save(pending);

            if (pending.getAttempts() >= MAX_OTP_ATTEMPTS) {
                pendingRepository.deleteByEmail(email);
                throw new IllegalArgumentException(
                        "Too many incorrect attempts. Please request a new OTP."
                );
            }

            throw new BadCredentialsException(
                    "Incorrect OTP. Please try again."
            );
        }

        if (userRepository.existsByEmail(email)) {
            pendingRepository.deleteByEmail(email);
            throw new IllegalArgumentException(
                    "An account with this email already exists"
            );
        }

        User user = new User();
        user.setName(pending.getName());
        user.setEmail(email);
        user.setPassword(pending.getPasswordHash());

        User savedUser = userRepository.save(user);
        pendingRepository.deleteByEmail(email);

        String token = jwtService.generateToken(savedUser.getEmail());

        return new AuthResponse(
                token,
                savedUser.getId(),
                savedUser.getName(),
                savedUser.getEmail()
        );
    }

    // ---------------- FORGOT PASSWORD ----------------

    public void requestPasswordResetOtp(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());

        // Do not reveal whether the account exists.
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            return;
        }

        String otp = generateOtp();

        PasswordResetOtp resetOtp = passwordResetOtpRepository
                .findByEmail(email)
                .orElseGet(PasswordResetOtp::new);

        resetOtp.setEmail(email);
        resetOtp.setOtpHash(passwordEncoder.encode(otp));
        resetOtp.setExpiresAt(
                LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );
        resetOtp.setAttempts(0);
        resetOtp.setVerified(false);

        passwordResetOtpRepository.save(resetOtp);

        try {
            resendEmailService.sendOtpEmail(email, otp);
        } catch (RuntimeException exception) {
            passwordResetOtpRepository.deleteByEmail(email);
            throw new IllegalStateException(
                    "Unable to send the password reset email. Please try again."
            );
        }
    }

    // Verify the OTP without changing the password.
    @Transactional(noRollbackFor = {
            BadCredentialsException.class,
            IllegalArgumentException.class
    })
    public void verifyPasswordResetOtp(String emailInput, String otp) {
        String email = normalizeEmail(emailInput);

        PasswordResetOtp resetOtp = passwordResetOtpRepository
                .findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid or expired reset code. Please request a new one."
                ));

        if (!LocalDateTime.now().isBefore(resetOtp.getExpiresAt())) {
            passwordResetOtpRepository.deleteByEmail(email);
            throw new IllegalArgumentException(
                    "Reset code has expired. Please request a new one."
            );
        }

        if (resetOtp.getAttempts() >= MAX_OTP_ATTEMPTS) {
            passwordResetOtpRepository.deleteByEmail(email);
            throw new IllegalArgumentException(
                    "Too many attempts. Please request a new reset code."
            );
        }

        if (!passwordEncoder.matches(otp, resetOtp.getOtpHash())) {
            resetOtp.setAttempts(resetOtp.getAttempts() + 1);
            passwordResetOtpRepository.save(resetOtp);

            if (resetOtp.getAttempts() >= MAX_OTP_ATTEMPTS) {
                passwordResetOtpRepository.deleteByEmail(email);
                throw new IllegalArgumentException(
                        "Too many attempts. Please request a new reset code."
                );
            }

            throw new BadCredentialsException(
                    "Incorrect reset code. Please try again."
            );
        }

        resetOtp.setVerified(true);
        passwordResetOtpRepository.save(resetOtp);
    }

    // Change the password only after successful OTP verification.
    @Transactional
    public void resetPassword(
            String emailInput,
            String otp,
            String newPassword
    ) {
        String email = normalizeEmail(emailInput);

        PasswordResetOtp resetOtp = passwordResetOtpRepository
                .findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid or expired reset code. Please request a new one."
                ));

        if (!LocalDateTime.now().isBefore(resetOtp.getExpiresAt())) {
            passwordResetOtpRepository.deleteByEmail(email);
            throw new IllegalArgumentException(
                    "Reset code has expired. Please request a new one."
            );
        }

        if (!resetOtp.isVerified()) {
            throw new IllegalArgumentException(
                    "Please verify your reset code before changing your password."
            );
        }

        // Also ensure the submitted code is the verified code.
        if (!passwordEncoder.matches(otp, resetOtp.getOtpHash())) {
            throw new BadCredentialsException(
                    "Invalid reset code. Please request a new one."
            );
        }

        if (resetOtp.getAttempts() >= MAX_OTP_ATTEMPTS) {
            passwordResetOtpRepository.deleteByEmail(email);
            throw new IllegalArgumentException(
                    "Too many attempts. Please request a new reset code."
            );
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid or expired reset code. Please request a new one."
                ));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // The code cannot be reused after a successful reset.
        passwordResetOtpRepository.deleteByEmail(email);
    }

    // ---------------- LOGIN ----------------

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException(
                        "Invalid email or password"
                ));

        if (!passwordEncoder.matches(
                request.getPassword(), user.getPassword()
        )) {
            throw new BadCredentialsException(
                    "Invalid email or password"
            );
        }

        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail()
        );
    }

    // ---------------- HELPERS ----------------

    private String generateOtp() {
        return String.format(
                "%06d", secureRandom.nextInt(1_000_000)
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
