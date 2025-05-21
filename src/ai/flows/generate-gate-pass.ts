// src/ai/flows/generate-gate-pass.ts
'use server';

/**
 * @fileOverview Generates a gate pass for outgoing products, optimized for thermal printers.
 * Can include multiple products and a QR code linking to the gate pass details.
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
  // sku: z.string().optional().describe('The SKU of the product, if available.'), // Optional
});

const GenerateGatePassInputSchema = z.object({
  items: z.array(GatePassItemSchema).min(1).describe('A list of products included in this gate pass.'),
  destination: z.string().describe('The destination of the shipment.'),
  reason: z.string().describe('The reason for the shipment (e.g., Sale, Transfer).'),
  date: z.string().describe('The date of the shipment (e.g., Month DD, YYYY).'),
  userName: z.string().describe('Name of the user/staff creating or authorizing the gate pass.'),
  qrCodeData: z.string().describe('Unique Gate Pass ID or data to be encoded in the QR code for verification.'),
});
export type GenerateGatePassInput = z.infer<typeof GenerateGatePassInputSchema>;

const GenerateGatePassOutputSchema = z.object({
  gatePass: z.string().describe('The gate pass content, formatted for a thermal printer.'),
});
export type GenerateGatePassOutput = z.infer<typeof GenerateGatePassOutputSchema>;

export async function generateGatePass(input: GenerateGatePassInput): Promise<GenerateGatePassOutput> {
  return generateGatePassFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateGatePassPrompt',
  input: {schema: GenerateGatePassInputSchema},
  output: {schema: GenerateGatePassOutputSchema},
  prompt: `You are an AI assistant tasked with generating a gate pass for outgoing products.
The pass must be optimized for printing on a thermal printer, meaning it should be concise, use simple formatting, and avoid complex graphics beyond a placeholder for a QR code.

Gate Pass Details:
--------------------
Destination: {{{destination}}}
Reason for Dispatch: {{{reason}}}
Date: {{{date}}}
Authorized by: {{{userName}}}
Gate Pass ID (for QR): {{{qrCodeData}}}

Items:
{{#each items}}
- Product: {{this.productName}}
  Quantity: {{this.quantity}}
{{/each}}
--------------------

Instructions:
1. Create a clear header, like "GATE PASS" or "MATERIAL DISPATCH NOTE".
2. List all items clearly. For each item, show Product Name and Quantity.
3. Include Destination, Reason, Date, and Authorized By fields.
4. Crucially, include a placeholder text like "[QR Code for Gate Pass ID: {{{qrCodeData}}}]". This indicates where a QR code image would be printed. The actual QR image generation is handled separately.
5. Ensure the layout is compact and readable on a small thermal printer slip. Use line breaks effectively.
6. Add a simple footer, perhaps with a line for "Receiver's Signature" or a thank you note.
7. The output should be a single block of text. Do not use Markdown formatting like backticks for code blocks.

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
