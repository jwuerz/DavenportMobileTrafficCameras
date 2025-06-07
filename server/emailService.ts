import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set. Email notifications will be disabled.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface ScrapedLocation {
  address: string;
  type: string;
  description: string;
  schedule: string;
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`Email would be sent to ${params.to}: ${params.subject}`);
    return true; // Return true for development/testing without API key
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendCameraUpdateNotification(
  userEmail: string, 
  locations: ScrapedLocation[]
): Promise<boolean> {
  const fromEmail = process.env.FROM_EMAIL || 'notifications@davenportcameraalerts.com';
  
  const subject = `Davenport Camera Locations Updated - ${locations.length} Locations This Week`;
  
  const textContent = generateTextEmailContent(locations);
  const htmlContent = generateHtmlEmailContent(locations);

  return await sendEmail({
    to: userEmail,
    from: fromEmail,
    subject,
    text: textContent,
    html: htmlContent,
  });
}

function generateTextEmailContent(locations: ScrapedLocation[]): string {
  const content = `
Davenport Traffic Camera Location Update

The mobile traffic camera locations have been updated on the City of Davenport website. Here are the current locations for this week:

${locations.map((location, index) => `
${index + 1}. ${location.address}
   Type: ${location.type.replace('_', ' ').toUpperCase()}
   Description: ${location.description}
   Schedule: ${location.schedule}
`).join('\n')}

Important Reminders:
- Always drive safely and obey posted speed limits
- Camera locations and schedules may change without notice
- For the most up-to-date information, visit the official city website

Official Source: https://www.davenportiowa.com/government/departments/police/automated_traffic_enforcement

You are receiving this notification because you subscribed to Davenport Camera Alerts. To manage your subscription or unsubscribe, visit our website.

Drive safely!
Davenport Camera Alerts Team

---
This is an automated notification from an unofficial community service. We are not affiliated with the City of Davenport.
`;

  return content.trim();
}

