import { Resend } from "resend";

// Lazily initialized — only create when the API key is actually present
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = "CPTS Companion <noreply@learnnovice.com>";

// Send welcome email after signup
export async function sendWelcomeEmail(email: string, name: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[Email] Skipping welcome email (no RESEND_API_KEY)");
    return;
  }

  try {
    const resend = getResend()!;
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to CPTS Companion 🎯",
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #111927; color: #f8fafc; padding: 2rem; border-radius: 12px;">
          <h1 style="color: #9FEF00; margin-bottom: 1rem;">Welcome, ${name}! 🚀</h1>
          <p>You've just joined CPTS Companion — your study buddy for the Hack The Box CPTS certification.</p>
          <p>Here's what's waiting for you:</p>
          <ul style="line-height: 2;">
            <li>📚 <strong>30+ Modules</strong> covering every exam topic</li>
            <li>🎯 <strong>Interactive Exercises</strong> to test your skills</li>
            <li>🃏 <strong>Flashcards</strong> with spaced repetition</li>
            <li>🗺️ <strong>Mind Maps</strong> for visual learners</li>
            <li>📅 <strong>Study Plan</strong> — 30 days to exam-ready</li>
          </ul>
          <a href="https://cpts.learnnovice.com" style="display: inline-block; background: #9FEF00; color: #111927; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 1rem;">Start Studying →</a>
          <p style="color: #6b7280; margin-top: 2rem; font-size: 0.85rem;">This email was sent by CPTS Companion. Educational use only.</p>
        </div>
      `,
    });
    console.log(`[Email] Welcome email sent to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send welcome email:", err);
  }
}

// Send study nudge if user hasn't logged in for 2 days
export async function sendStudyNudge(email: string, name: string, dayNumber: number) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[Email] Skipping nudge email (no RESEND_API_KEY)");
    return;
  }

  try {
    const resend = getResend()!;
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Day ${dayNumber} is waiting for you 📖`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #111927; color: #f8fafc; padding: 2rem; border-radius: 12px;">
          <h2 style="color: #9FEF00;">Hey ${name}, don't break the streak! 🔥</h2>
          <p>You're on <strong>Day ${dayNumber}</strong> of your CPTS study plan. Keep the momentum going!</p>
          <p>Even 30 minutes today will move you closer to passing the exam.</p>
          <a href="https://cpts.learnnovice.com" style="display: inline-block; background: #9FEF00; color: #111927; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 1rem;">Continue Studying →</a>
          <p style="color: #6b7280; margin-top: 2rem; font-size: 0.85rem;">This email was sent by CPTS Companion. Reply to unsubscribe.</p>
        </div>
      `,
    });
    console.log(`[Email] Nudge sent to ${email}`);
  } catch (err) {
    console.error("[Email] Failed to send nudge email:", err);
  }
}
