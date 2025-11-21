import fs from 'fs';
import fetch from 'node-fetch';

const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const placeId = process.env.PLACE_ID;

if (!apiKey || !placeId) {
  console.error('Missing GOOGLE_PLACES_API_KEY or PLACE_ID');
  process.exit(1);
}

const url =
  'https://maps.googleapis.com/maps/api/place/details/json' +
  `?place_id=${encodeURIComponent(placeId)}` +
  '&fields=rating,user_ratings_total,reviews' +
  `&key=${encodeURIComponent(apiKey)}`;

console.log('Fetching Google Place details…');

const res = await fetch(url);
if (!res.ok) {
  console.error('HTTP error from Google Places API:', res.status, res.statusText);
  process.exit(1);
}

const json = await res.json();

if (json.status !== 'OK') {
  console.error('Google Places API returned status:', json.status, json.error_message);
  process.exit(1);
}

const result = json.result || {};
const allReviews = result.reviews || [];

// Newest first
const sorted = allReviews.sort((a, b) => {
  if (typeof a.time === 'number' && typeof b.time === 'number') {
    return b.time - a.time;
  }
  return 0;
});

const data = {
  updatedAt: new Date().toISOString(),
  rating: result.rating || null,
  totalReviews: result.user_ratings_total || (allReviews ? allReviews.length : 0),
  reviews: sorted.slice(0, 20).map(r => ({
    author_name: r.author_name,
    rating: r.rating,
    text: r.text,
    relative_time_description: r.relative_time_description,
    time: r.time
  }))
};

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/reviews.json', JSON.stringify(data, null, 2));

console.log(`Wrote data/reviews.json with ${data.reviews.length} reviews`);
