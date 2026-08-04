export type StructuredReply = {
  title: string;
  summary: string;
  definition: string;
  explanation: string;
  keyPoints: string[];
  example: string;
  relatedTopics: string[];
};

export function formatStructuredReply({
  title,
  summary,
  definition,
  explanation,
  keyPoints,
  example,
  relatedTopics,
}: StructuredReply): string {
  const keyPointsList = keyPoints.map((point) => `- ${point}`).join("\n");
  const relatedList = relatedTopics.map((topic) => `- ${topic}`).join("\n");

  return `## ${title}

${summary}

---

### Definition

${definition}

---

### Explanation

${explanation}

---

### Key Points

${keyPointsList}

---

### Example

${example}

---

### Related Topics

${relatedList}`;
}
