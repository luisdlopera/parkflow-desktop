package com.parkflow.common.infrastructure.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {
  private final JavaMailSender mailSender;

  @Value("${app.mail.from:noreply@parkflow.local}")
  private String fromEmail;

  @Value("${app.mail.from-name:ParkFlow}")
  private String fromName;

  public void sendSimpleEmail(String to, String subject, String body) {
    try {
      SimpleMailMessage message = new SimpleMailMessage();
      message.setFrom(fromEmail);
      message.setTo(to);
      message.setSubject(subject);
      message.setText(body);
      mailSender.send(message);
      log.info("Simple email sent to {}", to);
    } catch (Exception e) {
      log.error("Failed to send simple email to {}: {}", to, e.getMessage());
      throw new EmailException("No se pudo enviar el correo", e);
    }
  }

  public void sendHtmlEmail(String to, String subject, String htmlBody) {
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
      helper.setFrom(fromEmail, fromName);
      helper.setTo(to);
      helper.setSubject(subject);
      helper.setText(htmlBody, true);
      mailSender.send(message);
      log.info("HTML email sent to {}", to);
    } catch (MessagingException | java.io.UnsupportedEncodingException e) {
      log.error("Failed to send HTML email to {}: {}", to, e.getMessage());
      throw new EmailException("No se pudo enviar el correo", e);
    }
  }

  public void sendPasswordResetEmail(String to, String resetLink) {
    String subject = "Restablecer contraseña - ParkFlow";
    String htmlBody = String.format(
        "<html><body>" +
            "<h2>Restablecer contraseña</h2>" +
            "<p>Haz clic en el enlace a continuación para restablecer tu contraseña:</p>" +
            "<p><a href=\"%s\" style=\"display: inline-block; padding: 10px 20px; background-color: #D97757; color: white; text-decoration: none; border-radius: 5px;\">Restablecer contraseña</a></p>" +
            "<p>O copia este enlace en tu navegador:</p>" +
            "<p><code>%s</code></p>" +
            "<p>Este enlace expirará en 1 hora.</p>" +
            "<p>Si no solicitaste un restablecimiento de contraseña, ignora este correo.</p>" +
            "<hr>" +
            "<p><small>© 2026 ParkFlow Operations</small></p>" +
            "</body></html>",
        resetLink, resetLink);
    sendHtmlEmail(to, subject, htmlBody);
  }

  public static class EmailException extends RuntimeException {
    public EmailException(String message, Throwable cause) {
      super(message, cause);
    }

    public EmailException(String message) {
      super(message);
    }
  }
}
