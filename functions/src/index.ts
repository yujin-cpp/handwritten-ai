import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as nodemailer from "nodemailer";

// pdf-parse MUST be required (CommonJS)
const pdfParse = require("pdf-parse");

// Initialize Firebase Admin once
admin.initializeApp();

// =========================================================
// 1️⃣ EXISTING PDF PROCESSOR (FIXED)
// =========================================================
export const processMasterlist = onObjectFinalized(
  { cpu: 2 },
  async (event) => {
    console.log("🔥 TRIGGERED", event.data.bucket, event.data.name);
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Validate file
    if (
      !filePath ||
      !filePath.startsWith("masterlists/") ||
      !contentType?.startsWith("application/pdf")
    ) {
      logger.info("File is not a masterlist PDF.");
      return;
    }

    const parts = filePath.split("/");
    if (parts.length < 4) {
      logger.error("Invalid file path structure:", filePath);
      return;
    }

    const professorId = parts[1];
    const classId = parts[2];

    const bucket = admin.storage().bucket(fileBucket);

    try {
      const [buffer] = await bucket.file(filePath).download();
      const pdfData = await pdfParse(buffer);
      const text: string = pdfData.text || "";
      const lines = text.split("\n");

      const students: Record<string, any> = {};

      for (const rawLine of lines) {
        let line = rawLine.trim();
        if (!line) continue;

        // Find Student ID anywhere
        const idMatch = line.match(/TUPM-\d{2}-\d{4}/i);
        if (!idMatch) continue;

        const studentId = idMatch[0];

        // Remove numbering (1., 28.)
        line = line.replace(/^\d+[\.\)]?\s*/, "");

        // Remove Student ID from line
        line = line.replace(studentId, "");

        // Remove course code (BSCS etc)
        line = line.replace(
          /(BSCS|BSIT|BSECE|BIT|BET|BSEE|BSME|BSCE|BSA|BSBA|BSTM|BSHM|BSENT).*$/i,
          ""
        );

        // Cleanup commas & spacing
        let name = line
          .replace(/\s+/g, " ")
          .replace(/\s*,\s*/g, ", ")
          .replace(/^,/, "")
          .replace(/,$/, "")
          .trim();

        if (name.length < 4) continue;

        students[studentId] = {
          studentId,
          name,
          addedAt: new Date().toISOString(),
        };
      }

      const studentCount = Object.keys(students).length;
      logger.info(`Parsed ${studentCount} students from PDF.`);

      if (studentCount > 0) {
        const dbRef = admin
          .database()
          .ref(`professors/${professorId}/classes/${classId}/students`);

        await dbRef.update(students);
        logger.info(`Successfully added ${studentCount} students for class ${classId}.`);
      } else {
        logger.warn("No students found in PDF parsing.");
      }
    } catch (error) {
      logger.error("Error processing masterlist:", error);
    }
  }
);

// =========================================================
// 🧩 EMAIL TEMPLATES
// =========================================================
const LOGO_URL = "https://i.imgur.com/WALs5KS.png";

const getPasswordResetHtml = (otp: string) => `
<table cellpadding="0" cellspacing="0" role="presentation" style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 16px; max-width: 600px; margin: 0 auto; width: 100%;">
  <tbody>
    <tr>
      <td style="padding: 48px 48px 16px; text-align: left; vertical-align: middle;">
        <img src="${LOGO_URL}" alt="Handwritten AI" width="30" style="display: inline-block; vertical-align: middle; border: 0;">
        <span style="color: #0EA47A; font-size: 24px; font-weight: bold; display: inline-block; vertical-align: middle; margin-left: 12px;">
            Handwritten AI
        </span>
      </td>
    </tr>
    <tr>
      <td>
        <table cellpadding="0" cellspacing="0" role="presentation" style="width: 100%;">
          <tbody>
            <tr>
              <td style="padding: 0 48px;">
                <h1 style="font-size: 1.5rem; color: #333; text-align: left;">🔐 Reset your Password</h1>
                <p style="margin-bottom: 24px; color: #555;">We received a request to reset the password for your Handwritten AI account.</p>
                <p style="margin-bottom: 24px; color: #555;">
                    Use the code below to complete the process. This code expires in <strong>10 minutes</strong>.
                </p>
                <div style="margin-bottom: 24px; text-align: center;">
                  <div style="display: inline-block; border-radius: 8px; background-color: #DCFCE7; padding: 15px 30px; border: 1px solid #0EA47A;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0EA47A; display: block;">${otp}</span>
                  </div>
                </div>
                <p style="margin-bottom: 16px; margin-top: 24px; color: #555;">
                    If you didn't request a password reset, you can safely ignore this email. Your password will not change.
                </p>
                <p style="margin-bottom: 16px; color: #555;">
                    Happy teaching,<br>
                    The Handwritten AI Team
                </p>
              </td>
            </tr>
          </tbody>
        </table>
        <table cellpadding="0" cellspacing="0" role="presentation" style="width: 100%;">
          <tbody>
             <tr><td style="padding: 24px 48px;"><hr style="border: 0; height: 1px; background-color: #d7dbdf;"></td></tr>
             <tr><td style="padding: 0 48px 32px; color: #9ca3af; font-size: 12px; text-align: center;"><p>Handwritten AI System • 2026</p></td></tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
`;

