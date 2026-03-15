**MDT 915 - BLOCKCHAIN PRACTITIONER**
**BLOCKCHAIN IMPLEMENTATION PROJECT**
**NFT-Based Event Ticketing System Technical Documentation (README)**

1- Description
This project addresses critical issues in the traditional ticketing industry, namely ticket scalping, lack of transparency in the secondary market, and event fraud. By representing tickets as Non-Fungible Tokens (NFTs) on the Ethereum blockchain (specifically designed for the Sepolia testnet), the platform enforces smart contract bounds on maximum resale prices. It also automatically splits resale revenues to guarantee a transparent, un-bypassable royalty cut to the original event organizers when tickets change hands on the secondary market.

2- Team Members

- Serhii Klyuyev -8897785
- Ksemiia Ivannikova - 8955967
- Cemalettin Gorkem Cokcetin - 8753167

3-	System Architecture
High-level components:
  - Users / Wallets (Organizer, Buyer, Venue Verifier)
  - Frontend DApp (Web UI, React)
  - Smart Contracts on Sepolia:
    - EventTicketNFT: NFT tickets with on-chain images and metadata; dynamic status
    - TicketingPlatform: Event management, minting, sales (primary and resale), verification, check-in

  Data & Flow:
    - Event creation → event data stored in TicketingPlatform
    - Ticket minting → NFT tickets linked to events
    - Primary sale → ownership transfer
    - Resale → listing and resale purchases
    - Verification → check ownership and used status
    - Check-in → status updates to Used and NFT state
  - Network: Sepolia Testnet (Ethereum-compatible); local testing with Hardhat

The decentralized application operates across the following flow:
1. User (Organizer) connects their Web3 Wallet (MetaMask) to the Frontend interface.
2. Frontend captures event details (venue, date, supply, base price, max resale price) and prompts a transaction.
3. Web3 Wallet signs the transaction and sends it to the Smart Contract (EventFactory/TicketingPlatform.sol) on the Blockchain (Sepolia Testnet).
4. Smart Contract records the event data on-chain.
5. User (Organizer) initiates a mint action on the Frontend, which triggers TicketingPlatform.sol to delegate minting to the TicketNFT.sol (ERC721) contract.
6. The TicketNFT.sol contract pulls real-time metadata (such as validity, listed status, and check-in status) from the TicketingPlatform.sol contract to dynamically generate on-chain Base64 JSON and SVG ticket files.
7. User (Buyer) browses the primary or resale marketplace on the Frontend, executing a purchase that transfers Ether directly to the Organizer/Seller (modulo royalty splits) entirely on-chain.
8. User (Venue Verifier) uses the Frontend to scan/input a token ID, triggering the checkIn function on the Smart Contract to irreversibly mark the ticket as "USED".

4-	Technologies Used
- Blockchain Platform: Ethereum (specifically optimized for deployment on the Sepolia testnet or local Hardhat network).
- Smart Contract Development:
  - Language: Solidity (v0.8)
  - Framework: Hardhat ("hardhat": "^3.1.8")
  - Tokens standard: OpenZeppelin (@openzeppelin/contracts) (ERC-721)
- Frontend App:
  - Framework: React (framework interface ) instantiated with Vite
  - Web3 Interaction: Native Ethers.js (communication between frontend and blockchain)
  - Language: TypeScript
  - Wallet: Metamask (wallet connection)

5-	Prerequisites
To successfully deploy and interact with the application, the following environment requirements must be met:
- Node.js: Version 18 or newer.
- Git: Required for version control 
- Web Extension: MetaMask Wallet connected to the Sepolia Testnet.
- API Keys: An Alchemy API key for the SEPOLIA_RPC_URL.
- Testnet Tokens: Sepolia ETH to cover transaction gas fees.

6-	Installation & Setup Instructions

NFT Ticketing DApp — How to Run
Everything runs locally + Sepolia testnet
Follow the steps below exactly in order to:
 • create events
 • mint NFT tickets
 • buy tickets (primary market)
 • resell tickets
 • verify tickets
 • check-in tickets

1. Install prerequisites

You need these installed first.
Install:
 • Node.js (v18 or newer)
 • Git
 • MetaMask
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
 • NFT ticket
 • Token ID
 • Status
 • Event info

15. Resell a ticket

Inside My Tickets
 1. Click:
Approve Marketplace
 2. Enter resale price.
 3. Click:
List for Resale
Ticket will appear in Marketplace resale listings

16. Buy resale ticket

Go to:Marketplace
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
 • owner
 • event id
 • used status

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

7. Smart contracts and key functions
The project is built around two main contracts: EventTicketNFT and TicketingPlatform. Together, these contracts manage the full lifecycle of the NFT tickets. One contract focuses on the NFT asset itself, while the other manages the event and market logic around it. This separation is sensible because it keeps the token representation distinct from the platform rules that govern how tickets are created, sold, transferred and verified.

The EventTicketNFT contract represents the ticket as an NFT. Each ticket is unique and tied to a token ID. The ticket metadata and image are generated fully on-chain. The image is an on-chain SVG and the metadata is encoded as Base64 JSON. This is an important design feature because it means the ticket does not depend entirely on external hosted images in order to display its identity and status. The ticket state also updates dynamically, which means the NFT can visually reflect whether it is valid, listed, or used. That adds practical value because the NFT is not only a proof of ownership, but also a live representation of ticket status.

The TicketingPlatform contract contains the core business logic of the application. It handles event creation, ticket minting, primary market sales, resale listings, resale purchases, ticket verification and venue check-in. These functions together form the operational logic of the DApp.

The most important functions can be explained as follows:

-	createEvent(...):
This function allows the organizer to create a new event. It stores core event details such as the event name, venue, date and time, base ticket price, maximum supply and possibly verifier-related information. This is the starting point of the entire system because tickets cannot exist before an event has been created.

-	mintTickets(eventId, quantity):
After an event is created, the organizer can mint NFT tickets for it. These minted tickets become the digital ticket inventory linked to the selected event. This step turns the event configuration into actual ticket assets.

-	buyPrimary(eventId):
This function handles purchases in the primary market. A buyer pays the base ticket price and receives ownership of a ticket NFT. This is the first official sale of the ticket from the organizer to the attendee.

-	listForResale(tokenId, price):
If a buyer can no longer attend, the ticket can be listed for resale. The contract checks whether resale is allowed and whether the ticket owner has given the necessary approval. Once listed, the NFT appears in the marketplace as a resale option.

-	buyResale(listingId):
This function allows another user to buy a ticket from the resale market. Ownership transfers automatically after the transaction is confirmed, which removes the need for a manual intermediary.

-	verifyTicket(tokenId, wallet):
This function checks whether a particular wallet owns the ticket and whether the ticket has already been used. It acts as a validation step before check-in.

-	checkIn(tokenId, attendee):
This function is used by the assigned venue verifier. Once the ticket is checked in, its status becomes “used”, which prevents reuse and updates the NFT state.
Taken together, these functions cover the entire ticket journey. The system begins with the organizer, continues through sale and resale, and ends with event entry. That gives the project a complete and practical structure rather than a narrow NFT minting demo.

8. User guide
The user journey in this DApp is structured around three main roles: organizer, buyer, and venue verifier. The organizer starts by connecting MetaMask and making sure the wallet is on the Sepolia Testnet. After that, the organizer goes to the Organizer page in the frontend. There, the organizer enters the event name, venue, date and time, base price in ETH, and maximum ticket supply. Once the event is created, the interface displays the latest created event ID. This event ID is then used when minting tickets. On the same organizer page, the organizer enters the event ID and ticket quantity, and then clicks Mint Tickets. At this stage, the system creates the NFT tickets linked to that event.

The buyer journey starts in the Marketplace. After connecting MetaMask, the buyer loads the listings and chooses a ticket from the primary market. By clicking “Buy Primary”, the buyer approves the transaction in MetaMask and receives the NFT ticket after the transaction is confirmed. This ticket is then visible in the “My Tickets” page, where the buyer can load all owned tickets and see information such as the token ID, current status and event details.

If the buyer wants to resell the ticket, the resale process begins inside “My Tickets”. First, the buyer clicks “Approve Marketplace”, which gives the platform permission to handle the NFT transfer if a resale happens. Then the buyer enters a resale price and clicks “List for Resale”. Once listed, the ticket appears in the marketplace resale section. Another user can then go to the Marketplace, find the resale listing and click “Buy Resale”. After approval in MetaMask, ownership transfers automatically to the new buyer.

