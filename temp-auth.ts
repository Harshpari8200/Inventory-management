import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";

export const auth = betterAuth({
    database: {
        provider: "sqlite",
        url: ":memory:"
    },
    emailAndPassword: {
        enabled: true,
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
        username(),
    ],
});
