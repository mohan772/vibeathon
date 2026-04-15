# Vibeathon Backend

Express.js backend server for the Vibeathon project.

## Project Structure

```
vibeathon/
├── server.js          # Main server entry point
├── routes/            # Route handlers
│   └── index.js       # Home and health check routes
├── services/          # Business logic and utilities
│   └── example.js     # Example service file
├── models/            # Data models and schemas
│   └── example.js     # Example model file
├── package.json       # Dependencies and scripts
├── .env              # Environment variables
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## Installation

1. Navigate to the project directory:
```bash
cd vibeathon
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The `.env` file contains environment variables:
- `PORT=5000` - Server port
- `NODE_ENV=development` - Environment mode

Modify these values as needed for your setup.

## Running the Server

### Production Mode
```bash
npm start
```

### Development Mode (with auto-reload)
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### Home Route
- **GET** `/` - Welcome message and API info
  ```json
  {
    "success": true,
    "message": "Welcome to Vibeathon API",
    "version": "1.0.0",
    "timestamp": "2026-04-15T00:00:00.000Z"
  }
  ```

### Health Check
- **GET** `/health` - Server health status
  ```json
  {
    "status": "OK",
    "uptime": 123.45,
    "timestamp": "2026-04-15T00:00:00.000Z"
  }
  ```

## Key Features

✅ ES Modules (import/export)  
✅ Express.js with middleware  
✅ CORS enabled  
✅ Environment variable support via dotenv  
✅ Error handling middleware  
✅ Clean, scalable folder structure  
✅ Development mode with auto-reload  

## Dependencies

- **express** - Web framework
- **cors** - Cross-Origin Resource Sharing middleware
- **dotenv** - Environment variable management

## Next Steps

1. Add more routes in the `routes/` folder
2. Implement business logic in `services/`
3. Define data models in `models/`
4. Extend the server configuration as needed
