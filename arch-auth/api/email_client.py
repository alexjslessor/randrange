import smtplib
from email.message import EmailMessage
from typing import Optional


class EmailClient:
    """Simple SMTP email sender for signup notifications."""

    def __init__(self, host: str, sender: str, port: int = 25, timeout: float = 10.0) -> None:
        self.host = host
        self.port = port
        self.sender = sender
        self.timeout = timeout
        self._smtp: Optional[smtplib.SMTP] = None

    def _get_connection(self) -> smtplib.SMTP:
        if self._smtp is None:
            self._smtp = smtplib.SMTP(self.host, self.port, timeout=self.timeout)
        return self._smtp

    def send_signup_email(
        self, 
        user_email: str, 
        subject: str, 
        body: str,
    ):
        msg = EmailMessage()
        msg["From"] = self.sender
        msg["To"] = user_email
        msg["Subject"] = subject
        msg.set_content(body)

        try:
            self._get_connection().send_message(msg)
        except smtplib.SMTPServerDisconnected:
            self.close()
            self._get_connection().send_message(msg)

    def close(self) -> None:
        if self._smtp is not None:
            try:
                self._smtp.quit()
            finally:
                self._smtp = None