The final stage is ticket verification and check-in. On the “Verify” page, a user can enter the token ID and click “Verify”. The system then displays the owner, the event ID, and the used status. At the venue, the wallet assigned as the official verifier connects to the application and clicks “Check In”. When that happens, the ticket status changes to “Used”, and the NFT image updates automatically. This creates a strong link between on-chain ownership and real-world entry control. Overall, the user flow is one of the strengths of the project. It is not limited to minting and holding NFTs. Instead, it shows a full event ticketing lifecycle in a way that is easy to explain and easy to demonstrate.

10. Testing instructions
Before deployment, the user can run the test suite with:
“npx hardhat test”

If the setup is correct, all tests should pass. This step helps confirm that the core smart contract logic behaves as expected before the contracts are deployed to Sepolia. In practice, this matters because the contracts manage ticket ownership, payments, resale and event check-in. A mistake in any of these areas would affect the full user experience. The testing step also supports the credibility of the project. It shows that the DApp is not just designed visually, but also validated through code.

12. Known issues and limitations
The project is well structured and covers the main ticketing workflow effectively, but there are still some limitations that should be recognized. First, the application depends on MetaMask and wallet-based interaction at every main stage. That is reasonable for an Ethereum DApp, but it can still create friction for users who are not familiar with wallets, gas approvals or Sepolia network setup. In other words, the system is technically clear, but not yet as simple as a mainstream ticketing app for ordinary users.

Second, the setup process depends on environment variables such as a Sepolia RPC URL and a private key. This is standard in blockchain development, yet it also means the project is aimed more at developers, testers or technically confident users rather than general consumers. 

Third, while the project handles event creation, ticket minting, purchase, resale, verification and check-in, it does not yet describe broader real-world operational cases such as refunds, event cancellation or anti-bot controls during high-demand sales. These are important business functions that would need to be added in a more mature version of the platform.
Finally, the venue verification process still depends on a wallet assigned as the official verifier. This works well for a prototype and demonstrates the logic clearly, but in a large event environment it would likely need faster operational tools, such as a dedicated scanning interface or more streamlined staff controls.

14. Future improvements
There are several realistic directions for improving the project further. One useful next step would be adding a more polished check-in interface, ideally with QR-based scanning and a faster verification workflow for venue staff. The current logic is already there, but the operational experience could become much more practical with better front-end tooling.
Another strong improvement would be support for refunds and cancellations. Real events do not always happen exactly as planned, so a complete ticketing platform should be able to respond when an event is cancelled, delayed or changed significantly.

The project could also benefit from anti-bot protections during the initial sales stage. Resale controls help reduce unfair secondary-market behavior, but they do not fully solve the problem of automated bulk purchases when tickets are first released. In addition, the system could be expanded with more advanced user-facing features such as clearer ticket history, richer event information, better wallet guidance and stronger support for first-time blockchain users. Since the project already demonstrates dynamic NFT status updates, that same idea could be extended into a more interactive and polished ticket ownership experience.

**Serhii's Indivisual Contribution Report**

My role in this project was Project Lead. Personally, I focused on the core technical implementation, project coordination, and final integration of the system. I was mainly responsible for the blockchain architecture, deployment process, smart contract logic, and overall repository organisation.

First, I designed the overall system architecture. I defined the logic of the project, using a two-contract structure: EventTicketNFT.sol for the ERC-721 NFT ticket layer, and TicketingPlatform.sol for the overall project logic, including event creation, minting, sales, resale, verification, and check-in logic. This separate development ultimately allowed the system to remain modular and simpler to manage.

Second, I implemented the ticket lifecycle logic, which included implementing and ensuring that the ticket status changed correctly throughout all pipeline execution steps, including normal ownership, resale listing, resale purchase, and check-in. A key part of this work was to make sure that the NFT metadata and visuals reflected the actual on-chain ticket status.

Third, I implemented security checks in the smart contract. I included validation of ownership, payment correctness, resale restrictions, double-use prevention, and access restrictions for the verifier role. These checks were important to make sure that the system is logically safe and consistent with the real blockchain applications requirements.

I also defined the smart contract interface for the frontend, in particular which contract functions the frontend need to call, how the frontend would read blockchain, and how the deployed contract addresses would be structured so that the frontend would interact with the blockchain without any errors.

