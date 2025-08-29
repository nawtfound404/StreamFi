# StreamFi 🎥💸

**StreamFi** is a decentralized live-streaming platform where creators can host streams and viewers can send real-time crypto payments and reactions. Built with **Next.js**, **Node.js**, and **Web3**, it ensures secure, censorship-resistant, and interactive streaming experiences.

---

## 🚀 Features

* 🔴 **Live Streaming** – Low-latency video streaming using WebRTC.
* 💰 **Crypto Payments** – Real-time tipping via smart contracts.
* 🎉 **Live Reactions** – Heart, like, clap, and more with socket updates.
* 🔐 **Wallet Integration** – MetaMask & WalletConnect support.
* 🌐 **Decentralized** – Powered by blockchain for security & transparency.

---

## 🏗️ Tech Stack

### Frontend

* [Next.js](https://nextjs.org/) – React framework
* [TailwindCSS](https://tailwindcss.com/) – Styling
* [Socket.IO Client](https://socket.io/) – Real-time communication
* [Web3.js](https://web3js.readthedocs.io/) – Blockchain interaction

### Backend

* [Node.js](https://nodejs.org/)
* [Express.js](https://expressjs.com/)
* [Socket.IO](https://socket.io/) – WebSocket connections
* [MongoDB](https://www.mongodb.com/) – Database
* [Ethers.js](https://docs.ethers.org/) – Smart contract integration

### Blockchain

* Ethereum / Polygon – Smart contracts
* Solidity – Smart contract language

---


## ⚡ Getting Started

### Prerequisites

* Node.js (>=16)
* npm / yarn
* MongoDB running locally or on Atlas
* MetaMask wallet

### 1. Clone the repository

```bash
git clone https://github.com/your-username/streamfi.git
cd streamfi
```

### 2. Install dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd frontend
npm install
```

### 3. Set up environment variables

Create a `.env` file in **backend** and **frontend** with:

```
MONGO_URI=your_mongo_url
PORT=5000
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=deployed_contract_address
```

### 4. Run the project

#### Backend

```bash
cd backend
npm run dev
```

#### Frontend

```bash
cd frontend
npm run dev
```
---

## 🤝 Contributing

We welcome contributions! Please fork the repo and make a pull request.

---

## 📜 License

MIT License © 2025 StreamFi Team

---

## 🌟 Acknowledgements

* Socket.IO for real-time infra
* Web3.js & Ethers.js for blockchain
* Hardhat for contract testing
* Next.js for frontend
