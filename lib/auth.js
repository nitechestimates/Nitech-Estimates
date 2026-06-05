import GoogleProvider from "next-auth/providers/google";

/**
 * Shared NextAuth options — kept in a separate lib file so that
 * it can be imported by both the [...nextauth] route handler AND
 * other API routes that need getServerSession(authOptions).
 *
 * IMPORTANT: Do NOT export this from the route.js file directly —
 * Next.js App Router only allows HTTP method exports from route files.
 */
export const authOptions = {
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Force cookie to work over HTTP (needed for Electron on localhost)
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
};
