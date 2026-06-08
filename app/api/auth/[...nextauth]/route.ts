import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Only export HTTP method handlers from route files (Next.js App Router requirement)
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };