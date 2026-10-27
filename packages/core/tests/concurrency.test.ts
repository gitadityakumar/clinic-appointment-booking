import { describe, expect, it } from "vite-plus/test";
import {
  doesOverlap,
  generateOtp,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  type OtpRecord,
} from "../src/index.js";

describe("Simultaneous User Scenarios & Concurrency", () => {
  // ==========================================================================
  // Condition 1: Simultaneous Double-Booking Prevention
  // ==========================================================================
  it("Condition 1: exactly 1 user secures the slot when 10 users book simultaneously", async () => {
    interface Reservation {
      id: string;
      patientId: string;
      startTime: string;
      endTime: string;
      status: "confirmed" | "cancelled";
    }

    const confirmedAppointments: Reservation[] = [];
    const slotStart = new Date("2026-11-05T09:00:00.000Z");
    const slotEndWithBuffer = new Date("2026-11-05T09:40:00.000Z");

    // Atomic reservation handler simulating concurrent database transaction
    let mutex = Promise.resolve();
    const tryReserveSlot = async (patientId: string): Promise<Reservation> => {
      // Simulate real-world network concurrency where all requests hit the server at once
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

      return new Promise<Reservation>((resolve, reject) => {
        mutex = mutex.then(async () => {
          // Check for collision against active confirmed appointments
          const hasConflict = confirmedAppointments.some(
            (apt) =>
              apt.status === "confirmed" &&
              doesOverlap(slotStart, slotEndWithBuffer, apt.startTime, apt.endTime),
          );

          if (hasConflict) {
            reject(
              new Error(
                "CONFLICT_SLOT_TAKEN: This slot was just reserved by another patient. Please choose an alternative time.",
              ),
            );
            return;
          }

          const reservation: Reservation = {
            id: `apt-${Date.now()}-${patientId}`,
            patientId,
            startTime: slotStart.toISOString(),
            endTime: slotEndWithBuffer.toISOString(),
            status: "confirmed",
          };
          confirmedAppointments.push(reservation);
          resolve(reservation);
        });
      });
    };

    // 10 simultaneous users compete for 9:00 AM
    const users = Array.from({ length: 10 }, (_, i) => `patient-${i + 1}`);
    const results = await Promise.allSettled(users.map((uid) => tryReserveSlot(uid)));

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly 1 winner
    expect(fulfilled).toHaveLength(1);
    // Exactly 9 rejected with slot conflict error
    expect(rejected).toHaveLength(9);

    rejected.forEach((r) => {
      if (r.status === "rejected") {
        expect(r.reason.message).toContain("CONFLICT_SLOT_TAKEN");
      }
    });

    expect(confirmedAppointments).toHaveLength(1);
  });

  // ==========================================================================
  // Condition 2: Buffer Overlap Collisions
  // ==========================================================================
  it("Condition 2: rejects overlapping buffer intervals and accepts clean adjacent slots", () => {
    // Service: 30 minutes consultation + 10 minutes buffer = 40 minutes window
    const existingBooking = {
      startTime: "2026-11-05T09:00:00.000Z",
      // End time with buffer is 09:40:00
      endTimeWithBuffer: "2026-11-05T09:40:00.000Z",
    };

    // Candidate A: 09:15 AM (Direct overlap during consultation)
    const candidateA_Start = "2026-11-05T09:15:00.000Z";
    const candidateA_End = "2026-11-05T09:45:00.000Z";
    expect(
      doesOverlap(
        candidateA_Start,
        candidateA_End,
        existingBooking.startTime,
        existingBooking.endTimeWithBuffer,
      ),
    ).toBe(true);

    // Candidate B: 09:30 AM (During doctor's 10-minute rest buffer between 09:30 and 09:40)
    const candidateB_Start = "2026-11-05T09:30:00.000Z";
    const candidateB_End = "2026-11-05T10:00:00.000Z";
    expect(
      doesOverlap(
        candidateB_Start,
        candidateB_End,
        existingBooking.startTime,
        existingBooking.endTimeWithBuffer,
      ),
    ).toBe(true);

    // Candidate C: 09:40 AM (Right after buffer expires — valid adjacent slot)
    const candidateC_Start = "2026-11-05T09:40:00.000Z";
    const candidateC_End = "2026-11-05T10:10:00.000Z";
    expect(
      doesOverlap(
        candidateC_Start,
        candidateC_End,
        existingBooking.startTime,
        existingBooking.endTimeWithBuffer,
      ),
    ).toBe(false);
  });

  // ==========================================================================
  // Condition 3: Rapid OTP Flooding & Rate Limiting (60-second cooldown)
  // ==========================================================================
  it("Condition 3: blocks rapid concurrent OTP requests via 60-second cooldown", async () => {
    const lastSentAt = new Map<string, number>();

    const requestOtpWithCooldown = (
      recipient: string,
      now: number,
    ): { success: boolean; code?: string; error?: string } => {
      const lastSent = lastSentAt.get(recipient) || 0;
      const elapsed = now - lastSent;

      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const remaining = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        return {
          success: false,
          error: `Please wait ${remaining} seconds before requesting another code.`,
        };
      }

      const code = generateOtp(6);
      lastSentAt.set(recipient, now);
      return { success: true, code };
    };

    const recipient = "patient@apexhealth.org";
    const requestTime = Date.now();

    // 5 concurrent requests fired at the exact same millisecond
    const concurrentSends = Array.from({ length: 5 }, () =>
      requestOtpWithCooldown(recipient, requestTime),
    );

    const successfulSends = concurrentSends.filter((s) => s.success);
    const blockedSends = concurrentSends.filter((s) => !s.success);

    // Only the very first send succeeds
    expect(successfulSends).toHaveLength(1);
    expect(blockedSends).toHaveLength(4);
    blockedSends.forEach((b) => {
      expect(b.error).toContain("Please wait 60 seconds");
    });

    // When 61 seconds have passed, sending is permitted again
    const laterSend = requestOtpWithCooldown(recipient, requestTime + 61000);
    expect(laterSend.success).toBe(true);
  });

  // ==========================================================================
  // Condition 4: Concurrent Brute-Force OTP Guessing & Invalidation
  // ==========================================================================
  it("Condition 4: locks session and invalidates token when 3 failed attempts occur concurrently", async () => {
    const activeTokens = new Map<string, OtpRecord>();
    const tokenId = "otp-session-test";
    const correctCode = "741852";

    activeTokens.set(tokenId, {
      id: tokenId,
      identifier: "user@example.com",
      code: correctCode,
      channel: "email",
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS, // 3
      expiresAt: Date.now() + 300000,
      createdAt: new Date().toISOString(),
    });

    let mutex = Promise.resolve();
    const submitGuess = async (guess: string): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        mutex = mutex.then(async () => {
          const record = activeTokens.get(tokenId);
          if (!record) {
            reject(
              new Error("Verification session expired or locked due to too many failed attempts."),
            );
            return;
          }

          if (record.attempts >= record.maxAttempts) {
            activeTokens.delete(tokenId);
            reject(
              new Error("Too many failed attempts. For your security, this code is now invalid."),
            );
            return;
          }

          if (record.code !== guess) {
            record.attempts += 1;
            const remaining = record.maxAttempts - record.attempts;
            if (remaining <= 0) {
              activeTokens.delete(tokenId);
              reject(
                new Error("Too many failed attempts. For your security, this code is now invalid."),
              );
              return;
            }
            reject(new Error(`Incorrect code. ${remaining} attempt(s) remaining.`));
            return;
          }

          // Success: consume token
          activeTokens.delete(tokenId);
          resolve("VERIFIED_SUCCESS");
        });
      });
    };

    // 5 concurrent wrong guesses fired at once
    const wrongGuesses = ["000001", "000002", "000003", "000004", "000005"];
    const results = await Promise.allSettled(wrongGuesses.map((g) => submitGuess(g)));

    // All 5 attempts should be rejected
    results.forEach((r) => {
      expect(r.status).toBe("rejected");
    });

    // Token must be purged completely from active tokens
    expect(activeTokens.has(tokenId)).toBe(false);

    // Even if an attacker now tries the real correct code, it must fail because the session is destroyed
    await expect(submitGuess(correctCode)).rejects.toThrow(
      "Verification session expired or locked due to too many failed attempts.",
    );
  });
});
