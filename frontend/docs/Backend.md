# Backend API Notes

## Overview
The backend uses Express, Firebase Firestore, and the Spotify API. It currently supports fetching songs, saving liked songs, and retrieving liked songs for a user.

## Firestore Structure

users/{uid}
- email
- displayName
- createdAt

users/{uid}/likedSongs/{spotifyId}
- spotifyId
- title
- artist
- album
- imageUrl
- previewUrl
- likedAt

## Routes

### GET /
Checks if the backend is running.

Response:
`Backend is running`

---

### GET /test-db
Tests the Firestore connection by returning the test user document.

Example:
`GET /test-db`

---

### GET /songs?q=...
Fetches songs from Spotify based on a search query.

Example:
`GET /songs?q=drake`

Response:
```json
[
  {
    "spotifyId": "123",
    "title": "Song Name",
    "artist": "Artist Name",
    "album": "Album Name",
    "imageUrl": "https://...",
    "previewUrl": "https://..."
  }
]
