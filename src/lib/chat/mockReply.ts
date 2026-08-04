const MOCK_DELAY_MS = 1200;

const MOCK_RESPONSES: Array<{ match: RegExp; reply: string }> = [
  {
    match: /\brcd\b/i,
    reply: `## RCD Overview

An **RCD** (Residual Current Device) protects people from electric shock by detecting imbalance between live and neutral conductors.

### Key points
- Monitors current balance on a circuit
- Trips quickly when leakage current is detected
- Commonly required for socket and wet-area circuits

\`\`\`text
Typical trip sensitivity: 30 mA (domestic)
\`\`\`

| Feature | Benefit |
| --- | --- |
| Leakage detection | Reduces shock risk |
| Fast operation | Limits fault duration |`,
  },
  {
    match: /\brcbo\b/i,
    reply: `## RCBO Explained

An **RCBO** combines **MCB** and **RCD** protection in one device.

1. Overcurrent protection for the circuit
2. Earth leakage protection for people and equipment
3. Individual circuit isolation during faults

> RCBOs are useful where both overload and shock protection are needed per circuit.`,
  },
  {
    match: /\bmaximum demand\b/i,
    reply: `## Maximum Demand

**Maximum demand** is the highest expected load on an installation at one time.

- Used to size mains conductors and switchboards
- Considers diversity between circuits
- Supports supply authority assessment

\`\`\`text
Example: Sum of circuit loads × diversity factor
\`\`\``,
  },
  {
    match: /\bcable sizing\b|\bcable size\b/i,
    reply: `## Cable Sizing

Cable sizing selects a conductor that safely carries load current while meeting installation rules.

### Design checks
- **Current-carrying capacity**
- **Voltage drop**
- **Installation conditions** (ambient temperature, grouping)
- **Protection coordination**

| Factor | Why it matters |
| --- | --- |
| Load current | Prevents overheating |
| Length | Limits voltage drop |
| Environment | Affects derating |`,
  },
  {
    match: /\bmcb\b/i,
    reply: `An **MCB** (Miniature Circuit Breaker) protects circuits from **overcurrent** and **short circuits**.`,
  },
  {
    match: /\belcb\b|\brccb\b/i,
    reply: `An **ELCB/RCCB** detects earth leakage current and disconnects power to reduce shock risk.`,
  },
];

function findMockReply(message: string): string {
  for (const { match, reply } of MOCK_RESPONSES) {
    if (match.test(message)) {
      return reply;
    }
  }

  return `Thanks for your message. AI integration is coming soon.

For now, this is a mock reply to:

> ${message.trim()}`;
}

export function getMockReply(message: string): string {
  const trimmed = message.trim();

  if (!trimmed) {
    return "Please enter a message to get a mock response.";
  }

  return findMockReply(trimmed);
}

export function mockReplyDelay(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, MOCK_DELAY_MS);
  });
}