const getVerifyEmailHtml = (otp: string) => `
<table cellpadding="0" cellspacing="0" role="presentation" style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 16px; letter-spacing: -0.176px; max-width: 600px; margin: 0 auto; width: 100%;">
    <tbody>
        <tr>
            <td style="padding: 48px 48px 16px; text-align: left; vertical-align: middle;">
                <img src="${LOGO_URL}" alt="Handwritten AI" width="30" style="display: inline-block; vertical-align: middle; border: 0;">
                <span style="color: #0EA47A; font-size: 24px; font-weight: bold; display: inline-block; vertical-align: middle; margin-left: 12px;">
                    Handwritten AI
                </span>
            </td>
        </tr>
        <tr>
            <td>
                <table cellpadding="0" cellspacing="0" role="presentation" style="width: 100%;">
                    <tbody>
                        <tr>
                            <td style="padding: 0 48px;">
                                <h1 style="font-size: 1.875rem; line-height: 2.25rem; color: #333;">
                                    📬 Verify secondary email
                                </h1>
                                <p style="margin-bottom: 24px; color: #555;">
                                    Thanks for adding a personal email to your profile. This helps us ensure you can recover your account if you lose access to your university email.
                                </p>
                                <p style="margin-bottom: 24px; color: #555;">
                                    Please enter the following verification code in the app:
                                </p>
                                
                                <div style="margin-bottom: 24px; text-align: center;">
                                    <div style="display: inline-block; border-radius: 8px; background-color: #DCFCE7; padding: 20px 40px; text-align: center; border: 1px solid #0EA47A;">
                                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0EA47A; display: block;">${otp}</span>
                                    </div>
                                </div>

                                <p style="margin-bottom: 16px; margin-top: 24px; color: #555;">
                                    This code will expire in 10 minutes. If you did not add this email address, please check your account security settings immediately.
                                </p>
                                <p style="margin-bottom: 16px; color: #555;">
                                    Regards,<br>
                                    The Handwritten AI Team
                                </p>
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                <table cellpadding="0" cellspacing="0" role="presentation" style="width: 100%;">
                    <tbody>
                        <tr>
                            <td style="padding: 24px 48px;">
                                <hr style="border: 0; height: 1px; background-color: #d7dbdf;">
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 48px 32px; color: #9ca3af; font-size: 12px; text-align: center;">
                                <p>Handwritten AI System • Faculty Department</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    </tbody>
</table>
`;

// =========================================================
// 2️⃣ SEND OTP EMAIL (Callable)
// =========================================================
export const sendOtpEmail = onCall(async (request) => {
  const { email, type } = request.data;

  if (!email) {
    throw new HttpsError('invalid-argument', 'Email is required');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const sanitizedEmail = email.replace(/\./g, ',');
    await admin.database().ref(`otps/${sanitizedEmail}`).set({
      otp: otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'handwrittenai@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // Select Template based on 'type'
    let htmlContent = "";
    let subjectLine = "";

    if (type === 'personal_verification') {
      subjectLine = "Verify your Personal Email - Handwritten AI";
      htmlContent = getVerifyEmailHtml(otp);
    } else {
      subjectLine = "Reset your Password - Handwritten AI";
      htmlContent = getPasswordResetHtml(otp);
    }

    await transporter.sendMail({
      from: 'Handwritten AI <handwrittenai@gmail.com>',
      to: email,
      subject: subjectLine,
      text: `Your verification code is: ${otp}`,
      html: htmlContent
    });

    return { success: true, message: "OTP sent successfully" };

  } catch (error: any) {
    logger.error("Error sending OTP:", error);
    throw new HttpsError('internal', 'Failed to send email.');
  }
});

// =========================================================
// 3️⃣ VERIFY OTP & RESET PASSWORD (Callable)
// =========================================================
export const resetPasswordWithOtp = onCall(async (request) => {
  const { email, otp, newPassword } = request.data;

  if (!email || !otp || !newPassword) {
    throw new HttpsError('invalid-argument', 'Missing fields');
  }

  const sanitizedEmail = email.replace(/\./g, ',');
  const otpRef = admin.database().ref(`otps/${sanitizedEmail}`);

  try {
    const snapshot = await otpRef.get();
    if (!snapshot.exists()) throw new HttpsError('not-found', 'Invalid code');

    const data = snapshot.val();
    if (data.otp !== otp) throw new HttpsError('invalid-argument', 'Incorrect code');
    if (Date.now() > data.expiresAt) throw new HttpsError('deadline-exceeded', 'Code expired');

    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, { password: newPassword });
    await otpRef.remove();

    return { success: true, message: "Password updated successfully" };

  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to reset password');
  }
});

// =========================================================
// 4️⃣ VERIFY PERSONAL EMAIL (Callable)
// =========================================================
export const verifyPersonalEmail = onCall(async (request) => {
  const { email, otp } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'User must be logged in.');
  if (!email || !otp) throw new HttpsError('invalid-argument', 'Missing fields');

  const sanitizedEmail = email.replace(/\./g, ',');
  const otpRef = admin.database().ref(`otps/${sanitizedEmail}`);

  try {
    const snapshot = await otpRef.get();
    if (!snapshot.exists()) throw new HttpsError('not-found', 'Invalid code');

    const data = snapshot.val();
    if (data.otp !== otp) throw new HttpsError('invalid-argument', 'Incorrect code');
    if (Date.now() > data.expiresAt) throw new HttpsError('deadline-exceeded', 'Code expired');

    await admin.database().ref(`professors/${uid}`).update({ personalEmailVerified: true });
    await otpRef.remove();

    return { success: true, message: "Personal email verified successfully" };

  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to verify email');
  }
});

