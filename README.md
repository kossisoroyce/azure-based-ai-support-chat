# AI Support Chat Platform

An advanced AI-powered customer support chatbot platform with intelligent, adaptive communication capabilities designed for streamlined customer interactions.

## Features

- 🤖 Azure OpenAI Integration with robust error management
- 🔄 Real-time WebSocket communication
- 🌍 Dynamic multilingual support
- 💬 Contextual quick response system
- 🎨 Minimalist UI with compact chat bubble styling
- ⚡ Efficient loading states with minimalist skeletons

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Express.js
- **AI Integration**: Azure OpenAI
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query
- **Real-time Communication**: WebSocket
- **Type Safety**: TypeScript

## Getting Started

### Prerequisites

- Node.js 20.x or later
- Azure OpenAI API access

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-support-chat
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory and add:
```env
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_DEPLOYMENT=your_deployment
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## Project Structure

```
├── client/             # Frontend React application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/     # Custom React hooks
│   │   ├── lib/       # Utility functions
│   │   └── pages/     # Page components
├── server/            # Backend Express application
├── shared/           # Shared types and utilities
└── public/           # Static assets
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Author

**Kossiso Udodi** - _Initial work and maintenance_

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.