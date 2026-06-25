"use server";

/**
 * Verifies if the administrative passcode matches the server-configured passcode.
 */
export async function verifyPasscode(code: string): Promise<boolean> {
  const adminPasscode = process.env.ADMIN_PASSCODE || "Polo_624";
  return code === adminPasscode;
}
