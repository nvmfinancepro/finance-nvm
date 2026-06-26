import { NextResponse } from "next/server";

export const revalidate = 3600; // revalidate every hour

export async function GET() {
  const apiKey  = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId || placeId === "PLACEHOLDER") {
    return NextResponse.json({ error: "Place ID not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "rating,userRatingCount,reviews",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) throw new Error(`Google API error ${res.status}`);

    const data = await res.json();

    const reviews = (data.reviews ?? []).map((r: {
      authorAttribution: { displayName: string; photoUri: string };
      rating: number;
      text?: { text: string };
      relativePublishTimeDescription?: string;
    }) => ({
      author:   r.authorAttribution?.displayName ?? "Anonyme",
      avatar:   r.authorAttribution?.photoUri ?? null,
      rating:   r.rating,
      text:     r.text?.text ?? "",
      date:     r.relativePublishTimeDescription ?? "",
    }));

    return NextResponse.json({
      rating:       data.rating ?? 5,
      total:        data.userRatingCount ?? 0,
      reviews,
    });
  } catch (e) {
    console.error("Reviews fetch error:", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
