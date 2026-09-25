import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { currentEmail, newEmail, otp, restaurantName, purpose } = await req.json();

    if (!currentEmail || !otp) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (currentEmail, otp)" },
        { status: 400 }
      );
    }

    const isPasswordReset = purpose === "PASSWORD_RESET";

    const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT || 465);

    if (!gmailUser || !gmailPass) {
      // SMTP not configured yet in environment
      return NextResponse.json({
        success: false,
        configured: false,
        message:
          "Gmail SMTP credentials not set in .env.local. Please set GMAIL_USER and GMAIL_APP_PASSWORD to send real emails to your Gmail inbox.",
      });
    }

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const business = restaurantName || "Orderly Restaurant OS";
    const brandSender = `"Orderly Security" <${gmailUser}>`;

    const titleText = isPasswordReset ? "Reset Your Account Password" : "Verify Login Email Change";
    const bodyText = isPasswordReset
      ? `We received a request to reset the login password for your Orderly account. To choose a new password, please enter the following single-use verification code:`
      : `We received a request to change the primary login email address for your Orderly account ${newEmail ? `to <strong style="color: #ffffff;">${newEmail}</strong>` : ""}. To ensure security, please enter the following single-use verification code in your dashboard:`;
    const subjectText = isPasswordReset
      ? `Orderly Security Code: ${otp} (Reset Password)`
      : `Orderly Security Code: ${otp} (Verify Email Change)`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${titleText}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f17; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #111827; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 36px 20px 36px; border-bottom: 1px solid #1f2937; text-align: center;">
                    <div style="display: inline-block; padding: 8px 18px; border-radius: 9999px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3);">
                      <span style="font-size: 13px; font-weight: 800; letter-spacing: 0.15em; color: #818cf8; text-transform: uppercase;">
                        ORDERLY • SECURITY OS
                      </span>
                    </div>
                    <h1 style="margin: 18px 0 6px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
                      ${titleText}
                    </h1>
                    <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                      Account: <strong style="color: #e2e8f0;">${currentEmail}</strong>
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px 36px; text-align: center;">
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1; text-align: left;">
                      Hello ${business} Team,<br><br>
                      ${bodyText}
                    </p>

                    <!-- OTP Block -->
                    <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1)); border: 1px solid #4f46e5; border-radius: 12px; padding: 22px 16px; margin: 26px 0;">
                      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; color: #a5b4fc; text-transform: uppercase; margin-bottom: 8px;">
                        One-Time Verification Code
                      </div>
                      <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 0.28em; color: #ffffff; padding-left: 0.28em;">
                        ${otp}
                      </div>
                      <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                        Valid for 10 minutes • Do not share this code with anyone
                      </div>
                    </div>

                    <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: left;">
                      If you did not initiate this request, someone may be attempting to access your restaurant dashboard. Please contact support or ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 36px; background-color: #0b0f17; border-top: 1px solid #1f2937; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #475569;">
                      Orderly Restaurant Operating System • Automated Security Dispatch<br>
                      Sent to ${currentEmail}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send mail
    const info = await transporter.sendMail({
      from: brandSender,
      to: currentEmail,
      subject: subjectText,
      text: `${subjectText}. Your code is: ${otp}. Valid for 10 minutes.`,
      html: htmlContent,
    });

    console.log(`[Orderly Email] Dispatched OTP to ${currentEmail}. MessageId: ${info.messageId}`);

    return NextResponse.json({
      success: true,
      configured: true,
      deliveredTo: currentEmail,
      messageId: info.messageId,
    });
  } catch (err: any) {
    console.error("[Orderly Email] Error sending OTP:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to send email via SMTP",
      },
      { status: 500 }
    );
  }
}