Another major part of my contribution was that I managed the full Sepolia deployment process including configuring the deployment environment, preparing the required RPC and wallet settings, compiling the contracts, and deploying the final versions of the smart contracts to the Sepolia testnet. I also verified that the deployed contracts were working correctly and that the frontend was connected to the correct contract address.

A further contribution was that I was responsible for managing and organising the GitHub repository. I handled the project structure, ensured that all files and codes were in the correct places, and coordinated the final integrated version of the repository. Moreover, to maintain a correct structure, project flow and content consistency, when each of our team members have completed their assigned tasks, they have shared the final version with me and I have polished it up to the best blockchain practices, added comments where needed, and pushed the version to the GitHub repository. 

Lastly, all team members of the Group B, were contributing to the report development and finalisation equally. Personally, I reviewed the technical content of the documentation, aligned the written description with the actual implemented system, and ensured that the README and other related written content correctly reflected the deployed project.

The total time I invested in this project was approximately 35-40 hours. Around 10-12 hours were spent designing the system architecture and implementing the core smart contract logic. Approximately 8-10 hours were dedicated to implementing the ticketing lifecycle logic, including ticket minting, resale functionality, and check-in status updates. Around 6-8 hours were spent on managing the Sepolia deployment process and ensuring that the frontend correctly interracted with the contracts. Another 5-6 hours were used for organising the GitHub repository, integrating the work from other team members, and creating the final project structure. The remaining time was spent on reviewing the documentation and aligning the written report with the implemented system. 

During the development process I’ve faced a few technical challenges. The first one was when I was working on the NFT ticket metadata and the visual status of an actual ticket depending on its current state (valid, listed, or used). This was solved by dynamically generating the metadata directly from on-chain data, which allowed the ticket image to update automatically based on the contract state.

Another challenge was ensuring correct interaction between the frontend and deployed smart contracts. Since the contracts were deployed on the Sepolia testnet, it was very important to carefully manage contract addresses, ABI files, and RPC configurations so that the frontend would correctly read blockchain and execute transactions.

In general, our team collaborated well throughout all divided responsibilities. Each team member focused on specific parts of the project. Once individual tasks were completed, the results were shared and integrated into the main repository. One detail that worked well was the clear separation of responsibilities based on all participants knowledge and skills. However, the coordination process could be slightly improved in the future by scheduling more meetings earlier in the development stage to ensure smoother workflow. 

Overall, I focused on the technical foundation of the project: blockchain architecture, contract logic, deployment, security, integration, and the overall project finalisation. Throughout this group project I have highly improved my Solidity development, DApp architecture, contract deployment, on-chain – frontend interraction, and the general project coordination and management skills.

**Kseniia's Individual Contribution Report**

My main role in this project was frontend development. I designed the frontend structure and implemented the main user interface pages, for example: Home, Organizer, Marketplace, My Tickets and Verify. These pages supported the full ticket lifecycle, including event creation, ticket minting, primary purchase, resale, verification and check-in. I also implemented MetaMask wallet integration and connected the frontend to the deployed smart contracts on Sepolia using Ethers.js. This included reading contract addresses and ABIs, creating contract instances and linking UI actions to blockchain functions such as creating events, minting tickets, buying tickets, listing tickets for resale, buying resale tickets and checking in tickets. Another key part of my work was the NFT metadata display. The frontend called tokenURI on the ERC-721 contract, decoded the Base64 JSON and rendered the Base64 SVG ticket image directly in the browser. This was important because the NFT visuals changed dynamically depending on the ticket state, such as valid, listed and used. I also worked on frontend error handling, including wallet connection issues, rejected transactions and failed blockchain calls.

I spent around 30 hours on the project. About 10 hours went into planning the frontend structure and implementing the main pages. Around 10 hours were spent on wallet connection, Ethers.js integration and transaction flows. Another 5 hours went into metadata rendering and dynamic NFT display. The remaining 5 hours were used for debugging, testing the frontend with the deployed contracts and writing the final report.

One of the main challenges was working with blockchain transaction flow in the frontend. Unlike a normal web app, actions were not instant because users had to approve transactions in MetaMask and wait for them to be confirmed on-chain. I solved this by structuring the UI around clear user actions and making the flow easier to follow. Another challenge was the on-chain metadata rendering. Since the metadata and image were returned directly from the contract in Base64 format, I had to decode and display them correctly in the frontend. I solved this by implementing a decoding process for both the JSON metadata and SVG image and testing it against different ticket states.

