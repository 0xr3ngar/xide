# Xide

Hide posts from countries you don't want to see on X, right in the sidebar.

## What it does

- Adds an "Xide" button to the X sidebar
- Denylist of countries, pick which ones to hide
- Fetches each author's profile location once (cached per author), maps it to a country
- Fully hides matching posts, they never touch your timeline

## How it works

1. Post appears in the timeline
2. Author already in cache? -> hide/show instantly
3. Not cached? -> fetch profile location -> map to country -> cache -> hide/show

No backend, no analytics, all local. Private by design.

## Browser support

- Firefox + Chrome (Manifest V3, shared codebase)
