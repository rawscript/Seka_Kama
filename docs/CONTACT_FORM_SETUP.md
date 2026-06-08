# Contact Form Email Forwarding Setup

The Seka Kama contact form now supports multiple email forwarding options. Choose one of these free, fail-proof solutions:

## Option 1: SendGrid (Recommended - 100 emails/day free)

1. Sign up for a free SendGrid account: https://signup.sendgrid.com/
2. Create an API key in SendGrid dashboard
3. Add to your environment variables:
   ```
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   EMAIL_FROM=noreply@seka-kama.io
   ```

## Option 2: SMTP (Gmail/Outlook/Other)

1. Use existing SMTP configuration:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   EMAIL_FROM=noreply@seka-kama.io
   ```

## Option 3: Webhook Automation (Most Flexible)

Use free automation services to forward emails:

### Using Zapier (100 tasks/month free):
1. Create a free Zapier account
2. Create a "Webhook by Zapier" trigger
3. Use the webhook URL in environment:
   ```
   CONTACT_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...
   ```
4. Add "Email by Zapier" action to send to `jasemwaura@gmail.com`

### Using n8n.io (Self-hosted, free):
1. Deploy n8n (can run locally or on free cloud)
2. Create webhook trigger
3. Add email node to send to `jasemwaura@gmail.com`

### Using Make.com (formerly Integromat - 1,000 ops/month free):
Similar to Zapier setup.

## Option 4: Supabase Edge Function (Advanced)

Create a Supabase Edge Function that sends emails:

1. Create `send-contact-email` edge function
2. Add email service (SendGrid, Resend, etc.)
3. Create database trigger to call the function

## Database Setup

The contact form submissions are stored in `contact_submissions` table with status tracking:
- `received` - Form submitted
- `email_sent` - Email sent successfully  
- `pending_email` - Email pending (no configuration)
- `email_failed` - Email sending failed
- `webhook_sent` - Forwarded via webhook

## How It Works

1. User submits contact form
2. Submission saved to database
3. System tries sending methods in order:
   - SendGrid API (if configured)
   - SMTP fallback (if configured)
   - Webhook fallback (if configured)
4. Status updated in database
5. User sees success message with lion GIF

## Testing

Test the contact form at: `/contact`

## Monitoring

Check contact submissions in database:
```sql
SELECT * FROM contact_submissions ORDER BY submitted_at DESC;
```

## Fail-Proof Design

The system is designed to be resilient:
- Multiple fallback methods
- Database logging for all submissions
- Email sending failures don't break form submission
- Status tracking for debugging