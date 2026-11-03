export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({
    ok: true, model: process.env.GEMINI_MODEL,
    liveModel: process.env.GEMINI_LIVE_MODEL, time: new Date().toISOString(),
  });
}
