
package com.anusha.resume_builder.auth.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class ResendEmailService {

    private final JavaMailSender mailSender;
    private final String fromEmail;

    public ResendEmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String fromEmail) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
    }

    public void sendOtpEmail(String recipient, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(fromEmail);
            helper.setTo(recipient);
            helper.setSubject("Your Resume Builder Verification Code");

            String html = """
                    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
                        <h2>Email Verification</h2>
                        <p>Your Resume Builder verification code is:</p>
                        <h1 style="letter-spacing:6px">%s</h1>
                        <p>This code expires in 5 minutes.</p>
                        <p>If you did not request this code, you can ignore this email.</p>
                    </div>
                    """.formatted(otp);

            helper.setText(html, true);
            mailSender.send(message);

        } catch (MessagingException | org.springframework.mail.MailException e) {
            throw new IllegalStateException(
                    "Could not send the verification email. Please try again later.", e);
        }
    }
}
