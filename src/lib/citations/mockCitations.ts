import type { Citation } from "@/types/citation";

const MOCK_CITATION_SETS: Array<{
  match: RegExp;
  citations: Citation[];
}> = [
  {
    match: /RCD \(Residual Current Device\)/i,
    citations: [
      {
        id: "as3000-rcd",
        document: "AS/NZS 3000:2018",
        fileName: "AS3000-2018.pdf",
        page: 214,
        clause: "2.6.3",
        confidence: "High",
        excerpt:
          "Residual current devices (RCDs) with a rated residual operating current not exceeding 30 mA shall be installed for the additional protection of socket-outlet circuits.",
        inlineLabel: "Residual Current Device",
      },
      {
        id: "as3000-rcd-wet",
        document: "AS/NZS 3000:2018",
        fileName: "AS3000-2018.pdf",
        page: 218,
        clause: "2.6.3.2",
        confidence: "High",
        excerpt:
          "RCDs shall be installed for circuits supplying socket-outlets in wet areas including bathrooms, laundries, and outdoor locations.",
        inlineLabel: "30 mA",
      },
    ],
  },
  {
    match: /Maximum Demand/i,
    citations: [
      {
        id: "as3000-md",
        document: "AS/NZS 3000:2018",
        fileName: "AS3000-2018.pdf",
        page: 156,
        clause: "1.6.3",
        confidence: "High",
        excerpt:
          "The maximum demand of an electrical installation shall be determined by assessment, measurement, or calculation in accordance with this Standard.",
        inlineLabel: "Maximum Demand",
      },
      {
        id: "as3000-diversity",
        document: "AS/NZS 3000:2018",
        fileName: "AS3000-2018.pdf",
        page: 158,
        clause: "1.6.4",
        confidence: "Medium",
        excerpt:
          "Diversity may be applied when determining maximum demand where not all connected load operates simultaneously.",
        inlineLabel: "diversity",
      },
    ],
  },
  {
    match: /Referenced AS\/NZS Standards/i,
    citations: [
      {
        id: "as3000-std",
        document: "AS/NZS 3000:2018",
        fileName: "AS3000-2018.pdf",
        page: 12,
        confidence: "High",
        excerpt:
          "This Standard sets out requirements for the design, construction and verification of electrical installations.",
        inlineLabel: "AS/NZS 3000",
      },
      {
        id: "as5033-std",
        document: "AS/NZS 5033:2021",
        fileName: "AS5033-2021.pdf",
        page: 76,
        clause: "3.1",
        confidence: "High",
        excerpt:
          "Photovoltaic (PV) arrays shall be installed in accordance with this Standard and the manufacturer's instructions.",
        inlineLabel: "AS/NZS 5033",
      },
      {
        id: "as3017-std",
        document: "AS/NZS 3017:2022",
        fileName: "AS3017-2022.pdf",
        page: 41,
        clause: "2.1",
        confidence: "Medium",
        excerpt:
          "Verification of electrical installations shall be carried out to confirm compliance with AS/NZS 3000.",
        inlineLabel: "AS/NZS 3017",
      },
    ],
  },
  {
    match: /Cable Sizing/i,
    citations: [
      {
        id: "as3000-cable",
        document: "AS/NZS 3000:2018",
        fileName: "AS3000-2018.pdf",
        page: 192,
        clause: "3.4.1",
        confidence: "High",
        excerpt:
          "Conductors shall have a current-carrying capacity not less than the maximum demand of the circuit they serve.",
        inlineLabel: "Cable Sizing",
      },
    ],
  },
  {
    match: /Voltage Drop/i,
    citations: [
      {
        id: "as3000-vd",
        document: "AS/NZS 3000:2018",
        fileName: "AS3000-2018.pdf",
        page: 198,
        clause: "3.6.2",
        confidence: "High",
        excerpt:
          "The voltage drop in consumer mains shall not exceed 2% of the nominal voltage at the point of supply.",
        inlineLabel: "Voltage Drop",
      },
    ],
  },
];

export function getMockCitationsForContent(content: string): Citation[] {
  for (const { match, citations } of MOCK_CITATION_SETS) {
    if (match.test(content)) {
      return citations.filter((citation) =>
        content.toLowerCase().includes(citation.inlineLabel.toLowerCase()),
      );
    }
  }

  return [];
}
