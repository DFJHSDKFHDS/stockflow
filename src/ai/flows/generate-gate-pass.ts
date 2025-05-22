// src/ai/flows/generate-gate-pass.ts
'use server';

/**
 * @fileOverview DEPRECATED: Gate pass content is now generated directly in OutgoingForm.tsx.
 * This file is kept for potential future AI features but is not currently used for gate pass content.
 *
 * - generateGatePass - A function that handles the gate pass generation process.
 * - GenerateGatePassInput - The input type for the generateGatePass function.
 * - GenerateGatePassOutput - The return type for the generateGatePass function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GatePassItemSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  quantity: z.number().describe('The quantity of this product being shipped.'),
});

const GenerateGatePassInputSchema = z.object({
  items: z.array(GatePassItemSchema).min(1).describe('A list of products included in this gate pass.'),
  customerName: z.string().describe('The name of the customer or entity receiving the shipment.'),
  date: z.string().describe('The date and time of the shipment (e.g., Month DD, YYYY, HH:MM AM/PM).'),
  userName: z.string().describe('Name of the user/staff creating or authorizing the gate pass.'),
  qrCodeData: z.string().describe('Unique Gate Pass ID (Firebase key) or data to be encoded in the QR code for verification.'),
  gatePassNumber: z.number().describe('The sequential, human-readable number of this gate pass.'),
});
export type GenerateGatePassInput = z.infer<typeof GenerateGatePassInputSchema>;

const GenerateGatePassOutputSchema = z.object({
  gatePass: z.string().describe('The gate pass content, formatted for a thermal printer.'),
});
export type GenerateGatePassOutput = z.infer<typeof GenerateGatePassOutputSchema>;

// This function is no longer called by OutgoingForm.tsx for content generation.
// It can be removed or repurposed if no other part of the system uses it.
export async function generateGatePass(input: GenerateGatePassInput): Promise<GenerateGatePassOutput> {
  // console.warn("generateGatePass AI flow was called, but content generation has moved to OutgoingForm.tsx");
  // Returning a minimal or empty response as AI content generation is deprecated here.
  return { gatePass: "Gate pass content is now generated directly by the application." };
}

/*
// AI Prompt and Flow definition are removed as they are no longer used.

const prompt = ai.definePrompt({
  name: 'generateGatePassPrompt',
  input: {schema: GenerateGatePassInputSchema},
  output: {schema: GenerateGatePassOutputSchema},
  prompt: `You are an AI assistant tasked with generating a gate pass for outgoing products.
The pass must be optimized for printing on a thermal printer, meaning it should be concise, use simple formatting, and avoid complex graphics beyond a placeholder for a QR code.

GATE PASS
--------------------
Gate Pass No.: {{{gatePassNumber}}}
Customer Name: {{{customerName}}}
Date & Time: {{{date}}}
Authorized by: {{{userName}}}
Gate Pass ID (for QR): {{{qrCodeData}}}

Items:
{{#each items}}
- Product: {{this.productName}}
  Quantity: {{this.quantity}}
{{/each}}
--------------------

Instructions:
1. Create a clear header "GATE PASS".
2. Display the "Gate Pass No.: {{{gatePassNumber}}}".
3. List all items clearly. For each item, show Product Name and Quantity.
4. Include Customer Name, Date & Time, and Authorized By fields.
5. Crucially, include a placeholder text like "[QR Code for Gate Pass ID: {{{qrCodeData}}}]". This indicates where a QR code image would be printed. The actual QR image generation is handled separately.
6. Ensure the layout is compact and readable on a small thermal printer slip. Use line breaks effectively.
7. Add a simple footer, perhaps with a line for "Receiver's Signature" or a thank you note.
8. The output should be a single block of text. Do not use Markdown formatting like backticks for code blocks.

Example of a section:
Product: Awesome Widget
Quantity: 10

Make sure the entire output is just the plain text content of the gate pass slip.
`,
});

const generateGatePassFlow = ai.defineFlow(
  {
    name: 'generateGatePassFlow',
    inputSchema: GenerateGatePassInputSchema,
    outputSchema: GenerateGatePassOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate gate pass content.');
    }
    return output;
  }
);
*/
