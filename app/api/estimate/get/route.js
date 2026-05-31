import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // #region agent log
    fetch('http://127.0.0.1:7317/ingest/d03e8a05-c75e-4594-b8e5-551bd40fece5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9a3af0'},body:JSON.stringify({sessionId:'9a3af0',location:'api/estimate/get/route.js:GET',message:'session resolved',data:{hasSession:!!session,hasEmail:!!session?.user?.email,mongoUriSet:!!process.env.MONGODB_URI},timestamp:Date.now(),hypothesisId:'C-G'})}).catch(()=>{});
    // #endregion

    // 🔐 Auth check – user must be logged in
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    // ✅ Fetch only estimates belonging to the logged-in user
    //    Sort by creation date (newest first) – safe now that createdAt exists
    const estimates = await db
      .collection("estimates")
      .find({ userId: session.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    // #region agent log
    fetch('http://127.0.0.1:7317/ingest/d03e8a05-c75e-4594-b8e5-551bd40fece5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9a3af0'},body:JSON.stringify({sessionId:'9a3af0',location:'api/estimate/get/route.js:GET',message:'estimates fetched',data:{count:estimates.length},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(JSON.parse(JSON.stringify(estimates)));

  } catch (error) {
    console.error("🔥 FETCH ERROR:", error);
    // #region agent log
    fetch('http://127.0.0.1:7317/ingest/d03e8a05-c75e-4594-b8e5-551bd40fece5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9a3af0'},body:JSON.stringify({sessionId:'9a3af0',location:'api/estimate/get/route.js:GET',message:'estimate get error',data:{error:error.message,name:error.name},timestamp:Date.now(),hypothesisId:'C-G'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}