/**
 * Firebase Cloud Function:
 * Triggered when a PDF masterlist is uploaded to Storage
 * Path: masterlists/{professorId}/{classId}/{fileName}.pdf
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onObjectFinalized } from "firebase-functions/v2/storage";

// pdf-parse MUST be required (CommonJS)
const pdfParse = require("pdf-parse");

// Initialize Firebase Admin once
admin.initializeApp();

export const processMasterlist = onObjectFinalized(
  { cpu: 2 },
  async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // 1️⃣ Validate file
    if (
      !filePath ||
      !filePath.startsWith("masterlists/") ||
      !contentType?.startsWith("application/pdf")
    ) {
      logger.info("File is not a masterlist PDF.");
      return;
    }

    // Expected path: masterlists/{professorId}/{classId}/{filename}
    const parts = filePath.split("/");
    if (parts.length < 4) {
      logger.error("Invalid file path structure:", filePath);
      return;
    }

    const professorId = parts[1];
    const classId = parts[2];

    const bucket = admin.storage().bucket(fileBucket);

    try {
      // 2️⃣ Download PDF into memory
      const [buffer] = await bucket.file(filePath).download();

      // 3️⃣ Parse PDF text
      const pdfData = await pdfParse(buffer);
      const text: string = pdfData.text || "";

      const lines = text.split("\n");

      // Debug sample (safe)
      logger.info("PDF TEXT LINES SAMPLE:", lines.slice(0, 20));

      // 4️⃣ Parse students (ROBUST strategy)
      const students: Record<string, any> = {};

      // Match student ID anywhere in the line
      const STUDENT_ID_REGEX = /(TUPM-\d{2}-\d{4})(.*)$/i;

      for (const line of lines) {
        const match = line.match(STUDENT_ID_REGEX);
        if (!match) continue;

        const studentId = match[1].trim();
        let remainder = match[2].trim();

        // Remove leading numbering like "1."
        remainder = remainder.replace(/^\d+\./, "").trim();

        // Remove course/program codes (future-proof)
        remainder = remainder.replace(
          /\b(BSCS|BSIT|BSECE|BIT|BET|BSEE|BSME|BSCE|BSA|BSBA|BSTM|BSHM|BSENT)\b.*$/i,
          ""
        ).trim();

        // Final validation
        if (remainder.length < 4) continue;

        students[studentId] = {
          studentId,
          name: remainder,
          addedAt: new Date().toISOString(),
        };
      }

      const studentCount = Object.keys(students).length;

      logger.info(`Parsed ${studentCount} students from PDF.`);

      // 5️⃣ Save to Realtime Database
      if (studentCount > 0) {
        const dbRef = admin
          .database()
          .ref(`professors/${professorId}/classes/${classId}/students`);

        await dbRef.update(students);

        logger.info(
          `Successfully added ${studentCount} students for class ${classId}.`
        );
      } else {
        logger.warn("No students found in PDF parsing.");
      }
    } catch (error) {
      logger.error("Error processing masterlist:", error);
    }
  }
);