From this project, I learned how a React frontend works in a blockchain environment. I gradually improved my understanding of Ethers.js, MetaMask integration, contract ABIs, transaction handling and how to display fully on-chain NFT metadata, which was a lot of practical information for me as a non-technical student. I also learned that in a DApp, the frontend is not where the business logic lives. Its role is to connect the user to the wallet and the smart contracts in a clear and usable way.

Our team divided the project into three main areas: smart contracts and architecture, frontend development and infrastructure, metadata, and testing. This worked well because each member had a clear responsibility, but we coordinated closely every step of the way so that the frontend matched the contract functions and deployment setup. What went well was the clear division of roles and the fact that each person contributed to a different technical layer of the project as well as helping other partners if they requested. One thing that could be improved is earlier full integration testing, because small mismatches between the frontend and smart contract expectations created extra debugging later.

**Gorkem's Individual Contribution Report**

My role in this project was Technical Lead and  product owner . I focused on establishing a robust development and deployment workflow, designing the on-chain ticketing primitives, and ensuring end-to-end integration between the smart contracts and the frontend. Below is a details of my specific contributions, time investment, challenges and solutions, learning outcomes, and how the team collaborated.

My Specific Contributions
I implemented the Hardhat development environment by setting up a full TypeScript-based Hardhat project, integrating essential plugins (hardhat-deploy, ethers, waffle), and establishing robust environment management. I configured local and testnet networks and standardized the build, test, and deployment workflows to ensure reproducibility across machines and teammates.

I developed modular deployment scripts to bootstrap the project in the correct order, specifically deploying EventTicketNFT.sol and TicketingPlatform.sol. I wired deployment outputs—addresses and ABIs—into frontend integration points and environment configurations, so the UI could reliably interact with the deployed contracts.

I implemented the NFT metadata generation system, designing a strategy that reflects ticket status (e.g., valid, reserved, used) in tokenURI. I built a metadata generator capable of running across local and testnet environments while staying in sync with the on-chain state, ensuring consistent visuals and attributes for each ticket.

I delivered the on-chain ticket design by building ERC-721 based contracts: EventTicketNFT.sol, the NFT ticket layer with minting and transfer rules, and TicketingPlatform.sol, which handles event creation, minting, resale, purchase, verification, and check-in logic. I encapsulated lifecycle logic and security checks to support real-world usage patterns, enabling reliable downstream UI interaction and governance.

I authored smart contract tests, including unit and integration tests for minting, transfers, resale flows, verification, and edge cases. Tests were designed to be deterministic, leveraging fixtures and appropriate gas/timeout settings to ensure stability and meaningful coverage.

I performed blockchain integration testing through end-to-end validation from deployment to frontend interaction, covering event creation, minting, resale, and check-in flows. I verified contract interfaces and ensured data flows between on-chain state and UI components were coherent and reliable.

I ensured system reproducibility by locking dependencies, documenting setup steps, and stabilizing environment parity across machines. I created clear, developer-facing guidelines to reproduce builds and deployments reliably, reducing onboarding time and divergence.

Finally, I contributed to report development and finalization by aligning the technical narrative with the implemented artifacts and polishing documentation to ensure consistency between the README, tests, and deployed state. This work emphasizes a cohesive engineering story that is deployable, testable, and reproducible
Learning Outcomes
- Deepened understanding of Solidity contract architecture for NFT-based ticketing, including ERC-721 integration with a broader platform logic.
- Gained practical experience with Hardhat-based workflows, including deployment orchestration and robust testing strategies.
- Enhanced skills in end-to-end DApp integration, including contract interaction patterns, front-end wiring, and reproducible environments.
- Strengthened collaboration practices, documentation discipline, and the importance of reproducibility in blockchain projects.
- Developed a pragmatic approach to security considerations in smart contract design (ownership checks, resale controls, double-use prevention, and access control).

Team Collaboration
Our coordination approach with 3 meeting and constant communication in the chat  for syncs and task breakdowns were complemented by GitHub issues and PR reviews.
 
We define  clear ownership was established for contract design, deployment, and testing tasks, with regular updates to the shared documentation.

What went well
Modular design facilitated parallel work streams (contracts, tests, deployment, and frontend integration).

Areas for improvement
We can dedicate more to  More explicit interface specifications for frontend-to-smart-contract calls to during integration.
