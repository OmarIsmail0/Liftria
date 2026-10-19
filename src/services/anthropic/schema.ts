import { z } from 'zod';

export const mealSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().finite().positive(),
    unit: z.string().min(1),
    confidence: z.number().min(0).max(1),
  }).strict()).max(25),
}).strict();
export type MealEstimate = z.infer<typeof mealSchema>;

// Deliberately omit numeric constraints unsupported by the API's grammar;
// zod still enforces them locally after response validation.
export const mealJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['name', 'quantity', 'unit', 'confidence'],
      },
    },
  },
  required: ['items'],
} as const;
