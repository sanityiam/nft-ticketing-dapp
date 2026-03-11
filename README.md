NFT Ticketing DApp — How to Run

Everything runs locally + Sepolia testnet

Follow the steps below exactly in order to:
	•	create events
	•	mint NFT tickets
	•	buy tickets (primary market)
	•	resell tickets
	•	verify tickets
	•	check-in tickets

1. Install prerequisites

You need these installed first.

Install:
	•	Node.js (v18 or newer)
	•	Git
	•	MetaMask

Node.js download:

https://nodejs.org

MetaMask:

https://metamask.io

If you have it already - skip

2. Clone the project

Open terminal.

Mac / Linux

git clone https://github.com/sanityiam/nft-ticketing-dapp-main.git
cd nft-ticketing-dapp-main

Windows (PowerShell)

git clone https://github.com/sanityiam/nft-ticketing-dapp-main.git
cd nft-ticketing-dapp-main

3. Install dependencies

Run:

npm install

Wait until ot finishes 

4. Create .env file

Inside the project root folder, create a file called:

.env

Paste this inside:

SEPOLIA_RPC_URL=https://sepolia-g.alchemy.com/v2/yourAPIcode
SEPOLIA_PRIVATE_KEY=yourSepoliaPrivateKeyHere
BASE_URI=https://sanityiam.github.io/nft-ticketing-db-metadata

Replace:

yourAPIcode

with your Alchemy API key

Get one here:

https://alchemy.com

Replace:

yourSepoliaPrivateKeyHere

with your MetaMask private key

Don't forget to use a test wallet only

Never use your main wallet private key

5. Compile contracts

Run:

npx hardhat clean
npx hardhat compile

You should see:

Compiled successfully

6. Run tests (optional)

Run:

npx hardhat test

You should see all tests passing

7. Deploy contracts to Sepolia

Run:

DEPLOYMENT_NAME=sepolia npx hardhat run scripts/deploy.ts --network sepolia

Example output:

EventTicketNFT deployed: 0x...
TicketingPlatform deployed: 0x...

The deployment will automatically export addresses to the frontend

8. Start the frontend

Go into frontend folder:

cd frontend

Install dependencies:

npm install

Start the app:

npm run dev

You will see something like:

Local: http://localhost:5173

9. Open the application

Open any browser on your computer

Go to:

http://localhost:5173

10. Connect MetaMask

Inside the app:

Click:

Connect MetaMask

Make sure MetaMask network is:

Sepolia Testnet

11. Organizer flow (create event)

Go to:

Organizer

Fill:

Event name
Venue
Date and time
Base price (ETH)
Max supply

Click:

Create Event

You will see:

Latest Created Event ID

12. Mint tickets

Still inside Organizer page

Fill:

Event ID
Quantity

Click:

Mint Tickets

This creates NFT tickets

13. Buy tickets (primary market)

Go to:

Marketplace

Click:

Load Listings

Click:

Buy Primary

Approve transaction in MetaMask

14. See your tickets

Go to:

My Tickets

Click:

Load My Tickets

You will see:
	•	NFT ticket
	•	Token ID
	•	Status
	•	Event info

15. Resell a ticket

Inside My Tickets
	1.	Click:

Approve Marketplace

	2.	Enter resale price.
	3.	Click:

List for Resale

Ticket will appear in Marketplace resale listings

16. Buy resale ticket

Go to:

Marketplace

Find resale listing.

Click:

Buy Resale

Approve MetaMask transaction.

Ownership transfers automatically

17. Verify ticket

Go to:

Verify

Enter:

Token ID

Click:

Verify

You will see:
	•	owner
	•	event id
	•	used status

18. Check-in ticket (venue)

Connect wallet that was assigned as venue verifier

Click:

Check In

Ticket status becomes:

USED

NFT image updates automatically

19. NFT metadata

NFT metadata and image are generated fully on-chain

Image = on-chain SVG

Metadata = Base64 JSON

Status updates dynamically:

VALID
LISTED
USED

Done