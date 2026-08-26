const response = await fetch("http://localhost:3000/creator-deliveries", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    listingId: "episode-42-cover",
    creatorId: "creator-17",
    image: "https://images.example.com/episode-42.jpg",
    format: "webp"
  })
});

const result: unknown = await response.json();
console.log(JSON.stringify(result, null, 2));

export {};
