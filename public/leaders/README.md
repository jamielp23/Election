# Party leader photos

Drop the leader headshots here with these exact filenames. They are loaded at
runtime by the "Party leaders" dashboard panel; until a file is present the
panel shows an initials avatar fallback.

| File                     | Leader           | Party            |
| ------------------------ | ---------------- | ---------------- |
| `jason-macpherson.jpg`   | Jason MacPherson | Social-Democrats |
| `john-sunderland.jpg`    | John Sunderland  | Conservatives    |
| `elizabeth-merson.jpg`   | Elizabeth Merson | Liberals         |
| `mark-boyd.jpg`          | Mark Boyd        | Nationalist      |

Independent and BP First are intentionally left without a leader for now.

Any web image format works if you also update `photo` in
`src/data/leaders.ts` (e.g. `.png`, `.webp`). Square-ish crops look best; the
avatar uses `object-fit: cover` anchored to the top of the image.
