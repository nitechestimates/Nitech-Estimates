import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// ✅ Export config
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
};

// ✅ Create handler
const handler = NextAuth(authOptions);

// ✅ Export for App Router
export { handler as GET, handler as POST };