function generateHtmlEmailContent(locations: ScrapedLocation[]): string {
  const locationRows = locations.map((location, index) => {
    const typeColor = getTypeColor(location.type);
    const typeBadge = getTypeLabel(location.type);
    
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 16px 8px; text-align: center; font-weight: 600; color: #374151;">
          ${index + 1}
        </td>
        <td style="padding: 16px 8px;">
          <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">
            ${location.address}
          </div>
          <div style="color: #6b7280; font-size: 14px;">
            ${location.description}
          </div>
        </td>
        <td style="padding: 16px 8px; text-align: center;">
          <span style="background-color: ${typeColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
            ${typeBadge}
          </span>
        </td>
        <td style="padding: 16px 8px; color: #6b7280; font-size: 14px;">
          ${location.schedule}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Davenport Camera Locations Updated</title>
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
      <svg width="24" height="24" style="margin-right: 8px;" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23 4v2c0 .55-.45 1-1 1h-2v2c0 .55-.45 1-1 1s-1-.45-1-1V7h-2c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1h2V1c0-.55.45-1 1-1s1 .45 1 1v2h2c.55 0 1 .45 1 1zM9 12c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/>
      </svg>
      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Davenport Camera Alerts</h1>
    </div>
    <p style="margin: 0; font-size: 16px; opacity: 0.9;">Traffic Camera Locations Updated</p>
  </div>

  <!-- Content -->
  <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Alert Banner -->
    <div style="background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="display: flex; align-items: flex-start;">
        <div style="background-color: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; margin-top: 2px;">
          <span style="font-size: 12px; font-weight: bold;">!</span>
        </div>
        <div>
          <p style="margin: 0; font-weight: 600; color: #1e40af; margin-bottom: 4px;">Location Update Alert</p>
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            The mobile traffic camera locations have been updated on the City of Davenport website. 
            Here are the <strong>${locations.length} locations</strong> for this week:
          </p>
        </div>
      </div>
    </div>

    <!-- Locations Table -->
    <div style="margin-bottom: 24px; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">#</th>
            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Location</th>
            <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Type</th>
            <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Schedule</th>
          </tr>
        </thead>
        <tbody>
          ${locationRows}
        </tbody>
      </table>
    </div>

    <!-- Safety Reminder -->
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 16px; font-weight: 600;">
        🚗 Safety Reminder
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #92400e;">
        <li>Always drive safely and obey posted speed limits</li>
        <li>Camera locations and schedules may change without notice</li>
        <li>For the most up-to-date information, visit the official city website</li>
      </ul>
    </div>

    <!-- CTA Buttons -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="https://www.davenportiowa.com/government/departments/police/automated_traffic_enforcement" 
         style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 8px; display: inline-block;">
        View Official Website
      </a>
      <a href="#manage-subscription" 
         style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Manage Subscription
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        You are receiving this notification because you subscribed to Davenport Camera Alerts.
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        This is an automated notification from an unofficial community service. We are not affiliated with the City of Davenport.
      </p>
    </div>

  </div>

</body>
</html>
  `;
}

function getTypeColor(type: string): string {
  switch (type) {
    case "red_light":
      return "#dc2626"; // red-600
    case "fixed":
      return "#16a34a"; // green-600
    case "mobile":
    default:
      return "#ea580c"; // orange-600
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "red_light":
      return "Red Light";
    case "fixed":
      return "Fixed";
    case "mobile":
    default:
      return "Mobile";
  }
}

export async function sendTestNotification(userEmail: string): Promise<boolean> {
  const testLocations: ScrapedLocation[] = [
    {
      address: "53rd & Eastern Ave",
      type: "mobile",
      description: "Speed enforcement zone",
      schedule: "Mon-Fri, 7am-6pm"
    },
    {
      address: "Locust St & Brady St", 
      type: "red_light",
      description: "Intersection monitoring",
      schedule: "24/7"
    }
  ];

  return await sendCameraUpdateNotification(userEmail, testLocations);
}

export async function sendWelcomeEmail(userEmail: string): Promise<boolean> {
  const fromEmail = process.env.FROM_EMAIL || 'notifications@davenportcameraalerts.com';
  
  const subject = "Welcome to Davenport Camera Alerts!";
  
  const textContent = `
Welcome to Davenport Camera Alerts!

Thank you for subscribing to our camera location notification service. You will now receive email alerts whenever the mobile traffic camera locations change on the City of Davenport website.

What to expect:
- Notifications within 30 minutes of location changes
- Weekly updates every Monday (typical schedule)
- Emergency alerts for unexpected changes

Our service monitors the official city website at:
https://www.davenportiowa.com/government/departments/police/automated_traffic_enforcement

To manage your subscription preferences or unsubscribe at any time, visit our website.

Drive safely!
Davenport Camera Alerts Team

---
This is an automated notification from an unofficial community service. We are not affiliated with the City of Davenport.
`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Davenport Camera Alerts</title>
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 32px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700;">Welcome to Davenport Camera Alerts!</h1>
    <p style="margin: 0; font-size: 18px; opacity: 0.9;">Your subscription is now active</p>
  </div>

  <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #065f46; font-weight: 600;">
        ✅ Subscription Confirmed! You will now receive email alerts whenever mobile traffic camera locations change.
      </p>
    </div>

    <h3 style="color: #374151; margin-bottom: 16px;">What to expect:</h3>
    <ul style="color: #6b7280; margin-bottom: 24px;">
      <li>Notifications within 30 minutes of location changes</li>
      <li>Weekly updates every Monday (typical schedule)</li>
      <li>Emergency alerts for unexpected changes</li>
    </ul>

    <p style="color: #6b7280; margin-bottom: 24px;">
      Our service monitors the official city website to keep you informed about camera locations and help you drive safely.
    </p>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="https://www.davenportiowa.com/government/departments/police/automated_traffic_enforcement" 
         style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        View Current Locations
      </a>
    </div>

    <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Drive safely and thank you for using Davenport Camera Alerts!
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        This is an unofficial community service. We are not affiliated with the City of Davenport.
      </p>
    </div>

  </div>

</body>
</html>
  `;

  return await sendEmail({
    to: userEmail,
    from: fromEmail,
    subject,
    text: textContent,
    html: htmlContent,
  });
}
