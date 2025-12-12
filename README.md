# White Elephant Gift Exchange

A pixel art themed web app for hosting virtual White Elephant gift exchange parties with friends.

## Features

- **Create & Join Parties** - Host creates a party and shares an invite code/link with friends
- **Gift Registration** - Each participant registers their gift (name + optional description)
- **Real-time Game Play** - Take turns opening gifts or stealing from others
- **White Elephant Rules**:
  - Randomized turn order
  - Open a wrapped gift OR steal an opened gift from someone
  - Gifts can only be stolen 3 times max
  - Can't steal back the gift that was just stolen from you
- **Action Log** - Track all opens and steals throughout the game
- **Final Results** - See who ended up with what gift

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript with pixel art theme
- **Backend**: Node.js with Express (local) or Vercel Serverless Functions
- **Storage**: In-memory (local) or Vercel KV (production)
- **Real-time Updates**: Polling-based

## Running Locally

### Option 1: Express Server (simplest)

```bash
npm install
npm start
```

Open http://localhost:3000

### Option 2: Vercel Dev

```bash
npm install -g vercel
npm install
npm run dev
```

## Deploying to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Create a Vercel KV database:
   - Go to https://vercel.com/dashboard
   - Create/select your project
   - Go to **Storage** tab → **Create Database** → **KV**
   - Connect it to your project

3. Deploy:
   ```bash
   vercel
   ```

Vercel will automatically set the `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables.

## Project Structure

```
white-elephant/
├── api/                    # Vercel serverless functions
│   ├── _game.js           # Game logic
│   ├── _storage.js        # Vercel KV storage
│   ├── party.js           # POST /api/party
│   └── party/
│       ├── [id].js        # GET /api/party/:id
│       └── [id]/
│           ├── join.js
│           ├── register.js
│           ├── gift.js
│           ├── start.js
│           ├── open.js
│           └── steal.js
├── public/                 # Static frontend
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js              # Local Express server
├── vercel.json
└── package.json
```

## How to Play

1. **Host** creates a party and shares the invite code
2. **Players** join using the code or invite link
3. **Host** starts the gift registration phase
4. **Everyone** registers their gift
5. **Host** starts the game once all gifts are registered
6. **Players** take turns:
   - Open a mystery wrapped gift, OR
   - Steal an already-opened gift from someone else
7. If your gift is stolen, you get to open/steal
8. Game ends when all gifts are opened
9. See the final results!

## License

MIT
