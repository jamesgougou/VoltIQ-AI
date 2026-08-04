import { formatStructuredReply } from "./structuredReply";

const MOCK_DELAY_MS = 1200;

const MOCK_RESPONSES: Array<{ match: RegExp; reply: string }> = [
  {
    match: /\brcd\b/i,
    reply: formatStructuredReply({
      title: "RCD (Residual Current Device)",
      summary:
        "A protective device that disconnects power when it detects dangerous leakage current.",
      definition:
        "An **RCD** monitors the balance between live and neutral conductors and trips when current leaks to earth.",
      explanation:
        "RCDs protect people from electric shock by detecting small imbalance currents that may flow through a person during a fault. They are commonly installed on socket, lighting, and wet-area circuits in domestic and commercial installations.",
      keyPoints: [
        "Typical domestic sensitivity is 30 mA",
        "Trips quickly to limit shock duration",
        "Does not replace overcurrent protection from an MCB",
        "Required on many final subcircuits under AS/NZS 3000",
      ],
      example:
        "A 32 A socket circuit protected by a 30 mA RCD will disconnect if leakage current exceeds the rated threshold, even when the load current is below the breaker rating.",
      relatedTopics: ["RCBO", "Earthing", "Socket Circuits", "AS/NZS 3000"],
    }),
  },
  {
    match: /\brcbo\b/i,
    reply: formatStructuredReply({
      title: "RCBO (Combined MCB + RCD)",
      summary:
        "A single device that provides both overcurrent and earth leakage protection.",
      definition:
        "An **RCBO** combines miniature circuit breaker and residual current protection in one unit.",
      explanation:
        "RCBOs protect individual circuits from overload, short circuit, and earth leakage. They are useful where separate RCD and MCB coordination is needed per circuit, such as mixed loads on a switchboard.",
      keyPoints: [
        "Protects one circuit for both overcurrent and leakage",
        "Reduces nuisance tripping on unrelated circuits",
        "Useful for workshop, kitchen, and outdoor circuits",
        "Selected to match cable size and load current",
      ],
      example:
        "A 20 A RCBO on a kitchen ring circuit can protect against both a faulty appliance leaking to earth and a sustained overload from multiple appliances.",
      relatedTopics: ["RCD", "MCB", "Switchboard Analysis", "Circuit Protection"],
    }),
  },
  {
    match: /\bmaximum demand\b/i,
    reply: formatStructuredReply({
      title: "Maximum Demand",
      summary:
        "The highest expected simultaneous load on an electrical installation.",
      definition:
        "**Maximum demand** is the greatest load likely to occur at one time on an installation or part of an installation.",
      explanation:
        "Maximum demand is used to size mains, switchboards, service fuses, and supply capacity. It considers connected load, operating patterns, and diversity between circuits rather than simply adding every connected appliance.",
      keyPoints: [
        "Used to size mains and switchboard capacity",
        "Diversity reduces the total compared with connected load",
        "Important for supply authority applications",
        "Differs from connected load and after-diversity maximum demand (ADMD)",
      ],
      example:
        "A house may have 80 A of connected load but a calculated maximum demand of 45 A once diversity is applied to cooking, heating, and general power circuits.",
      relatedTopics: ["Cable Sizing", "Switchboard Analysis", "Load Assessment"],
    }),
  },
  {
    match: /\bcable sizing\b|\bcable size\b/i,
    reply: formatStructuredReply({
      title: "Cable Sizing",
      summary:
        "Selecting a conductor that safely carries load current and meets installation rules.",
      definition:
        "**Cable sizing** is the process of choosing conductor cross-sectional area based on current, installation conditions, and voltage drop limits.",
      explanation:
        "Correct cable sizing prevents overheating, excessive voltage drop, and failure of protective devices to operate correctly. It must consider load current, length, ambient temperature, grouping, insulation type, and installation method.",
      keyPoints: [
        "Current-carrying capacity must exceed design load",
        "Voltage drop limits apply to final subcircuits and mains",
        "Derating applies for grouping, insulation, and ambient temperature",
        "Protective device rating must coordinate with cable capacity",
      ],
      example:
        "A 32 A circuit feeding a load 30 m away may require a larger conductor than 32 A alone suggests if voltage drop limits are exceeded.",
      relatedTopics: ["Maximum Demand", "Voltage Drop", "AS/NZS 3000"],
    }),
  },
  {
    match: /\bvoltage drop\b/i,
    reply: formatStructuredReply({
      title: "Voltage Drop",
      summary:
        "The reduction in voltage along a conductor due to load current and resistance.",
      definition:
        "**Voltage drop** is the difference between supply voltage and load voltage caused by current flowing through conductor impedance.",
      explanation:
        "Excessive voltage drop can cause poor equipment performance, dim lighting, and motor starting problems. Installation standards limit allowable voltage drop for safety and performance.",
      keyPoints: [
        "Increases with current, length, and conductor resistance",
        "Limited by AS/NZS 3000 for subcircuits and mains",
        "Improved by increasing cable size or reducing run length",
        "Must be checked alongside current-carrying capacity",
      ],
      example:
        "A long submain to a detached garage may need upsizing from 6 mm² to 10 mm² to keep voltage drop within limits at full load.",
      relatedTopics: ["Cable Sizing", "Maximum Demand", "Submains"],
    }),
  },
  {
    match: /generate 20 study questions/i,
    reply: formatStructuredReply({
      title: "Study Questions Generated",
      summary:
        "Mock study questions based on your uploaded documents.",
      definition:
        "Study questions are prompts designed to test understanding of technical concepts, standards, and installation requirements found in your uploaded content.",
      explanation:
        "In a full implementation, VoltIQ AI would analyse your PDFs, images, and pasted text to produce targeted revision questions. This mock response demonstrates the structured answer format.",
      keyPoints: [
        "Questions would reference content from uploaded documents",
        "Mix of definition, application, and standards-based prompts",
        "Useful for apprentice revision and exam preparation",
        "Can be regenerated as new documents are uploaded",
      ],
      example:
        "1. What is the purpose of an RCD on a socket-outlet circuit?\n2. Which AS/NZS standard governs wiring rules?\n3. How does maximum demand differ from connected load?",
      relatedTopics: ["Generate Questions", "Explain", "Find Standards"],
    }),
  },
  {
    match: /\bsummaris/i,
    reply: formatStructuredReply({
      title: "Document Summary",
      summary: "A concise overview of your uploaded documents.",
      definition:
        "A **summary** captures the main topics, requirements, and technical points from uploaded source material.",
      explanation:
        "Summarisation helps you quickly understand long PDFs, reports, and pasted notes without reading every page. Full AI integration will extract key themes directly from your uploaded context.",
      keyPoints: [
        "Highlights main technical topics and requirements",
        "Useful for switchboard schedules, reports, and standards extracts",
        "Reduces time spent reviewing lengthy documents",
        "Works across PDF, image, and pasted text context",
      ],
      example:
        "Your uploaded switchboard schedule summary might note main breaker rating, circuit list, RCD protection, and referenced AS/NZS standards.",
      relatedTopics: ["Explain", "Find Standards", "Extract Tables"],
    }),
  },
  {
    match: /\bexplain the uploaded content/i,
    reply: formatStructuredReply({
      title: "Simplified Explanation",
      summary:
        "Technical content explained in plain language for apprentice-level learning.",
      definition:
        "An **explanation** breaks complex electrical concepts into clear, practical language without losing technical accuracy.",
      explanation:
        "This tool is designed to translate standards language, switchboard terminology, and report findings into language suitable for apprentices and field technicians learning the trade.",
      keyPoints: [
        "Uses plain language while keeping technical meaning",
        "Ideal for apprentices and new electricians",
        "Can simplify standards, diagrams, and report findings",
        "Supports learning without replacing formal training",
      ],
      example:
        "Instead of only stating “30 mA RCD required”, the explanation would describe why leakage protection matters and where it is commonly applied on site.",
      relatedTopics: ["Generate Questions", "Summarise", "Find Standards"],
    }),
  },
  {
    match: /as\/nzs standard/i,
    reply: formatStructuredReply({
      title: "Referenced AS/NZS Standards",
      summary:
        "Standards identified from your uploaded documents.",
      definition:
        "**AS/NZS standards** are joint Australian and New Zealand technical documents covering wiring rules, equipment, and safety requirements.",
      explanation:
        "Finding standards in uploaded documents helps identify compliance obligations, design requirements, and testing references. Full AI integration would scan your context and list every cited standard with context.",
      keyPoints: [
        "AS/NZS 3000 is commonly referenced for wiring rules",
        "Standards may appear in reports, schedules, and specifications",
        "Useful for compliance checks and design review",
        "Mock response until live document analysis is connected",
      ],
      example:
        "An uploaded inspection report might reference AS/NZS 3000, AS/NZS 3017, and AS/NZS 5033 depending on the installation type.",
      relatedTopics: ["Find Standards", "Summarise", "Inspection Report"],
    }),
  },
  {
    match: /extract all tables/i,
    reply: formatStructuredReply({
      title: "Extracted Tables",
      summary: "Tables identified from your uploaded documents.",
      definition:
        "Table extraction pulls structured rows and columns from PDFs and reports for analysis, comparison, and reporting.",
      explanation:
        "Schedules, test results, cable lists, and switchboard tables are common in electrical documentation. This tool would return them in a readable structured format once full AI parsing is enabled.",
      keyPoints: [
        "Useful for switchboard schedules and test sheets",
        "Supports comparison across multiple documents",
        "Can feed into compliance and design workflows",
        "Mock response until live table extraction is connected",
      ],
      example:
        "A switchboard schedule table might include circuit number, protective device rating, cable size, and load description.",
      relatedTopics: ["Summarise", "Switchboard Analysis", "Find Standards"],
    }),
  },
  {
    match: /\bmcb\b/i,
    reply: formatStructuredReply({
      title: "MCB (Miniature Circuit Breaker)",
      summary: "Overcurrent protection for final subcircuits.",
      definition:
        "An **MCB** protects a circuit against overload and short circuit by automatically disconnecting the supply.",
      explanation:
        "MCBs are selected based on load current, cable capacity, and fault level. They form the basic overcurrent protection layer in most switchboards and distribution boards.",
      keyPoints: [
        "Protects against overload and short circuit",
        "Rated in amperes to match circuit design",
        "Must coordinate with cable current-carrying capacity",
        "Different curve types suit different load characteristics",
      ],
      example:
        "A 16 A Type B MCB might protect a lighting subcircuit wired with 1.5 mm² cable under normal domestic conditions.",
      relatedTopics: ["RCBO", "Cable Sizing", "Switchboard Analysis"],
    }),
  },
];

function findMockReply(message: string): string {
  for (const { match, reply } of MOCK_RESPONSES) {
    if (match.test(message)) {
      return reply;
    }
  }

  return formatStructuredReply({
    title: "VoltIQ AI Response",
    summary: "Mock structured response for your question.",
    definition:
      "This is a placeholder response while OpenAI integration is not yet connected.",
    explanation:
      "Your message was received through the existing chat workflow. When AI integration is enabled, VoltIQ AI will analyse uploaded documents and return answers in this structured format.",
    keyPoints: [
      "Upload PDFs, images, or text for context",
      "Use AI Tools for common electrical tasks",
      "Responses follow a consistent workspace format",
      "OpenAI / DeepSeek integration coming soon",
    ],
    example: `You asked: "${message.trim()}"`,
    relatedTopics: ["Cable Sizing", "Maximum Demand", "Voltage Drop"],
  });
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
