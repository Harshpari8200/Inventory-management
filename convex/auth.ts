import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { username, emailOTP } from "better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import {
    betterAuth,
    type BetterAuthOptions,
} from "better-auth/minimal";
import authSchema from "./betterAuth/schema";
import authConfig from "./auth.config";
import { Resend } from "resend";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel, typeof authSchema>(
    components.betterAuth,
    {
        local: {
            schema: authSchema,
        },
    }
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
    return {
        baseURL: siteUrl,
        database: authComponent.adapter(ctx),
        // Configure simple, non-verified email/password to get started
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
        },
        user: {
            additionalFields: {
                role: {
                    type: "string",
                    required: false,
                    defaultValue: "staff",
                },
            },
        },
        plugins: [
            // The Convex plugin is required for Convex compatibility
            convex({ authConfig, }),
            username(), // Enable Username authentication
            emailOTP({
                async sendVerificationOTP({ email, otp, type }) {
                    console.log(`[Better Auth] Sending OTP for ${type} to ${email}`);
                    if (type === "forget-password") {
                        try {
                            const apiKey = process.env.RESEND_API_KEY;
                            if (!apiKey) {
                                console.error("[Better Auth] RESEND_API_KEY is not defined");
                                return;
                            }
                            const resend = new Resend(apiKey);
                            const response = await resend.emails.send({
                                from: "Inventory <onboarding@resend.dev>",
                                to: email,
                                subject: "Reset your password",
                                html: `<p>Your password reset code is: <strong>${otp}</strong></p>`,
                            });

                            if (response.error) {
                                console.error(`[Better Auth] Resend API Error for ${email}:`, response.error);
                            } else {
                                console.log(`[Better Auth] OTP sent successfully to ${email}. Response ID: ${response.data?.id}`);
                            }
                        } catch (error) {
                            console.error(`[Better Auth] Unexpected error sending OTP to ${email}:`, error);
                        }
                    }
                },
            }),
        ],
    } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
    return betterAuth(createAuthOptions(ctx));
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        return authComponent.getAuthUser(ctx);
    },
});