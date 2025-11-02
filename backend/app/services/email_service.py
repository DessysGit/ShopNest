"""
Email Service for ShopNest

Handles all email sending functionality using SMTP.
Uses Jinja2 for HTML templates and aiosmtplib for async email sending.

For Development/Testing: Uses Mailtrap.io (fake SMTP server)
For Production: Can use SendGrid, Mailgun, AWS SES, or any SMTP server
"""

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path
from app.config import settings
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Set up Jinja2 template environment
template_dir = Path(__file__).parent.parent / "templates" / "emails"
template_env = Environment(
    loader=FileSystemLoader(str(template_dir)),
    autoescape=select_autoescape(['html', 'xml'])
)


class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.mail_from = settings.MAIL_FROM
        self.mail_from_name = settings.MAIL_FROM_NAME
        self.frontend_url = settings.FRONTEND_URL
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str = None
    ):
        """
        Send an email
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of email
            text_content: Plain text content (optional, falls back to html)
        """
        
        # Skip if SMTP not configured
        if not self.smtp_user or not self.smtp_password:
            logger.warning(f"SMTP not configured. Would send email to {to_email}: {subject}")
            logger.info(f"Email content: {html_content[:200]}...")
            return False
        
        try:
            # Create message
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = f"{self.mail_from_name} <{self.mail_from}>"
            message['To'] = to_email
            
            # Add text part
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                message.attach(text_part)
            
            # Add HTML part
            html_part = MIMEText(html_content, 'html')
            message.attach(html_part)
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True
            )
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_password_reset_email(self, to_email: str, reset_token: str, user_name: str = None):
        """
        Send password reset email with reset link
        
        Args:
            to_email: User's email address
            reset_token: Password reset token
            user_name: User's name (optional)
        """
        
        # Generate reset link
        reset_link = f"{self.frontend_url}/reset-password?token={reset_token}"
        
        # Load template
        template = template_env.get_template('password_reset.html')
        
        # Render HTML
        html_content = template.render(
            reset_link=reset_link,
            user_name=user_name or "there",
            company_name=self.mail_from_name,
            support_email=self.mail_from
        )
        
        # Send email
        await self.send_email(
            to_email=to_email,
            subject="Reset Your Password - ShopNest",
            html_content=html_content
        )
    
    async def send_welcome_email(self, to_email: str, user_name: str):
        """Send welcome email to new users"""
        
        template = template_env.get_template('welcome.html')
        
        html_content = template.render(
            user_name=user_name,
            company_name=self.mail_from_name,
            login_link=f"{self.frontend_url}/login"
        )
        
        await self.send_email(
            to_email=to_email,
            subject="Welcome to ShopNest! 🎉",
            html_content=html_content
        )
    
    async def send_order_confirmation_email(self, to_email: str, order_data: dict):
        """Send order confirmation email to buyer"""
        
        template = template_env.get_template('order_confirmation.html')
        
        html_content = template.render(
            buyer_name=order_data.get('buyer_name', 'Customer'),
            order_number=order_data['order_number'],
            order_date=order_data.get('order_date', ''),
            payment_method=order_data.get('payment_method', 'Card'),
            items=order_data['items'],
            subtotal=order_data['subtotal'],
            shipping=order_data.get('shipping', 0),
            tax=order_data.get('tax', 0),
            total=order_data['total'],
            shipping_address=order_data['shipping_address'],
            order_link=f"{self.frontend_url}/orders/{order_data['id']}",
            frontend_url=self.frontend_url,
            company_name=self.mail_from_name,
            support_email=self.mail_from
        )
        
        await self.send_email(
            to_email=to_email,
            subject=f"Order Confirmation - {order_data['order_number']}",
            html_content=html_content
        )
    
    async def send_seller_new_order_email(self, to_email: str, seller_name: str, order_data: dict):
        """Send new order notification to seller"""
        
        template = template_env.get_template('seller_new_order.html')
        
        # Calculate total earnings for this seller
        total_earnings = sum(item['seller_earning'] for item in order_data['items'])
        
        html_content = template.render(
            seller_name=seller_name,
            order_number=order_data['order_number'],
            order_date=order_data.get('order_date', ''),
            customer_name=order_data.get('customer_name', 'Customer'),
            items=order_data['items'],
            total_earnings=total_earnings,
            shipping_address=order_data['shipping_address'],
            seller_dashboard=f"{self.frontend_url}/seller/orders",
            company_name=self.mail_from_name
        )
        
        await self.send_email(
            to_email=to_email,
            subject=f"New Order Received - {order_data['order_number']}",
            html_content=html_content
        )
    
    async def send_order_status_update_email(
        self, 
        to_email: str, 
        customer_name: str,
        order_number: str,
        order_id: str,
        new_status: str,
        tracking_number: str = None
    ):
        """Send order status update email to customer"""
        
        template = template_env.get_template('order_status_update.html')
        
        html_content = template.render(
            customer_name=customer_name,
            order_number=order_number,
            new_status=new_status,
            tracking_number=tracking_number,
            order_link=f"{self.frontend_url}/orders/{order_id}",
            review_link=f"{self.frontend_url}/orders/{order_id}/review" if new_status == 'delivered' else None,
            company_name=self.mail_from_name,
            support_email=self.mail_from
        )
        
        status_titles = {
            'confirmed': 'Order Confirmed',
            'processing': 'Order Processing',
            'shipped': 'Order Shipped',
            'delivered': 'Order Delivered'
        }
        
        subject = f"{status_titles.get(new_status, 'Order Update')} - {order_number}"
        
        await self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content
        )


# Create singleton instance
email_service = EmailService()