// =========================================================
// 5️⃣ EXAM GRADING (STORAGE TRIGGER)
// =========================================================
export const processExamImage = onObjectFinalized(
  { cpu: 2, memory: "1GiB" },
  async (event) => {
    logger.info("🔥 EXAM TRIGGERED", event.data.bucket, event.data.name);
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // We expect path: exams/<professorId>/<classId>/<activityId>/<studentId>.<ext>
    if (
      !filePath ||
      !filePath.startsWith("exams/") ||
      !(contentType?.startsWith("image/") || contentType === "application/pdf")
    ) {
      return;
    }

    const parts = filePath.split("/");
    if (parts.length < 5) {
      logger.error("Invalid exam image path structure:", filePath);
      return;
    }

    const professorId = parts[1];
    const classId = parts[2];
    const activityId = parts[3];
    const studentIdAndFilename = parts[4];
    const studentId = studentIdAndFilename.replace(/\.[^/.]+$/, ""); // remove extension

    const bucket = admin.storage().bucket(event.data.bucket);

    try {
      // 1. Fetch Context from RTDB
      const dbRef = admin
        .database()
        .ref(`professors/${professorId}/classes/${classId}/activities/${activityId}`);
      const snapshot = await dbRef.get();

      let context = "Grade based on general correctness.";
      let totalPoints = 100;

      if (snapshot.exists()) {
        const activityData = snapshot.val();
        context =
          activityData.answerKey ||
          activityData.rubric ||
          activityData.description ||
          context;
        totalPoints = activityData.totalPoints || 100;
      }

      // 2. Download Image
      const [buffer] = await bucket.file(filePath).download();
      const blob = new Blob([new Uint8Array(buffer)], { type: contentType });

      const formData = new FormData();
      formData.append("file", blob, "exam.jpg");
      formData.append("mode", "grade");
      formData.append("rubric", context);

      const AI_SERVER_URL = "https://handwritten-ai-server-9183885350.us-central1.run.app";

      logger.info(`Sending image to AI Server for student ${studentId}...`);
      const response = await fetch(`${AI_SERVER_URL}/process_exam`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json() as any;

      if (!result.success) {
        throw new Error(result.error || "AI processing failed");
      }

      // 3. Update RTDB with Score
      const gradePath = `professors/${professorId}/classes/${classId}/students/${studentId}/activities/${activityId}`;
      const gradeRef = admin.database().ref(gradePath);

      await gradeRef.update({
        score: parseInt(result.data.score),
        total: parseInt(totalPoints as any),
        feedback: result.data.feedback,
        confidenceScore: result.data.confidence_score,
        legibility: result.data.legibility,
        gradingType: result.data.grading_type,
        verificationLog: result.data.true_enough_reasoning,
        transcribedText: result.data.transcribed_text,
        gradedAt: new Date().toISOString(),
        status: "graded",
      });

      logger.info(`Successfully graded exam for ${studentId}. Score: ${result.data.score}/${totalPoints}`);
    } catch (error) {
      logger.error("Error processing exam:", error);
      // Fallback
      const gradeRef = admin.database().ref(`professors/${professorId}/classes/${classId}/students/${studentId}/activities/${activityId}`);
      await gradeRef.update({
        status: "failed_grading"
      });
    }
  }
);
