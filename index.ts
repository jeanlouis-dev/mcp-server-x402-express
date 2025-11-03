import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
//import axios from "axios";
import { Hex } from "viem";
/*import { privateKeyToAccount } from "viem/accounts";
import { withPaymentInterceptor } from "x402-axios";*/
import { paymentMiddleware, Resource, type SolanaAddress } from "x402-express";
/*import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";*/
config();


/*const privateKey = process.env.PRIVATE_KEY as Hex;
const baseURL = process.env.RESOURCE_SERVER_URL as string; // e.g. https://example.com
const endpointPath = process.env.ENDPOINT_PATH as string; // e.g. /weather*/

const facilitatorUrl = process.env.FACILITATOR_URL as Resource;
const payTo = process.env.ADDRESS as `0x${string}` | SolanaAddress;

if (!facilitatorUrl || !payTo) {
  console.error("Missing required environment variables");
  process.exit(1);
}

/*if (!privateKey || !baseURL || !endpointPath) {
  throw new Error("Missing environment variables");
}

const account = privateKeyToAccount(privateKey);

const client = withPaymentInterceptor(axios.create({ baseURL, timeout: 30000 }), account);

// Create an MCP server
const server = new McpServer({
  name: "x402 MCP Server Demo",
  version: "1.0.0",
});

// Add an addition tool
server.tool(
  "get-data-from-resource-server",
  "Get data from the resource server (in this example, the weather)",
  {},
  async () => {
    const res = await client.get(endpointPath);
    return {
      content: [{ type: "text", text: JSON.stringify(res.data) }],
    };
  },
);*/

const app = express();
app.use(express.json());
/*app.use(
    cors({
        origin: '*',
        allowedHeaders: ["*"],
        exposedHeaders: ['Mcp-Session-Id','Content-Type', 'Access-Control-Allow-Origin']
    })
);

// Map to store transports by session ID
// Store transports for each session type
const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>,
  sse: {} as Record<string, SSEServerTransport>
};

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
 
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.streamable[sessionId]) {
      // Reuse existing transport
      transport = transports.streamable[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
              // Store the transport by session ID
              transports.streamable[sessionId] = transport;
          }
      });

      // Clean up transport when closed
      transport.onclose = () => {
          if (transport.sessionId) {
              delete transports.streamable[transport.sessionId];
          }
      };

      // Connect to the MCP server
      await server.connect(transport);
  } else {
      // Invalid request
      res.status(400).json({
          jsonrpc: '2.0',
          error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided',
          },
          id: null,
      });
      return;
  }
 
  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.streamable[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
  }

  const transport = transports.streamable[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

// Legacy SSE endpoint for older clients
app.get('/sse', async (req, res) => {
  // Create SSE transport for legacy clients
  const transport = new SSEServerTransport('/messages', res);
  transports.sse[transport.sessionId] = transport;

  res.on("close", () => {
      delete transports.sse[transport.sessionId];
  });

  await server.connect(transport);
});

// Legacy message endpoint for older clients
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.sse[sessionId];
  if (transport) {
      await transport.handlePostMessage(req, res, req.body);
  } else {
      res.status(400).send('No transport found for sessionId');
  }
});*/

app.use(
  paymentMiddleware(
    payTo,
    {
      "GET /weather": {
        // USDC amount in dollars
        price: "$0.001",
        // network: "base" // uncomment for Base mainnet
        // network: "solana" // uncomment for Solana mainnet
        network: "base-sepolia",
      },
      "/premium/*": {
        // Define atomic amounts in any EIP-3009 token
        price: {
          amount: "100000",
          asset: {
            address: "0xabc",
            decimals: 18,
            // omit eip712 for Solana
            eip712: {
              name: "WETH",
              version: "1",
            },
          },
        },
        // network: "base" // uncomment for Base mainnet
        // network: "solana" // uncomment for Solana mainnet
        network: "base-sepolia",
      },
    },
    {
      url: facilitatorUrl,
    },
  ),
);

app.get("/weather", (req, res) => {
  res.send({
    report: {
      weather: "sunny",
      temperature: 70,
    },
  });
});

app.get("/premium/content", (req, res) => {
  res.send({
    content: "This is premium content",
  });
});

app.listen(4021, () => {
  console.log(` 🚀 MCP Server listening at http://localhost:${4021}`);
});
