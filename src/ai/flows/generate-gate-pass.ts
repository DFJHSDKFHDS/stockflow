// src/ai/flows/generate-gate-pass.ts
'use server';

/**
 * @fileOverview Generates a gate pass for outgoing products, optimized for thermal printers, including a QR code.
 *
 * - generateGatePass - A function that handles the gate pass generation process.
 * - GenerateGatePassInput - The input type for the generateGatePass function.
 * - GenerateGatePassOutput - The return type for the generateGatePass function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateGatePassInputSchema = z.object({
  productName: z.string().describe('The name of the product being shipped.'),
  quantity: z.number().describe('The quantity of the product being shipped.'),
  destination: z.string().describe('The destination of the shipment.'),
  reason: z.string().describe('The reason for the shipment.'),
  date: z.string().describe('The date of the shipment.'),
  qrCodeData: z.string().describe('QR code data to link to more product details.'),
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
  prompt: `You are an AI assistant designed to generate gate passes for outgoing products, optimized for thermal printers.
  Consider the limited space of a thermal printer when formatting the gate pass. Include only the most essential information.
  Include a concise header and footer for the gate pass.
  Include the product name, quantity, destination, and date in the gate pass.
  Include a QR code that links to more details.  The QR code content is: {{{qrCodeData}}}

  Product Name: {{{productName}}}
  Quantity: {{{quantity}}}
  Destination: {{{destination}}}
  Reason: {{{reason}}}
  Date: {{{date}}}

  Format the gate pass to be easily readable and printable on a thermal printer.
  Ensure the gate pass is compliant with standard warehouse procedures.
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
    return output!;
  }
);
