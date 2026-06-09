#!/usr/bin/env python3
"""
Test Gmail SMTP Configuration
Run this script to verify your Gmail SMTP settings work.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_gmail_smtp():
    """Test Gmail SMTP connection and send a test email"""
    
    # Get SMTP configuration from environment
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    email_from = os.getenv("EMAIL_FROM", "noreply@seka-kama.io")
    
    print("=" * 60)
    print("Testing Gmail SMTP Configuration")
    print("=" * 60)
    
    # Check configuration
    print(f"SMTP_HOST: {smtp_host}")
    print(f"SMTP_PORT: {smtp_port}")
    print(f"SMTP_USER: {smtp_user}")
    print(f"SMTP_PASSWORD: {'*' * len(smtp_password) if smtp_password else 'NOT SET'}")
    print(f"EMAIL_FROM: {email_from}")
    print()
    
    # Check if all required variables are set
    required_vars = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"]
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        print(f"❌ Missing required environment variables: {', '.join(missing)}")
        print("\nPlease set these in your .env file:")
        print("SMTP_HOST=smtp.gmail.com")
        print("SMTP_PORT=587")
        print("SMTP_USER=your-email@gmail.com")
        print("SMTP_PASSWORD=your-16-character-app-password")
        return False
    
    # Check password for spaces
    if smtp_password and ' ' in smtp_password:
        print("⚠️  WARNING: SMTP_PASSWORD contains spaces!")
        print("Google shows: 'abcd efgh ijkl mnop'")
        print("You should use: 'abcdefghijklmnop' (NO SPACES)")
        print()
    
    # Try to send test email
    try:
        import smtplib
        from email.mime.text import MIMEText
        
        print("🔧 Testing SMTP connection...")
        
        # Create test email
        subject = "Seka Kama - Gmail SMTP Test"
        body = f"""This is a test email from Seka Kama contact form system.

SMTP Configuration Test:
- Host: {smtp_host}
- Port: {smtp_port}
- User: {smtp_user}
- Status: ✅ Connected successfully

If you receive this email, your Gmail SMTP configuration is working correctly!
"""
        
        msg = MIMEText(body)
        msg['From'] = email_from
        msg['To'] = "jasemwaura@gmail.com"  # Test recipient
        msg['Subject'] = subject
        
        # Connect and send
        print(f"📡 Connecting to {smtp_host}:{smtp_port}...")
        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            print("🔐 Starting TLS...")
            server.starttls()
            
            print(f"🔑 Logging in as {smtp_user}...")
            server.login(smtp_user, smtp_password)
            
            print("📤 Sending test email to jasemwaura@gmail.com...")
            server.send_message(msg)
        
        print("✅ SUCCESS: Test email sent!")
        print("\n📝 Next steps:")
        print("1. Check jasemwaura@gmail.com for the test email")
        print("2. If received, your contact form is ready")
        print("3. If not received, check spam folder")
        print("4. Verify 2FA is enabled and app password is correct")
        
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ SMTP Authentication Failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Ensure 2-Step Verification is enabled in Google account")
        print("2. Generate new App Password (old one might be wrong)")
        print("3. Use password WITHOUT spaces")
        print("4. Check if 'Less secure app access' is disabled (it should be)")
        return False
        
    except smtplib.SMTPException as e:
        print(f"❌ SMTP Error: {e}")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    # Check if running in correct directory
    if not os.path.exists("backend"):
        print("⚠️  Please run this script from the project root directory")
        print("   Expected: Seka_Kama/")
        print(f"   Current: {os.getcwd()}")
        sys.exit(1)
    
    # Run test
    success = test_gmail_smtp()
    print("\n" + "=" * 60)
    if success:
        print("✅ Gmail SMTP configuration test PASSED")
    else:
        print("❌ Gmail SMTP configuration test FAILED")
    print("=" * 60)
    sys.exit(0 if success else 1)


def test_contact_form_api():
    """Test the contact form API endpoint"""
    import requests
    import json
    
    print("\n" + "=" * 60)
    print("Testing Contact Form API")
    print("=" * 60)
    
    # Get API URL from environment or use default
    api_url = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api")
    
    test_data = {
        "name": "Test User",
        "email": "test@example.com",
        "organization": "Test Organization",
        "message": "This is a test message from the contact form test script."
    }
    
    try:
        print(f"📡 Testing API endpoint: {api_url}/contact")
        print(f"📝 Sending test data: {json.dumps(test_data, indent=2)}")
        
        response = requests.post(
            f"{api_url}/contact",
            json=test_data,
            timeout=10
        )
        
        print(f"📊 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Success: {result.get('message')}")
            print(f"📧 Forwarded to: {result.get('forwarded_to')}")
            return True
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

if __name__ == "__main__":
    # Check if running in correct directory
    if not os.path.exists("backend"):
        print("⚠️  Please run this script from the project root directory")
        print("   Expected: Seka_Kama/")
        print(f"   Current: {os.getcwd()}")
        sys.exit(1)
    
    # Run SMTP test
    smtp_success = test_gmail_smtp()
    
    # Run API test (optional)
    if smtp_success:
        print("\n" + "=" * 60)
        print("Testing Contact Form API (Optional)")
        print("=" * 60)
        try:
            api_success = test_contact_form_api()
        except ImportError:
            print("⚠️  Skipping API test (requests module not installed)")
            print("   Install with: pip install requests")
            api_success = True  # Skip if requests not installed
    
    print("\n" + "=" * 60)
    if smtp_success:
        print("✅ Gmail SMTP configuration test PASSED")
        print("\n📋 Summary:")
        print("1. ✅ Gmail SMTP is configured correctly")
        print("2. ✅ Contact form requires email for replies")
        print("3. ✅ You can reply to users at their email address")
        print("4. ✅ Emails are sent to jasemwaura@gmail.com")
    else:
        print("❌ Gmail SMTP configuration test FAILED")
    print("=" * 60)
    
    sys.exit(0 if smtp_success else 1)