# web-user (NumCheck)
Env:
- VITE_API_BASE (default `/api`)

Scripts:
- npm run dev
- npm run build
- npm run preview

Docker:
- docker build -t web-user .
- docker run -p 5173:80 web-user
