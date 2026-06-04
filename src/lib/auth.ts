import { betterAuth } from "better-auth";
import { pool } from "./db";

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  secret: process.env.BETTER_AUTH_SECRET || "some-extremely-long-and-secure-fallback-secret-12345",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
      username: {
        type: "string",
        defaultValue: "",
      },
      balance: {
        type: "number",
        defaultValue: 0,
      },
      overdraftLimit: {
        type: "number",
        defaultValue: 0,
      },
      savingsBalance: {
        type: "number",
        defaultValue: 0,
      }
    }
  }
});
