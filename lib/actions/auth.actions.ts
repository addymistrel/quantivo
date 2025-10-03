"use server";

import { auth } from "@/lib/better-auth/auth";
import { inngest } from "@/lib/inngest/client";
import { DEFAULT_PROFILE_IMAGE } from "@/lib/constants";
import { headers } from "next/headers";

export const signUpWithEmail = async ({
  email,
  password,
  fullName,
  country,
  investmentGoals,
  riskTolerance,
  preferredIndustry,
}: SignUpFormData) => {
  try {
    // First try normal email sign-up. If user already exists (e.g., came from OAuth), we'll fall back to profile completion update.
    let response: any = null;
    try {
      response = await auth.api.signUpEmail({
        body: { email, password, name: fullName },
      });
    } catch (e: any) {
      const msg = (e as Error)?.message || "";
      const isDuplicate = /exists|duplicate|already/i.test(msg);
      if (!isDuplicate) throw e; // real failure
    }

    // Whether newly created or existing from social, send creation event only if new sign up occurred
    if (response) {
      await inngest.send({
        name: "app/user.created",
        data: {
          email,
          name: fullName,
          country,
          investmentGoals,
          riskTolerance,
          preferredIndustry,
          profileImage: DEFAULT_PROFILE_IMAGE,
        },
      });
    } else {
      // Existing user path: update missing profile fields directly
      try {
        const headersObj: any = await headers();
        await auth.api.updateUser({
          body: { name: fullName },
          headers: headersObj,
        } as any);
      } catch (e) {
        console.warn("Failed updating user name for existing account", e);
      }
      // Direct DB update for extended fields
      try {
        const mongoose = (await import("@/database/mongoose"))
          .connectToDatabase;
        const conn = await mongoose();
        const db = conn.connection.db;
        const session = await auth.api.getSession({ headers: await headers() });
        const userId = session?.user?.id;
        if (db && userId) {
          await db
            .collection("user")
            .updateOne(
              { _id: new (conn as any).mongo.ObjectId(userId) },
              {
                $set: {
                  country,
                  investmentGoals,
                  riskTolerance,
                  preferredIndustry,
                },
              }
            );
        }
      } catch (e) {
        console.warn("Failed updating extended profile fields", e);
      }
    }

    return { success: true, data: response || { existing: true } };
  } catch (e) {
    console.log("Sign up falied", e);
    return { success: false, error: "Sign up failed" };
  }
};

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
  try {
    const response = await auth.api.signInEmail({
      body: { email, password },
    });

    return { success: true, data: response };
  } catch (e) {
    console.log("Sign in falied", e);
    return { success: false, error: "Sign in failed" };
  }
};

export const signOut = async () => {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (e) {
    console.log("Sign out failed", e);
    return { success: false, error: "Sign out failed" };
  }
};

// Initiate Google OAuth sign-in (server-side). Returns a redirect URL to Google's consent screen.
export const getGoogleSignInUrl = async () => {
  try {
    const res = await auth.api.signInSocial({
      body: {
        provider: "google",
      },
    });
    // Shape may differ; attempt to extract URL
    const url =
      (res as any)?.url || (res as any)?.redirectTo || (res as any)?.location;
    if (!url) throw new Error("No redirect URL returned");
    return { success: true, url };
  } catch (e) {
    console.error("Google sign-in init failed", e);
    return { success: false, error: "Failed to initiate Google sign-in" };
  }
};
